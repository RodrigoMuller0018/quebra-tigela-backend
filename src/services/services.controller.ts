import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ServicesService } from './services.service';
import { CreateServiceOfferingDto } from './dto/create-service.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('service-offerings')
export class ServicesController {
  constructor(private readonly service: ServicesService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('artist')
  @Post()
  create(@Body() dto: CreateServiceOfferingDto) {
    return this.service.create(dto);
  }

  @Get('artist/:artistId')
  byArtist(@Param('artistId') id: string) {
    return this.service.byArtist(id);
  }
}
