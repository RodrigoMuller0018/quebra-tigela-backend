import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReplyReviewDto } from './dto/reply-review.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtUser } from '../auth/current-user.decorator';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly service: ReviewsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('client')
  @Post()
  create(@Body() dto: CreateReviewDto, @CurrentUser() user: JwtUser) {
    return this.service.create(dto, user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('client')
  @Get('mine')
  mine(@CurrentUser() user: JwtUser) {
    return this.service.byUser(user.sub);
  }

  @Get('artist/:artistId')
  byArtist(@Param('artistId') id: string) {
    return this.service.byArtist(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('client')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateReviewDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.update(id, dto, user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('client')
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.service.remove(id, user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('artist')
  @Post(':id/reply')
  reply(
    @Param('id') id: string,
    @Body() dto: ReplyReviewDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.reply(id, dto.text, user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('artist')
  @Delete(':id/reply')
  deleteReply(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.service.deleteReply(id, user.sub);
  }
}
