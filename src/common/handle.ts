/**
 * Utilitários de handle (username público do artista).
 * Formato: 3-30 caracteres, só [a-z0-9_], sempre minúsculo.
 * Aparece em URLs públicas como /artistas/@marinaarte.
 */

export const REGEX_HANDLE = /^[a-z0-9_]{3,30}$/;

/**
 * Handles reservados pelo sistema — nunca podem ser escolhidos por usuários.
 * Inclui rotas do app, identidades especiais e palavras potencialmente confusas.
 */
export const HANDLES_RESERVADOS = new Set([
  // identidades especiais
  'admin', 'administrador', 'root', 'system', 'sistema', 'staff', 'oficial',
  'verificado', 'support', 'suporte', 'help', 'ajuda', 'moderador',
  // rotas do app
  'api', 'auth', 'autenticacao', 'login', 'logout', 'registrar', 'registro',
  'eu', 'me', 'perfil', 'profile', 'configuracoes', 'settings', 'dashboard',
  'home', 'inicio', 'contato', 'sobre', 'about', 'busca', 'buscar', 'search',
  'explorar', 'artistas', 'artista', 'cliente', 'clientes', 'usuario',
  'usuarios', 'agenda', 'servicos', 'servico', 'solicitacoes', 'solicitacao',
  'avaliacoes', 'avaliacao', 'reviews', 'review',
  // tecnicos
  'static', 'public', 'assets', 'app', 'cdn', 'static', 'media',
  // literais perigosos
  'null', 'undefined', 'true', 'false', 'nan', 'void',
  // termos comuns que confundem usuários
  'tornar-se-artista', 'tornar_se_artista', 'editar', 'criar', 'novo', 'nova',
]);

/**
 * Converte um texto livre (ex: nome) numa base pra handle.
 * Remove acentos, mantém só [a-z0-9_], limita a 30 chars.
 * Pode retornar string vazia (caller deve tratar).
 */
export function slugificarParaHandle(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '')
    .slice(0, 30);
}

/**
 * Valida apenas o formato (regex + reservados). Não checa unicidade no banco —
 * pra isso usa ArtistsService.handleDisponivel().
 */
export function validarFormatoHandle(
  handle: string,
): { valido: boolean; motivo?: string } {
  if (!handle || typeof handle !== 'string') {
    return { valido: false, motivo: "Handle inválido" };
  }
  if (!REGEX_HANDLE.test(handle)) {
    return {
      valido: false,
      motivo:
        'Handle deve ter 3-30 caracteres usando apenas letras minúsculas, números e _',
    };
  }
  if (HANDLES_RESERVADOS.has(handle)) {
    return { valido: false, motivo: 'Esse handle é reservado pelo sistema' };
  }
  return { valido: true };
}

/**
 * Shape mínimo necessário pra checar/criar handles. AuthService e ArtistsService
 * passam o artistaModel próprio — evita dependência circular entre módulos.
 */
interface ArtistaHandleModel {
  exists(filter: { handle: string }): Promise<unknown>;
}

/**
 * Gera handle único a partir de uma string base (nome do usuário).
 * Slugifica + adiciona sufixo numérico até achar livre.
 */
export async function gerarHandleUnico(
  nomeBase: string,
  artistaModel: ArtistaHandleModel,
): Promise<string> {
  let base = slugificarParaHandle(nomeBase);
  if (base.length < 3) base = 'artista';
  if (base.length > 27) base = base.slice(0, 27);

  let candidato = base;
  let n = 2;
  while (await artistaModel.exists({ handle: candidato })) {
    candidato = `${base}${n++}`;
    if (n > 100) {
      candidato = `${base}${Date.now()}`.slice(0, 30);
      break;
    }
  }
  return candidato;
}

