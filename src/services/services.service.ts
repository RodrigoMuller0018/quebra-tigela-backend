import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ServiceOffering,
  ServiceOfferingDocument,
} from './schemas/service.schema';
import { CreateServiceOfferingDto } from './dto/create-service.dto';

@Injectable()
export class ServicesService {
  constructor(
    @InjectModel(ServiceOffering.name)
    private model: Model<ServiceOfferingDocument>,
  ) {}

  create(dto: CreateServiceOfferingDto) {
    return this.model.create({
      ...dto,
      artistId: new Types.ObjectId(dto.artistId),
    });
  }
  byArtist(artistId: string) {
    return this.model.find({
      artistId: new Types.ObjectId(artistId),
      active: true,
    });
  }
}
