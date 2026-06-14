import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({
  collection: 'requests',
  timestamps: { createdAt: 'requestedAt', updatedAt: 'updatedAt' },
})
export class Request {
  _id!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Artist', required: true, index: true })
  artistId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'ServiceOffering',
    required: true,
    index: true,
  })
  serviceId!: Types.ObjectId;

  // Slot ancorado (Caminho A: reserva direta). Null para solicitação livre (Caminho B).
  @Prop({ type: Types.ObjectId, ref: 'ScheduleEntry', index: true })
  scheduleId?: Types.ObjectId;

  @Prop({ type: Date, required: true, index: true })
  eventDate!: Date;

  @Prop({ required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ })
  startTime!: string;

  @Prop({ required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ })
  endTime!: string;

  @Prop()
  location!: string;

  @Prop({
    enum: [
      'pending',
      'accepted',
      'awaiting_confirmation',
      'completed',
      'rejected',
      'cancelled',
    ],
    default: 'pending',
    index: true,
  })
  status!:
    | 'pending'
    | 'accepted'
    | 'awaiting_confirmation'
    | 'completed'
    | 'rejected'
    | 'cancelled';

  /** Quando artista marcou como "realizado". Usado pra auto-confirmar após 7 dias. */
  @Prop({ type: Date })
  markedDoneAt?: Date;

  @Prop()
  details?: string;
}

export type RequestDocument = HydratedDocument<Request>;
export const RequestSchema = SchemaFactory.createForClass(Request);
// Índice composto pra queries por (artista, data) — não-unique porque múltiplas solicitações por dia OK
RequestSchema.index({ artistId: 1, eventDate: 1, startTime: 1 });
