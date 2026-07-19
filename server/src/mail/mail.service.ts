import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  private getTransporter(): Transporter | null {
    if (this.transporter) return this.transporter;
    const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      this.logger.warn('SMTP env not configured — mail sending disabled.');
      return null;
    }
    this.transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 465),
      secure: Number(process.env.SMTP_PORT ?? 465) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    return this.transporter;
  }

  /** 문의 메일 발송 — 성공 여부 반환(실패해도 예외를 던지지 않음, FR-3) */
  async sendInquiry(subject: string, body: string, senderEmail: string): Promise<boolean> {
    const transporter = this.getTransporter();
    if (!transporter) return false;
    try {
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: process.env.MAIL_TO ?? 'fremdung@gmail.com',
        replyTo: senderEmail,
        subject: `[Modora 문의] ${subject}`,
        text: `보낸사람: ${senderEmail}\n\n${body}`,
      });
      return true;
    } catch (err) {
      this.logger.error(`Inquiry mail failed: ${(err as Error).message}`);
      return false;
    }
  }
}
