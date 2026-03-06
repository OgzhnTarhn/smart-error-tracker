import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const GROUP_STATUS_VALUES = ['open', 'resolved', 'ignored'] as const;
export const EVENT_LEVEL_VALUES = ['error', 'warn', 'info'] as const;

export type GroupStatusValue = (typeof GROUP_STATUS_VALUES)[number];
export type EventLevelValue = (typeof EVENT_LEVEL_VALUES)[number];

export class ListGroupsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  // Backward compatibility for existing clients using `q`.
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @IsOptional()
  @IsString()
  @IsIn(GROUP_STATUS_VALUES)
  status?: GroupStatusValue;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  environment?: string;

  @IsOptional()
  @IsString()
  @IsIn(EVENT_LEVEL_VALUES)
  level?: EventLevelValue;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  release?: string;

  @IsOptional()
  @IsString()
  limit?: string;

  @IsOptional()
  @IsString()
  offset?: string;
}
