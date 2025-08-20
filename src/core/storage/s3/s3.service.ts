import {
  PutObjectCommand,
  S3Client,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
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
      // Don't set ACL - files will be private by default
    });

    try {
      await this.s3Client.send(command);

      // Generate a presigned URL that expires in 7 days (adjust as needed)
      const presignedUrl = await this.getPresignedUrl(fileName);

      console.log('File uploaded successfully:', fileName);
      console.log('Presigned URL generated:', presignedUrl);

      // Return the S3 key (filename) instead of direct URL
      // We'll generate presigned URLs when needed
      return fileName; // Return just the key
    } catch (error) {
      console.error('Error uploading file to S3:', error);
      throw new Error('Failed to upload file to S3');
    }
  }

  // Generate presigned URL for accessing private files
  async getPresignedUrl(
    key: string,
    expiresIn: number = 7 * 24 * 60 * 60
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    try {
      const presignedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn, // 7 days by default
      });
      return presignedUrl;
    } catch (error) {
      console.error('Error generating presigned URL:', error);
      throw new Error('Failed to generate presigned URL');
    }
  }

  async deleteFile(fileKey: string): Promise<void> {
    try {
      // If it's a full URL, extract the key
      const key = this.isS3Url(fileKey)
        ? this.extractKeyFromUrl(fileKey)
        : fileKey;

      if (!key) {
        console.warn('Could not extract key from:', fileKey);
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
      // Handle both direct S3 URLs and presigned URLs
      if (url.includes('amazonaws.com')) {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        return pathname.startsWith('/') ? pathname.substring(1) : pathname;
      }
      return null;
    } catch (error) {
      console.error('Error extracting key from URL:', error);
      return null;
    }
  }

  // Helper method to check if string is an S3 URL
  isS3Url(url: string): boolean {
    return (
      url.includes('amazonaws.com') &&
      (url.includes('s3.') || url.includes('s3-'))
    );
  }
}
