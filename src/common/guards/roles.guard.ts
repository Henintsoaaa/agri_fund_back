import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get<string[]>(ROLES_KEY, context.getHandler());

    console.log('RolesGuard - Required roles:', roles);

    if (!roles) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    console.log('RolesGuard - User:', user);
    console.log('RolesGuard - User role:', user?.role);

    if (!user) throw new UnauthorizedException();

    if (!roles.includes(user.role)) {
      console.log(
        'RolesGuard - Access denied! User role:',
        user.role,
        'Required:',
        roles,
      );
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
