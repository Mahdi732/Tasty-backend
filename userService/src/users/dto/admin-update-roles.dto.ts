import { Field, InputType } from '@nestjs/graphql';
import { ArrayNotEmpty, IsArray, IsEnum } from 'class-validator';
import { Role } from '@prisma/client';

@InputType()
export class AdminUpdateRolesDto {
  @Field(() => [Role])
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(Role, { each: true })
  roles!: Role[];
}
