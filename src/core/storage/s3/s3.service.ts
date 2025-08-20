import {
  PutObjectCommand,
  S3Client,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuid } from 'uuid';

@Injectable()
export class S3Service {
  private s3Client: S3Client;
  private bucketName: string;
  private region: string;

  constructor(private readonly configService: ConfigService) {
    this.region = this.configService.get<string>('AWS_S3_REGION') as string;
    this.bucketName = this.configService.get<string>(
      'AWS_S3_BUCKET_NAME'
    ) as string;

    console.log('🔧 S3 Config:', {
      region: this.region,
      bucketName: this.bucketName,
      accessKeyId: this.configService.get('AWS_S3_ACCESS_KEY_ID')
        ? '✅ set'
        : '❌ missing',
      secretAccessKey: this.configService.get('AWS_S3_SECRET_ACCESS_KEY')
        ? '✅ set'
        : '❌ missing',
    });

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.configService.get<string>(
          'AWS_S3_ACCESS_KEY_ID'
        ) as string,
        secretAccessKey: this.configService.get<string>(
          'AWS_S3_SECRET_ACCESS_KEY'
        ) as string,
      },
    });
  }

  async uploadFile(
    file: Express.Multer.File,
    prefix: string = 'flowers'
  ): Promise<string> {
    // Generate unique filename with original extension
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${prefix}/${uuid()}.${fileExtension}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
      // Make the file publicly readable
      ACL: 'public-read',
    });

    try {
      await this.s3Client.send(command);

      // Return the full S3 URL
      const fileUrl = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${fileName}`;
      console.log('File uploaded successfully:', fileUrl);
      return fileUrl;
    } catch (error) {
      console.error('Error uploading file to S3:', error);
      throw new Error('Failed to upload file to S3');
    }
  }

  async deleteFile(fileUrl: string): Promise<void> {
    try {
      // Extract the key from the S3 URL
      const key = this.extractKeyFromUrl(fileUrl);
      if (!key) {
        console.warn('Could not extract key from URL:', fileUrl);
        return;
      }

      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      console.log('File deleted successfully:', key);
    } catch (error) {
      console.error('Error deleting file from S3:', error);
      throw new Error('Failed to delete file from S3');
    }
  }

  private extractKeyFromUrl(url: string): string | null {
    try {
      // Extract key from S3 URL format: https://bucket.s3.region.amazonaws.com/key
      const urlParts = url.split(
        `https://${this.bucketName}.s3.${this.region}.amazonaws.com/`
      );
      return urlParts.length > 1 ? urlParts[1] : null;
    } catch (error) {
      console.error('Error extracting key from URL:', error);
      return null;
    }
  }

  // Helper method to check if URL is an S3 URL
  isS3Url(url: string): boolean {
    return url.includes(`${this.bucketName}.s3.${this.region}.amazonaws.com`);
  }
}
