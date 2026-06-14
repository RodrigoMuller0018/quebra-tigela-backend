import {
  Body,
  Controller,
  ForbiddenException,
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
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtUser } from '../auth/current-user.decorator';

@Controller('requests')
export class RequestsController {
  constructor(private readonly service: RequestsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('client')
  @Post()
  create(@Body() dto: CreateRequestDto, @CurrentUser() user: JwtUser) {
    return this.service.create(dto, user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/status')
  changeStatus(
    @Param('id') id: string,
    @Body() dto: UpdateRequestStatusDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.changeStatus(id, dto.status, user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('client')
  @Get('user/:userId')
  byUser(@Param('userId') userId: string, @CurrentUser() user: JwtUser) {
    if (userId !== user.sub && user.role !== 'admin') {
      throw new ForbiddenException(
        'Você só pode listar suas próprias solicitações',
      );
    }
    return this.service.byUser(userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('artist')
  @Get('artist/:artistId')
  byArtist(
    @Param('artistId') artistId: string,
    @CurrentUser() user: JwtUser,
  ) {
    if (artistId !== user.sub && user.role !== 'admin') {
      throw new ForbiddenException(
        'Você só pode listar solicitações do seu próprio perfil',
      );
    }
    return this.service.byArtist(artistId);
  }
}
