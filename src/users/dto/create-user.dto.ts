import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

// Aceita data URL base64 (data:image/png|jpeg|webp;base64,...) OU http(s) URL
const PROFILE_PIC_REGEX = /^(data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+|https?:\/\/.+)$/;

export class CreateUserDto {
  @IsString() name!: string;
  @IsEmail() email!: string;
  @MinLength(6) password!: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional()
  @IsString()
  @MaxLength(500_000, { message: 'Foto excede 500KB — reduza ou comprima' })
  @Matches(PROFILE_PIC_REGEX, { message: 'profilePicture deve ser data URL base64 ou http(s) URL' })
  profilePicture?: string;
}
