import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Usuario, UsuarioDocument } from './schemas/user.schema';
import { Artista, ArtistaDocument } from '../artists/schemas/artist.schema';
import { CriarUsuarioDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(Usuario.name) private model: Model<UsuarioDocument>,
    @InjectModel(Artista.name) private artistaModel: Model<ArtistaDocument>,
  ) {}

  async criar(dto: CriarUsuarioDto) {
    try {
      const { senha, ...resto } = dto;
      const senhaHash = await bcrypt.hash(senha, 10);
      const usuario = new this.model({ ...resto, senhaHash, papel: 'cliente' });
      await usuario.save();
      const obj = usuario.toObject();
      delete (obj as { senhaHash?: string }).senhaHash;
      return obj;
    } catch (error: any) {
      if (error.code === 11000) {
        throw new ConflictException(
          `O campo '${Object.keys(error.keyPattern)[0]}' com valor '${Object.values(error.keyValue)[0]}' já está em uso.`,
        );
      }
      if (error.name === 'ValidationError') {
        throw new BadRequestException('Erro de validação: ' + error.message);
      }
      throw new InternalServerErrorException(
        'Erro ao criar usuário: ' + error.message,
      );
    }
  }

  /** Listagem só de contas ativas (sem desativadas). */
  async listar(): Promise<Usuario[]> {
    return this.model.find({ desativadaEm: { $exists: false } }).select('-senhaHash').lean();
  }

  async buscarPorId(id: string): Promise<Usuario | null> {
    const usuario = await this.model.findById(id).select('-senhaHash').lean();
    if (!usuario) throw new NotFoundException('Usuário não encontrado');
    return usuario;
  }

  async atualizar(id: string, dto: Partial<CriarUsuarioDto>): Promise<Usuario> {
    if (dto.senha) {
      const senhaHash = await bcrypt.hash(dto.senha, 10);
      const { senha, ...resto } = dto;
      Object.assign(resto, { senhaHash });
      dto = resto;
    }
    const atualizado = await this.model
      .findByIdAndUpdate(id, dto, { new: true })
      .select('-senhaHash')
      .lean();
    if (!atualizado) throw new NotFoundException('Usuário não encontrado');
    return atualizado as Usuario;
  }

  /**
   * Soft delete em cascata: marca o Usuario como desativado e propaga pro Artista
   * linkado (se houver). Dados de Servicos/Agenda/Solicitacoes/Avaliacoes ficam
   * intactos — mas como o Artista vira ativo=false e o Usuario tem desativadaEm,
   * eles somem das buscas públicas.
   *
   * Reversível por login bem-sucedido (ver AuthService.login).
   */
  async desativarConta(id: string): Promise<{ desativadaEm: Date }> {
    const objId = new Types.ObjectId(id);
    const agora = new Date();
    const atualizado = await this.model.findByIdAndUpdate(
      objId,
      { desativadaEm: agora },
      { new: true },
    );
    if (!atualizado) throw new NotFoundException('Usuário não encontrado');

    await this.artistaModel.updateMany(
      { usuarioId: objId },
      { ativo: false, desativadoEm: agora },
    );

    return { desativadaEm: agora };
  }

  /**
   * Reativa conta (e o Artista linkado, se houver).
   * Chamado pelo AuthService.login quando detecta conta desativada com login válido.
   */
  async reativarConta(id: string): Promise<void> {
    const objId = new Types.ObjectId(id);
    await this.model.updateOne({ _id: objId }, { $unset: { desativadaEm: '' } });
    await this.artistaModel.updateMany(
      { usuarioId: objId },
      { ativo: true, $unset: { desativadoEm: '' } },
    );
  }

  /** Hard delete real (admin/dev). Frontend não expõe — usa desativarConta. */
  async remover(id: string): Promise<{ removido: boolean }> {
    const resultado = await this.model.deleteOne({ _id: id });
    if (resultado.deletedCount === 0)
      throw new NotFoundException('Usuário não encontrado');
    return { removido: true };
  }
}
