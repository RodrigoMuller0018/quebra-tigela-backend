import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export const STATUS_AGENDA = [
  'disponivel',
  'pendente',
  'reservada',
  'concluida',
  'cancelada',
] as const;
export type StatusAgenda = (typeof STATUS_AGENDA)[number];

@Schema({ collection: 'agenda', timestamps: true })
export class ItemAgenda {
  _id!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Artista', required: true, index: true })
  artistaId!: Types.ObjectId;

  /** Instante de início (UTC). Suporta eventos multi-dia. */
  @Prop({ type: Date, required: true, index: true })
  inicio!: Date;

  /** Instante de fim (UTC). Deve ser estritamente > inicio. */
  @Prop({ type: Date, required: true, index: true })
  fim!: Date;

  @Prop({
    required: true,
    enum: STATUS_AGENDA,
    default: 'disponivel',
    index: true,
  })
  status!: StatusAgenda;

  @Prop()
  observacoes?: string;

  @Prop({ type: Types.ObjectId, ref: 'Usuario', index: true })
  clienteId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Servico' })
  servicoId?: Types.ObjectId;
}

export type ItemAgendaDocument = HydratedDocument<ItemAgenda>;
export const ItemAgendaSchema = SchemaFactory.createForClass(ItemAgenda);
ItemAgendaSchema.index({ artistaId: 1, inicio: 1 });
