import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException('Access denied: unauthenticated caller');
    }

    if (user.isSuperuser) {
      return true;
    }

    const userPermissions: string[] = user.permissions || [];
    if (userPermissions.includes('*')) {
      return true;
    }

    const hasPermission = requiredPermissions.some((perm) => userPermissions.includes(perm));
    if (!hasPermission) {
      throw new ForbiddenException(
        `Access denied: required permission [${requiredPermissions.join(', ')}]`,
      );
    }

    return true;
  }
}
