import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UsuarioJwt } from './current-user.decorator';

@Injectable()
export class PapeisGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const papeisExigidos = this.reflector.getAllAndOverride<string[]>('papeis', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!papeisExigidos || papeisExigidos.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: UsuarioJwt }>();
    const user = request.user;
    if (!user) return false;

    // Com composition pattern, o "papel" no JWT é só 'cliente' ou 'admin'.
    // 'artista' é uma capability — definida por ter temPerfilArtista=true.
    for (const p of papeisExigidos) {
      if (p === 'admin' && user.papel === 'admin') return true;
      if (p === 'cliente') return true; // todo usuário logado é cliente
      if (p === 'artista' && user.temPerfilArtista) return true;
    }
    return false;
  }
}
