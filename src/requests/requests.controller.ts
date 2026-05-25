import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RequestsService } from './requests.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestStatusDto } from './dto/update-request.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('requests')
export class RequestsController {
  constructor(private readonly service: RequestsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('client')
  @Post()
  create(@Body() dto: CreateRequestDto) {
    return this.service.create(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/status')
  changeStatus(@Param('id') id: string, @Body() dto: UpdateRequestStatusDto) {
    return this.service.changeStatus(id, dto.status);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('client')
  @Get('user/:userId')
  byUser(@Param('userId') userId: string) {
    return this.service.byUser(userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('artist')
  @Get('artist/:artistId')
  byArtist(@Param('artistId') artistId: string) {
    return this.service.byArtist(artistId);
  }
}
