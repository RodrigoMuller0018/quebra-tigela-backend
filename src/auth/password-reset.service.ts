import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  PasswordReset,
  PasswordResetDocument,
} from './schemas/password-reset.schema';
import { Usuario, UsuarioDocument } from '../users/schemas/user.schema';
import { PasswordResetMailService } from '../mail/password-reset.mail.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PasswordResetService {
  constructor(
    @InjectModel(PasswordReset.name)
    private resetModel: Model<PasswordResetDocument>,
    @InjectModel(Usuario.name)
    private usuarioModel: Model<UsuarioDocument>,
    private mailService: PasswordResetMailService,
  ) {}

  async pedirReset(email: string) {
    const usuario = await this.usuarioModel.findOne({ email: email.toLowerCase() });
    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    const expiraEm = new Date(Date.now() + 6 * 60 * 1000);

    await this.resetModel.create({ email, code: codigo, expiresAt: expiraEm, used: false });
    await this.mailService.sendResetCode(email, codigo);
    return { mensagem: 'Código enviado para o e-mail' };
  }

  async validarCodigo(email: string, codigo: string) {
    const reset = await this.resetModel.findOne({ email, code: codigo, used: false });
    if (!reset || reset.expiresAt < new Date())
      throw new BadRequestException('Código inválido ou expirado');
    return { valido: true };
  }

  async redefinirSenha(email: string, codigo: string, novaSenha: string) {
    const reset = await this.resetModel.findOne({ email, code: codigo, used: false });
    if (!reset || reset.expiresAt < new Date())
      throw new BadRequestException('Código inválido ou expirado');

    const usuario = await this.usuarioModel.findOne({ email: email.toLowerCase() });
    if (!usuario) throw new NotFoundException('Usuário não encontrado');

    usuario.senhaHash = await bcrypt.hash(novaSenha, 10);
    await usuario.save();

    reset.used = true;
    await reset.save();

    return { mensagem: 'Senha redefinida com sucesso' };
  }
}
