import {
  BadRequestException,
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

@Injectable()
export class RequestsService {
  constructor(
    @InjectModel(Request.name) private reqModel: Model<RequestDocument>,
    @InjectModel(ScheduleEntry.name)
    private scheduleModel: Model<ScheduleDocument>,
  ) {}

  async create(dto: CreateRequestDto) {
    const artistId = new Types.ObjectId(dto.artistId);
    const eventDate = new Date(dto.eventDate);

    const slot = await this.scheduleModel.findOne({
      artistId,
      date: eventDate,
    });
    if (slot && slot.status !== 'available')
      throw new BadRequestException('Date not available');

    const created = await this.reqModel.create({
      ...dto,
      userId: new Types.ObjectId(dto.userId),
      artistId,
      serviceId: new Types.ObjectId(dto.serviceId),
      eventDate,
    });
    return created;
  }

  async changeStatus(
    id: string,
    status: 'accepted' | 'rejected' | 'completed' | 'cancelled',
  ) {
    const req = await this.reqModel.findById(id);
    if (!req) throw new NotFoundException('Request not found');
    req.status = status;
    await req.save();

    if (status === 'accepted') {
      await this.scheduleModel.updateOne(
        { artistId: req.artistId, date: req.eventDate },
        { $set: { status: 'booked' } },
        { upsert: true },
      );
    }
    if (status === 'cancelled' || status === 'rejected') {
      const stillBooked = await this.reqModel.exists({
        artistId: req.artistId,
        eventDate: req.eventDate,
        status: { $in: ['accepted', 'completed'] },
      });
      if (!stillBooked) {
        await this.scheduleModel.updateOne(
          { artistId: req.artistId, date: req.eventDate },
          { $set: { status: 'available' } },
          { upsert: true },
        );
      }
    }
    return req;
  }

  byUser(userId: string) {
    return this.reqModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ requestedAt: -1 });
  }

  byArtist(artistId: string) {
    return this.reqModel
      .find({ artistId: new Types.ObjectId(artistId) })
      .sort({ requestedAt: -1 });
  }
}
