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

  @Get('active-users')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getActiveUsers() {
    return this.adminService.getActiveUsers();
  }

  @Get('non-active-users')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getNonActiveUsers() {
    return this.adminService.getNonActiveUsers();
  }

  @Get('user/:id')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getUserById(@Param('id') id: string) {
    return this.adminService.getUserById(id);
  }

  @Get('deleted-users')
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

  @Get('investors')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getInvestors() {
    return this.adminService.getInvestors();
  }

  @Get('active-project-owners')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getActiveProjectOwners() {
    return this.adminService.getActiveProjectOwners();
  }
  @Get('non-active-project-owners')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getNonActiveProjectOwners() {
    return this.adminService.getNonActiveProjectOwners();
  }

  @Get('active-investors')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getActiveInvestors() {
    return this.adminService.getActiveInvestors();
  }

  @Get('non-active-investors')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getNonActiveInvestors() {
    return this.adminService.getNonActiveInvestors();
  }
}
