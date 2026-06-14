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
import { ServicesService } from './services.service';
import { CreateServiceOfferingDto } from './dto/create-service.dto';
import { UpdateServiceOfferingDto } from './dto/update-service.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtUser } from '../auth/current-user.decorator';

@Controller('service-offerings')
export class ServicesController {
  constructor(private readonly service: ServicesService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('artist')
  @Post()
  create(@Body() dto: CreateServiceOfferingDto, @CurrentUser() user: JwtUser) {
    return this.service.create(dto, user.sub);
  }

  // Artista vê os próprios serviços (incluindo inativos)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('artist')
  @Get('mine')
  mine(@CurrentUser() user: JwtUser) {
    return this.service.byArtist(user.sub, true);
  }

  // Público — clientes vendo serviços ativos de um artista
  @Get('artist/:artistId')
  byArtist(@Param('artistId') id: string) {
    return this.service.byArtist(id, false);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('artist')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateServiceOfferingDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.update(id, dto, user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('artist')
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.service.remove(id, user.sub);
  }
}
