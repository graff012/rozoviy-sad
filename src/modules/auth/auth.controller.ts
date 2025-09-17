import { AuthService } from './auth.service';
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { LoginDto, RegisterDto } from './dto/create-auth.dto';
import { Public } from '../../common/decorators/public.decorator';
import { AuthGuard } from './../../common/guards/auth.guard';

@Public()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(AuthGuard)
  @Get('check')
  checkAuth() {
    return {
      authenticated: true,
    };
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    console.log('registerDto: ', registerDto);
    return await this.authService.register(registerDto);
  }

  // @Post('verify')
  // async verify(@Body() dto: VerifyOtpDto) {
  //   return await this.authService.verifyOtpUser(dto);
  // }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    const { token, message } = await this.authService.login(loginDto);
    return { message, token };
  }

  @Post('logout')
  logout() {
    // Stateless JWT: client should discard token
    return { message: 'Successfully logged out' };
  }
}
