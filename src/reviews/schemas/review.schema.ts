import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ _id: false })
class ArtistReply {
  @Prop({ required: true })
  text!: string;

  @Prop({ type: Date, default: Date.now })
  repliedAt!: Date;
}

@Schema({
  collection: 'reviews',
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
})
export class Review {
  _id!: Types.ObjectId;

  // 1 review por solicitação. O artistId/userId são denormalizados a partir do request
  // pra facilitar agregações (média por artista, lista por cliente).
  @Prop({
    type: Types.ObjectId,
    ref: 'Request',
    required: true,
    unique: true,
    index: true,
  })
  requestId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Artist', required: true, index: true })
  artistId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ min: 1, max: 5, required: true })
  rating!: number;

  @Prop()
  comment?: string;

  @Prop({ type: ArtistReply })
  artistReply?: ArtistReply;
}

export type ReviewDocument = HydratedDocument<Review>;
export const ReviewSchema = SchemaFactory.createForClass(Review);
