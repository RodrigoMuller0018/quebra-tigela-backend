import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('autenticacao')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('registrar/usuario')
  registrarUsuario(@Body() dto: any) {
    return this.auth.registrarUsuario(dto);
  }

  @Post('registrar/artista')
  registrarArtista(@Body() dto: any) {
    return this.auth.registrarArtista(dto);
  }

  @Post('login')
  login(@Body() dto: { email: string; senha: string }) {
    return this.auth.login(dto.email, dto.senha);
  }

  /** Reativa conta desativada (chamado após o usuário confirmar no modal). */
  @Post('reativar')
  reativarConta(@Body() dto: { email: string; senha: string }) {
    return this.auth.reativarConta(dto.email, dto.senha);
  }
}
