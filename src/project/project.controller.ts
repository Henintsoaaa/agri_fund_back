import {
  Controller,
  Post,
  Req,
  UseGuards,
  Body,
  Get,
  Put,
  Delete,
  Param,
} from '@nestjs/common';
import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import {
  UpdateProjectStageDto,
  CreateIndividualStageDto,
} from './dto/project-stage.dto';
import { BetterAuthGuard } from '../common/guards/better-auth.guard';
import { Role } from '@/generated/prisma/enums';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('project')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post('create')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('PROJECT_OWNER')
  createProject(@Body() data: CreateProjectDto, @Req() req) {
    const userId = req.user.id;

    return this.projectService.createProject(data, userId);
  }

  @Get('my-projects')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('PROJECT_OWNER')
  getMyProjects(@Req() req) {
    const userId = req.user.id;

    return this.projectService.getMyProjects(userId);
  }

  @Get(':id')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('PROJECT_OWNER')
  getProjectById(@Param('id') id: string) {
    const projectId = id;

    return this.projectService.getProjectById(projectId);
  }

  @Put('update/:id')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('PROJECT_OWNER')
  updateProject(
    @Param('id') id: string,
    @Body() data: CreateProjectDto,
    @Req() req,
  ) {
    const projectId = id;
    const userId = req.user.id;

    return this.projectService.updateProject(projectId, data, userId);
  }

  @Put('suspend/:id')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('ADMIN')
  suspendProject(@Param('id') id: string) {
    const projectId = id;

    return this.projectService.suspendProject(projectId);
  }

  @Put('activate/:id')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('ADMIN')
  activateProject(@Param('id') id: string) {
    const projectId = id;

    return this.projectService.activateProject(projectId);
  }

  @Put('delete/:id')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('ADMIN')
  deleteProject(@Param('id') id: string) {
    const projectId = id;

    return this.projectService.deleteProject(projectId);
  }

  @Get('')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getAllProjects() {
    return this.projectService.getAllProjects();
  }

  // Stage-related endpoints
  @Post(':projectId/stages')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('PROJECT_OWNER')
  createProjectStage(
    @Param('projectId') projectId: string,
    @Body() data: CreateIndividualStageDto,
    @Req() req,
  ) {
    const userId = req.user.id;
    return this.projectService.createProjectStage(projectId, data, userId);
  }

  @Get('stages/:stageId')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('PROJECT_OWNER')
  getProjectStageById(@Param('stageId') stageId: string, @Req() req) {
    const userId = req.user.id;
    return this.projectService.getProjectStageById(stageId, userId);
  }

  @Put('stages/:stageId')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('PROJECT_OWNER')
  updateProjectStage(
    @Param('stageId') stageId: string,
    @Body() data: UpdateProjectStageDto,
    @Req() req,
  ) {
    const userId = req.user.id;
    return this.projectService.updateProjectStage(stageId, data, userId);
  }

  @Delete('stages/:stageId')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('PROJECT_OWNER')
  deleteProjectStage(@Param('stageId') stageId: string, @Req() req) {
    const userId = req.user.id;
    return this.projectService.deleteProjectStage(stageId, userId);
  }
}
