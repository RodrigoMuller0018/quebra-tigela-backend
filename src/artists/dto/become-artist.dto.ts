import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
} from 'class-validator';
import { REGEX_TELEFONE_BR } from '../../common/telefone';
import { REGEX_HANDLE } from '../../common/handle';

/**
 * Pra um Usuario existente virar artista. Pega usuarioId do JWT, não do body.
 * Não recebe nome/email/senha — já estão no Usuario base.
 */
export class TornarSeArtistaDto {
  @IsOptional()
  @IsString({ message: "O campo 'bio' deve ser um texto" })
  @MaxLength(2000)
  bio?: string;

  @IsArray({ message: "O campo 'tiposArte' deve ser uma lista de textos" })
  @IsNotEmpty({
    message: "O campo 'tiposArte' é obrigatório e não pode estar vazio",
  })
  tiposArte!: string[];

  /**
   * Handle público (estilo @username). Opcional — se não vier, backend auto-gera
   * a partir do nome do usuário com sufixo numérico em caso de colisão.
   */
  @IsOptional()
  @IsString({ message: "O campo 'handle' deve ser um texto" })
  @Matches(REGEX_HANDLE, {
    message:
      "Handle deve ter 3-30 caracteres com apenas letras minúsculas, números e _",
  })
  handle?: string;

  /**
   * Telefone celular brasileiro normalizado (55 + DDD + 9 + 8 dígitos).
   * Frontend deve normalizar antes de enviar.
   */
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
}
