import {
  ConflictException,
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { LoginDto, RegisterDto } from './dto/create-auth.dto';
import { PrismaService } from '../../core/database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { OtpService } from './otp.service';
// import { VerifyOtpDto } from './dto/verify-otp.dto';
// import { LoginPhoneAndPasswordDto } from './dto/login-phone-password.dto';
// import { LoginPhoneNumberDto } from './dto/login-phone-number.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
    private readonly otpService: OtpService,
  ) {}

  async register(registerDto: RegisterDto) {
    if (
      !registerDto.phoneNumber ||
      !registerDto.firstName ||
      !registerDto.lastName
    ) {
      throw new ConflictException('Missing required fields');
    }

    const user = await this.prismaService.user.findUnique({
      where: { phone_number: registerDto.phoneNumber },
    });

    if (user) {
      throw new ConflictException('User already exists');
    }

    await this.prismaService.user.create({
      data: {
        first_name: registerDto.firstName,
        address: registerDto.address,
        last_name: registerDto.lastName,
        phone_number: registerDto.phoneNumber,
      },
    });

    // await this.otpService.sendOtp(registerDto.phone_number);

    return {
      message: 'user register success',
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.prismaService.user.findUnique({
      where: {
        phone_number: loginDto.phoneNumber,
      },
    });

    if (!user) throw new NotFoundException('User not found');

    // If user doesn't have a password, allow login with just phone number
    if (!user.password) {
      // Generate a token for phone-only login
      const payload = {
        userId: user.id,
        role: user.role,
      };

      const token = await this.jwtService.signAsync(payload);

      return {
        message: 'Login successful',
        token,
      };
    }

    // If user has a password, verify it
    if (!loginDto.password) {
      throw new ConflictException('Password is required for this account');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) throw new ConflictException('Invalid password');

    const payload = {
      userId: user.id,
      role: user.role,
    };

    const token = await this.jwtService.signAsync(payload);

    return {
      message: 'Login successful',
      token,
    };
  }

  // this login is for otp
  // async login(loginDto: LoginDto) {
  //   const user = await this.prismaService.user.findUnique({
  //     where: { phoneNumber: loginDto.phoneNumber },
  //   });
  //
  //   if (!user || !user.isPhoneVerified) {
  //     throw new NotFoundException('User not found or not verified');
  //   }
  //
  //   await this.otpService.sendOtp(loginDto.phoneNumber);
  //
  //   return { message: 'OTP sent to phone number' };
  // }
  //
  // async verifyOtpUser(verifyOtpDto: VerifyOtpDto) {
  //   const key = `user:${verifyOtpDto.phone_number}`;
  //
  //   const sessionToken = await this.otpService.verifyOtpSendUser(
  //     key,
  //     verifyOtpDto.code,
  //     verifyOtpDto.phone_number
  //   );
  //
  //   return {
  //     message: 'OTP verified successfully',
  //     session_token: sessionToken,
  //   };
  // }

  // async logout(req: Request) {
  //   const userId = req.userId;

  //   // Optional: clear session from Redis
  //   // await this.otpService.delSessionTokenUser(`session_token:${userId}`);

  //   return { message: 'Successfully logged out' };
  // }
}
