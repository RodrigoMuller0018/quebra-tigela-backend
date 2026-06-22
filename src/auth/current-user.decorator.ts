import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface UsuarioJwt {
  /** Usuario._id sempre (nunca Artista._id). É a identidade base. */
  sub: string;
  /** Papel base do Usuario. 'admin' é especial; 'cliente' é o padrão (todo mundo é cliente). */
  papel: 'cliente' | 'admin';
  email: string;
  /** Indica se o usuário tem perfil de Artista linkado. */
  temPerfilArtista: boolean;
  /** Artista._id se temPerfilArtista=true. Undefined caso contrário. */
  artistaId?: string;
}

export const UsuarioAtual = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UsuarioJwt => {
    const request = ctx.switchToHttp().getRequest<{ user: UsuarioJwt }>();
    return request.user;
  },
);
