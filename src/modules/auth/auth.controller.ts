import { AuthService } from './auth.service';
import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { LoginDto, RegisterDto } from './dto/create-auth.dto';
import { Request, Response } from 'express';
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
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { token, message } = await this.authService.login(loginDto);

    response.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24, // 24 hour
      path: '/',
    });

    return {
      message,
      token,
    };
  }

  @Post('logout')
  logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    res.clearCookie('token', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
    });

    return { message: 'Successfully logged Out' };
  }
}
