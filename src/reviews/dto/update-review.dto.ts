import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class AtualizarAvaliacaoDto {
  @IsOptional() @IsInt() @Min(1) @Max(5) nota?: number;
  @IsOptional() @IsString() @MaxLength(1000) comentario?: string;
}
