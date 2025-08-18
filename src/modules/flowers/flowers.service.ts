import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { CreateFlowerDto } from './dto/create-flower.dto';
import { UpdateFlowerDto } from './dto/update-flower.dto';
import { PrismaService } from '../../core/database/prisma.service';
import { plainToInstance } from 'class-transformer';
import { Prisma, Role } from '@prisma/client';

interface ToggleLikeResult {
  message: string;
  isLiked: boolean;
}

@Injectable()
export class FlowersService {
  constructor(private readonly prismaService: PrismaService) {}
  async create(createFlowerDto: CreateFlowerDto) {
    const { category_id, ...flowerData } = createFlowerDto;

    const flower = await this.prismaService.flower.create({
      data: {
        name: flowerData.name,
        smell: flowerData.smell,
        flower_size: flowerData.flower_size,
        height: flowerData.height,
        price: flowerData.price,
        img_url: flowerData.img_url,
        category: {
          connect: { id: category_id },
        },
      },
      include: {
        category: true,
      },
    });

    return {
      message: 'Flower added successfully',
      flower,
    };
  }

  async findAll(userId?: string) {
    console.log('Fetching flowers for user:', userId);

    try {
      const flowers = await this.prismaService.flower.findMany({
        include: {
          liked_by: {
            where: userId ? { user_id: userId } : undefined,
            select: { user_id: true },
          },
          category: true,
        },
      });

      console.log(`Found ${flowers.length} flowers`);

      if (!flowers || flowers.length === 0) {
        console.log('No flowers found in the database');
        return [];
      }

      // Process each flower
      const processedFlowers = flowers.map((flower) => {
        const isLiked = flower.liked_by && flower.liked_by.length > 0;
        const { liked_by, ...flowerData } = flower;

        // Process the image URL
        let imgUrl = flower.img_url || '';

        // If it's a relative path starting with /images/ or /public/images/
        if (imgUrl.startsWith('/public/images/')) {
          imgUrl = imgUrl.replace('/public', ''); // Convert to /images/...
        } else if (imgUrl.startsWith('/images/')) {
          // Keep as is, but remove leading slash
          imgUrl = imgUrl.substring(1);
        }
        // If it's just a filename, prepend images/
        else if (
          imgUrl &&
          !imgUrl.includes('/') &&
          !imgUrl.startsWith('http')
        ) {
          imgUrl = `images/${imgUrl}`;
        }

        // Ensure the path is clean (no double slashes)
        imgUrl = imgUrl.replace(/([^:]\/)\/+/g, '$1');

        const processedFlower = {
          ...flowerData,
          isLiked,
          // Return the relative path without leading slash
          img_url: imgUrl || null,
          // For backward compatibility
          imgUrl: imgUrl || null,
        };

        console.log(
          `Processed flower ${flower.id} - Final img_url:`,
          processedFlower.img_url
        );
        return processedFlower;
      });

      return processedFlowers;
    } catch (error) {
      console.error('Error in flowersService.findAll:', error);
      throw error;
    }
  }

  async findOne(id: string) {
    const flower = await this.prismaService.flower.findUnique({
      where: { id },
    });

    if (!flower) throw new NotFoundException('flower not found');

    return flower;
  }

  async update(id: string, updateFlowerDto: UpdateFlowerDto) {
    const flower = await this.prismaService.flower.findUnique({
      where: { id },
    });

    if (!flower) throw new NotFoundException('Flower not found');

    // Convert DTO to database fields
    const updateData: any = {};

    if (updateFlowerDto.name !== undefined)
      updateData.name = updateFlowerDto.name;
    if (updateFlowerDto.smell !== undefined)
      updateData.smell = updateFlowerDto.smell;
    if (updateFlowerDto.flower_size !== undefined)
      updateData.flower_size = updateFlowerDto.flower_size;
    if (updateFlowerDto.height !== undefined)
      updateData.height = updateFlowerDto.height;
    if (updateFlowerDto.price !== undefined)
      updateData.price = updateFlowerDto.price;
    if (updateFlowerDto.img_url !== undefined)
      updateData.img_url = updateFlowerDto.img_url;
    if (updateFlowerDto.category_id !== undefined)
      updateData.category_id = updateFlowerDto.category_id;

    // Always update the updated_at timestamp
    updateData.updated_at = new Date();

    const updatedFlower = await this.prismaService.flower.update({
      where: { id },
      data: updateData,
    });

    return plainToInstance(UpdateFlowerDto, updatedFlower);
  }

  async remove(id: string) {
    try {
      const deletedFlower = await this.prismaService.flower.delete({
        where: { id },
      });

      return {
        message: 'Flower deleted successfully',
        deletedFlower,
      };
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        throw new NotFoundException('Flower not found');
      }
    }
  }

  async toggleLike(
    flowerId: string,
    userId: string
  ): Promise<ToggleLikeResult> {
    // Check if flower exists
    const flower = await this.prismaService.flower.findUnique({
      where: { id: flowerId },
    });

    if (!flower) {
      throw new NotFoundException('Flower not found');
    }

    // Check if user exists
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user already liked the flower
    const existingLike = await this.prismaService.userLikes.findUnique({
      where: {
        user_id_flower_id: {
          user_id: userId,
          flower_id: flowerId,
        },
      },
    });

    if (existingLike) {
      // Unlike the flower
      await this.prismaService.userLikes.delete({
        where: {
          user_id_flower_id: {
            user_id: userId,
            flower_id: flowerId,
          },
        },
      });

      return {
        message: 'Successfully unliked the flower',
        isLiked: false,
      };
    } else {
      // Like the flower
      await this.prismaService.userLikes.create({
        data: {
          user_id: userId,
          flower_id: flowerId,
        },
      });

      return {
        message: 'Successfully liked the flower',
        isLiked: true,
      };
    }
  }
}
