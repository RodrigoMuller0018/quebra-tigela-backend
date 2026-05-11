import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Review, ReviewDocument } from './schemas/review.schema';
import { Request, RequestDocument } from '../requests/schemas/request.schema';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name) private reviewModel: Model<ReviewDocument>,
    @InjectModel(Request.name) private reqModel: Model<RequestDocument>,
  ) {}

  async create(dto: CreateReviewDto) {
    const completed = await this.reqModel.exists({
      artistId: new Types.ObjectId(dto.artistId),
      userId: new Types.ObjectId(dto.userId),
      status: 'completed',
    });
    if (!completed)
      throw new BadRequestException(
        'You can only review after a completed service',
      );
    return this.reviewModel.create({
      ...dto,
      artistId: new Types.ObjectId(dto.artistId),
      userId: new Types.ObjectId(dto.userId),
    });
  }

  byArtist(artistId: string) {
    return this.reviewModel
      .find({ artistId: new Types.ObjectId(artistId) })
      .sort({ createdAt: -1 });
  }
}
