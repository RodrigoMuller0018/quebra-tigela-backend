import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Papel } from '../../common/enums/papel.enum';

@Schema({
  timestamps: { createdAt: 'criadoEm', updatedAt: 'atualizadoEm' },
  collection: 'usuarios',
})
export class Usuario {
  _id!: string;

  @Prop({ required: true })
  nome!: string;

  @Prop({ required: true, unique: true, lowercase: true, index: true })
  email!: string;

  @Prop({ required: true })
  senhaHash!: string;

  @Prop()
  cidade?: string;

  @Prop()
  estado?: string;

  @Prop({ enum: Object.values(Papel), default: Papel.CLIENTE })
  papel!: string;

  /** Foto de perfil — data URL base64 (data:image/jpeg;base64,...) ou URL futura de CDN */
  @Prop()
  fotoPerfil?: string;

  /**
   * Soft delete: quando a pessoa desativa a conta, esse campo recebe a data.
   * Login bem-sucedido reativa automaticamente (limpa o campo + reativa o Artista linkado).
   * Buscas/listagens públicas ignoram contas com esse campo presente.
   */
  @Prop({ index: true })
  desativadaEm?: Date;
}
export type UsuarioDocument = HydratedDocument<Usuario>;
export const UsuarioSchema = SchemaFactory.createForClass(Usuario);
UsuarioSchema.index({ email: 1 }, { unique: true });
