import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const FOTO_PERFIL_REGEX = /^(data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+|https?:\/\/.+)$/;

export class CriarUsuarioDto {
  @IsString() nome!: string;
  @IsEmail() email!: string;
  @MinLength(6) senha!: string;
  @IsOptional() @IsString() cidade?: string;
  @IsOptional() @IsString() estado?: string;
  @IsOptional()
  @IsString()
  @MaxLength(500_000, { message: 'Foto excede 500KB — reduza ou comprima' })
  @Matches(FOTO_PERFIL_REGEX, { message: 'fotoPerfil deve ser data URL base64 ou http(s) URL' })
  fotoPerfil?: string;
}
