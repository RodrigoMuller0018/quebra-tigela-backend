import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ServicesService } from './services.service';
import { CriarServicoDto } from './dto/create-service.dto';
import { AtualizarServicoDto } from './dto/update-service.dto';
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

@Controller('servicos')
export class ServicesController {
  constructor(private readonly service: ServicesService) {}

  @UseGuards(JwtAuthGuard, PapeisGuard)
  @Papeis('artista')
  @Post()
  criar(@Body() dto: CriarServicoDto, @UsuarioAtual() user: UsuarioJwt) {
    return this.service.criar(dto, exigirArtistaId(user));
  }

  @UseGuards(JwtAuthGuard, PapeisGuard)
  @Papeis('artista')
  @Get('meus')
  meus(@UsuarioAtual() user: UsuarioJwt) {
    return this.service.porArtista(exigirArtistaId(user), true);
  }

  @Get('artista/:artistaId')
  porArtista(@Param('artistaId') id: string) {
    return this.service.porArtista(id, false);
  }

  @Get(':id')
  buscarPorId(@Param('id') id: string) {
    return this.service.buscarPorId(id);
  }

  @UseGuards(JwtAuthGuard, PapeisGuard)
  @Papeis('artista')
  @Patch(':id')
  atualizar(
    @Param('id') id: string,
    @Body() dto: AtualizarServicoDto,
    @UsuarioAtual() user: UsuarioJwt,
  ) {
    return this.service.atualizar(id, dto, exigirArtistaId(user));
  }

  @UseGuards(JwtAuthGuard, PapeisGuard)
  @Papeis('artista')
  @Delete(':id')
  remover(@Param('id') id: string, @UsuarioAtual() user: UsuarioJwt) {
    return this.service.remover(id, exigirArtistaId(user));
  }
}
