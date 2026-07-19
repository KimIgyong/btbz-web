import { Body, Controller, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AdminAuthGuard, AllowMustChange, AuthedRequest } from './admin-auth.guard';
import { ChangePasswordDto, LoginDto } from './auth.dto';
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

  @Post('change-password')
  @HttpCode(204)
  @UseGuards(AdminAuthGuard)
  @AllowMustChange()
  async changePassword(@Req() req: AuthedRequest, @Body() dto: ChangePasswordDto): Promise<void> {
    await this.auth.changePassword(req.adminUser.id, dto.currentPassword, dto.newPassword);
  }
}
