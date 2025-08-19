import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateFlowerDto {
  @IsString()
  name: string;

  // @IsEnum(['weak', 'average', 'strong', 'very_strong'])
  // @Transform(({ value }) => value?.toUpperCase())
  @IsString()
  smell: string;

  @IsString()
  @Transform(({ value }) => value || '')
  flowerSize: string;

  @IsString()
  height: string;

  @IsString()
  @IsOptional()
  imgUrl?: string;

  @IsString()
  price: string;

  @IsString()
  categoryId: string;
}
