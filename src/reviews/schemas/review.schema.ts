import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ _id: false })
class RespostaArtista {
  @Prop({ required: true })
  texto!: string;

  @Prop({ type: Date, default: Date.now })
  respondidaEm!: Date;
}

@Schema({
  collection: 'avaliacoes',
  timestamps: { createdAt: 'criadaEm', updatedAt: 'atualizadaEm' },
})
export class Avaliacao {
  _id!: Types.ObjectId;

  /**
   * 1 avaliação por solicitação. artistaId/usuarioId são denormalizados a partir
   * da Solicitacao pra facilitar agregações (média por artista, lista por cliente).
   */
  @Prop({
    type: Types.ObjectId,
    ref: 'Solicitacao',
    required: true,
    unique: true,
    index: true,
  })
  solicitacaoId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Artista', required: true, index: true })
  artistaId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Usuario', required: true, index: true })
  usuarioId!: Types.ObjectId;

  @Prop({ min: 1, max: 5, required: true })
  nota!: number;

  @Prop()
  comentario?: string;

  @Prop({ type: RespostaArtista })
  respostaArtista?: RespostaArtista;
}

export type AvaliacaoDocument = HydratedDocument<Avaliacao>;
export const AvaliacaoSchema = SchemaFactory.createForClass(Avaliacao);
