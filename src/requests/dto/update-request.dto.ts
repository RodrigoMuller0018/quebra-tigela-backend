import { IsIn } from 'class-validator';

export const transicoesStatusSolicitacaoPermitidas = [
  'aceita',
  'aguardando_confirmacao',
  'concluida',
  'recusada',
  'cancelada',
] as const;

export type EntradaStatusSolicitacao =
  (typeof transicoesStatusSolicitacaoPermitidas)[number];

export class AtualizarStatusSolicitacaoDto {
  @IsIn(transicoesStatusSolicitacaoPermitidas)
  status!: EntradaStatusSolicitacao;
}
