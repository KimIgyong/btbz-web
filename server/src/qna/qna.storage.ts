import { BadRequestException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { memoryStorage } from 'multer';
import { extname, join } from 'path';

// 업로드 저장 위치 (운영: /home/btbz/btbz-cms-data/qna-uploads)
export const UPLOAD_DIR = process.env.QNA_UPLOAD_DIR ?? join(process.cwd(), 'qna-uploads');
if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });

// 인라인 실행/스크립트 위험이 있는 확장자 차단 (SVG 포함 — XSS)
const BLOCKED_EXT = /\.(html?|xht(ml)?|svg|js|mjs|php\d?|phtml|exe|bat|cmd|sh|com|scr|jar|msi)$/i;

// memoryStorage: 검증 전에는 디스크에 쓰지 않음 → 검증 실패 시 고아 파일 없음
export const qnaMulterOptions = {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 5 }, // 파일당 5MB, 최대 5개
  fileFilter: (_req: unknown, file: Express.Multer.File, cb: (e: Error | null, ok: boolean) => void) => {
    if (BLOCKED_EXT.test(file.originalname)) {
      return cb(new BadRequestException('허용되지 않는 파일 형식입니다.'), false);
    }
    cb(null, true);
  },
};

export function attachmentKind(mimeType: string): 'image' | 'file' {
  return mimeType === 'image/png' || mimeType === 'image/jpeg' ? 'image' : 'file';
}

/** 메모리 버퍼를 디스크에 기록하고 저장 파일명 반환 (검증 통과 후 호출) */
export function writeUpload(file: Express.Multer.File): string {
  const ext = extname(file.originalname).toLowerCase().slice(0, 12);
  const storedName = randomBytes(16).toString('hex') + ext;
  writeFileSync(join(UPLOAD_DIR, storedName), file.buffer);
  return storedName;
}
