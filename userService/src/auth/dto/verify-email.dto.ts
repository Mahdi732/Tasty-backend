import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString } from 'class-validator';

@InputType()
export class VerifyEmailDto {
  @Field()
  @IsString()
  @IsNotEmpty()
  token!: string;
}
