import {
  IsDateString,
  IsIn,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  statusAgendaValores,
  type StatusAgenda,
} from './create-schedule.dto';

export class AtualizarItemAgendaDto {
  @IsOptional()
  @IsMongoId()
  artistaId?: string;

  @IsOptional()
  @IsDateString()
  inicio?: string;

  @IsOptional()
  @IsDateString()
  fim?: string;

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
}
