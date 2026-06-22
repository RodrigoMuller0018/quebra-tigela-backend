import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import {
  CriarItemAgendaDto,
  statusAgendaValores,
} from './dto/create-schedule.dto';
import type { StatusAgenda } from './dto/create-schedule.dto';
import { AtualizarItemAgendaDto } from './dto/update-schedule.dto';
import { CriarItensAgendaEmLoteDto } from './dto/batch-schedule.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { PapeisGuard } from '../auth/roles.guard';
import { Papeis } from '../auth/roles.decorator';
import { UsuarioAtual } from '../auth/current-user.decorator';
import type { UsuarioJwt } from '../auth/current-user.decorator';

function exigirArtistaId(user: UsuarioJwt): string {
  if (!user.artistaId) {
    throw new ForbiddenException(
      'Você precisa ter perfil de artista para esta ação',
    );
  }
  return user.artistaId;
}

@Controller('agenda')
export class ScheduleController {
  constructor(private readonly service: ScheduleService) {}

  @UseGuards(JwtAuthGuard, PapeisGuard)
  @Papeis('artista')
  @Post()
  criar(@Body() dto: CriarItemAgendaDto, @UsuarioAtual() user: UsuarioJwt) {
    const artistaId = exigirArtistaId(user);
    if (dto.artistaId !== artistaId) {
      throw new BadRequestException(
        'artistaId deve ser o seu próprio (do token)',
      );
    }
    return this.service.criar(dto);
  }

  @UseGuards(JwtAuthGuard, PapeisGuard)
  @Papeis('artista')
  @Post('lote')
  emLote(@Body() dto: CriarItensAgendaEmLoteDto, @UsuarioAtual() user: UsuarioJwt) {
    const artistaId = exigirArtistaId(user);
    const invalido = dto.itens.find((s) => s.artistaId !== artistaId);
    if (invalido) {
      throw new BadRequestException(
        'Todos os horários devem ser do seu próprio artista',
      );
    }
    return this.service.criarEmLote(dto.itens);
  }

  @UseGuards(JwtAuthGuard, PapeisGuard)
  @Papeis('cliente')
  @Get('minhas-reservas')
  minhasReservas(@UsuarioAtual() user: UsuarioJwt) {
    return this.service.listarMinhasReservas(user.sub);
  }

  @Get('artista/:artistaId/futuros')
  listarFuturos(@Param('artistaId') id: string) {
    return this.service.listarFuturos(id);
  }

  @Get('artista/:artistaId')
  listarPorArtista(
    @Param('artistaId') artistaId: string,
    @Query('de') de?: string,
    @Query('ate') ate?: string,
    @Query('status') status?: StatusAgenda,
    @Query('limite') limite?: string,
  ) {
    if (status && !statusAgendaValores.includes(status)) {
      throw new BadRequestException('Status de agenda inválido');
    }
    return this.service.listarPorArtista({
      artistaId,
      de,
      ate,
      status,
      limite: limite ? Number(limite) : undefined,
    });
  }

  @Get(':id')
  buscarPorId(@Param('id') id: string) {
    return this.service.buscarPorId(id);
  }

  @UseGuards(JwtAuthGuard, PapeisGuard)
  @Papeis('cliente')
  @Post(':id/reservar')
  reservar(
    @Param('id') id: string,
    @Body() body: { observacoes?: string; servicoId?: string },
    @UsuarioAtual() user: UsuarioJwt,
  ) {
    return this.service.reservar(id, user.sub, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/cancelar')
  cancelar(@Param('id') id: string, @UsuarioAtual() user: UsuarioJwt) {
    const identidade = user.artistaId ?? user.sub;
    return this.service.cancelar(id, identidade);
  }

  @UseGuards(JwtAuthGuard, PapeisGuard)
  @Papeis('artista')
  @Patch(':id')
  atualizar(@Param('id') id: string, @Body() dto: AtualizarItemAgendaDto) {
    if (!dto || Object.keys(dto).length === 0) {
      throw new BadRequestException(
        'Informe pelo menos um campo para atualização da agenda',
      );
    }
    return this.service.atualizar(id, dto);
  }

  @UseGuards(JwtAuthGuard, PapeisGuard)
  @Papeis('artista')
  @Delete(':id')
  remover(@Param('id') id: string, @UsuarioAtual() user: UsuarioJwt) {
    const artistaId = exigirArtistaId(user);
    return this.service.remover(id, artistaId);
  }
}
