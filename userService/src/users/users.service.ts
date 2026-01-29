import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AdminUpdateRolesDto } from './dto/admin-update-roles.dto';
import { Role } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async list() {
    return this.prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({ where: { id: userId }, data: dto });
  }

  async updateRoles(userId: string, dto: AdminUpdateRolesDto) {
    return this.prisma.user.update({ where: { id: userId }, data: { roles: dto.roles as Role[] } });
  }
}
