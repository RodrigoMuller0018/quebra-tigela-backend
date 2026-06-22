import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Igual ao JwtAuthGuard, mas NÃO rejeita quando o token está ausente/expirado.
 * Útil pra endpoints públicos que precisam saber quem é o usuário SE estiver
 * logado (ex: contador de visualizações que ignora self-views).
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(_err: any, user: any) {
    return user || null;
  }
}
