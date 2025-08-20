import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Put,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FlowersService } from './flowers.service';
import { CreateFlowerDto } from './dto/create-flower.dto';
import { UpdateFlowerDto } from './dto/update-flower.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RoleGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';

// Interface for the like response
interface LikeResponse {
  success: boolean;
  message: string;
  isLiked: boolean;
}

@Controller('flowers')
export class FlowersController {
  constructor(private readonly flowersService: FlowersService) {}

  @UseGuards(AuthGuard, RoleGuard)
  @Roles('admin')
  @Post('create')
  @UseInterceptors(FileInterceptor('image')) // No storage config - using memory storage for S3
  async create(
    @Body() createFlowerDto: CreateFlowerDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({
            fileType: 'image/(jpeg|jpg|png|webp)',
          }),
        ],
        fileIsRequired: false,
      })
    )
    file?: Express.Multer.File
  ) {
    try {
      const result = await this.flowersService.create(createFlowerDto, file);
      return result;
    } catch (err) {
      console.error('Error creating flower:', err);
      throw err;
    }
  }

  @Post('debug-upload')
  @UseInterceptors(FileInterceptor('image'))
  debugUpload(@UploadedFile() file: Express.Multer.File) {
    return {
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      bufferLength: file.buffer?.length,
    };
  }

  @Get()
  async findAll() {
    try {
      const flowers = await this.flowersService.findAll();
      return { flowers };
    } catch (error) {
      console.error('Error in findAll controller:', error);
      throw error;
    }
  }

  @Post(':id/like')
  async toggleLike(
    @Param('id') id: string,
    @Body() body: { userId: string }
  ): Promise<LikeResponse> {
    try {
      const result = await this.flowersService.toggleLike(id, body.userId);
      return {
        success: true,
        message: result.message,
        isLiked: result.isLiked,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to update like status',
        isLiked: false,
      };
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.flowersService.findOne(id);
  }

  @UseGuards(AuthGuard, RoleGuard)
  @Roles('admin')
  @Put(':id')
  @UseInterceptors(FileInterceptor('image')) // No storage config - using memory storage for S3
  async update(
    @Param('id') id: string,
    @Body() updateFlowerDto: UpdateFlowerDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({
            fileType: 'image/(jpeg|jpg|png|webp)',
          }),
        ],
        fileIsRequired: false, // Make file optional
      })
    )
    file?: Express.Multer.File
  ) {
    try {
      const result = await this.flowersService.update(
        id,
        updateFlowerDto,
        file
      );
      return result;
    } catch (err) {
      console.error('Error updating flower:', err);
      throw err;
    }
  }

  @UseGuards(AuthGuard, RoleGuard)
  @Roles('admin')
  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      return await this.flowersService.remove(id);
    } catch (error) {
      console.error('Error deleting flower:', error);
      throw error;
    }
  }

  // Test endpoint for S3 upload
  @UseGuards(AuthGuard, RoleGuard)
  @Roles('admin')
  @Post('upload-image')
  @UseInterceptors(FileInterceptor('image'))
  async uploadImage(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({
            fileType: 'image/(jpeg|jpg|png|webp)',
          }),
        ],
        fileIsRequired: true,
      })
    )
    file: Express.Multer.File
  ) {
    try {
      // Direct S3 upload test
      const s3Url = await this.flowersService.uploadImageToS3(file);
      return {
        message: 'Image uploaded successfully to S3',
        imageUrl: s3Url,
        fileInfo: {
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
        },
      };
    } catch (error) {
      console.error('Error handling image upload:', error);
      throw error;
    }
  }
}
