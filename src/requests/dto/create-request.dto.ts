import {
  IsDateString,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CriarSolicitacaoDto {
  @IsMongoId() artistaId!: string;
  @IsMongoId() servicoId!: string;

  @IsOptional()
  @IsMongoId()
  agendaId?: string;

  /** ISO 8601 com timezone (ex: 2026-06-21T22:00:00-03:00) */
  @IsDateString()
  inicio!: string;

  /** ISO 8601 com timezone. Deve ser > inicio. */
  @IsDateString()
  fim!: string;

  @IsString()
  @MaxLength(300)
  local!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  detalhes?: string;
}
