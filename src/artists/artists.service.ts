import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Artista, ArtistaDocument } from './schemas/artist.schema';
import { Usuario, UsuarioDocument } from '../users/schemas/user.schema';
import { Servico, ServicoDocument } from '../services/schemas/service.schema';
import { ItemAgenda, ItemAgendaDocument } from '../schedule/schemas/schedule.schema';
import { Avaliacao, AvaliacaoDocument } from '../reviews/schemas/review.schema';
import { TornarSeArtistaDto } from './dto/become-artist.dto';
import { AtualizarArtistaDto } from './dto/update-artist.dto';
import {
  gerarHandleUnico,
  validarFormatoHandle,
} from '../common/handle';

/** Shape padrão devolvido pelas queries que combinam Usuario + Artista. */
export interface ArtistaComUsuario {
  _id: string;
  usuarioId: string;
  handle: string;
  nome: string;
  email: string;
  cidade?: string;
  estado?: string;
  fotoPerfil?: string;
  bio?: string;
  verificado: boolean;
  ativo: boolean;
  desativadoEm?: Date;
  tiposArte: string[];
  telefone: string;
  nomeArtistico?: string;
  dataNascimento?: string;
  portfolio?: string;
  redesSociais: string[];
  notaMedia?: number | null;
  totalAvaliacoes?: number;
  totalServicosAtivos?: number;
  visualizacoes?: number;
  criadoEm?: Date;
  atualizadoEm?: Date;
}

@Injectable()
export class ArtistsService {
  constructor(
    @InjectModel(Artista.name) private artistaModel: Model<ArtistaDocument>,
    @InjectModel(Usuario.name) private usuarioModel: Model<UsuarioDocument>,
    @InjectModel(Servico.name) private servicoModel: Model<ServicoDocument>,
    @InjectModel(ItemAgenda.name) private agendaModel: Model<ItemAgendaDocument>,
    @InjectModel(Avaliacao.name) private avaliacaoModel: Model<AvaliacaoDocument>,
  ) {}

  /**
   * Cria um Artista linkado a um Usuario existente. Usado por usuário que já tem conta
   * e quer virar artista.
   */
  async tornarSeArtista(usuarioId: string, dto: TornarSeArtistaDto): Promise<Artista> {
    const usuarioObjId = new Types.ObjectId(usuarioId);

    const usuario = await this.usuarioModel.findById(usuarioObjId).lean();
    if (!usuario) throw new NotFoundException('Usuário não encontrado');

    const existente = await this.artistaModel.findOne({ usuarioId: usuarioObjId }).lean();
    if (existente) {
      throw new ConflictException(
        'Você já tem um perfil de artista. Use /reativar se estiver pausado.',
      );
    }

    const handle = await this.resolverHandle(dto.handle, usuario.nome);

    try {
      const artista = new this.artistaModel({
        usuarioId: usuarioObjId,
        handle,
        bio: dto.bio,
        tiposArte: dto.tiposArte,
        telefone: dto.telefone,
        nomeArtistico: dto.nomeArtistico,
        dataNascimento: dto.dataNascimento,
        portfolio: dto.portfolio,
        redesSociais: dto.redesSociais ?? [],
        verificado: false,
        ativo: true,
      });
      await artista.save();
      return artista.toObject() as Artista;
    } catch (error: any) {
      if (error?.code === 11000 && error?.keyPattern?.handle) {
        throw new ConflictException('Esse handle já está em uso');
      }
      if (error?.name === 'ValidationError') {
        throw new BadRequestException('Erro de validação: ' + error.message);
      }
      throw new InternalServerErrorException(
        'Erro ao criar perfil de artista: ' + error.message,
      );
    }
  }

  /**
   * Resolve o handle de um Artista: valida formato, checa disponibilidade.
   * Se não vier do DTO, gera um único baseado no nome com sufixo numérico.
   */
  async resolverHandle(handleDesejado: string | undefined, nomeBase: string): Promise<string> {
    if (handleDesejado) {
      const handle = handleDesejado.toLowerCase();
      const validacao = validarFormatoHandle(handle);
      if (!validacao.valido) {
        throw new BadRequestException(validacao.motivo);
      }
      const conflito = await this.artistaModel.exists({ handle });
      if (conflito) {
        throw new ConflictException('Esse handle já está em uso');
      }
      return handle;
    }
    return gerarHandleUnico(nomeBase, this.artistaModel);
  }

  /**
   * Checa disponibilidade pública (pra UI mostrar verde/vermelho em tempo real).
   * Retorna { disponivel, motivo? } — não levanta exception, é só consulta.
   */
  async handleDisponivel(handle: string): Promise<{ disponivel: boolean; motivo?: string }> {
    const normalizado = handle?.toLowerCase();
    const validacao = validarFormatoHandle(normalizado);
    if (!validacao.valido) {
      return { disponivel: false, motivo: validacao.motivo };
    }
    const existe = await this.artistaModel.exists({ handle: normalizado });
    if (existe) return { disponivel: false, motivo: 'Esse handle já está em uso' };
    return { disponivel: true };
  }

  /** Mesmo shape do `perfil(id)`, mas localizado pelo handle. */
  async perfilPorHandle(handle: string) {
    const doc = await this.artistaModel
      .findOne({ handle: handle.toLowerCase() })
      .select('_id')
      .lean();
    if (!doc) throw new NotFoundException('Artista não encontrado');
    return this.perfil(doc._id.toString());
  }

  /** Busca pública. Filtra artistas ATIVOS e verificados. */
  async buscar({
    cidade,
    tipoArte,
    limite = 20,
    pagina = 1,
  }: {
    cidade?: string;
    tipoArte?: string;
    limite?: number;
    pagina?: number;
  }): Promise<ArtistaComUsuario[]> {
    const filtro: {
      verificado: boolean;
      ativo: boolean;
      tiposArte?: string;
    } = {
      verificado: true,
      ativo: true,
    };
    if (tipoArte) filtro.tiposArte = tipoArte;

    const artistas = await this.artistaModel.aggregate([
      { $match: filtro },
      {
        $lookup: {
          from: 'usuarios',
          localField: 'usuarioId',
          foreignField: '_id',
          as: 'usuario',
        },
      },
      { $unwind: '$usuario' },
      // Exclui artistas de contas desativadas (soft delete em cascata)
      { $match: { 'usuario.desativadaEm': { $exists: false } } },
      ...(cidade ? [{ $match: { 'usuario.cidade': cidade } }] : []),
      {
        $lookup: {
          from: 'servicos',
          localField: '_id',
          foreignField: 'artistaId',
          as: 'servicos',
          pipeline: [{ $match: { ativo: true } }],
        },
      },
      { $addFields: { totalServicosAtivos: { $size: '$servicos' } } },
      { $match: { totalServicosAtivos: { $gt: 0 } } },
      {
        $lookup: {
          from: 'avaliacoes',
          localField: '_id',
          foreignField: 'artistaId',
          as: 'avaliacoes',
        },
      },
      {
        $addFields: {
          notaMedia: {
            $cond: [
              { $gt: [{ $size: '$avaliacoes' }, 0] },
              { $avg: '$avaliacoes.nota' },
              null,
            ],
          },
          totalAvaliacoes: { $size: '$avaliacoes' },
          nome: '$usuario.nome',
          email: '$usuario.email',
          cidade: '$usuario.cidade',
          estado: '$usuario.estado',
          fotoPerfil: '$usuario.fotoPerfil',
        },
      },
      { $project: { usuario: 0, servicos: 0, avaliacoes: 0 } },
      { $sort: { notaMedia: -1, totalServicosAtivos: -1, nome: 1 } },
      { $skip: (pagina - 1) * limite },
      { $limit: limite },
    ]);
    return artistas as ArtistaComUsuario[];
  }

  /** Perfil completo: combina dados de Usuario + Artista + avaliações + agenda + serviços. */
  async perfil(artistaId: string): Promise<{
    artista: ArtistaComUsuario;
    servicos: Servico[];
    agenda: ItemAgenda[];
    avaliacao: { media: number | null; total: number };
  }> {
    const _id = new Types.ObjectId(artistaId);
    const artistaDoc = await this.artistaModel.findById(_id).lean();
    if (!artistaDoc) throw new NotFoundException('Artista não encontrado');
    if (!artistaDoc.ativo) {
      throw new NotFoundException('Este artista está com perfil pausado');
    }

    const usuario = await this.usuarioModel.findById(artistaDoc.usuarioId).lean();
    if (!usuario) throw new NotFoundException('Usuário base não encontrado');

    const [servicos, agenda, agg] = await Promise.all([
      this.servicoModel.find({ artistaId: _id, ativo: true }).lean(),
      this.agendaModel
        .find({
          artistaId: _id,
          inicio: { $gte: new Date() },
          status: { $in: ['disponivel', 'reservada'] },
        })
        .sort({ inicio: 1 })
        .limit(100)
        .lean(),
      this.avaliacaoModel.aggregate([
        { $match: { artistaId: _id } },
        {
          $group: {
            _id: '$artistaId',
            media: { $avg: '$nota' },
            total: { $sum: 1 },
          },
        },
      ]),
    ]);

    const ag = agg[0] ?? { media: null, total: 0 };
    const avaliacao = {
      media: ag.media != null ? Number(ag.media) : null,
      total: typeof ag.total === 'number' ? ag.total : Number(ag.total || 0),
    };

    const combinado: ArtistaComUsuario = this.combinar(artistaDoc, usuario);
    return { artista: combinado, servicos, agenda, avaliacao };
  }

  async listarTodos(): Promise<ArtistaComUsuario[]> {
    const docs = await this.artistaModel.find().lean();
    const usuariosIds = docs.map((d) => d.usuarioId);
    const usuarios = await this.usuarioModel.find({ _id: { $in: usuariosIds } }).lean();
    const mapa = new Map(usuarios.map((u) => [u._id.toString(), u]));

    return docs
      .map((d) => {
        const u = mapa.get(d.usuarioId.toString());
        return u ? this.combinar(d, u) : null;
      })
      .filter((x): x is ArtistaComUsuario => !!x);
  }

  async buscarPorId(id: string): Promise<ArtistaComUsuario> {
    const _id = new Types.ObjectId(id);
    const doc = await this.artistaModel.findById(_id).lean();
    if (!doc) throw new NotFoundException('Artista não encontrado');
    const usuario = await this.usuarioModel.findById(doc.usuarioId).lean();
    if (!usuario) throw new NotFoundException('Usuário base não encontrado');
    return this.combinar(doc, usuario);
  }

  async buscarPorUsuarioId(usuarioId: string): Promise<ArtistaComUsuario | null> {
    const doc = await this.artistaModel
      .findOne({ usuarioId: new Types.ObjectId(usuarioId) })
      .lean();
    if (!doc) return null;
    return this.buscarPorId(doc._id.toString());
  }

  async atualizar(id: string, dto: AtualizarArtistaDto): Promise<ArtistaComUsuario> {
    const atualizado = await this.artistaModel
      .findByIdAndUpdate(id, dto, { new: true })
      .lean();
    if (!atualizado) throw new NotFoundException('Artista não encontrado');
    return this.buscarPorId(atualizado._id.toString());
  }

  /** Soft delete: pausa o perfil sem apagar nada. */
  async desativar(id: string): Promise<{ ativo: boolean; desativadoEm: Date }> {
    const desativadoEm = new Date();
    const atualizado = await this.artistaModel
      .findByIdAndUpdate(id, { ativo: false, desativadoEm }, { new: true })
      .lean();
    if (!atualizado) throw new NotFoundException('Artista não encontrado');
    return { ativo: false, desativadoEm };
  }

  async reativar(id: string): Promise<{ ativo: boolean }> {
    const atualizado = await this.artistaModel
      .findByIdAndUpdate(
        id,
        { ativo: true, $unset: { desativadoEm: '' } },
        { new: true },
      )
      .lean();
    if (!atualizado) throw new NotFoundException('Artista não encontrado');
    return { ativo: true };
  }

  async remover(id: string): Promise<{ removido: boolean }> {
    const resultado = await this.artistaModel.deleteOne({ _id: id });
    if (resultado.deletedCount === 0)
      throw new NotFoundException('Artista não encontrado');
    return { removido: true };
  }

  async verificarIdentidade(
    artistaId: string,
    _fotoAtualBuffer: Buffer,
    _fotoDocumentoBuffer: Buffer,
  ): Promise<{
    verificado: boolean;
    similaridade: number;
    artistaAtualizado: boolean;
    detalhes: any;
  }> {
    const verificado = Math.random() > 0.5;

    if (verificado) {
      await this.artistaModel.findByIdAndUpdate(artistaId, { verificado: true });
    }

    return {
      verificado,
      similaridade: verificado ? 0.85 : 0.45,
      artistaAtualizado: verificado,
      detalhes: {
        metodoDeteccao: 'Mock verification (development mode)',
        limiar: 0.6,
        timestamp: new Date().toISOString(),
      },
    };
  }

  private combinar(
    artista: { _id: any; usuarioId: any } & Partial<Artista>,
    usuario: { nome: string; email: string; cidade?: string; estado?: string; fotoPerfil?: string },
  ): ArtistaComUsuario {
    return {
      _id: artista._id.toString(),
      usuarioId: artista.usuarioId.toString(),
      handle: artista.handle ?? '',
      nome: usuario.nome,
      email: usuario.email,
      cidade: usuario.cidade,
      estado: usuario.estado,
      fotoPerfil: usuario.fotoPerfil,
      bio: artista.bio,
      verificado: !!artista.verificado,
      ativo: artista.ativo !== false,
      desativadoEm: artista.desativadoEm,
      tiposArte: artista.tiposArte ?? [],
      telefone: artista.telefone ?? '',
      nomeArtistico: artista.nomeArtistico,
      dataNascimento: artista.dataNascimento,
      portfolio: artista.portfolio,
      redesSociais: artista.redesSociais ?? [],
      visualizacoes: artista.visualizacoes ?? 0,
    };
  }

  /**
   * Incrementa o contador de visualizações do perfil. Ignora self-views
   * (quando o usuário logado é o próprio dono do perfil).
   * Retorna o total atualizado pra UI poder refletir na hora se quiser.
   */
  async registrarVisualizacaoPorHandle(
    handle: string,
    usuarioAtualId?: string,
  ): Promise<{ visualizacoes: number; contou: boolean }> {
    const doc = await this.artistaModel
      .findOne({ handle: handle.toLowerCase() })
      .select('usuarioId visualizacoes')
      .lean();
    if (!doc) throw new NotFoundException('Artista não encontrado');

    const ehDono = !!usuarioAtualId && doc.usuarioId.toString() === usuarioAtualId;
    if (ehDono) {
      return { visualizacoes: doc.visualizacoes ?? 0, contou: false };
    }

    const atualizado = await this.artistaModel.findByIdAndUpdate(
      doc._id,
      { $inc: { visualizacoes: 1 } },
      { new: true, projection: 'visualizacoes' },
    );
    return {
      visualizacoes: atualizado?.visualizacoes ?? 0,
      contou: true,
    };
  }
}
