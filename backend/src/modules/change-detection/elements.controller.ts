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
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ElementsService } from './elements.service';
import {
  AddLocatorDto,
  CreateElementProfileDto,
  UpdateElementProfileDto,
} from './dto/elements.dto';

@ApiTags('Element Profiles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/elements')
export class ElementsController {
  constructor(private readonly elementsService: ElementsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register element profile' })
  async createProfile(
    @Body() dto: CreateElementProfileDto,
    @CurrentUser() user: any,
  ) {
    return this.elementsService.createElementProfile(dto, user.id, user.isSuperuser);
  }

  @Get()
  @ApiOperation({ summary: 'List element profiles' })
  async listProfiles(
    @Query('project_id') projectId: string | undefined,
    @CurrentUser() user: any,
  ) {
    return this.elementsService.listElementProfiles(projectId, user.id, user.isSuperuser);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get element profile by id' })
  async getProfile(@Param('id') id: string, @CurrentUser() user: any) {
    return this.elementsService.getElementProfile(id, user.id, user.isSuperuser);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update element profile' })
  async updateProfile(
    @Param('id') id: string,
    @Body() dto: UpdateElementProfileDto,
    @CurrentUser() user: any,
  ) {
    return this.elementsService.updateElementProfile(id, dto, user.id, user.isSuperuser);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete element profile' })
  async deleteProfile(@Param('id') id: string, @CurrentUser() user: any) {
    return this.elementsService.deleteElementProfile(id, user.id, user.isSuperuser);
  }

  @Post(':id/locators')
  @ApiOperation({ summary: 'Add locator variant to element profile' })
  async addLocator(
    @Param('id') id: string,
    @Body() dto: AddLocatorDto,
    @CurrentUser() user: any,
  ) {
    return this.elementsService.addLocator(id, dto, user.id, user.isSuperuser);
  }
}
