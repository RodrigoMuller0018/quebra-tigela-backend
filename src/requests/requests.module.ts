import { Module } from '@nestjs/common';
import { RequestsService } from './requests.service';
import { RequestsController } from './requests.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Solicitacao, SolicitacaoSchema } from './schemas/request.schema';
import { ItemAgenda, ItemAgendaSchema } from '../schedule/schemas/schedule.schema';
import { Artista, ArtistaSchema } from '../artists/schemas/artist.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Solicitacao.name, schema: SolicitacaoSchema },
      { name: ItemAgenda.name, schema: ItemAgendaSchema },
      { name: Artista.name, schema: ArtistaSchema },
    ]),
  ],
  controllers: [RequestsController],
  providers: [RequestsService],
  exports: [RequestsService],
})
export class RequestsModule {}
