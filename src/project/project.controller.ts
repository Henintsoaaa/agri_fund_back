import {
  Controller,
  Post,
  Req,
  UseGuards,
  Body,
  Get,
  Put,
} from '@nestjs/common';
import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { BetterAuthGuard } from '../common/guards/better-auth.guard';
import { Role } from '@/generated/prisma/enums';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('project')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @UseGuards(BetterAuthGuard)
  @Roles('PROJECT_OWNER')
  @Post('create')
  createProject(@Body() data: CreateProjectDto, @Req() req) {
    const userId = req.user.id;

    return this.projectService.createProject(data, userId);
  }

  @UseGuards(BetterAuthGuard)
  @Roles('PROJECT_OWNER')
  @Get('my-projects')
  getMyProjects(@Req() req) {
    const userId = req.user.id;

    return this.projectService.getMyProjects(userId);
  }

  @UseGuards(BetterAuthGuard)
  @Roles('PROJECT_OWNER')
  @Get(':id')
  getProjectById(@Req() req) {
    const projectId = req.params.id;

    return this.projectService.getProjectById(projectId);
  }

  @UseGuards(BetterAuthGuard)
  @Roles('PROJECT_OWNER')
  @Put(':id/update')
  updateProject(@Req() req, @Body() data: CreateProjectDto) {
    const projectId = req.params.id;
    const userId = req.user.id;

    return this.projectService.updateProject(projectId, data, userId);
  }

  @UseGuards(BetterAuthGuard)
  @Roles('ADMIN')
  @Put(':id/suspend')
  suspendProject(@Req() req) {
    const projectId = req.params.id;

    return this.projectService.suspendProject(projectId);
  }

  @UseGuards(BetterAuthGuard)
  @Roles('ADMIN')
  @Put(':id/activate')
  activateProject(@Req() req) {
    const projectId = req.params.id;

    return this.projectService.activateProject(projectId);
  }

  @UseGuards(BetterAuthGuard)
  @Roles('ADMIN')
  @Put(':id/delete')
  deleteProject(@Req() req) {
    const projectId = req.params.id;

    return this.projectService.deleteProject(projectId);
  }

  @UseGuards(BetterAuthGuard)
  @Roles('ADMIN')
  @Get('')
  getAllProjects(@Req() req) {
    const projectId = req.params.id;

    return this.projectService.getAllProjects();
  }
}
