import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Inquiry } from '../entities';
import { MailModule } from '../mail/mail.module';
import { AdminInquiriesController, InquiriesController } from './inquiries.controller';
import { InquiriesService } from './inquiries.service';

@Module({
  imports: [TypeOrmModule.forFeature([Inquiry]), MailModule, AuthModule],
  controllers: [InquiriesController, AdminInquiriesController],
  providers: [InquiriesService],
})
export class InquiriesModule {}
