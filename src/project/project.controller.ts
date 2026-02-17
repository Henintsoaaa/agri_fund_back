import {
  Controller,
  Post,
  Req,
  UseGuards,
  Body,
  Get,
  Put,
  Param,
} from '@nestjs/common';
import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { BetterAuthGuard } from '../common/guards/better-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import {
  DeleteProjectStageDto,
  UpdateProjectStageDto,
} from './dto/update-project-stage.dto';
import { ProjectStageService } from './project-stage.service';

@Controller('project')
export class ProjectController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly projectStageService: ProjectStageService,
  ) {}

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

  @Get('public')
  @UseGuards(BetterAuthGuard)
  getPublicProjects() {
    return this.projectService.getPublicProjects();
  }

  @Put('update-stage/:id')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('PROJECT_OWNER')
  updateProjectStage(
    @Param('id') id: string,
    @Body() data: UpdateProjectStageDto,
  ) {
    const projectStageId = id;

    return this.projectStageService.updateOneProjectStage(data, projectStageId);
  }

  @Put('delete-stage/:id')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('PROJECT_OWNER')
  deleteProjectStage(
    @Param('id') id: string,
    @Body() data: DeleteProjectStageDto,
  ) {
    const projectStageId = id;

    return this.projectStageService.deleteProjectStage(data, projectStageId);
  }

  @Get('stages/:projectId')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('PROJECT_OWNER')
  getAllProjectStageOfProject(@Param('projectId') projectId: string) {
    return this.projectStageService.getAllProjectStageOfProject(projectId);
  }

  @Get('stages-count/:projectId')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles('PROJECT_OWNER')
  countProjectStages(@Param('projectId') projectId: string) {
    return this.projectStageService.countProjectStages(projectId);
  }
}
