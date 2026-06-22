import { Module } from '@nestjs/common';
import { ArtistsService } from './artists.service';
import { ArtistsController } from './artists.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Artista, ArtistaSchema } from './schemas/artist.schema';
import { Usuario, UsuarioSchema } from '../users/schemas/user.schema';
import { Servico, ServicoSchema } from '../services/schemas/service.schema';
import { ItemAgenda, ItemAgendaSchema } from '../schedule/schemas/schedule.schema';
import { Avaliacao, AvaliacaoSchema } from '../reviews/schemas/review.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Artista.name, schema: ArtistaSchema },
      { name: Usuario.name, schema: UsuarioSchema },
      { name: Servico.name, schema: ServicoSchema },
      { name: ItemAgenda.name, schema: ItemAgendaSchema },
      { name: Avaliacao.name, schema: AvaliacaoSchema },
    ]),
  ],
  controllers: [ArtistsController],
  providers: [ArtistsService],
  exports: [ArtistsService],
})
export class ArtistsModule {}
