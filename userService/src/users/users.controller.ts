import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAccessGuard } from '../common/guards/jwt-access.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { AdminUpdateRolesDto } from './dto/admin-update-roles.dto';

@UseGuards(JwtAccessGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async me(@CurrentUser() user: any) {
    return this.usersService.findById(user.sub ?? user.id);
  }

  @Patch('me')
  async updateProfile(@CurrentUser() user: any, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.sub ?? user.id, dto);
  }

  @Roles(Role.ADMIN)
  @Get()
  list() {
    return this.usersService.list();
  }

  @Roles(Role.ADMIN)
  @Patch(':id/roles')
  updateRoles(@Param('id') id: string, @Body() dto: AdminUpdateRolesDto) {
    return this.usersService.updateRoles(id, dto);
  }
}