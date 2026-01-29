import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { LocalAuthGuard } from '../common/guards/local.guard';
import { JwtAccessGuard } from '../common/guards/jwt-access.guard';
import { JwtRefreshGuard } from '../common/guards/jwt-refresh.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Response, Request } from 'express';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.register(dto);
    this.authService['setRefreshCookie']?.(res, result.tokens.refreshToken);
    return { accessToken: result.tokens.accessToken, user: result.user };
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.authService.login(req.user as any, res);
  }

  @Post('login/basic')
  async loginBasic(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.authService.loginWithCredentials(dto, res);
  }

  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  async refresh(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    const { sub, refreshToken } = req.user;
    return this.authService.refreshTokens(sub, refreshToken, res);
  }

  @UseGuards(JwtAccessGuard)
  @Post('logout')
  async logout(@CurrentUser() user: any, @Res({ passthrough: true }) res: Response) {
    return this.authService.logout(user.sub ?? user.id, res);
  }

  @UseGuards(JwtAccessGuard)
  @Get('me')
  me(@CurrentUser() user: any) {
    return user;
  }

  @Post('verify-email')
  verify(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }
}