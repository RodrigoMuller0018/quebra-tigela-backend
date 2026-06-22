import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export const STATUS_SOLICITACAO = [
  'pendente',
  'aceita',
  'aguardando_confirmacao',
  'concluida',
  'recusada',
  'cancelada',
] as const;
export type StatusSolicitacao = (typeof STATUS_SOLICITACAO)[number];

@Schema({
  collection: 'solicitacoes',
  timestamps: { createdAt: 'solicitadaEm', updatedAt: 'atualizadaEm' },
})
export class Solicitacao {
  _id!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Usuario', required: true, index: true })
  usuarioId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Artista', required: true, index: true })
  artistaId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Servico',
    required: true,
    index: true,
  })
  servicoId!: Types.ObjectId;

  /** Slot ancorado (Caminho A: reserva direta). Null para solicitação livre (Caminho B). */
  @Prop({ type: Types.ObjectId, ref: 'ItemAgenda', index: true })
  agendaId?: Types.ObjectId;

  /** Instante de início (UTC). Suporta eventos multi-dia (ex: show 22h → 02h). */
  @Prop({ type: Date, required: true, index: true })
  inicio!: Date;

  /** Instante de fim (UTC). Deve ser estritamente > inicio. */
  @Prop({ type: Date, required: true, index: true })
  fim!: Date;

  @Prop()
  local!: string;

  @Prop({
    enum: STATUS_SOLICITACAO,
    default: 'pendente',
    index: true,
  })
  status!: StatusSolicitacao;

  /** Quando artista marcou como "realizada". Usado pra auto-confirmar após 7 dias. */
  @Prop({ type: Date })
  marcadaConcluidaEm?: Date;

  @Prop()
  detalhes?: string;
}

export type SolicitacaoDocument = HydratedDocument<Solicitacao>;
export const SolicitacaoSchema = SchemaFactory.createForClass(Solicitacao);
SolicitacaoSchema.index({ artistaId: 1, inicio: 1 });
