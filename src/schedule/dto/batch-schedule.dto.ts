import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, ValidateNested } from 'class-validator';
import { CriarItemAgendaDto } from './create-schedule.dto';

export class CriarItensAgendaEmLoteDto {
  @ValidateNested({ each: true })
  @Type(() => CriarItemAgendaDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  itens!: CriarItemAgendaDto[];
}
