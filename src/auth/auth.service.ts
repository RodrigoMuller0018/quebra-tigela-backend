/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Usuario, UsuarioDocument } from '../users/schemas/user.schema';
import { Artista, ArtistaDocument } from '../artists/schemas/artist.schema';
import { gerarHandleUnico, validarFormatoHandle } from '../common/handle';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Usuario.name) private usuarioModel: Model<UsuarioDocument>,
    @InjectModel(Artista.name) private artistaModel: Model<ArtistaDocument>,
    private jwt: JwtService,
  ) {}

  /** Registra um usuário comum. Não cria perfil de artista — pra isso usa /artistas/tornar-se-artista depois. */
  async registrarUsuario(dados: {
    nome: string;
    email: string;
    senha: string;
    cidade?: string;
    estado?: string;
    fotoPerfil?: string;
  }) {
    const { senha, ...resto } = dados;
    const existente = await this.usuarioModel.findOne({ email: resto.email.toLowerCase() }).lean();
    if (existente) {
      throw new ConflictException('Já existe uma conta com esse e-mail');
    }
    const senhaHash = await bcrypt.hash(senha, 10);
    const doc = new this.usuarioModel({ ...resto, senhaHash, papel: 'cliente' });
    await doc.save();
    return this.assinarToken({
      sub: doc._id.toString(),
      papel: 'cliente',
      email: doc.email,
      temPerfilArtista: false,
    });
  }

  /**
   * Registra cliente + artista em uma só operação (caminho público "Sou artista").
   * Cria Usuario base e Artista linkado. Campos comuns (nome/email/cidade/estado/fotoPerfil)
   * ficam no Usuario; campos artísticos (bio/tiposArte/etc.) ficam no Artista.
   */
  async registrarArtista(dados: {
    nome: string;
    email: string;
    senha: string;
    cidade?: string;
    estado?: string;
    fotoPerfil?: string;
    bio?: string;
    tiposArte: string[];
    telefone: string;
    handle?: string;
    nomeArtistico?: string;
    dataNascimento?: string;
    portfolio?: string;
    redesSociais?: string[];
    verificado?: boolean;
  }) {
    const {
      senha,
      nome,
      email,
      cidade,
      estado,
      fotoPerfil,
      bio,
      tiposArte,
      telefone,
      handle: handleDesejado,
      nomeArtistico,
      dataNascimento,
      portfolio,
      redesSociais,
      verificado,
    } = dados;

    const existente = await this.usuarioModel.findOne({ email: email.toLowerCase() }).lean();
    if (existente) {
      throw new ConflictException('Já existe uma conta com esse e-mail');
    }

    // Resolve handle: se veio do form, valida + checa unicidade; senão auto-gera do nome.
    let handle: string;
    if (handleDesejado) {
      handle = handleDesejado.toLowerCase();
      const v = validarFormatoHandle(handle);
      if (!v.valido) throw new BadRequestException(v.motivo);
      const dup = await this.artistaModel.exists({ handle });
      if (dup) throw new ConflictException('Esse handle já está em uso');
    } else {
      handle = await gerarHandleUnico(nome, this.artistaModel);
    }

    const senhaHash = await bcrypt.hash(senha, 10);
    const usuario = await new this.usuarioModel({
      nome,
      email,
      senhaHash,
      cidade,
      estado,
      fotoPerfil,
      papel: 'cliente',
    }).save();

    const artista = await new this.artistaModel({
      usuarioId: usuario._id,
      handle,
      bio,
      tiposArte,
      telefone,
      nomeArtistico,
      dataNascimento,
      portfolio,
      redesSociais: redesSociais ?? [],
      verificado: !!verificado,
      ativo: true,
    }).save();

    return this.assinarToken({
      sub: usuario._id.toString(),
      papel: 'cliente',
      email: usuario.email,
      temPerfilArtista: true,
      artistaId: artista._id.toString(),
    });
  }

  /**
   * Login unificado: busca em Usuario (única fonte de identidade).
   * Se a conta estiver desativada, lança 409 com `contaDesativada: true` — frontend
   * captura e pergunta se quer reativar (via POST /autenticacao/reativar).
   */
  async login(email: string, senha: string) {
    const usuario = await this.validarCredenciais(email, senha);

    if (usuario.desativadaEm) {
      throw new ConflictException({
        contaDesativada: true,
        message: 'Conta desativada. Confirme a reativação pra continuar.',
      });
    }

    return this.tokenParaUsuario(usuario);
  }

  /**
   * Reativa conta desativada e retorna token. Espera as MESMAS credenciais do login —
   * é só o passo seguinte ao 409 do login, com confirmação explícita do usuário.
   */
  async reativarConta(email: string, senha: string) {
    const usuario = await this.validarCredenciais(email, senha);

    if (usuario.desativadaEm) {
      await this.usuarioModel.updateOne(
        { _id: usuario._id },
        { $unset: { desativadaEm: '' } },
      );
      await this.artistaModel.updateMany(
        { usuarioId: usuario._id },
        { ativo: true, $unset: { desativadoEm: '' } },
      );
    }

    return this.tokenParaUsuario(usuario);
  }

  private async validarCredenciais(email: string, senha: string) {
    const usuario = await this.usuarioModel.findOne({ email: email.toLowerCase() });
    if (!usuario) throw new UnauthorizedException('Credenciais inválidas');
    const ok = await bcrypt.compare(senha, usuario.senhaHash);
    if (!ok) throw new UnauthorizedException('Credenciais inválidas');
    return usuario;
  }

  private async tokenParaUsuario(usuario: UsuarioDocument) {
    const artista = await this.artistaModel
      .findOne({ usuarioId: usuario._id })
      .select('_id')
      .lean();

    return this.assinarToken({
      sub: usuario._id.toString(),
      papel: (usuario.papel === 'admin' ? 'admin' : 'cliente') as 'cliente' | 'admin',
      email: usuario.email,
      temPerfilArtista: !!artista,
      artistaId: artista ? artista._id.toString() : undefined,
    });
  }

  /**
   * Re-emite um JWT pra um usuário já autenticado, refletindo o estado atual
   * (papel, perfil de artista, artistaId). Usado quando o usuário muda de
   * estado durante a sessão — ex: virou artista e precisa do JWT atualizado
   * sem ter que deslogar/relogar.
   */
  async reemitirTokenParaUsuario(usuarioId: string) {
    const usuario = await this.usuarioModel.findById(usuarioId).lean();
    if (!usuario) throw new UnauthorizedException('Usuário não encontrado');
    const artista = await this.artistaModel
      .findOne({ usuarioId: new Types.ObjectId(usuarioId) })
      .lean();
    return this.assinarToken({
      sub: usuarioId,
      papel: (usuario.papel === 'admin' ? 'admin' : 'cliente') as
        | 'cliente'
        | 'admin',
      email: usuario.email,
      temPerfilArtista: !!artista,
      artistaId: artista ? artista._id.toString() : undefined,
    });
  }

  private async assinarToken(payload: {
    sub: string;
    papel: 'cliente' | 'admin';
    email: string;
    temPerfilArtista: boolean;
    artistaId?: string;
  }) {
    return { access_token: await this.jwt.signAsync(payload) };
  }
}
