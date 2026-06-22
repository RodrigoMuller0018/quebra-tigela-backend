import { Body, Controller, Post } from '@nestjs/common';
import { PasswordResetService } from './password-reset.service';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ValidateResetCodeDto } from './dto/validate-reset-code.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('autenticacao/recuperar-senha')
export class PasswordResetController {
  constructor(private readonly service: PasswordResetService) {}

  @Post('solicitar')
  solicitar(@Body() dto: RequestPasswordResetDto) {
    return this.service.pedirReset(dto.email);
  }

  @Post('validar')
  validar(@Body() dto: ValidateResetCodeDto) {
    return this.service.validarCodigo(dto.email, dto.code);
  }

  @Post('redefinir')
  redefinir(@Body() dto: ResetPasswordDto) {
    return this.service.redefinirSenha(dto.email, dto.code, dto.newPassword);
  }
}
