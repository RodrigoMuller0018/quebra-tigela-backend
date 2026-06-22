import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { ItemAgenda, ItemAgendaDocument } from './schemas/schedule.schema';
import { CriarItemAgendaDto } from './dto/create-schedule.dto';
import type { StatusAgenda } from './dto/create-schedule.dto';
import { AtualizarItemAgendaDto } from './dto/update-schedule.dto';

interface FiltroAgendaArtista {
  artistaId: string;
  de?: string;
  ate?: string;
  status?: StatusAgenda;
  limite?: number;
}

@Injectable()
export class ScheduleService {
  constructor(
    @InjectModel(ItemAgenda.name) private model: Model<ItemAgendaDocument>,
  ) {}

  async criar(dto: CriarItemAgendaDto) {
    const artistaId = this.garantirObjectId(dto.artistaId, 'artistaId');
    const { inicio, fim } = this.parseEValidarInstantes(dto.inicio, dto.fim);
    this.validarNaoRetroativo(inicio);
    await this.garantirSemSobreposicao(artistaId, inicio, fim);

    const criado = await this.model.create({
      artistaId,
      inicio,
      fim,
      status: dto.status ?? 'disponivel',
      observacoes: dto.observacoes,
      servicoId: dto.servicoId
        ? this.garantirObjectId(dto.servicoId, 'servicoId')
        : undefined,
      clienteId: dto.clienteId
        ? this.garantirObjectId(dto.clienteId, 'clienteId')
        : undefined,
    });

    return criado.toObject();
  }

  async criarEmLote(itens: CriarItemAgendaDto[]) {
    const normalizados = itens.map((dto) => {
      const { inicio, fim } = this.parseEValidarInstantes(dto.inicio, dto.fim);
      this.validarNaoRetroativo(inicio);
      return { dto, inicio, fim };
    });

    for (let i = 0; i < normalizados.length; i++) {
      for (let j = i + 1; j < normalizados.length; j++) {
        const a = normalizados[i];
        const b = normalizados[j];
        if (
          a.dto.artistaId === b.dto.artistaId &&
          a.inicio < b.fim &&
          a.fim > b.inicio
        ) {
          throw new ConflictException(
            `Os horários do lote se sobrepõem: ${a.inicio.toISOString()}→${a.fim.toISOString()} e ${b.inicio.toISOString()}→${b.fim.toISOString()}`,
          );
        }
      }
    }

    for (const { dto, inicio, fim } of normalizados) {
      const artistaId = this.garantirObjectId(dto.artistaId, 'artistaId');
      await this.garantirSemSobreposicao(artistaId, inicio, fim);
    }

    const criados: ItemAgenda[] = [];
    for (const dto of itens) {
      criados.push(await this.criar(dto));
    }
    return criados;
  }

  async buscarPorId(id: string) {
    const objectId = this.garantirObjectId(id, 'id');
    const item = await this.model.findById(objectId).lean();
    if (!item) {
      throw new NotFoundException('Agenda não encontrada');
    }
    return item;
  }

  async listarPorArtista(filtro: FiltroAgendaArtista) {
    const artistaId = this.garantirObjectId(filtro.artistaId, 'artistaId');
    const query: FilterQuery<ItemAgendaDocument> = { artistaId };

    if (filtro.de || filtro.ate) {
      query.inicio = {} as FilterQuery<ItemAgendaDocument>['inicio'];
      if (filtro.de) {
        const de = new Date(filtro.de);
        if (Number.isNaN(de.getTime())) {
          throw new BadRequestException('Campo de inválido');
        }
        (query.inicio as any).$gte = de;
      }
      if (filtro.ate) {
        const ate = new Date(filtro.ate);
        if (Number.isNaN(ate.getTime())) {
          throw new BadRequestException('Campo ate inválido');
        }
        (query.inicio as any).$lte = ate;
      }
    }

    if (filtro.status) {
      query.status = filtro.status;
    } else {
      query.status = { $nin: ['cancelada', 'concluida'] };
    }

    const limite = Math.max(1, Math.min(filtro.limite ?? 200, 500));

    return this.model
      .find(query)
      .sort({ inicio: 1 })
      .limit(limite)
      .lean();
  }

  async atualizar(id: string, dto: AtualizarItemAgendaDto) {
    const objectId = this.garantirObjectId(id, 'id');
    const item = await this.model.findById(objectId);
    if (!item) {
      throw new NotFoundException('Agenda não encontrada');
    }

    const proximoArtistaId = dto.artistaId
      ? this.garantirObjectId(dto.artistaId, 'artistaId')
      : item.artistaId;
    const proximoInicio = dto.inicio ? new Date(dto.inicio) : item.inicio;
    const proximoFim = dto.fim ? new Date(dto.fim) : item.fim;
    const proximoStatus = dto.status ?? item.status;

    if (item.status === 'reservada' && proximoStatus === 'disponivel') {
      throw new BadRequestException(
        'Não é possível reabrir uma data já reservada',
      );
    }

    if (proximoInicio >= proximoFim) {
      throw new BadRequestException('inicio deve ser anterior a fim');
    }

    const horarioMudou =
      dto.inicio ||
      dto.fim ||
      (dto.artistaId && !item.artistaId.equals(proximoArtistaId));

    if (horarioMudou) {
      await this.garantirSemSobreposicao(
        proximoArtistaId,
        proximoInicio,
        proximoFim,
        objectId,
      );
    }

    item.artistaId = proximoArtistaId;
    item.inicio = proximoInicio;
    item.fim = proximoFim;
    item.status = proximoStatus;
    if (dto.observacoes !== undefined) item.observacoes = dto.observacoes;
    if (dto.servicoId !== undefined) {
      item.servicoId = this.garantirObjectId(dto.servicoId, 'servicoId');
    }

    await item.save();
    return item.toObject();
  }

  async remover(id: string, artistaIdSolicitante: string) {
    const objectId = this.garantirObjectId(id, 'id');
    const item = await this.model.findById(objectId);
    if (!item) {
      throw new NotFoundException('Agenda não encontrada');
    }
    if (!item.artistaId.equals(artistaIdSolicitante)) {
      throw new ForbiddenException(
        'Você só pode deletar horários da sua própria agenda',
      );
    }
    if (item.status === 'reservada') {
      throw new BadRequestException(
        'Não é possível deletar um horário reservado. Cancele primeiro.',
      );
    }
    if (item.status === 'concluida') {
      throw new BadRequestException(
        'Não é possível deletar um horário concluído (histórico)',
      );
    }
    await item.deleteOne();
    return { removido: true } as const;
  }

  async reservar(
    id: string,
    clienteId: string,
    opcoes?: { observacoes?: string; servicoId?: string },
  ) {
    const objectId = this.garantirObjectId(id, 'id');
    const item = await this.model.findById(objectId);
    if (!item) {
      throw new NotFoundException('Agenda não encontrada');
    }
    if (item.status !== 'disponivel') {
      throw new ConflictException('Este horário não está disponível');
    }

    item.status = 'reservada';
    item.clienteId = this.garantirObjectId(clienteId, 'clienteId');
    if (opcoes?.observacoes) item.observacoes = opcoes.observacoes;
    if (opcoes?.servicoId) {
      item.servicoId = this.garantirObjectId(opcoes.servicoId, 'servicoId');
    }

    await item.save();
    return item.toObject();
  }

  async cancelar(id: string, idSolicitante: string) {
    const objectId = this.garantirObjectId(id, 'id');
    const item = await this.model.findById(objectId);
    if (!item) {
      throw new NotFoundException('Agenda não encontrada');
    }

    const ehDonoArtista = item.artistaId.equals(idSolicitante);
    const ehDonoCliente = item.clienteId && item.clienteId.equals(idSolicitante);

    if (!ehDonoArtista && !ehDonoCliente) {
      throw new ForbiddenException(
        'Você só pode cancelar reservas suas ou da sua agenda',
      );
    }

    if (item.status === 'cancelada') {
      throw new BadRequestException('Este horário já está cancelado');
    }
    if (item.status === 'concluida') {
      throw new BadRequestException(
        'Não é possível cancelar um horário já concluído',
      );
    }

    item.status = 'cancelada';
    await item.save();
    return item.toObject();
  }

  async listarFuturos(artistaId: string) {
    return this.listarPorArtista({
      artistaId,
      de: new Date().toISOString(),
    });
  }

  async listarMinhasReservas(clienteId: string) {
    const objectId = this.garantirObjectId(clienteId, 'clienteId');
    return this.model
      .find({ clienteId: objectId, status: 'reservada' })
      .sort({ inicio: 1 })
      .lean();
  }

  // ---------- helpers ----------

  private garantirObjectId(valor: string, campo: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(valor)) {
      throw new BadRequestException(`Campo ${campo} inválido`);
    }
    return new Types.ObjectId(valor);
  }

  private parseEValidarInstantes(
    inicioIso: string,
    fimIso: string,
  ): { inicio: Date; fim: Date } {
    const inicio = new Date(inicioIso);
    const fim = new Date(fimIso);
    if (Number.isNaN(inicio.getTime())) {
      throw new BadRequestException('inicio inválido');
    }
    if (Number.isNaN(fim.getTime())) {
      throw new BadRequestException('fim inválido');
    }
    if (inicio >= fim) {
      throw new BadRequestException('inicio deve ser anterior a fim');
    }
    return { inicio, fim };
  }

  private validarNaoRetroativo(inicio: Date) {
    if (inicio.getTime() < Date.now()) {
      throw new BadRequestException(
        'Não é possível criar horário com início no passado',
      );
    }
  }

  private async garantirSemSobreposicao(
    artistaId: Types.ObjectId,
    inicio: Date,
    fim: Date,
    ignorarId?: Types.ObjectId,
  ) {
    const query: FilterQuery<ItemAgendaDocument> = {
      artistaId,
      status: { $nin: ['cancelada', 'concluida'] },
      inicio: { $lt: fim },
      fim: { $gt: inicio },
    };

    if (ignorarId) {
      query._id = { $ne: ignorarId } as any;
    }

    const conflito = await this.model.findOne(query).lean();
    if (conflito) {
      throw new ConflictException(
        `Conflito de horário: já existe ${conflito.inicio.toISOString()} → ${conflito.fim.toISOString()}`,
      );
    }
  }
}
