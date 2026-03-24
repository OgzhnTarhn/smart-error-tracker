import { Body, Controller, Get, Headers, Patch, Post } from '@nestjs/common';
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

  @Get('profile')
  getProfile(@Headers('authorization') authorization: string | undefined) {
    return this.authService.getProfile(getBearerToken(authorization));
  }

  @Patch('profile')
  updateProfile(
    @Headers('authorization') authorization: string | undefined,
    @Body()
    body: {
      name?: string;
      email?: string;
    },
  ) {
    return this.authService.updateProfile(getBearerToken(authorization), {
      name: body?.name ?? '',
      email: body?.email ?? '',
    });
  }

  @Post('change-password')
  changePassword(
    @Headers('authorization') authorization: string | undefined,
    @Body()
    body: {
      currentPassword?: string;
      newPassword?: string;
    },
  ) {
    return this.authService.changePassword(getBearerToken(authorization), {
      currentPassword: body?.currentPassword ?? '',
      newPassword: body?.newPassword ?? '',
    });
  }

  @Post('logout')
  logout(@Headers('authorization') authorization: string | undefined) {
    return this.authService.logout(getBearerToken(authorization));
  }
}
