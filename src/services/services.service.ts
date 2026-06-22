import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Servico, ServicoDocument } from './schemas/service.schema';
import { CriarServicoDto } from './dto/create-service.dto';
import { AtualizarServicoDto } from './dto/update-service.dto';

@Injectable()
export class ServicesService {
  constructor(
    @InjectModel(Servico.name)
    private model: Model<ServicoDocument>,
  ) {}

  criar(dto: CriarServicoDto, artistaAtualId: string) {
    return this.model.create({
      ...dto,
      artistaId: new Types.ObjectId(artistaAtualId),
    });
  }

  porArtista(artistaId: string, incluirInativos = false) {
    const query: { artistaId: Types.ObjectId; ativo?: boolean } = {
      artistaId: new Types.ObjectId(artistaId),
    };
    if (!incluirInativos) query.ativo = true;
    return this.model.find(query);
  }

  async buscarPorId(id: string) {
    const encontrado = await this.model.findById(id);
    if (!encontrado) throw new NotFoundException('Serviço não encontrado');
    return encontrado;
  }

  async atualizar(
    id: string,
    dto: AtualizarServicoDto,
    artistaAtualId: string,
  ) {
    const item = await this.model.findById(id);
    if (!item) throw new NotFoundException('Serviço não encontrado');
    if (!item.artistaId.equals(artistaAtualId)) {
      throw new ForbiddenException(
        'Você só pode editar seus próprios serviços',
      );
    }

    if (dto.titulo !== undefined) item.titulo = dto.titulo;
    if (dto.descricao !== undefined) item.descricao = dto.descricao;
    if (dto.midia !== undefined) item.midia = dto.midia;
    if (dto.ativo !== undefined) item.ativo = dto.ativo;

    await item.save();
    return item;
  }

  async remover(id: string, artistaAtualId: string) {
    const item = await this.model.findById(id);
    if (!item) throw new NotFoundException('Serviço não encontrado');
    if (!item.artistaId.equals(artistaAtualId)) {
      throw new ForbiddenException(
        'Você só pode excluir seus próprios serviços',
      );
    }
    await item.deleteOne();
    return { removido: true } as const;
  }
}
