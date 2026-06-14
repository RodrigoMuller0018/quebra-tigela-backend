import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateServiceOfferingDto {
  @IsString() @MaxLength(200) title!: string;
  @IsOptional() @IsString() @MaxLength(5000) description?: string;
  @IsOptional() @IsArray() media?: { type: 'image' | 'video'; url: string }[];
  @IsOptional() @IsBoolean() active?: boolean;
}
