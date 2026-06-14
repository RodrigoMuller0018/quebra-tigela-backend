import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import {
  CreateScheduleDto,
  scheduleStatusValues,
} from './dto/create-schedule.dto';
import type { ScheduleStatus } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { BatchCreateScheduleDto } from './dto/batch-schedule.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtUser } from '../auth/current-user.decorator';

@Controller('schedule')
export class ScheduleController {
  constructor(private readonly service: ScheduleService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('artist')
  @Post()
  create(@Body() dto: CreateScheduleDto, @CurrentUser() user: JwtUser) {
    if (dto.artistId !== user.sub) {
      throw new BadRequestException(
        'artistId deve ser o seu próprio (do token)',
      );
    }
    return this.service.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('artist')
  @Post('batch')
  batch(@Body() dto: BatchCreateScheduleDto, @CurrentUser() user: JwtUser) {
    const invalid = dto.schedules.find((s) => s.artistId !== user.sub);
    if (invalid) {
      throw new BadRequestException(
        'Todos os horários devem ser do seu próprio artista',
      );
    }
    return this.service.createMany(dto.schedules);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('client')
  @Get('my-bookings')
  myBookings(@CurrentUser() user: JwtUser) {
    return this.service.listMyBookings(user.sub);
  }

  @Get('artist/:artistId/future')
  listFuture(@Param('artistId') id: string) {
    return this.service.listFuture(id);
  }

  @Get('artist/:artistId')
  listByArtist(
    @Param('artistId') artistId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: ScheduleStatus,
    @Query('limit') limit?: string,
  ) {
    if (status && !scheduleStatusValues.includes(status)) {
      throw new BadRequestException('Status de agenda inválido');
    }
    return this.service.listByArtist({
      artistId,
      from,
      to,
      status,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('client')
  @Post(':id/book')
  book(
    @Param('id') id: string,
    @Body() body: { notes?: string; serviceId?: string },
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.book(id, user.sub, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.service.cancel(id, user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('artist')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateScheduleDto) {
    if (!dto || Object.keys(dto).length === 0) {
      throw new BadRequestException(
        'Informe pelo menos um campo para atualização da agenda',
      );
    }
    return this.service.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('artist')
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.service.remove(id, user.sub);
  }
}
