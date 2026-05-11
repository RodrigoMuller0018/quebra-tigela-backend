import * as path from 'node:path';
import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';
import { PasswordResetMailService } from './password-reset.mail.service';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  providers: [PasswordResetMailService],
  exports: [PasswordResetMailService],
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        transport: {
          host: config.get<string>('SMTP_HOST'),
          port: config.get<number>('SMTP_PORT'),
          secure: false, 
          auth: {
            user: config.get<string>('SMTP_USER'),
            pass: config.get<string>('SMTP_PASSWORD'),
          },
        },
        defaults: {
          from:
            config.get<string>('SMTP_FROM') || 'noreply@quebratigela.com.br',
        },
        template: {
          dir: path.join(process.cwd(), 'src/shared/assets/templates'),
          adapter: new HandlebarsAdapter(),
          options: { strict: true },
        },
        options: {
          partials: {
            dir: path.join(
              process.cwd(),
              'src/shared/assets/templates/partials',
            ),
            options: { strict: true },
          },
        },
      }),
    }),
  ],
})
export class MailModule {}
