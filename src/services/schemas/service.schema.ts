import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

class Midia {
  @Prop({ required: true, enum: ['imagem', 'video'] })
  tipo!: 'imagem' | 'video';

  @Prop({ required: true })
  url!: string;
}

@Schema({ collection: 'servicos' })
export class Servico {
  _id!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Artista', required: true, index: true })
  artistaId!: Types.ObjectId;

  @Prop({ required: true })
  titulo!: string;

  @Prop()
  descricao?: string;

  @Prop({ type: [Midia], default: [] })
  midia!: Midia[];

  @Prop({ default: true, index: true })
  ativo!: boolean;
}
export type ServicoDocument = HydratedDocument<Servico>;
export const ServicoSchema = SchemaFactory.createForClass(Servico);
ServicoSchema.index({ artistaId: 1, ativo: 1 });
