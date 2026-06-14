import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  collection: 'artists',
})
export class Artist {
  _id: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, index: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop()
  bio?: string;

  @Prop()
  city?: string;

  @Prop()
  state?: string;

  @Prop({ default: false })
  verified: boolean;

  @Prop({ type: [String], index: true })
  artTypes: string[];

  /** Foto de perfil — data URL base64 (data:image/jpeg;base64,...) ou URL futura de CDN */
  @Prop()
  profilePicture?: string;
}
export type ArtistDocument = HydratedDocument<Artist>;
export const ArtistSchema = SchemaFactory.createForClass(Artist);
ArtistSchema.index({ city: 1, verified: 1 });
ArtistSchema.index({ artTypes: 1, verified: 1 });
