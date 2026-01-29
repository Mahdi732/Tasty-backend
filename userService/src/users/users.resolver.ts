import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UsersService } from './users.service';
import { UserModel } from './models/user.model';
import { UseGuards } from '@nestjs/common';
import { JwtAccessGuard } from '../common/guards/jwt-access.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AdminUpdateRolesDto } from './dto/admin-update-roles.dto';

@Resolver(() => UserModel)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAccessGuard)
  @Query(() => UserModel)
  async me(@CurrentUser() user: any) {
    return this.usersService.findById(user.sub ?? user.id);
  }

  @Roles(Role.ADMIN)
  @UseGuards(JwtAccessGuard)
  @Query(() => [UserModel])
  async users() {
    return this.usersService.list();
  }

  @UseGuards(JwtAccessGuard)
  @Mutation(() => UserModel)
  async updateProfile(@CurrentUser() user: any, @Args('input') input: UpdateProfileDto) {
    return this.usersService.updateProfile(user.sub ?? user.id, input);
  }

  @Roles(Role.ADMIN)
  @UseGuards(JwtAccessGuard)
  @Mutation(() => UserModel)
  async updateUserRoles(@Args('userId') userId: string, @Args('input') input: AdminUpdateRolesDto) {
    return this.usersService.updateRoles(userId, input);
  }
}