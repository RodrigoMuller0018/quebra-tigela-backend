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
import { CriarSolicitacaoDto } from './dto/create-request.dto';
import { AtualizarStatusSolicitacaoDto } from './dto/update-request.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { PapeisGuard } from '../auth/roles.guard';
import { Papeis } from '../auth/roles.decorator';
import { UsuarioAtual } from '../auth/current-user.decorator';
import type { UsuarioJwt } from '../auth/current-user.decorator';

@Controller('solicitacoes')
export class RequestsController {
  constructor(private readonly service: RequestsService) {}

  @UseGuards(JwtAuthGuard, PapeisGuard)
  @Papeis('cliente')
  @Post()
  criar(@Body() dto: CriarSolicitacaoDto, @UsuarioAtual() user: UsuarioJwt) {
    return this.service.criar(dto, user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/status')
  mudarStatus(
    @Param('id') id: string,
    @Body() dto: AtualizarStatusSolicitacaoDto,
    @UsuarioAtual() user: UsuarioJwt,
  ) {
    return this.service.mudarStatus(id, dto.status, user);
  }

  @UseGuards(JwtAuthGuard, PapeisGuard)
  @Papeis('cliente')
  @Get('usuario/:usuarioId')
  porUsuario(
    @Param('usuarioId') usuarioId: string,
    @UsuarioAtual() user: UsuarioJwt,
  ) {
    if (usuarioId !== user.sub && user.papel !== 'admin') {
      throw new ForbiddenException(
        'Você só pode listar suas próprias solicitações',
      );
    }
    return this.service.porUsuario(usuarioId);
  }

  @UseGuards(JwtAuthGuard, PapeisGuard)
  @Papeis('artista')
  @Get('artista/:artistaId')
  porArtista(
    @Param('artistaId') artistaId: string,
    @UsuarioAtual() user: UsuarioJwt,
  ) {
    if (artistaId !== user.artistaId && user.papel !== 'admin') {
      throw new ForbiddenException(
        'Você só pode listar solicitações do seu próprio perfil',
      );
    }
    return this.service.porArtista(artistaId);
  }
}
