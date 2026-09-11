// NOTE: Defines and documents the login request payload.
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@isp.local' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SeedPass123!', minLength: 1 })
  @IsString()
  @MinLength(1)
  password: string;
}
