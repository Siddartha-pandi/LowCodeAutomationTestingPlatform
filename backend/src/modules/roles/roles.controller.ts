import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Roles & Permissions')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('api/v1/roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @ApiOperation({ summary: 'List all available RBAC roles and assigned permissions' })
  async listRoles() {
    return this.rolesService.listRoles();
  }
}
