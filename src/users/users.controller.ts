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
import { UsersService } from './users.service';
import { CriarUsuarioDto } from './dto/create-user.dto';
import { Usuario } from './schemas/user.schema';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { PapeisGuard } from '../auth/roles.guard';
import { Papeis } from '../auth/roles.decorator';
import { UsuarioAtual } from '../auth/current-user.decorator';
import type { UsuarioJwt } from '../auth/current-user.decorator';

function garantirDono(paramId: string, user: UsuarioJwt) {
  if (paramId !== user.sub && user.papel !== 'admin') {
    throw new ForbiddenException(
      'Você só pode acessar/modificar seu próprio perfil',
    );
  }
}

@Controller('usuarios')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Post()
  criar(@Body() dto: CriarUsuarioDto) {
    return this.service.criar(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  listar(): Promise<Usuario[]> {
    return this.service.listar();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  buscar(
    @Param('id') id: string,
    @UsuarioAtual() user: UsuarioJwt,
  ): Promise<Usuario | null> {
    garantirDono(id, user);
    return this.service.buscarPorId(id);
  }

  @UseGuards(JwtAuthGuard, PapeisGuard)
  @Papeis('cliente')
  @Patch(':id')
  atualizar(
    @Param('id') id: string,
    @Body() dto: Partial<CriarUsuarioDto>,
    @UsuarioAtual() user: UsuarioJwt,
  ): Promise<Usuario> {
    garantirDono(id, user);
    return this.service.atualizar(id, dto);
  }

  /**
   * Desativa a conta (soft delete em cascata: Usuario + Artista linkado).
   * Reversível: ao logar novamente, conta é reativada automaticamente.
   */
  @UseGuards(JwtAuthGuard, PapeisGuard)
  @Papeis('cliente')
  @Patch(':id/desativar')
  desativar(
    @Param('id') id: string,
    @UsuarioAtual() user: UsuarioJwt,
  ): Promise<{ desativadaEm: Date }> {
    garantirDono(id, user);
    return this.service.desativarConta(id);
  }

  /** Hard delete (admin / dev). Frontend usa /desativar. */
  @UseGuards(JwtAuthGuard, PapeisGuard)
  @Papeis('admin')
  @Delete(':id')
  remover(
    @Param('id') id: string,
    @UsuarioAtual() user: UsuarioJwt,
  ): Promise<{ removido: boolean }> {
    garantirDono(id, user);
    return this.service.remover(id);
  }
}
