import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { REGEX_TELEFONE_BR } from '../../common/telefone';
import { REGEX_HANDLE } from '../../common/handle';

const FOTO_PERFIL_REGEX = /^(data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+|https?:\/\/.+)$/;

/**
 * DTO usado pelo /autenticacao/registrar/artista (caminho público).
 * Mistura campos de Usuario base (nome/email/senha/cidade/estado/fotoPerfil)
 * com campos de Artista (bio/tiposArte/etc.). O service separa.
 */
export class CriarArtistaDto {
  @IsString({ message: "O campo 'nome' deve ser um texto" })
  @IsNotEmpty({ message: "O campo 'nome' é obrigatório" })
  nome!: string;

  @IsEmail(
    {},
    { message: "O campo 'email' deve ser um endereço de e-mail válido" },
  )
  @IsNotEmpty({ message: "O campo 'email' é obrigatório" })
  email!: string;

  @IsString({ message: "O campo 'senha' deve ser um texto" })
  @MinLength(6, { message: "O campo 'senha' deve ter no mínimo 6 caracteres" })
  @IsNotEmpty({ message: "O campo 'senha' é obrigatório" })
  senha!: string;

  @IsOptional()
  @IsString({ message: "O campo 'bio' deve ser um texto" })
  @MaxLength(2000)
  bio?: string;

  @IsOptional()
  @IsString({ message: "O campo 'cidade' deve ser um texto" })
  cidade?: string;

  @IsOptional()
  @IsString({ message: "O campo 'estado' deve ser um texto" })
  estado?: string;

  @IsOptional()
  @IsBoolean({ message: "O campo 'verificado' deve ser verdadeiro ou falso" })
  verificado?: boolean;

  @IsArray({ message: "O campo 'tiposArte' deve ser uma lista de textos" })
  @IsNotEmpty({
    message: "O campo 'tiposArte' é obrigatório e não pode estar vazio",
  })
  tiposArte!: string[];

  /** Handle público opcional — auto-gerado se omitido. */
  @IsOptional()
  @IsString({ message: "O campo 'handle' deve ser um texto" })
  @Matches(REGEX_HANDLE, {
    message:
      "Handle deve ter 3-30 caracteres com apenas letras minúsculas, números e _",
  })
  handle?: string;

  /** Telefone celular brasileiro normalizado (55 + DDD + 9 + 8 dígitos) */
  @IsString({ message: "O campo 'telefone' deve ser um texto" })
  @Matches(REGEX_TELEFONE_BR, {
    message:
      "O campo 'telefone' deve ser um celular brasileiro válido (com DDI 55, DDD e 9 inicial)",
  })
  telefone!: string;

  @IsOptional()
  @IsString({ message: "O campo 'nome artístico' deve ser um texto" })
  @MaxLength(120)
  nomeArtistico?: string;

  @IsOptional()
  @IsDateString(
    {},
    { message: "O campo 'data de nascimento' deve ser uma data válida (yyyy-mm-dd)" },
  )
  dataNascimento?: string;

  @IsOptional()
  @IsUrl({}, { message: "O campo 'portfólio' deve ser uma URL válida" })
  @MaxLength(500)
  portfolio?: string;

  @IsOptional()
  @IsArray({ message: "O campo 'redes sociais' deve ser uma lista de URLs" })
  @IsUrl(
    {},
    {
      each: true,
      message: "Cada entrada em 'redes sociais' deve ser uma URL válida",
    },
  )
  redesSociais?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500_000, { message: 'Foto excede 500KB — reduza ou comprima' })
  @Matches(FOTO_PERFIL_REGEX, {
    message: 'fotoPerfil deve ser data URL base64 ou http(s) URL',
  })
  fotoPerfil?: string;
}
