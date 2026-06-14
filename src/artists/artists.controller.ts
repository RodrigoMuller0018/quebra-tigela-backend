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
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ArtistsService } from './artists.service';
import { CreateArtistDto } from './dto/create-artist.dto';
import { Artist } from './schemas/artist.schema';
import { ServiceOffering } from '../services/schemas/service.schema';
import { ScheduleEntry } from '../schedule/schemas/schedule.schema';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtUser } from '../auth/current-user.decorator';

function ensureOwner(paramId: string, user: JwtUser) {
  if (paramId !== user.sub && user.role !== 'admin') {
    throw new ForbiddenException(
      'Você só pode acessar/modificar seu próprio perfil de artista',
    );
  }
}

@Controller('artists')
export class ArtistsController {
  constructor(private readonly service: ArtistsService) {}

  @Post()
  create(@Body() dto: CreateArtistDto): Promise<Artist> {
    return this.service.create(dto);
  }

  @Get('search')
  search(
    @Query('city') city?: string,
    @Query('artType') artType?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ): Promise<Artist[]> {
    return this.service.search({ city, artType, page: +page, limit: +limit });
  }

  @Get(':id/profile')
  profile(@Param('id') id: string): Promise<{
    artist: Omit<Artist, 'passwordHash'>;
    services: ServiceOffering[];
    schedule: ScheduleEntry[];
    rating: { avg: number | null; count: number };
  }> {
    return this.service.profile(id);
  }

  @Get()
  getAll(): Promise<Artist[]> {
    return this.service.findAll();
  }

  @Get(':id')
  getById(@Param('id') id: string): Promise<Artist | null> {
    return this.service.findById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('artist')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateArtistDto>,
    @CurrentUser() user: JwtUser,
  ): Promise<Artist> {
    ensureOwner(id, user);
    return this.service.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('artist')
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: JwtUser,
  ): Promise<{ deleted: boolean }> {
    ensureOwner(id, user);
    return this.service.remove(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('artist')
  @Post(':id/verify-identity')
  @UseInterceptors(FilesInterceptor('photos', 2))
  async verifyIdentity(
    @Param('id') id: string,
    @UploadedFiles()
    files: Array<{
      buffer: Buffer;
      mimetype: string;
      originalname: string;
      size: number;
    }>,
    @CurrentUser() user: JwtUser,
  ) {
    ensureOwner(id, user);
    if (!files || files.length !== 2) {
      throw new BadRequestException(
        'É necessário enviar foto atual e foto do documento',
      );
    }

    const [currentPhoto, documentPhoto] = files;

    return this.service.verifyArtistIdentity(
      id,
      currentPhoto.buffer,
      documentPhoto.buffer,
    );
  }
}
