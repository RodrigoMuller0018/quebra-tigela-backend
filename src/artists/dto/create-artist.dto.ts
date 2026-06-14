import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const PROFILE_PIC_REGEX = /^(data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+|https?:\/\/.+)$/;

export class CreateArtistDto {
  @IsString({ message: "O campo 'nome' deve ser um texto" })
  @IsNotEmpty({ message: "O campo 'nome' é obrigatório" })
  name: string;

  @IsEmail(
    {},
    { message: "O campo 'email' deve ser um endereço de e-mail válido" },
  )
  @IsNotEmpty({ message: "O campo 'email' é obrigatório" })
  email: string;

  @IsString({ message: "O campo 'senha' deve ser um texto" })
  @MinLength(6, { message: "O campo 'senha' deve ter no mínimo 6 caracteres" })
  @IsNotEmpty({ message: "O campo 'senha' é obrigatório" })
  password: string;

  @IsOptional()
  @IsString({ message: "O campo 'bio' deve ser um texto" })
  bio?: string;

  @IsOptional()
  @IsString({ message: "O campo 'cidade' deve ser um texto" })
  city?: string;

  @IsOptional()
  @IsString({ message: "O campo 'estado' deve ser um texto" })
  state?: string;

  @IsOptional()
  @IsBoolean({ message: "O campo 'verificado' deve ser verdadeiro ou falso" })
  verified?: boolean;

  @IsArray({ message: "O campo 'artTypes' deve ser uma lista de textos" })
  @IsNotEmpty({
    message: "O campo 'artTypes' é obrigatório e não pode estar vazio",
  })
  artTypes: string[];

  @IsOptional()
  @IsString({ message: "O campo 'nome artístico' deve ser um texto" })
  artisticName?: string;

  @IsOptional()
  @IsString({
    message: "O campo 'data de nascimento' deve ser uma data válida",
  })
  birthDate?: string;

  @IsOptional()
  @IsString({ message: "O campo 'documento com foto' deve ser um texto" })
  documentPhoto?: string;

  @IsOptional()
  @IsBoolean({ message: "O campo 'possui MEI' deve ser verdadeiro ou falso" })
  hasMEI?: boolean;

  @IsOptional()
  @IsString({ message: "O campo 'CCMEI' deve ser um texto" })
  ccmeiCertificate?: string;

  @IsOptional()
  @IsString({ message: "O campo 'grau de instrução' deve ser um texto" })
  educationLevel?: string;

  @IsOptional()
  @IsString({ message: "O campo 'segmento cultural' deve ser um texto" })
  culturalSegment?: string;

  @IsOptional()
  @IsString({ message: "O campo 'função específica' deve ser um texto" })
  specificFunction?: string;

  @IsOptional()
  @IsString({ message: "O campo 'qualificação' deve ser um texto" })
  qualification?: string;

  @IsOptional()
  @IsString({ message: "O campo 'portfólio' deve ser um texto" })
  portfolio?: string;

  @IsOptional()
  @IsArray({ message: "O campo 'redes sociais' deve ser uma lista de textos" })
  socialLinks?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500_000, { message: 'Foto excede 500KB — reduza ou comprima' })
  @Matches(PROFILE_PIC_REGEX, {
    message: 'profilePicture deve ser data URL base64 ou http(s) URL',
  })
  profilePicture?: string;
}
