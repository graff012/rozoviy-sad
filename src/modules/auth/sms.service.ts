import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import ENDIPOINTS from '../../common/constants/endpoints';
import axios from 'axios';

@Injectable()
export class SmsService {
  private readonly email: string;
  private readonly password: string;

  constructor(private readonly configService: ConfigService) {
    this.email = configService.get('ESKIZ_EMAIL') as string;
    this.password = configService.get('ESKIZ_PASSWORD') as string;
  }

  async getToken() {
    try {
      const url = ENDIPOINTS.getEskizTokenUrl();

      const formData = new FormData();

      formData.set('email', this.email);
      formData.set('password', this.password);

      const {
        data: {
          data: { token },
        },
      } = await axios.post(url, formData, {
        headers: {
          'Content-Type': 'multirpart/form-data',
        },
      });

      return token;
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  async sendSms(phone_number: string, otp: string) {
    const url = ENDIPOINTS.sendSmsUrl();

    const token = await this.getToken();

    const formData = new FormData();

    formData.set('mobile_phone', phone_number);
    formData.set('message', `Rozoviy sad ilovasiga kirish kodi:${otp}`);
    formData.set('from', '4546');

    const { status } = await axios.post(url, formData, {
      headers: {
        'Content-Type': 'multirpart/from-data',
        Authorization: `Bearer ${token}`,
      },
    });

    if (status !== 200) throw new InternalServerErrorException('Server error');
  }
}
