import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({
  timestamps: { createdAt: 'criadoEm', updatedAt: 'atualizadoEm' },
  collection: 'artistas',
})
export class Artista {
  _id!: Types.ObjectId;

  /**
   * FK para Usuario. É o que liga o perfil artístico ao usuário base.
   * Toda pessoa tem Usuario; só vira artista quem cria um Artista linkado.
   */
  @Prop({ type: Types.ObjectId, ref: 'Usuario', required: true, unique: true, index: true })
  usuarioId!: Types.ObjectId;

  /**
   * Handle público estilo @username — usado em URLs (/artistas/@marinaarte).
   * Único, lowercase, 3-30 chars [a-z0-9_]. Auto-gerado a partir do nome se não
   * for informado no cadastro.
   */
  @Prop({ required: true, unique: true, lowercase: true, index: true })
  handle!: string;

  @Prop()
  bio?: string;

  @Prop({ default: false })
  verificado!: boolean;

  /** Soft delete: quando o artista pausa o perfil, fica false e some das buscas */
  @Prop({ default: true, index: true })
  ativo!: boolean;

  /** Quando o perfil foi pausado (null se ativo) */
  @Prop()
  desativadoEm?: Date;

  @Prop({ type: [String], index: true })
  tiposArte!: string[];

  /**
   * Telefone normalizado: só dígitos com DDI (ex: "5511999998888").
   * Usado pra montar links wa.me. Obrigatório pra virar artista — sem telefone,
   * cliente não consegue te contatar fora da plataforma.
   */
  @Prop({ required: true })
  telefone!: string;

  /** Nome artístico / stage name (opcional). Pode ser diferente do nome real (que fica em Usuario). */
  @Prop()
  nomeArtistico?: string;

  /** Data de nascimento (ISO yyyy-mm-dd). Opcional. */
  @Prop()
  dataNascimento?: string;

  /** URL pro portfólio externo (Behance, site próprio, etc.) */
  @Prop()
  portfolio?: string;

  /** URLs das redes sociais (Instagram, YouTube, TikTok, Spotify, etc.) */
  @Prop({ type: [String], default: [] })
  redesSociais!: string[];

  /** Contador de visualizações do perfil público. Self-views são ignoradas. */
  @Prop({ default: 0 })
  visualizacoes!: number;
}
export type ArtistaDocument = HydratedDocument<Artista>;
export const ArtistaSchema = SchemaFactory.createForClass(Artista);
ArtistaSchema.index({ ativo: 1, verificado: 1 });
ArtistaSchema.index({ tiposArte: 1, ativo: 1, verificado: 1 });
