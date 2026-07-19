import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminAuthGuard, AuthedRequest } from '../auth/admin-auth.guard';
import { CreateAdminUserDto, UpdateAdminUserDto } from './admin-users.dto';
import { AdminUsersService } from './admin-users.service';

@Controller('admin/users')
@UseGuards(AdminAuthGuard)
export class AdminUsersController {
  constructor(private readonly users: AdminUsersService) {}

  @Get()
  list() {
    return this.users.list();
  }

  @Post()
  create(@Body() dto: CreateAdminUserDto) {
    return this.users.create(dto.email);
  }

  @Patch(':id')
  updateEmail(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAdminUserDto) {
    return this.users.updateEmail(id, dto.email);
  }

  @Post(':id/temp-password')
  issueTempPassword(@Param('id', ParseIntPipe) id: number) {
    return this.users.issueTempPassword(id);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: AuthedRequest): Promise<void> {
    await this.users.remove(id, req.adminUser.id);
  }
}
