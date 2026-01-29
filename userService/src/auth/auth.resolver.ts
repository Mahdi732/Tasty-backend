import { Resolver, Mutation, Args, Context, Query } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { AuthPayload } from './models/auth-payload.model';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UseGuards } from '@nestjs/common';
import { JwtAccessGuard } from '../common/guards/jwt-access.guard';
import { JwtRefreshGuard } from '../common/guards/jwt-refresh.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => AuthPayload)
  async register(
    @Args('input') input: RegisterDto,
    @Context() ctx: any,
  ): Promise<AuthPayload> {
    const result = await this.authService.register(input);
    this.authService.setRefreshCookie(ctx.res, result.tokens.refreshToken);
    return { accessToken: result.tokens.accessToken, user: result.user as any };
  }

  @Mutation(() => AuthPayload)
  async login(
    @Args('input') input: LoginDto,
    @Context() ctx: any,
  ): Promise<AuthPayload> {
    const result = await this.authService.loginWithCredentials(input, ctx.res);
    return result as AuthPayload;
  }

  @UseGuards(JwtRefreshGuard)
  @Mutation(() => AuthPayload)
  async refresh(@Context() ctx: any): Promise<AuthPayload> {
    const { sub, refreshToken } = ctx.req.user;
    return this.authService.refreshTokens(sub, refreshToken, ctx.res) as any;
  }

  @UseGuards(JwtAccessGuard)
  @Mutation(() => Boolean)
  async logout(@CurrentUser() user: any, @Context() ctx: any) {
    await this.authService.logout(user.sub ?? user.id, ctx.res);
    return true;
  }

  @UseGuards(JwtAccessGuard)
  @Query(() => String)
  me(@CurrentUser() user: any) {
    return user.email;
  }
}