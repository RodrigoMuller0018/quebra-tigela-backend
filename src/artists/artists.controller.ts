import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ArtistsService } from './artists.service';
import { TornarSeArtistaDto } from './dto/become-artist.dto';
import { AtualizarArtistaDto } from './dto/update-artist.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt.guard';
import { UsuarioAtual } from '../auth/current-user.decorator';
import type { UsuarioJwt } from '../auth/current-user.decorator';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Artista, ArtistaDocument } from './schemas/artist.schema';

@Controller('artistas')
export class ArtistsController {
  constructor(
    private readonly service: ArtistsService,
    @InjectModel(Artista.name) private artistaModel: Model<ArtistaDocument>,
  ) {}

  /** Garante que o JWT.sub é o dono do Artista :id (ou é admin). */
  private async garantirDonoArtista(artistaId: string, user: UsuarioJwt) {
    if (user.papel === 'admin') return;
    const doc = await this.artistaModel
      .findById(new Types.ObjectId(artistaId))
      .select('usuarioId')
      .lean();
    if (!doc) throw new NotFoundException('Artista não encontrado');
    if (doc.usuarioId.toString() !== user.sub) {
      throw new ForbiddenException(
        'Você só pode modificar seu próprio perfil de artista',
      );
    }
  }

  /** Perfil público localizado por handle (estilo @username). */
  @Get('por-handle/:handle/perfil')
  perfilPorHandle(@Param('handle') handle: string) {
    return this.service.perfilPorHandle(handle);
  }

  /** Consulta de disponibilidade pra UI mostrar verde/vermelho em tempo real. */
  @Get('por-handle/:handle/disponivel')
  handleDisponivel(@Param('handle') handle: string) {
    return this.service.handleDisponivel(handle);
  }

  /**
   * Registra uma visualização do perfil. Endpoint público — funciona sem
   * login (visitantes anônimos contam) e ignora self-views quando o JWT
   * é o do próprio dono.
   */
  @UseGuards(OptionalJwtAuthGuard)
  @Post('por-handle/:handle/visualizar')
  registrarVisualizacao(
    @Param('handle') handle: string,
    @UsuarioAtual() user: UsuarioJwt | null,
  ) {
    return this.service.registrarVisualizacaoPorHandle(handle, user?.sub);
  }

  @Get('buscar')
  buscar(
    @Query('cidade') cidade?: string,
    @Query('tipoArte') tipoArte?: string,
    @Query('pagina') pagina = 1,
    @Query('limite') limite = 20,
  ) {
    return this.service.buscar({ cidade, tipoArte, pagina: +pagina, limite: +limite });
  }

  @UseGuards(JwtAuthGuard)
  @Get('eu')
  async meuPerfil(@UsuarioAtual() user: UsuarioJwt) {
    const artista = await this.service.buscarPorUsuarioId(user.sub);
    if (!artista) {
      throw new NotFoundException('Você ainda não tem perfil de artista');
    }
    return artista;
  }

  /** Usuário logado cria seu perfil de artista (composition: Usuario + Artista). */
  @UseGuards(JwtAuthGuard)
  @Post('tornar-se-artista')
  tornarSeArtista(@Body() dto: TornarSeArtistaDto, @UsuarioAtual() user: UsuarioJwt) {
    return this.service.tornarSeArtista(user.sub, dto);
  }

  @Get(':id/perfil')
  perfil(@Param('id') id: string) {
    return this.service.perfil(id);
  }

  @Get()
  listar() {
    return this.service.listarTodos();
  }

  @Get(':id')
  buscarPorId(@Param('id') id: string) {
    return this.service.buscarPorId(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async atualizar(
    @Param('id') id: string,
    @Body() dto: AtualizarArtistaDto,
    @UsuarioAtual() user: UsuarioJwt,
  ) {
    await this.garantirDonoArtista(id, user);
    return this.service.atualizar(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/desativar')
  async desativar(@Param('id') id: string, @UsuarioAtual() user: UsuarioJwt) {
    await this.garantirDonoArtista(id, user);
    return this.service.desativar(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/reativar')
  async reativar(@Param('id') id: string, @UsuarioAtual() user: UsuarioJwt) {
    await this.garantirDonoArtista(id, user);
    return this.service.reativar(id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remover(@Param('id') id: string, @UsuarioAtual() user: UsuarioJwt) {
    await this.garantirDonoArtista(id, user);
    return this.service.remover(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/verificar-identidade')
  @UseInterceptors(FilesInterceptor('fotos', 2))
  async verificarIdentidade(
    @Param('id') id: string,
    @UploadedFiles()
    arquivos: Array<{
      buffer: Buffer;
      mimetype: string;
      originalname: string;
      size: number;
    }>,
    @UsuarioAtual() user: UsuarioJwt,
  ) {
    await this.garantirDonoArtista(id, user);
    if (!arquivos || arquivos.length !== 2) {
      throw new BadRequestException(
        'É necessário enviar foto atual e foto do documento',
      );
    }
    const [fotoAtual, fotoDocumento] = arquivos;
    return this.service.verificarIdentidade(
      id,
      fotoAtual.buffer,
      fotoDocumento.buffer,
    );
  }
}
