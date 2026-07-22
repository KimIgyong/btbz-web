import { Body, Controller, Get, HttpCode, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AdminAuthGuard, AllowMustChange, AuthedRequest } from './admin-auth.guard';
import { ChangePasswordDto, ForgotPasswordDto, LoginDto, UpdateRecoveryEmailDto } from './auth.dto';
import { AuthService } from './auth.service';

@Controller('admin')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  /** 비밀번호 분실 재발급 — 공개 엔드포인트. 열거 방지 위해 항상 202. */
  @Post('forgot-password')
  @HttpCode(202)
  @Throttle({ default: { ttl: 600_000, limit: 3 } })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ ok: true }> {
    await this.auth.forgotPassword(dto.email, dto.destination);
    return { ok: true };
  }

  @Post('change-password')
  @HttpCode(204)
  @UseGuards(AdminAuthGuard)
  @AllowMustChange()
  async changePassword(@Req() req: AuthedRequest, @Body() dto: ChangePasswordDto): Promise<void> {
    await this.auth.changePassword(req.adminUser.id, dto.currentPassword, dto.newPassword);
  }

  /** 현재 로그인 관리자 정보(설정 화면용) */
  @Get('me')
  @UseGuards(AdminAuthGuard)
  me(@Req() req: AuthedRequest) {
    return this.auth.getMe(req.adminUser);
  }

  /** 복구 이메일 등록/변경/해제 */
  @Patch('me/recovery-email')
  @UseGuards(AdminAuthGuard)
  updateRecoveryEmail(@Req() req: AuthedRequest, @Body() dto: UpdateRecoveryEmailDto) {
    return this.auth.updateRecoveryEmail(req.adminUser.id, dto.recoveryEmail);
  }
}
