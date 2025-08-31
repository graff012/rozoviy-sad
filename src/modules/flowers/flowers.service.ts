import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateFlowerDto } from './dto/create-flower.dto';
import { UpdateFlowerDto } from './dto/update-flower.dto';
import { PrismaService } from '../../core/database/prisma.service';
import { S3Service } from '../../core/storage/s3/s3.service';

interface ToggleLikeResult {
  message: string;
  isLiked: boolean;
}

@Injectable()
export class FlowersService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly s3Service: S3Service
  ) {}

  async create(createFlowerDto: CreateFlowerDto, file?: Express.Multer.File) {
    let imgKey: string | null = null; // Change from imgUrl to imgKey

    // Upload image to S3 if file is provided
    if (file) {
      try {
        imgKey = await this.s3Service.uploadFile(file, 'flowers'); // This now returns S3 key
        console.log('Image uploaded to S3 with Key:', imgKey);
      } catch (err) {
        console.error('Failed to upload image to S3:', err);
        throw new Error('Failed to upload image to S3');
      }
    }

    const { categoryId, ...flowerData } = createFlowerDto;

    const flower = await this.prismaService.flower.create({
      data: {
        name: flowerData.name,
        smell: flowerData.smell,
        flower_size: flowerData.flowerSize,
        height: flowerData.height,
        price: flowerData.price,
        img_url: imgKey, // Store S3 key, not full URL
        category: {
          connect: { id: categoryId },
        },
      },
      include: {
        category: true,
      },
    });

    // Generate presigned URL for response
    let imgUrl: string | null = null; // FIX: Explicit type annotation
    if (imgKey) {
      try {
        imgUrl = await this.s3Service.getPresignedUrl(imgKey);
      } catch (error) {
        console.error('Failed to generate presigned URL:', error);
      }
    }

    return {
      message: 'Flower added successfully',
      flower: {
        ...flower,
        // Convert to camelCase for frontend
        flowerSize: flower.flower_size,
        imgUrl, // Return presigned URL
        categoryId: flower.category?.id,
      },
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

      // Process each flower and generate presigned URLs
      const processedFlowers = await Promise.all(
        flowers.map(async (flower) => {
          const isLiked = flower.liked_by && flower.liked_by.length > 0;
          const { liked_by, ...flowerData } = flower;

          // Generate presigned URL if img_url exists and is an S3 key
          let imgUrl = flower.img_url;
          if (flower.img_url && !this.s3Service.isS3Url(flower.img_url)) {
            // If it's an S3 key (not a full URL), generate presigned URL
            try {
              imgUrl = await this.s3Service.getPresignedUrl(flower.img_url);
            } catch (error) {
              console.error(
                `Failed to generate presigned URL for flower ${flower.id}:`,
                error
              );
              imgUrl = null; // Fallback to null if presigned URL generation fails
            }
          }

          const processedFlower = {
            ...flowerData,
            isLiked,
            // Convert snake_case to camelCase
            flowerSize: flower.flower_size,
            imgUrl, // This will be either a presigned URL or the original URL
            categoryId: flower.category?.id,
          };

          return processedFlower;
        })
      );

      return processedFlowers;
    } catch (error) {
      console.error('Error in flowersService.findAll:', error);
      throw error;
    }
  }

  async findOne(id: string) {
    const flower = await this.prismaService.flower.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });

    if (!flower) throw new NotFoundException('Flower not found');

    // Generate presigned URL if needed
    let imgUrl = flower.img_url;
    if (flower.img_url && !this.s3Service.isS3Url(flower.img_url)) {
      try {
        imgUrl = await this.s3Service.getPresignedUrl(flower.img_url);
      } catch (error) {
        console.error(
          `Failed to generate presigned URL for flower ${flower.id}:`,
          error
        );
        imgUrl = null;
      }
    }

    return {
      ...flower,
      flowerSize: flower.flower_size,
      imgUrl,
      categoryId: flower.category?.id,
    };
  }

  async update(
    id: string,
    updateFlowerDto: UpdateFlowerDto,
    file?: Express.Multer.File
  ) {
    const existingFlower = await this.prismaService.flower.findUnique({
      where: { id },
    });

    if (!existingFlower) throw new NotFoundException('Flower not found');

    let imgKey = existingFlower.img_url; // Keep existing S3 key

    // Handle new image upload
    if (file) {
      try {
        // Upload new image to S3 (returns S3 key)
        imgKey = await this.s3Service.uploadFile(file, 'flowers');
        console.log('New image uploaded to S3 with key:', imgKey);

        // Delete old image from S3 if it exists
        if (existingFlower.img_url) {
          try {
            await this.s3Service.deleteFile(existingFlower.img_url);
            console.log('Old image deleted from S3:', existingFlower.img_url);
          } catch (deleteError) {
            console.error('Failed to delete old S3 image:', deleteError);
            // Continue with update even if deletion fails
          }
        }
      } catch (err) {
        console.error('Failed to upload new image to S3:', err);
        throw new Error('Failed to upload image to S3');
      }
    }

    const { categoryId, ...flowerData } = updateFlowerDto;

    const updateData: any = {
      img_url: imgKey, // Store S3 key
    };

    // Only update fields that are provided
    if (flowerData.name !== undefined) updateData.name = flowerData.name;
    if (flowerData.smell !== undefined) updateData.smell = flowerData.smell;
    if (flowerData.flowerSize !== undefined)
      updateData.flower_size = flowerData.flowerSize;
    if (flowerData.height !== undefined) updateData.height = flowerData.height;
    if (flowerData.price !== undefined) updateData.price = flowerData.price;

    // Handle category update
    if (categoryId) {
      updateData.category = {
        connect: { id: categoryId },
      };
    }

    const flower = await this.prismaService.flower.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
      },
    });

    // Generate presigned URL for response
    let imgUrl: string | null = null; // FIX: Explicit type annotation
    if (imgKey) {
      try {
        imgUrl = await this.s3Service.getPresignedUrl(imgKey);
      } catch (error) {
        console.error('Failed to generate presigned URL:', error);
      }
    }

    return {
      message: 'Flower updated successfully',
      flower: {
        ...flower,
        flowerSize: flower.flower_size,
        imgUrl, // Return presigned URL
        categoryId: flower.category?.id,
      },
    };
  }

  async remove(id: string) {
    // Get the flower to delete its image from S3
    const flower = await this.prismaService.flower.findUnique({
      where: { id },
    });

    if (!flower) {
      throw new NotFoundException(`Flower with ID ${id} not found`);
    }

    // Delete image from S3 if it exists
    if (flower.img_url) {
      try {
        await this.s3Service.deleteFile(flower.img_url);
        console.log('Image deleted from S3:', flower.img_url);
      } catch (error) {
        console.error('Failed to delete image from S3:', error);
        // Continue with database deletion even if S3 deletion fails
      }
    }

    await this.prismaService.flower.delete({
      where: { id },
    });

    return {
      message: 'Flower deleted successfully',
    };
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

  // Helper method for direct S3 upload (used in upload-image endpoint)
  async uploadImageToS3(file: Express.Multer.File): Promise<string> {
    try {
      return await this.s3Service.uploadFile(file, 'flowers');
    } catch (error) {
      console.error('Failed to upload image to S3:', error);
      throw new Error('Failed to upload image to S3');
    }
  }
}
