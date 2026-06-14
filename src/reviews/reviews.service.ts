import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Review, ReviewDocument } from './schemas/review.schema';
import { Request, RequestDocument } from '../requests/schemas/request.schema';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name) private reviewModel: Model<ReviewDocument>,
    @InjectModel(Request.name) private reqModel: Model<RequestDocument>,
  ) {}

  async create(dto: CreateReviewDto, currentUserId: string) {
    const requestId = new Types.ObjectId(dto.requestId);
    const userId = new Types.ObjectId(currentUserId);

    const request = await this.reqModel.findById(requestId);
    if (!request) {
      throw new NotFoundException('Solicitação não encontrada');
    }
    if (!request.userId.equals(userId)) {
      throw new ForbiddenException(
        'Você só pode avaliar solicitações suas',
      );
    }
    if (request.status !== 'completed') {
      throw new BadRequestException(
        'A solicitação ainda não foi concluída',
      );
    }

    try {
      const created = await this.reviewModel.create({
        requestId,
        artistId: request.artistId,
        userId,
        rating: dto.rating,
        comment: dto.comment,
      });
      return created.populate('userId', 'name');
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new ConflictException(
          'Esta solicitação já foi avaliada. Você pode editar a avaliação existente.',
        );
      }
      throw err;
    }
  }

  async byArtist(artistId: string) {
    return this.reviewModel
      .find({ artistId: new Types.ObjectId(artistId) })
      .sort({ createdAt: -1 })
      .populate('userId', 'name')
      .lean();
  }

  async byUser(userId: string) {
    return this.reviewModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .populate('userId', 'name')
      .lean();
  }

  async update(id: string, dto: UpdateReviewDto, currentUserId: string) {
    const review = await this.reviewModel.findById(id);
    if (!review) throw new NotFoundException('Avaliação não encontrada');
    if (!review.userId.equals(currentUserId)) {
      throw new ForbiddenException(
        'Você só pode editar suas próprias avaliações',
      );
    }
    if (dto.rating !== undefined) review.rating = dto.rating;
    if (dto.comment !== undefined) review.comment = dto.comment;
    await review.save();
    return review.populate('userId', 'name');
  }

  async remove(id: string, currentUserId: string) {
    const review = await this.reviewModel.findById(id);
    if (!review) throw new NotFoundException('Avaliação não encontrada');
    if (!review.userId.equals(currentUserId)) {
      throw new ForbiddenException(
        'Você só pode excluir suas próprias avaliações',
      );
    }
    await review.deleteOne();
    return { deleted: true } as const;
  }

  async reply(id: string, text: string, currentArtistId: string) {
    const review = await this.reviewModel.findById(id);
    if (!review) throw new NotFoundException('Avaliação não encontrada');
    if (!review.artistId.equals(currentArtistId)) {
      throw new ForbiddenException(
        'Só o artista avaliado pode responder esta avaliação',
      );
    }
    review.artistReply = { text, repliedAt: new Date() };
    await review.save();
    return review.populate('userId', 'name');
  }

  async deleteReply(id: string, currentArtistId: string) {
    const review = await this.reviewModel.findById(id);
    if (!review) throw new NotFoundException('Avaliação não encontrada');
    if (!review.artistId.equals(currentArtistId)) {
      throw new ForbiddenException(
        'Só o artista avaliado pode remover esta resposta',
      );
    }
    review.artistReply = undefined;
    await review.save();
    return review.populate('userId', 'name');
  }
}
