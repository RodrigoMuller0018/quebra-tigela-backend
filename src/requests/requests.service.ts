import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Solicitacao, SolicitacaoDocument } from './schemas/request.schema';
import { CriarSolicitacaoDto } from './dto/create-request.dto';
import { ItemAgenda, ItemAgendaDocument } from '../schedule/schemas/schedule.schema';
import { Artista, ArtistaDocument } from '../artists/schemas/artist.schema';

type StatusSolicitacao =
  | 'aceita'
  | 'aguardando_confirmacao'
  | 'concluida'
  | 'recusada'
  | 'cancelada';

/** Após X dias em aguardando_confirmacao, sistema considera concluída. */
const DIAS_AUTO_CONFIRMACAO = 7;

@Injectable()
export class RequestsService {
  constructor(
    @InjectModel(Solicitacao.name) private solicModel: Model<SolicitacaoDocument>,
    @InjectModel(ItemAgenda.name) private agendaModel: Model<ItemAgendaDocument>,
    @InjectModel(Artista.name) private artistaModel: Model<ArtistaDocument>,
  ) {}

  async criar(dto: CriarSolicitacaoDto, usuarioAtualId: string) {
    const { inicio, fim } = this.parseEValidarInstantes(dto.inicio, dto.fim);
    this.validarNaoRetroativo(inicio);

    const usuarioId = new Types.ObjectId(usuarioAtualId);
    const artistaId = new Types.ObjectId(dto.artistaId);
    const servicoId = new Types.ObjectId(dto.servicoId);

    // Bloqueia auto-solicitação: artista não pode contratar a si mesmo
    const artistaDoc = await this.artistaModel
      .findById(artistaId)
      .select('usuarioId')
      .lean();
    if (!artistaDoc) {
      throw new NotFoundException('Artista não encontrado');
    }
    if (artistaDoc.usuarioId.equals(usuarioId)) {
      throw new BadRequestException(
        'Você não pode solicitar um serviço a si mesmo',
      );
    }

    let agendaObjectId: Types.ObjectId | undefined;

    if (dto.agendaId) {
      // Caminho A: reserva ancorada num slot
      agendaObjectId = new Types.ObjectId(dto.agendaId);
      const slot = await this.agendaModel.findById(agendaObjectId);
      if (!slot) {
        throw new NotFoundException('Slot da agenda não encontrado');
      }
      if (!slot.artistaId.equals(artistaId)) {
        throw new BadRequestException(
          'O slot informado não pertence a este artista',
        );
      }
      if (slot.status !== 'disponivel') {
        throw new ConflictException('Este horário não está disponível');
      }
      slot.status = 'pendente';
      slot.clienteId = usuarioId;
      await slot.save();
    } else {
      // Caminho B: solicitação livre — verifica colisão com slots reservada/pendente
      const conflito = await this.agendaModel.findOne({
        artistaId,
        status: { $in: ['reservada', 'pendente'] },
        inicio: { $lt: fim },
        fim: { $gt: inicio },
      });
      if (conflito) {
        throw new ConflictException(
          `Este horário choca com um agendamento existente (${conflito.inicio.toISOString()} → ${conflito.fim.toISOString()}). Escolha outro horário.`,
        );
      }
    }

    try {
      const criada = await this.solicModel.create({
        usuarioId,
        artistaId,
        servicoId,
        agendaId: agendaObjectId,
        inicio,
        fim,
        local: dto.local,
        detalhes: dto.detalhes,
      });
      return criada.toObject();
    } catch (e) {
      if (agendaObjectId) {
        await this.agendaModel.updateOne(
          { _id: agendaObjectId, status: 'pendente' },
          { $set: { status: 'disponivel' }, $unset: { clienteId: '' } },
        );
      }
      throw e;
    }
  }

  async mudarStatus(
    id: string,
    status: StatusSolicitacao,
    usuarioAtual: { sub: string; papel: string; artistaId?: string },
  ) {
    const sol = await this.solicModel.findById(id);
    if (!sol) throw new NotFoundException('Solicitação não encontrada');

    this.validarTransicaoStatus(sol.status, status, sol, usuarioAtual);

    sol.status = status;
    if (status === 'aguardando_confirmacao') {
      sol.marcadaConcluidaEm = new Date();
    }
    await sol.save();

    await this.sincronizarAgendaComSolicitacao(sol, status);

    return sol;
  }

  async porUsuario(usuarioId: string) {
    await this.autoConfirmarExpiradas(usuarioId, 'usuario');
    return this.solicModel
      .find({ usuarioId: new Types.ObjectId(usuarioId) })
      .sort({ solicitadaEm: -1 });
  }

  async porArtista(artistaId: string) {
    await this.autoConfirmarExpiradas(artistaId, 'artista');
    return this.solicModel
      .find({ artistaId: new Types.ObjectId(artistaId) })
      .sort({ solicitadaEm: -1 });
  }

  // ---------- helpers privados ----------

  private parseEValidarInstantes(
    inicioIso: string,
    fimIso: string,
  ): { inicio: Date; fim: Date } {
    const inicio = new Date(inicioIso);
    const fim = new Date(fimIso);
    if (Number.isNaN(inicio.getTime())) {
      throw new BadRequestException('inicio inválido');
    }
    if (Number.isNaN(fim.getTime())) {
      throw new BadRequestException('fim inválido');
    }
    if (inicio >= fim) {
      throw new BadRequestException('inicio deve ser anterior a fim');
    }
    return { inicio, fim };
  }

  private validarNaoRetroativo(inicio: Date) {
    if (inicio.getTime() < Date.now()) {
      throw new BadRequestException(
        'Não é possível criar solicitação com início no passado',
      );
    }
  }

  /**
   * Máquina de estados:
   *   pendente → aceita | recusada | cancelada
   *   aceita → aguardando_confirmacao | cancelada
   *   aguardando_confirmacao → concluida (cliente OU auto) | aceita (cliente "não realizei")
   *   concluida / recusada / cancelada → FIM
   */
  private validarTransicaoStatus(
    statusAtual: string,
    proximoStatus: StatusSolicitacao,
    sol: SolicitacaoDocument,
    usuarioAtual: { sub: string; papel: string; artistaId?: string },
  ) {
    const ehArtista = !!usuarioAtual.artistaId && sol.artistaId.equals(usuarioAtual.artistaId);
    const ehCliente = sol.usuarioId.equals(usuarioAtual.sub);

    if (!ehArtista && !ehCliente) {
      throw new ForbiddenException(
        'Você não tem permissão sobre esta solicitação',
      );
    }

    if (
      statusAtual === 'concluida' ||
      statusAtual === 'cancelada' ||
      statusAtual === 'recusada'
    ) {
      throw new BadRequestException(
        `Solicitação ${statusAtual} é final e não pode ser alterada`,
      );
    }

    const transicaoClientePermitida =
      (proximoStatus === 'cancelada' &&
        (statusAtual === 'pendente' || statusAtual === 'aceita')) ||
      (proximoStatus === 'concluida' &&
        statusAtual === 'aguardando_confirmacao') ||
      (proximoStatus === 'aceita' &&
        statusAtual === 'aguardando_confirmacao');

    const transicaoArtistaPermitida =
      (proximoStatus === 'aceita' && statusAtual === 'pendente') ||
      (proximoStatus === 'recusada' && statusAtual === 'pendente') ||
      (proximoStatus === 'aguardando_confirmacao' &&
        statusAtual === 'aceita') ||
      (proximoStatus === 'cancelada' &&
        (statusAtual === 'pendente' || statusAtual === 'aceita'));

    // Em auto-solicitações antigas (cliente == artista do request), prioriza a
    // ação de cliente — se ela existir. Senão tenta artista. Pra solicitações
    // normais o resultado é igual ao branching original.
    if (ehCliente && transicaoClientePermitida) {
      return;
    }
    if (ehCliente && !ehArtista) {
      throw new ForbiddenException(
        'Cliente não pode fazer essa transição de status',
      );
    }
    if (ehArtista) {
      const permitido = transicaoArtistaPermitida;
      if (!permitido) {
        throw new ForbiddenException(
          'Artista não pode fazer essa transição de status',
        );
      }
    }
  }

  private async sincronizarAgendaComSolicitacao(
    sol: SolicitacaoDocument,
    status: StatusSolicitacao,
  ) {
    if (status === 'aceita') {
      let slotReservadoId: Types.ObjectId;

      if (sol.agendaId) {
        await this.agendaModel.updateOne(
          { _id: sol.agendaId },
          { $set: { status: 'reservada' } },
        );
        slotReservadoId = sol.agendaId;
      } else {
        const criado = await this.agendaModel.create({
          artistaId: sol.artistaId,
          inicio: sol.inicio,
          fim: sol.fim,
          status: 'reservada',
          clienteId: sol.usuarioId,
          servicoId: sol.servicoId,
        });
        slotReservadoId = criado._id;
      }

      // Engole slots disponíveis que sobreponham o intervalo reservado
      await this.agendaModel.deleteMany({
        _id: { $ne: slotReservadoId },
        artistaId: sol.artistaId,
        status: 'disponivel',
        inicio: { $lt: sol.fim },
        fim: { $gt: sol.inicio },
      });
    }

    if (status === 'aguardando_confirmacao') {
      // Slot continua reservada
    }

    if (status === 'concluida') {
      if (sol.agendaId) {
        await this.agendaModel.updateOne(
          { _id: sol.agendaId },
          { $set: { status: 'concluida' } },
        );
      } else {
        await this.agendaModel.updateOne(
          {
            artistaId: sol.artistaId,
            inicio: sol.inicio,
            fim: sol.fim,
            status: 'reservada',
          },
          { $set: { status: 'concluida' } },
        );
      }
    }

    if (status === 'recusada' || status === 'cancelada') {
      if (sol.agendaId) {
        await this.agendaModel.updateOne(
          { _id: sol.agendaId },
          {
            $set: { status: 'disponivel' },
            $unset: { clienteId: '' },
          },
        );
      }
    }
  }

  private async autoConfirmarExpiradas(
    donoId: string,
    tipoDono: 'usuario' | 'artista',
  ) {
    const corte = new Date(
      Date.now() - DIAS_AUTO_CONFIRMACAO * 24 * 3600 * 1000,
    );
    const filtro =
      tipoDono === 'usuario'
        ? { usuarioId: new Types.ObjectId(donoId) }
        : { artistaId: new Types.ObjectId(donoId) };

    const expiradas = await this.solicModel.find({
      ...filtro,
      status: 'aguardando_confirmacao',
      marcadaConcluidaEm: { $lte: corte },
    });

    for (const sol of expiradas) {
      sol.status = 'concluida';
      await sol.save();
      await this.sincronizarAgendaComSolicitacao(sol, 'concluida');
    }
  }
}
