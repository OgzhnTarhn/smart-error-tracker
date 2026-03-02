import { Type } from 'class-transformer';
import {
  IsIn,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

class SdkInfoDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  version?: string;
}

export class IngestEventDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  source!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  message!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100000)
  stack?: string;

  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;

  @IsOptional()
  @IsISO8601()
  timestamp?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  environment?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  releaseVersion?: string;

  @IsOptional()
  @IsIn(['error', 'warn', 'info'])
  level?: 'error' | 'warn' | 'info';

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => SdkInfoDto)
  sdk?: SdkInfoDto;
}
