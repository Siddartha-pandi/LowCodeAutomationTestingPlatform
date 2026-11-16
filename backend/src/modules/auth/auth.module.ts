import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserEntity } from '../../database/entities/user.entity';
import { RoleEntity } from '../../database/entities/role.entity';
import { ProjectEntity } from '../../database/entities/project.entity';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, RoleEntity, ProjectEntity]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('app.jwtSecret') || 'enterprise-production-jwt-secret-key-32chars',
        signOptions: {
          expiresIn: `${configService.get<number>('app.tokenExpiryMinutes') || 480}m`,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, PasswordService, JwtStrategy, JwtAuthGuard, RbacGuard],
  exports: [AuthService, PasswordService, JwtAuthGuard, RbacGuard, JwtModule, PassportModule],
})
export class AuthModule {}
