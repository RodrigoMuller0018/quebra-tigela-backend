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
import { ReviewsService } from './reviews.service';
import { CriarAvaliacaoDto } from './dto/create-review.dto';
import { AtualizarAvaliacaoDto } from './dto/update-review.dto';
import { ResponderAvaliacaoDto } from './dto/reply-review.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { PapeisGuard } from '../auth/roles.guard';
import { Papeis } from '../auth/roles.decorator';
import { UsuarioAtual } from '../auth/current-user.decorator';
import type { UsuarioJwt } from '../auth/current-user.decorator';

@Controller('avaliacoes')
export class ReviewsController {
  constructor(private readonly service: ReviewsService) {}

  @UseGuards(JwtAuthGuard, PapeisGuard)
  @Papeis('cliente')
  @Post()
  criar(@Body() dto: CriarAvaliacaoDto, @UsuarioAtual() user: UsuarioJwt) {
    return this.service.criar(dto, user.sub);
  }

  @UseGuards(JwtAuthGuard, PapeisGuard)
  @Papeis('cliente')
  @Get('minhas')
  minhas(@UsuarioAtual() user: UsuarioJwt) {
    return this.service.porUsuario(user.sub);
  }

  @Get('artista/:artistaId')
  porArtista(@Param('artistaId') id: string) {
    return this.service.porArtista(id);
  }

  @UseGuards(JwtAuthGuard, PapeisGuard)
  @Papeis('cliente')
  @Patch(':id')
  atualizar(
    @Param('id') id: string,
    @Body() dto: AtualizarAvaliacaoDto,
    @UsuarioAtual() user: UsuarioJwt,
  ) {
    return this.service.atualizar(id, dto, user.sub);
  }

  @UseGuards(JwtAuthGuard, PapeisGuard)
  @Papeis('cliente')
  @Delete(':id')
  remover(@Param('id') id: string, @UsuarioAtual() user: UsuarioJwt) {
    return this.service.remover(id, user.sub);
  }

  @UseGuards(JwtAuthGuard, PapeisGuard)
  @Papeis('artista')
  @Post(':id/resposta')
  responder(
    @Param('id') id: string,
    @Body() dto: ResponderAvaliacaoDto,
    @UsuarioAtual() user: UsuarioJwt,
  ) {
    if (!user.artistaId) {
      throw new ForbiddenException('Você precisa ter perfil de artista');
    }
    return this.service.responder(id, dto.texto, user.artistaId);
  }

  @UseGuards(JwtAuthGuard, PapeisGuard)
  @Papeis('artista')
  @Delete(':id/resposta')
  removerResposta(@Param('id') id: string, @UsuarioAtual() user: UsuarioJwt) {
    if (!user.artistaId) {
      throw new ForbiddenException('Você precisa ter perfil de artista');
    }
    return this.service.removerResposta(id, user.artistaId);
  }
}
