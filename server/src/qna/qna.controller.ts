import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { requestIp } from '../common/request-ip';
import { QnaStatus } from '../entities/qna-post.entity';
import { CreateQnaDto, CreateQnaReplyDto, UpdateQnaStatusDto } from './qna.dto';
import { QnaService } from './qna.service';
import { qnaMulterOptions } from './qna.storage';

@Controller('qna')
export class QnaController {
  constructor(private readonly qna: QnaService) {}

  @Get()
  list(@Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number) {
    return this.qna.listPublic(Math.max(1, page));
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.qna.getPublic(id);
  }

  @Post()
  @HttpCode(201)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @UseInterceptors(FilesInterceptor('files', 5, qnaMulterOptions))
  async create(
    @Body() dto: CreateQnaDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: Request,
  ): Promise<{ ok: boolean; id?: number }> {
    if (dto.website) return { ok: true }; // 허니팟
    return this.qna.create(dto, files ?? [], requestIp(req));
  }

  @Get('attachments/:id')
  async attachment(@Param('id', ParseIntPipe) id: number, @Res() res: Response): Promise<void> {
    const { attachment, path } = await this.qna.getAttachment(id);
    const disposition = attachment.kind === 'image' ? 'inline' : 'attachment';
    const encoded = encodeURIComponent(attachment.originalName);
    res.set({
      'Content-Type': attachment.mimeType,
      'Content-Disposition': `${disposition}; filename*=UTF-8''${encoded}`,
      'Cache-Control': 'public, max-age=86400',
      'X-Content-Type-Options': 'nosniff',
    });
    res.sendFile(path, (err) => {
      if (err && !res.headersSent) res.status(404).end();
    });
  }
}

@Controller('admin/qna')
@UseGuards(AdminAuthGuard)
export class AdminQnaController {
  constructor(private readonly qna: QnaService) {}

  @Get()
  list(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('status') status?: QnaStatus,
  ) {
    const valid: QnaStatus[] = ['visible', 'hidden'];
    return this.qna.listAdmin(Math.max(1, page), 20, status && valid.includes(status) ? status : undefined);
  }

  @Patch(':id')
  setStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateQnaStatusDto) {
    if (dto.status !== 'visible' && dto.status !== 'hidden') {
      throw new BadRequestException('status must be visible|hidden');
    }
    return this.qna.setStatus(id, dto.status);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.qna.remove(id);
  }

  @Post(':id/replies')
  @HttpCode(201)
  addReply(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateQnaReplyDto) {
    return this.qna.addReply(id, dto.body);
  }

  @Delete('replies/:replyId')
  @HttpCode(204)
  async removeReply(@Param('replyId', ParseIntPipe) replyId: number): Promise<void> {
    await this.qna.removeReply(replyId);
  }
}
