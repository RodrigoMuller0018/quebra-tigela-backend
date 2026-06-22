import { IsString, MaxLength, MinLength } from 'class-validator';

export class ResponderAvaliacaoDto {
  @IsString() @MinLength(1) @MaxLength(1000) texto!: string;
}
