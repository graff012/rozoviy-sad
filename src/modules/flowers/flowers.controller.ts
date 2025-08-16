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
  Res,
  Request,
} from '@nestjs/common';
import { FlowersService } from './flowers.service';
import { CreateFlowerDto } from './dto/create-flower.dto';
import { UpdateFlowerDto } from './dto/update-flower.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RoleGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { FileInterceptor } from '@nestjs/platform-express';
import { existsSync } from 'fs';
import { Response } from 'express';

// Interface for the like response
interface LikeResponse {
  success: boolean;
  message: string;
  isLiked: boolean;
}

// Storage configuration
const storage = diskStorage({
  destination: (req, file, cb) => {
    // Use process.cwd() to get the project root, not dist folder
    const uploadPath = join(process.cwd(), 'public', 'images');
    console.log('Upload path:', uploadPath); // Debug log
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const randomName = Array(32)
      .fill(null)
      .map(() => Math.round(Math.random() * 16).toString(16))
      .join('');
    cb(null, `${randomName}${extname(file.originalname)}`);
  },
});

@Controller('flowers')
export class FlowersController {
  constructor(private readonly flowersService: FlowersService) {}

  @UseGuards(AuthGuard, RoleGuard)
  @Roles('admin')
  @Post('create')
  @UseInterceptors(FileInterceptor('image', { storage }))
  async create(
    @Body() createFlowerDto: CreateFlowerDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    // console.log('=== CREATE FLOWER DEBUG ===');
    // console.log('Raw request body keys:', Object.keys(createFlowerDto || {}));
    // console.log('Received file:', file);
    // console.log(
    //   'File details:',
    //   file
    //     ? {
    //         fieldname: file.fieldname,
    //         originalname: file.originalname,
    //         encoding: file.encoding,
    //         mimetype: file.mimetype,
    //         size: file.size,
    //         destination: file.destination,
    //         filename: file.filename,
    //         path: file.path,
    //       }
    //     : 'NO FILE',
    // );
    // console.log('Received DTO:', createFlowerDto);
    // console.log('=== END DEBUG ===');

    if (file) {
      // Save the image url ('images/filename.jpg')
      createFlowerDto.img_url = `/images/${file.filename}`;
    }

    const { flower, message } =
      await this.flowersService.create(createFlowerDto);

    return { flower, message };
  }

  // @Get('test-image/:filename')
  // testImage(@Param('filename') filename: string, @Res() res: Response) {
  //   const imagePath = join(process.cwd(), 'public', 'images', filename);
  //   console.log('Test image path:', imagePath);
  //   console.log('File exists:', existsSync(imagePath));
  //
  //   if (existsSync(imagePath)) {
  //     return res.sendFile(imagePath);
  //   } else {
  //     return res.status(404).send('Image not found at: ' + imagePath);
  //   }
  // }

  // @UseGuards(AuthGuard) // Require authentication
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

  @Get('test-like/:flowerId/:userId')
  async testLike(
    @Param('flowerId') flowerId: string,
    @Param('userId') userId: string,
  ) {
    try {
      const result = await this.flowersService.toggleLike(flowerId, userId);
      return {
        success: true,
        message: result.message,
        isLiked: result.isLiked,
        flowerId,
        userId,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        flowerId,
        userId,
      };
    }
  }

  @Post(':id/like')
  // @UseGuards(AuthGuard)
  async toggleLike(
    @Param('id') id: string,
    @Body() body: { userId: string },
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
  @UseInterceptors(FileInterceptor('image', { storage }))
  async update(
    @Param('id') id: string,
    @Body() updateFlowerDto: UpdateFlowerDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (file) {
      updateFlowerDto.img_url = `/images/${file.filename}`;
    }
    return await this.flowersService.update(id, updateFlowerDto);
  }

  @UseGuards(AuthGuard, RoleGuard)
  @Roles('admin')
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.flowersService.remove(id);
  }
}
