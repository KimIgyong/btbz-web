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

  /** 관리자 임시 비밀번호 발송 — 성공 여부 반환(실패해도 예외를 던지지 않음) */
  async sendAdminTempPassword(toEmail: string, tempPassword: string, loginEmail: string): Promise<boolean> {
    const transporter = this.getTransporter();
    if (!transporter) {
      this.logger.warn('SMTP not configured — admin temp password mail skipped.');
      return false;
    }
    try {
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: toEmail,
        subject: '[BTBZ Admin] 임시 비밀번호 안내',
        text:
          `BTBZ 관리자 콘솔 임시 비밀번호 안내\n\n` +
          `로그인 계정: ${loginEmail}\n` +
          `임시 비밀번호: ${tempPassword}\n\n` +
          `보안을 위해 이 임시 비밀번호로 로그인하면 즉시 새 비밀번호 설정이 요구됩니다.\n` +
          `본인이 요청하지 않았다면 이 메일을 무시하세요(기존 비밀번호는 이미 무효화되었습니다 — ` +
          `계정 보안이 걱정되면 관리자에게 문의하세요).\n\n` +
          `관리자 콘솔: https://www.btbz.ai/admin/`,
      });
      return true;
    } catch (err) {
      this.logger.error(`Admin temp password mail failed: ${(err as Error).message}`);
      return false;
    }
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
