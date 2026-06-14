import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ServiceOffering,
  ServiceOfferingDocument,
} from './schemas/service.schema';
import { CreateServiceOfferingDto } from './dto/create-service.dto';
import { UpdateServiceOfferingDto } from './dto/update-service.dto';

@Injectable()
export class ServicesService {
  constructor(
    @InjectModel(ServiceOffering.name)
    private model: Model<ServiceOfferingDocument>,
  ) {}

  create(dto: CreateServiceOfferingDto, currentArtistId: string) {
    return this.model.create({
      ...dto,
      artistId: new Types.ObjectId(currentArtistId),
    });
  }

  byArtist(artistId: string, includeInactive = false) {
    const query: { artistId: Types.ObjectId; active?: boolean } = {
      artistId: new Types.ObjectId(artistId),
    };
    if (!includeInactive) query.active = true;
    return this.model.find(query);
  }

  async findById(id: string) {
    const found = await this.model.findById(id);
    if (!found) throw new NotFoundException('Serviço não encontrado');
    return found;
  }

  async update(
    id: string,
    dto: UpdateServiceOfferingDto,
    currentArtistId: string,
  ) {
    const entry = await this.model.findById(id);
    if (!entry) throw new NotFoundException('Serviço não encontrado');
    if (!entry.artistId.equals(currentArtistId)) {
      throw new ForbiddenException(
        'Você só pode editar seus próprios serviços',
      );
    }

    if (dto.title !== undefined) entry.title = dto.title;
    if (dto.description !== undefined) entry.description = dto.description;
    if (dto.media !== undefined) entry.media = dto.media;
    if (dto.active !== undefined) entry.active = dto.active;

    await entry.save();
    return entry;
  }

  async remove(id: string, currentArtistId: string) {
    const entry = await this.model.findById(id);
    if (!entry) throw new NotFoundException('Serviço não encontrado');
    if (!entry.artistId.equals(currentArtistId)) {
      throw new ForbiddenException(
        'Você só pode excluir seus próprios serviços',
      );
    }
    await entry.deleteOne();
    return { deleted: true } as const;
  }
}
