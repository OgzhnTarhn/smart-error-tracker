import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

function getBearerToken(authorization: string | undefined) {
  const value = authorization?.trim() ?? '';
  if (!value.toLowerCase().startsWith('bearer ')) return '';
  return value.slice(7).trim();
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('demo-access')
  getDemoAccess() {
    return this.authService.getDemoAccess();
  }

  @Post('demo-login')
  demoLogin() {
    return this.authService.demoLogin();
  }

  @Post('register')
  register(
    @Body()
    body: {
      name?: string;
      email?: string;
      password?: string;
    },
  ) {
    return this.authService.register({
      name: body?.name ?? '',
      email: body?.email ?? '',
      password: body?.password ?? '',
    });
  }

  @Post('login')
  login(
    @Body()
    body: {
      email?: string;
      password?: string;
    },
  ) {
    return this.authService.login({
      email: body?.email ?? '',
      password: body?.password ?? '',
    });
  }

  @Get('me')
  getMe(@Headers('authorization') authorization: string | undefined) {
    return this.authService.getMe(getBearerToken(authorization));
  }

  @Post('logout')
  logout(@Headers('authorization') authorization: string | undefined) {
    return this.authService.logout(getBearerToken(authorization));
  }
}
