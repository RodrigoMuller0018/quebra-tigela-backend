import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Avaliacao, AvaliacaoDocument } from './schemas/review.schema';
import { Solicitacao, SolicitacaoDocument } from '../requests/schemas/request.schema';
import { CriarAvaliacaoDto } from './dto/create-review.dto';
import { AtualizarAvaliacaoDto } from './dto/update-review.dto';

/**
 * Janela em que cliente pode editar/excluir a avaliação e artista pode excluir
 * a resposta. Depois disso vira imutável — evita revenge edit reativo e mantém
 * o histórico público confiável.
 */
const JANELA_EDICAO_MS = 15 * 60_000;

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Avaliacao.name) private avaliacaoModel: Model<AvaliacaoDocument>,
    @InjectModel(Solicitacao.name) private solicModel: Model<SolicitacaoDocument>,
  ) {}

  async criar(dto: CriarAvaliacaoDto, usuarioAtualId: string) {
    const solicitacaoId = new Types.ObjectId(dto.solicitacaoId);
    const usuarioId = new Types.ObjectId(usuarioAtualId);

    const sol = await this.solicModel.findById(solicitacaoId);
    if (!sol) {
      throw new NotFoundException('Solicitação não encontrada');
    }
    if (!sol.usuarioId.equals(usuarioId)) {
      throw new ForbiddenException('Você só pode avaliar solicitações suas');
    }
    if (sol.status !== 'concluida') {
      throw new BadRequestException('A solicitação ainda não foi concluída');
    }

    try {
      const criada = await this.avaliacaoModel.create({
        solicitacaoId,
        artistaId: sol.artistaId,
        usuarioId,
        nota: dto.nota,
        comentario: dto.comentario,
      });
      return criada.populate('usuarioId', 'nome');
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new ConflictException(
          'Esta solicitação já foi avaliada. Você pode editar a avaliação existente.',
        );
      }
      throw err;
    }
  }

  async porArtista(artistaId: string) {
    return this.avaliacaoModel
      .find({ artistaId: new Types.ObjectId(artistaId) })
      .sort({ criadaEm: -1 })
      .populate('usuarioId', 'nome')
      .lean();
  }

  async porUsuario(usuarioId: string) {
    return this.avaliacaoModel
      .find({ usuarioId: new Types.ObjectId(usuarioId) })
      .sort({ criadaEm: -1 })
      .populate('usuarioId', 'nome')
      .lean();
  }

  async atualizar(id: string, dto: AtualizarAvaliacaoDto, usuarioAtualId: string) {
    const aval = await this.avaliacaoModel.findById(id);
    if (!aval) throw new NotFoundException('Avaliação não encontrada');
    if (!aval.usuarioId.equals(usuarioAtualId)) {
      throw new ForbiddenException(
        'Você só pode editar suas próprias avaliações',
      );
    }
    const criadaEm = (aval as any).criadaEm as Date | undefined;
    if (criadaEm && Date.now() - criadaEm.getTime() > JANELA_EDICAO_MS) {
      throw new ForbiddenException(
        'Janela de edição expirou (15 minutos após a criação)',
      );
    }
    if (dto.nota !== undefined) aval.nota = dto.nota;
    if (dto.comentario !== undefined) aval.comentario = dto.comentario;
    await aval.save();
    return aval.populate('usuarioId', 'nome');
  }

  async remover(id: string, usuarioAtualId: string) {
    const aval = await this.avaliacaoModel.findById(id);
    if (!aval) throw new NotFoundException('Avaliação não encontrada');
    if (!aval.usuarioId.equals(usuarioAtualId)) {
      throw new ForbiddenException(
        'Você só pode excluir suas próprias avaliações',
      );
    }
    const criadaEm = (aval as any).criadaEm as Date | undefined;
    if (criadaEm && Date.now() - criadaEm.getTime() > JANELA_EDICAO_MS) {
      throw new ForbiddenException(
        'Janela de exclusão expirou (15 minutos após a criação)',
      );
    }
    await aval.deleteOne();
    return { removida: true } as const;
  }

  async responder(id: string, texto: string, artistaAtualId: string) {
    const aval = await this.avaliacaoModel.findById(id);
    if (!aval) throw new NotFoundException('Avaliação não encontrada');
    if (!aval.artistaId.equals(artistaAtualId)) {
      throw new ForbiddenException(
        'Só o artista avaliado pode responder esta avaliação',
      );
    }
    aval.respostaArtista = { texto, respondidaEm: new Date() };
    await aval.save();
    return aval.populate('usuarioId', 'nome');
  }

  async removerResposta(id: string, artistaAtualId: string) {
    const aval = await this.avaliacaoModel.findById(id);
    if (!aval) throw new NotFoundException('Avaliação não encontrada');
    if (!aval.artistaId.equals(artistaAtualId)) {
      throw new ForbiddenException(
        'Só o artista avaliado pode remover esta resposta',
      );
    }
    const respondidaEm = aval.respostaArtista?.respondidaEm;
    if (
      respondidaEm &&
      Date.now() - new Date(respondidaEm).getTime() > JANELA_EDICAO_MS
    ) {
      throw new ForbiddenException(
        'Janela de exclusão da resposta expirou (15 minutos após responder)',
      );
    }
    aval.respostaArtista = undefined;
    await aval.save();
    return aval.populate('usuarioId', 'nome');
  }
}
