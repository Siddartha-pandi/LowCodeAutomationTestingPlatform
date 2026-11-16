import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { AssignRoleDto, UpdateUserDto } from './dto/user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Users Management')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RbacGuard)
@Controller('api/v1/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions('users:manage')
  @ApiOperation({ summary: 'List all registered users' })
  async listUsers() {
    return this.usersService.listUsers();
  }

  @Get(':user_id')
  @RequirePermissions('users:manage')
  @ApiOperation({ summary: 'Get user details by ID' })
  async getUser(@Param('user_id') userId: string) {
    return this.usersService.getUser(userId);
  }

  @Put(':user_id')
  @RequirePermissions('users:manage')
  @ApiOperation({ summary: 'Update user status, name, or role' })
  async updateUser(
    @Param('user_id') userId: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateUser(userId, dto);
  }

  @Delete(':user_id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('users:manage')
  @ApiOperation({ summary: 'Delete user account' })
  async deleteUser(@Param('user_id') userId: string) {
    await this.usersService.deleteUser(userId);
  }

  @Post(':user_id/roles')
  @RequirePermissions('roles:manage')
  @ApiOperation({ summary: 'Assign an RBAC role to a user' })
  async assignRole(
    @Param('user_id') userId: string,
    @Body() dto: AssignRoleDto,
  ) {
    return this.usersService.assignRole(userId, dto.role_name);
  }

  @Delete(':user_id/roles/:role_name')
  @RequirePermissions('roles:manage')
  @ApiOperation({ summary: 'Revoke an RBAC role from a user' })
  async removeRole(
    @Param('user_id') userId: string,
    @Param('role_name') roleName: string,
  ) {
    return this.usersService.removeRole(userId, roleName);
  }
}
