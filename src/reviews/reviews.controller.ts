import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly service: ReviewsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('client')
  @Post()
  create(@Body() dto: CreateReviewDto) {
    return this.service.create(dto);
  }

  @Get('artist/:artistId')
  byArtist(@Param('artistId') id: string) {
    return this.service.byArtist(id);
  }
}
