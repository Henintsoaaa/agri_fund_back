import { Controller, Post, Body, UseGuards } from '@nestjs/common';

import { BetterAuthGuard } from '../common/guards/better-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminService } from './admin.service';
import { CreateUserWithDefaultPassDto } from '../auth/dto/create-user.dto';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('create-user')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('ADMIN')
  createUser(@Body() user: CreateUserWithDefaultPassDto) {
    return this.adminService.createUser(user);
  }
}
