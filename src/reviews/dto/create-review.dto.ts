import {
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CriarAvaliacaoDto {
  @IsMongoId() solicitacaoId!: string;
  @IsInt() @Min(1) @Max(5) nota!: number;
  @IsOptional() @IsString() @MaxLength(1000) comentario?: string;
}
