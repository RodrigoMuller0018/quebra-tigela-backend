import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ collection: 'schedule', timestamps: true })
export class ScheduleEntry {
  _id!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Artist', required: true, index: true })
  artistId!: Types.ObjectId;

  @Prop({ type: Date, required: true, index: true })
  date!: Date;

  @Prop({ required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ })
  startTime!: string;

  @Prop({ required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ })
  endTime!: string;

  @Prop({
    required: true,
    enum: ['available', 'pending', 'booked', 'completed', 'cancelled'],
    default: 'available',
    index: true,
  })
  status!: 'available' | 'pending' | 'booked' | 'completed' | 'cancelled';

  @Prop()
  notes?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  clientId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'ServiceOffering' })
  serviceId?: Types.ObjectId;
}

export type ScheduleDocument = HydratedDocument<ScheduleEntry>;
export const ScheduleSchema = SchemaFactory.createForClass(ScheduleEntry);
ScheduleSchema.index({ artistId: 1, date: 1, startTime: 1 });
