import { Controller, Post } from '@nestjs/common';
import { ProjectService } from './project.service';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';

@Controller('project')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post('create')
  @AllowAnonymous()
  createProject() {
    return this.projectService.createProject();
  }
}
