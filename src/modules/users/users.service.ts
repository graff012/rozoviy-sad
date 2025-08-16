import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserDto } from './dto/user.dto';
import { PrismaService } from '../../core/database/prisma.service';
import { plainToInstance } from 'class-transformer';
import { UpdateUserDto } from './dto/update-user.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prismaService: PrismaService) {}

  async getAllUsers() {
    const users = await this.prismaService.user.findMany();

    if (!users) return [];

    return plainToInstance(UserDto, users);
  }

  async getUserById(id: string) {
    const user = await this.prismaService.user.findFirst({
      where: { id },
    });

    if (!user) throw new NotFoundException('User not found');

    return plainToInstance(UserDto, user);
  }

  async updateUser(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.prismaService.user.findUnique({
      where: { id },
    });

    if (!user) throw new NotFoundException('User not found');

    if (updateUserDto.role !== undefined && updateUserDto.role !== user.role) {
      throw new BadRequestException('Changing the role is not allowed');
    }

    const updateData: any = {};
    
    // Only include fields that are provided in the DTO
    if (updateUserDto.first_name !== undefined) updateData.first_name = updateUserDto.first_name;
    if (updateUserDto.last_name !== undefined) updateData.last_name = updateUserDto.last_name;
    if (updateUserDto.phone_number !== undefined) updateData.phone_number = updateUserDto.phone_number;
    if (updateUserDto.password !== undefined) updateData.password = updateUserDto.password;
    
    // Always update the updated_at timestamp
    updateData.updated_at = new Date();

    const updatedUser = await this.prismaService.user.update({
      where: { id },
      data: updateData,
    });

    return plainToInstance(UpdateUserDto, updatedUser);
  }

  async remove(id: string) {
    try {
      const deletedUser = await this.prismaService.user.delete({
        where: { id },
      });

      return {
        message: 'User deleted successfully',
        deletedUser,
      };
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        throw new NotFoundException('User not found');
      }

      throw err;
    }
  }
}
