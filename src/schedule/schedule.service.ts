import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { ScheduleEntry, ScheduleDocument } from './schemas/schedule.schema';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import type { ScheduleStatus } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

interface ArtistScheduleFilter {
  artistId: string;
  from?: string;
  to?: string;
  status?: ScheduleStatus;
  limit?: number;
}

@Injectable()
export class ScheduleService {
  constructor(
    @InjectModel(ScheduleEntry.name) private model: Model<ScheduleDocument>,
  ) {}

  async create(dto: CreateScheduleDto) {
    const artistId = this.ensureObjectId(dto.artistId, 'artistId');
    const date = this.ensureDateOnly(dto.date, 'date');

    this.validateTimeRange(dto.startTime, dto.endTime);
    this.validateNotRetroactive(date, dto.startTime);
    await this.ensureNoOverlap(artistId, date, dto.startTime, dto.endTime);

    const created = await this.model.create({
      artistId,
      date,
      startTime: dto.startTime,
      endTime: dto.endTime,
      status: dto.status ?? 'available',
      notes: dto.notes,
      serviceId: dto.serviceId
        ? this.ensureObjectId(dto.serviceId, 'serviceId')
        : undefined,
      clientId: dto.clientId
        ? this.ensureObjectId(dto.clientId, 'clientId')
        : undefined,
    });

    return created.toObject();
  }

  async createMany(schedules: CreateScheduleDto[]) {
    // 1. Valida cada item isoladamente (formato HH:mm, start<end, não retroativo)
    for (const dto of schedules) {
      this.validateTimeRange(dto.startTime, dto.endTime);
      this.validateNotRetroactive(
        this.ensureDateOnly(dto.date, 'date'),
        dto.startTime,
      );
    }

    // 2. Valida overlap intra-batch (slots novos entre si)
    for (let i = 0; i < schedules.length; i++) {
      for (let j = i + 1; j < schedules.length; j++) {
        const a = schedules[i];
        const b = schedules[j];
        if (
          a.artistId === b.artistId &&
          a.date === b.date &&
          a.startTime < b.endTime &&
          a.endTime > b.startTime
        ) {
          throw new ConflictException(
            `Os horários ${a.startTime}–${a.endTime} e ${b.startTime}–${b.endTime} do lote se sobrepõem`,
          );
        }
      }
    }

    // 3. Valida overlap com slots já existentes no banco
    for (const dto of schedules) {
      const artistId = this.ensureObjectId(dto.artistId, 'artistId');
      const date = this.ensureDateOnly(dto.date, 'date');
      await this.ensureNoOverlap(artistId, date, dto.startTime, dto.endTime);
    }

    // 4. Todas as validações passaram — agora cria todos
    const created: ScheduleEntry[] = [];
    for (const dto of schedules) {
      created.push(await this.create(dto));
    }
    return created;
  }

  async findById(id: string) {
    const objectId = this.ensureObjectId(id, 'id');
    const entry = await this.model.findById(objectId).lean();
    if (!entry) {
      throw new NotFoundException('Agenda não encontrada');
    }
    return entry;
  }

  async listByArtist(filter: ArtistScheduleFilter) {
    const artistId = this.ensureObjectId(filter.artistId, 'artistId');
    const query: FilterQuery<ScheduleDocument> = { artistId };

    if (filter.from || filter.to) {
      query.date = {} as FilterQuery<ScheduleDocument>['date'];
      if (filter.from) {
        (query.date as any).$gte = this.ensureDateOnly(filter.from, 'from');
      }
      if (filter.to) {
        (query.date as any).$lte = this.ensureDateOnly(filter.to, 'to');
      }
    }

    if (filter.status) {
      // Cliente pediu um status específico — respeita
      query.status = filter.status;
    } else {
      // Default: esconde cancelled E completed (histórico fica nas Requests)
      query.status = { $nin: ['cancelled', 'completed'] };
    }

    const limit = Math.max(1, Math.min(filter.limit ?? 200, 500));

    return this.model
      .find(query)
      .sort({ date: 1, startTime: 1 })
      .limit(limit)
      .lean();
  }

  async update(id: string, dto: UpdateScheduleDto) {
    const objectId = this.ensureObjectId(id, 'id');
    const entry = await this.model.findById(objectId);
    if (!entry) {
      throw new NotFoundException('Agenda não encontrada');
    }

    const nextArtistId = dto.artistId
      ? this.ensureObjectId(dto.artistId, 'artistId')
      : entry.artistId;
    const nextDate = dto.date
      ? this.ensureDateOnly(dto.date, 'date')
      : entry.date;
    const nextStartTime = dto.startTime ?? entry.startTime;
    const nextEndTime = dto.endTime ?? entry.endTime;
    const nextStatus = dto.status ?? entry.status;

    if (entry.status === 'booked' && nextStatus === 'available') {
      throw new BadRequestException(
        'Não é possível reabrir uma data já reservada',
      );
    }

    this.validateTimeRange(nextStartTime, nextEndTime);

    const timeChanged =
      dto.date ||
      dto.startTime ||
      dto.endTime ||
      (dto.artistId && !entry.artistId.equals(nextArtistId));

    if (timeChanged) {
      await this.ensureNoOverlap(
        nextArtistId,
        nextDate,
        nextStartTime,
        nextEndTime,
        objectId,
      );
    }

    entry.artistId = nextArtistId;
    entry.date = nextDate;
    entry.startTime = nextStartTime;
    entry.endTime = nextEndTime;
    entry.status = nextStatus;
    if (dto.notes !== undefined) entry.notes = dto.notes;
    if (dto.serviceId !== undefined) {
      entry.serviceId = this.ensureObjectId(dto.serviceId, 'serviceId');
    }

    await entry.save();
    return entry.toObject();
  }

  async remove(id: string, requesterArtistId: string) {
    const objectId = this.ensureObjectId(id, 'id');
    const entry = await this.model.findById(objectId);
    if (!entry) {
      throw new NotFoundException('Agenda não encontrada');
    }
    if (!entry.artistId.equals(requesterArtistId)) {
      throw new ForbiddenException(
        'Você só pode deletar horários da sua própria agenda',
      );
    }
    if (entry.status === 'booked') {
      throw new BadRequestException(
        'Não é possível deletar um horário reservado. Cancele primeiro.',
      );
    }
    if (entry.status === 'completed') {
      throw new BadRequestException(
        'Não é possível deletar um horário concluído (histórico)',
      );
    }
    await entry.deleteOne();
    return { deleted: true } as const;
  }

  async book(
    id: string,
    clientId: string,
    options?: { notes?: string; serviceId?: string },
  ) {
    const objectId = this.ensureObjectId(id, 'id');
    const entry = await this.model.findById(objectId);
    if (!entry) {
      throw new NotFoundException('Agenda não encontrada');
    }
    if (entry.status !== 'available') {
      throw new ConflictException('Este horário não está disponível');
    }

    entry.status = 'booked';
    entry.clientId = this.ensureObjectId(clientId, 'clientId');
    if (options?.notes) entry.notes = options.notes;
    if (options?.serviceId) {
      entry.serviceId = this.ensureObjectId(options.serviceId, 'serviceId');
    }

    await entry.save();
    return entry.toObject();
  }

  async cancel(id: string, requesterId: string) {
    const objectId = this.ensureObjectId(id, 'id');
    const entry = await this.model.findById(objectId);
    if (!entry) {
      throw new NotFoundException('Agenda não encontrada');
    }

    const isArtistOwner = entry.artistId.equals(requesterId);
    const isClientOwner =
      entry.clientId && entry.clientId.equals(requesterId);

    if (!isArtistOwner && !isClientOwner) {
      throw new ForbiddenException(
        'Você só pode cancelar reservas suas ou da sua agenda',
      );
    }

    if (entry.status === 'cancelled') {
      throw new BadRequestException('Este horário já está cancelado');
    }
    if (entry.status === 'completed') {
      throw new BadRequestException(
        'Não é possível cancelar um horário já concluído',
      );
    }

    entry.status = 'cancelled';
    await entry.save();
    return entry.toObject();
  }

  async listFuture(artistId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.listByArtist({
      artistId,
      from: today.toISOString(),
    });
  }

  async listMyBookings(clientId: string) {
    const objectId = this.ensureObjectId(clientId, 'clientId');
    return this.model
      .find({ clientId: objectId, status: 'booked' })
      .sort({ date: 1, startTime: 1 })
      .lean();
  }

  private ensureObjectId(value: string, field: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(`Campo ${field} inválido`);
    }
    return new Types.ObjectId(value);
  }

  private ensureDateOnly(value: string | Date, field: string): Date {
    const raw = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(raw.getTime())) {
      throw new BadRequestException(`Campo ${field} deve ser uma data válida`);
    }
    // Normaliza pra UTC 00:00 — o "dia" é o que importa, hora vai em startTime/endTime
    return new Date(
      Date.UTC(raw.getUTCFullYear(), raw.getUTCMonth(), raw.getUTCDate()),
    );
  }

  private validateTimeRange(startTime: string, endTime: string) {
    if (this.timeToMinutes(startTime) >= this.timeToMinutes(endTime)) {
      throw new BadRequestException(
        'startTime deve ser anterior a endTime',
      );
    }
  }

  /** Rejeita slot/agendamento com data+hora no passado. */
  private validateNotRetroactive(date: Date, startTime: string) {
    // Data armazenada como UTC midnight, hora local é HH:mm.
    // Compõe ISO local-like: "YYYY-MM-DDTHH:mm" e compara com agora.
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    const slotInstant = new Date(`${y}-${m}-${d}T${startTime}:00`);
    if (slotInstant.getTime() < Date.now()) {
      throw new BadRequestException(
        'Não é possível criar horário ou solicitação em data/hora passada',
      );
    }
  }

  private timeToMinutes(hhmm: string): number {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  }

  private async ensureNoOverlap(
    artistId: Types.ObjectId,
    date: Date,
    startTime: string,
    endTime: string,
    ignoreId?: Types.ObjectId,
  ) {
    const query: FilterQuery<ScheduleDocument> = {
      artistId,
      date,
      status: { $ne: 'cancelled' },
      // overlap: existing.startTime < new.endTime AND existing.endTime > new.startTime
      startTime: { $lt: endTime },
      endTime: { $gt: startTime },
    };

    if (ignoreId) {
      query._id = { $ne: ignoreId } as any;
    }

    const conflict = await this.model.findOne(query).lean();
    if (conflict) {
      throw new ConflictException(
        `Conflito de horário: já existe ${conflict.startTime}–${conflict.endTime} nesta data`,
      );
    }
  }
}
