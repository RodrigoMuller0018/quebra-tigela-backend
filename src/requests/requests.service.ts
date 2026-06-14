import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Request, RequestDocument } from './schemas/request.schema';
import { CreateRequestDto } from './dto/create-request.dto';
import {
  ScheduleEntry,
  ScheduleDocument,
} from '../schedule/schemas/schedule.schema';

type RequestStatus =
  | 'accepted'
  | 'awaiting_confirmation'
  | 'completed'
  | 'rejected'
  | 'cancelled';

/** Após X dias em awaiting_confirmation, sistema considera concluído. */
const AUTO_CONFIRM_DAYS = 7;

@Injectable()
export class RequestsService {
  constructor(
    @InjectModel(Request.name) private reqModel: Model<RequestDocument>,
    @InjectModel(ScheduleEntry.name)
    private scheduleModel: Model<ScheduleDocument>,
  ) {}

  async create(dto: CreateRequestDto, currentUserId: string) {
    this.validateTimeRange(dto.startTime, dto.endTime);

    const userId = new Types.ObjectId(currentUserId);
    const artistId = new Types.ObjectId(dto.artistId);
    const serviceId = new Types.ObjectId(dto.serviceId);
    const eventDate = this.normalizeDate(new Date(dto.eventDate));

    // Não permite solicitação retroativa
    this.validateNotRetroactive(eventDate, dto.startTime);

    let scheduleObjectId: Types.ObjectId | undefined;

    if (dto.scheduleId) {
      // Caminho A: reserva ancorada num slot
      scheduleObjectId = new Types.ObjectId(dto.scheduleId);
      const slot = await this.scheduleModel.findById(scheduleObjectId);
      if (!slot) {
        throw new NotFoundException('Slot da agenda não encontrado');
      }
      if (!slot.artistId.equals(artistId)) {
        throw new BadRequestException(
          'O slot informado não pertence a este artista',
        );
      }
      if (slot.status !== 'available') {
        throw new ConflictException('Este horário não está disponível');
      }
      // Marca como pending até artista aceitar
      slot.status = 'pending';
      slot.clientId = userId;
      await slot.save();
    } else {
      // Caminho B: solicitação livre — verifica colisão com slots booked/pending na mesma faixa
      const conflict = await this.scheduleModel.findOne({
        artistId,
        date: eventDate,
        status: { $in: ['booked', 'pending'] },
        startTime: { $lt: dto.endTime },
        endTime: { $gt: dto.startTime },
      });
      if (conflict) {
        throw new ConflictException(
          `Este horário choca com um agendamento existente (${conflict.startTime}–${conflict.endTime}). Escolha outro horário.`,
        );
      }
    }

    try {
      const created = await this.reqModel.create({
        userId,
        artistId,
        serviceId,
        scheduleId: scheduleObjectId,
        eventDate,
        startTime: dto.startTime,
        endTime: dto.endTime,
        location: dto.location,
        details: dto.details,
      });
      return created.toObject();
    } catch (e) {
      // Rollback: se a request falhou e marcamos slot como pending, reverte
      if (scheduleObjectId) {
        await this.scheduleModel.updateOne(
          { _id: scheduleObjectId, status: 'pending' },
          { $set: { status: 'available' }, $unset: { clientId: '' } },
        );
      }
      throw e;
    }
  }

  async changeStatus(
    id: string,
    status: RequestStatus,
    currentUser: { sub: string; role: string },
  ) {
    const req = await this.reqModel.findById(id);
    if (!req) throw new NotFoundException('Solicitação não encontrada');

    this.validateStatusTransition(req.status, status, req, currentUser);

    req.status = status;
    if (status === 'awaiting_confirmation') {
      req.markedDoneAt = new Date();
    }
    await req.save();

    await this.syncScheduleWithRequest(req, status);

    return req;
  }

  async byUser(userId: string) {
    await this.autoConfirmExpired(userId, 'user');
    return this.reqModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ requestedAt: -1 });
  }

  async byArtist(artistId: string) {
    await this.autoConfirmExpired(artistId, 'artist');
    return this.reqModel
      .find({ artistId: new Types.ObjectId(artistId) })
      .sort({ requestedAt: -1 });
  }

  // ---------- helpers privados ----------

  private validateTimeRange(startTime: string, endTime: string) {
    if (this.timeToMinutes(startTime) >= this.timeToMinutes(endTime)) {
      throw new BadRequestException('startTime deve ser anterior a endTime');
    }
  }

  private timeToMinutes(hhmm: string): number {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  }

  private normalizeDate(d: Date): Date {
    return new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
    );
  }

  private validateNotRetroactive(date: Date, startTime: string) {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    const instant = new Date(`${y}-${m}-${d}T${startTime}:00`);
    if (instant.getTime() < Date.now()) {
      throw new BadRequestException(
        'Não é possível criar solicitação para data/hora passada',
      );
    }
  }

  /**
   * Máquina de estados:
   *   pending → accepted | rejected   (artista) | cancelled (cliente ou artista)
   *   accepted → awaiting_confirmation (artista) | cancelled (cliente ou artista)
   *   awaiting_confirmation → completed (cliente OU auto-confirm) | accepted (cliente "não realizei")
   *   completed → FIM (sem mais transições)
   *   rejected/cancelled → FIM
   */
  private validateStatusTransition(
    currentStatus: string,
    nextStatus: RequestStatus,
    req: RequestDocument,
    currentUser: { sub: string; role: string },
  ) {
    const isArtist = req.artistId.equals(currentUser.sub);
    const isClient = req.userId.equals(currentUser.sub);

    if (!isArtist && !isClient) {
      throw new ForbiddenException(
        'Você não tem permissão sobre esta solicitação',
      );
    }

    // Transições terminais — não permite alterar
    if (
      currentStatus === 'completed' ||
      currentStatus === 'cancelled' ||
      currentStatus === 'rejected'
    ) {
      throw new BadRequestException(
        `Solicitação ${currentStatus} é final e não pode ser alterada`,
      );
    }

    // Regras por role
    if (isClient && !isArtist) {
      // Cliente pode: cancelar (até accepted); confirmar recebimento ou rejeitar "não realizei" em awaiting
      const permitido =
        (nextStatus === 'cancelled' &&
          (currentStatus === 'pending' || currentStatus === 'accepted')) ||
        (nextStatus === 'completed' && currentStatus === 'awaiting_confirmation') ||
        (nextStatus === 'accepted' && currentStatus === 'awaiting_confirmation');
      if (!permitido) {
        throw new ForbiddenException(
          'Cliente não pode fazer essa transição de status',
        );
      }
    } else if (isArtist) {
      // Artista pode: aceitar (pending); recusar (pending); marcar realizado (accepted); cancelar (pending/accepted)
      const permitido =
        (nextStatus === 'accepted' && currentStatus === 'pending') ||
        (nextStatus === 'rejected' && currentStatus === 'pending') ||
        (nextStatus === 'awaiting_confirmation' && currentStatus === 'accepted') ||
        (nextStatus === 'cancelled' &&
          (currentStatus === 'pending' || currentStatus === 'accepted'));
      if (!permitido) {
        throw new ForbiddenException(
          'Artista não pode fazer essa transição de status',
        );
      }
    }
  }

  private async syncScheduleWithRequest(
    req: RequestDocument,
    status: RequestStatus,
  ) {
    if (status === 'accepted') {
      let bookedSlotId: Types.ObjectId;

      if (req.scheduleId) {
        await this.scheduleModel.updateOne(
          { _id: req.scheduleId },
          { $set: { status: 'booked' } },
        );
        bookedSlotId = req.scheduleId;
      } else {
        const created = await this.scheduleModel.create({
          artistId: req.artistId,
          date: req.eventDate,
          startTime: req.startTime,
          endTime: req.endTime,
          status: 'booked',
          clientId: req.userId,
          serviceId: req.serviceId,
        });
        bookedSlotId = created._id;
      }

      // Engole slots available que sobreponham a faixa reservada
      await this.scheduleModel.deleteMany({
        _id: { $ne: bookedSlotId },
        artistId: req.artistId,
        date: req.eventDate,
        status: 'available',
        startTime: { $lt: req.endTime },
        endTime: { $gt: req.startTime },
      });
    }

    if (status === 'awaiting_confirmation') {
      // Slot continua booked, sem mudança visual na agenda do artista
    }

    if (status === 'completed') {
      // Slot some da agenda ativa: vira completed (filtrado por padrão no listByArtist)
      if (req.scheduleId) {
        await this.scheduleModel.updateOne(
          { _id: req.scheduleId },
          { $set: { status: 'completed' } },
        );
      } else {
        // Caminho B sem scheduleId — match por data+hora
        await this.scheduleModel.updateOne(
          {
            artistId: req.artistId,
            date: req.eventDate,
            startTime: req.startTime,
            endTime: req.endTime,
            status: 'booked',
          },
          { $set: { status: 'completed' } },
        );
      }
    }

    if (status === 'rejected' || status === 'cancelled') {
      // Libera o slot (volta available) — artista pode reusar
      if (req.scheduleId) {
        await this.scheduleModel.updateOne(
          { _id: req.scheduleId },
          {
            $set: { status: 'available' },
            $unset: { clientId: '' },
          },
        );
      }
    }
  }

  /**
   * Marca como completed qualquer awaiting_confirmation com markedDoneAt >
   * 7 dias atrás. Lazy — só roda quando alguém consulta as listas.
   */
  private async autoConfirmExpired(ownerId: string, ownerType: 'user' | 'artist') {
    const cutoff = new Date(Date.now() - AUTO_CONFIRM_DAYS * 24 * 3600 * 1000);
    const filter =
      ownerType === 'user'
        ? { userId: new Types.ObjectId(ownerId) }
        : { artistId: new Types.ObjectId(ownerId) };

    const expirados = await this.reqModel.find({
      ...filter,
      status: 'awaiting_confirmation',
      markedDoneAt: { $lte: cutoff },
    });

    for (const req of expirados) {
      req.status = 'completed';
      await req.save();
      await this.syncScheduleWithRequest(req, 'completed');
    }
  }
}
