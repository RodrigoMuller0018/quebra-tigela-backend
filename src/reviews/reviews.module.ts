import { Module } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Avaliacao, AvaliacaoSchema } from './schemas/review.schema';
import { Solicitacao, SolicitacaoSchema } from '../requests/schemas/request.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Avaliacao.name, schema: AvaliacaoSchema },
      { name: Solicitacao.name, schema: SolicitacaoSchema },
    ]),
  ],
  controllers: [ReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
