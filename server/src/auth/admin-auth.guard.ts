import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { Repository } from 'typeorm';
import { AdminUser } from '../entities';
import { AdminTokenPayload } from './auth.service';

// 비밀번호 변경 강제 상태에서도 접근을 허용하는 라우트 표시 (change-password 등)
export const ALLOW_MUST_CHANGE = 'allowMustChange';
export const AllowMustChange = () => SetMetadata(ALLOW_MUST_CHANGE, true);

export interface AuthedRequest extends Request {
  adminUser: AdminUser;
}

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    @InjectRepository(AdminUser)
    private readonly adminUsers: Repository<AdminUser>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedException();

    let payload: AdminTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<AdminTokenPayload>(token);
    } catch {
      throw new UnauthorizedException();
    }

    // 매 요청 DB에서 재조회 — 삭제된 계정·최신 mustChangePassword 반영
    const user = await this.adminUsers.findOneBy({ id: payload.sub });
    if (!user) throw new UnauthorizedException();

    const allowMustChange = this.reflector.getAllAndOverride<boolean>(ALLOW_MUST_CHANGE, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (user.mustChangePassword && !allowMustChange) {
      throw new ForbiddenException('비밀번호를 먼저 변경해야 합니다.');
    }

    req.adminUser = user;
    return true;
  }
}
