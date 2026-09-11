// NOTE: Defines and documents safe user response payloads.
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class UserResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @ApiProperty({ example: 'Maria Garcia' })
  name!: string;

  @ApiProperty({ format: 'email', example: 'maria@example.com' })
  email!: string;

  @ApiPropertyOptional({ example: '+54 11 4321-2112' })
  phone?: string | null;

  @ApiProperty({ enum: Role, example: Role.INSTALLER })
  role!: Role;

  @ApiProperty({ example: true })
  active!: boolean;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    nullable: true,
    description: 'Last login; null if the user has never signed in.',
  })
  lastLoginAt?: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}
