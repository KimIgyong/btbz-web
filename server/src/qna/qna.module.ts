import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { QnaAttachment, QnaPost, QnaReply } from '../entities';
import { AdminQnaController, QnaController } from './qna.controller';
import { QnaService } from './qna.service';

@Module({
  imports: [TypeOrmModule.forFeature([QnaPost, QnaAttachment, QnaReply]), AuthModule],
  controllers: [QnaController, AdminQnaController],
  providers: [QnaService],
})
export class QnaModule {}
