// NOTE: Defines and documents partial user update request payloads.
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Role } from '@prisma/client';

export interface UpdateUserBody {
  name?: string;
  email?: string;
  password?: string;
  phone?: string;
  role?: Role;
  active?: boolean;
}

export class UpdateUserDto implements UpdateUserBody {
  @ApiPropertyOptional({ example: 'Maria Garcia' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ format: 'email' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    minLength: 8,
    description: 'If provided, at least 8 characters.',
    example: 'NewPass456',
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
