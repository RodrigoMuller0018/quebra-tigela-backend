import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CriarServicoDto {
  @IsString() @MaxLength(200) titulo!: string;
  @IsOptional() @IsString() @MaxLength(5000) descricao?: string;
  @IsOptional() @IsArray() midia?: { tipo: 'imagem' | 'video'; url: string }[];
  @IsOptional() @IsBoolean() ativo?: boolean;
}
