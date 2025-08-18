import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateFlowerDto {
  @IsString()
  @IsOptional()
  name?: string;

  // @IsEnum(['WEAK', 'AVERAGE', 'STRONG', 'VERY_STRONG'])
  // @Transform(({ value }) => value?.toUpperCase())
  @IsOptional()
  smell?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value || '')
  flower_size?: string;

  @IsString()
  @IsOptional()
  height?: string;

  @IsString()
  @IsOptional()
  price?: string;

  @IsString()
  @IsOptional()
  img_url?: string;

  @IsString()
  @IsOptional()
  category_id?: string;
}
