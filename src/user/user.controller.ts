import {
  Controller,
  Post,
  Body,
  UseGuards,
  Put,
  Param,
  Get,
  Req,
} from '@nestjs/common';

import { BetterAuthGuard } from '../common/guards/better-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateUserWithDefaultPassDto } from '../auth/dto/create-user.dto';
import { EditUserDto } from '../user/dto/edit-user.dto';
import { DeleteUserDto } from '../user/dto/delete-user.dto';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('create-user')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('ADMIN')
  createUser(@Body() user: CreateUserWithDefaultPassDto, @Req() req: any) {
    const adminName = req.user?.name || 'Admin';
    return this.userService.createUser(user, adminName);
  }

  @Put('edit-user/:id')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('ADMIN')
  editUser(@Param('id') id: string, @Body() editData: EditUserDto) {
    // Utiliser l'id du paramètre URL, ignorer celui du corps s'il est fourni
    return this.userService.editUser({ ...editData, id });
  }

  @Put('delete-user/:id')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('ADMIN')
  deleteUser(@Param('id') id: string, @Body() deleteData: DeleteUserDto) {
    // Utiliser l'id du paramètre URL, ignorer celui du corps s'il est fourni
    return this.userService.deleteUser({ ...deleteData, id });
  }

  @Get('users')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getAllUsers() {
    return this.userService.getAllUsers();
  }

  @Get('users/active')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getActiveUsers() {
    return this.userService.getActiveUsers();
  }

  @Get('users/inactive')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getInactiveUsers() {
    return this.userService.getInactiveUsers();
  }

  @Get('user/:id')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getUserById(@Param('id') id: string) {
    return this.userService.getUserById(id);
  }

  @Get('users/deleted')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getDeletedUsers() {
    return this.userService.getDeletedUsers();
  }

  @Get('project-owners')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getProjectOwners() {
    return this.userService.getProjectOwners();
  }

  @Get('project-owners/active')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getActiveProjectOwners() {
    return this.userService.getActiveProjectOwners();
  }

  @Get('project-owners/inactive')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getInactiveProjectOwners() {
    return this.userService.getInactiveProjectOwners();
  }

  @Get('investors')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getInvestors() {
    return this.userService.getInvestors();
  }

  @Get('investors/active')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getActiveInvestors() {
    return this.userService.getActiveInvestors();
  }

  @Get('investors/inactive')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getInactiveInvestors() {
    return this.userService.getInactiveInvestors();
  }
}
