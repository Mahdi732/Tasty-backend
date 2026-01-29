import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { Provider, Role } from '@prisma/client';

registerEnumType(Role, { name: 'Role' });
registerEnumType(Provider, { name: 'Provider' });

@ObjectType()
export class UserModel {
  @Field(() => ID)
  id!: string;

  @Field()
  email!: string;

  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  avatarUrl?: string;

  @Field(() => [Role])
  roles!: Role[];

  @Field(() => Provider)
  provider!: Provider;

  @Field()
  verified!: boolean;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}
