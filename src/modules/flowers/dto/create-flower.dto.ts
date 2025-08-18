import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateFlowerDto {
  @IsString()
  name: string;

  @IsEnum(['weak', 'average', 'strong', 'very_strong'])
  @Transform(({ value }) => value?.toUpperCase())
  smell: string;

  @IsString()
  @Transform(({ value }) => value || '')
  flower_size: string;

  @IsString()
  height: string;

  @IsString()
  @IsOptional()
  img_url?: string;

  @IsString()
  price: string;

  @IsString()
  category_id: string;
}
