import {
  IsDateString,
  IsIn,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export const statusAgendaValores = [
  'disponivel',
  'pendente',
  'reservada',
  'concluida',
  'cancelada',
] as const;
export type StatusAgenda = (typeof statusAgendaValores)[number];

export class CriarItemAgendaDto {
  @IsMongoId()
  artistaId!: string;

  /** ISO 8601 com timezone (ex: 2026-06-21T22:00:00-03:00) */
  @IsDateString()
  inicio!: string;

  /** ISO 8601 com timezone. Deve ser estritamente > inicio. */
  @IsDateString()
  fim!: string;

  @IsOptional()
  @IsIn(statusAgendaValores)
  status?: StatusAgenda;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacoes?: string;

  @IsOptional()
  @IsMongoId()
  servicoId?: string;

  @IsOptional()
  @IsMongoId()
  clienteId?: string;
}
