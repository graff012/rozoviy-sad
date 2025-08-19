import { IsEnum, IsOptional, IsString, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateFlowerDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @Transform(({ value }) => value || '')
  smell: string;

  @IsString()
  @Transform(({ value }) => value || '')
  flowerSize: string;

  @IsString()
  @Transform(({ value }) => value || '')
  height: string;

  @IsString()
  @IsOptional()
  imgUrl?: string;

  @IsString()
  @IsNotEmpty()
  price: string;

  @IsString()
  @IsNotEmpty()
  categoryId: string;
}
