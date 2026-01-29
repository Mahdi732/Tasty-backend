import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsString, MaxLength, IsUrl } from 'class-validator';

@InputType()
export class UpdateProfileDto {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;
}
