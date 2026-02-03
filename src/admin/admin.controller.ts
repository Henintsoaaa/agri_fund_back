import {
  Controller,
  Post,
  Body,
  UseGuards,
  Put,
  Param,
  Get,
} from '@nestjs/common';

import { BetterAuthGuard } from '../common/guards/better-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminService } from './admin.service';
import { CreateUserWithDefaultPassDto } from '../auth/dto/create-user.dto';
import { EditUserDto } from './dto/edit-user.dto';
import { DeleteUserDto } from './dto/delete-user.dto';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('create-user')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('ADMIN')
  createUser(@Body() user: CreateUserWithDefaultPassDto) {
    return this.adminService.createUser(user);
  }

  @Put('edit-user/:id')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('ADMIN')
  editUser(@Param('id') id: string, @Body() editData: EditUserDto) {
    // Utiliser l'id du paramètre URL, ignorer celui du corps s'il est fourni
    return this.adminService.editUser({ ...editData, id });
  }

  @Put('delete-user/:id')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('ADMIN')
  deleteUser(@Param('id') id: string, @Body() deleteData: DeleteUserDto) {
    // Utiliser l'id du paramètre URL, ignorer celui du corps s'il est fourni
    return this.adminService.deleteUser({ ...deleteData, id });
  }

  @Get('users')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getAllUsers() {
    return this.adminService.getAllUsers();
  }

  @Get('users/active')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getActiveUsers() {
    return this.adminService.getActiveUsers();
  }

  @Get('users/inactive')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getInactiveUsers() {
    return this.adminService.getInactiveUsers();
  }

  @Get('user/:id')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getUserById(@Param('id') id: string) {
    return this.adminService.getUserById(id);
  }

  @Get('users/deleted')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getDeletedUsers() {
    return this.adminService.getDeletedUsers();
  }

  @Get('project-owners')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getProjectOwners() {
    return this.adminService.getProjectOwners();
  }

  @Get('project-owners/active')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getActiveProjectOwners() {
    return this.adminService.getActiveProjectOwners();
  }

  @Get('project-owners/inactive')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getInactiveProjectOwners() {
    return this.adminService.getInactiveProjectOwners();
  }

  @Get('investors')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getInvestors() {
    return this.adminService.getInvestors();
  }

  @Get('investors/active')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getActiveInvestors() {
    return this.adminService.getActiveInvestors();
  }

  @Get('investors/inactive')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getInactiveInvestors() {
    return this.adminService.getInactiveInvestors();
  }
}
