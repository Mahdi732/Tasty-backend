import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

@InputType()
export class RegisterDto {
  @Field()
  @IsEmail()
  email!: string;

  @Field()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;

  @Field()
  @IsNotEmpty()
  name!: string;
}
