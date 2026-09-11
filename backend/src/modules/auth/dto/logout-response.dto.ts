// NOTE: Defines and documents the logout response payload.
import { ApiProperty } from '@nestjs/swagger';

export class LogoutResponseDto {
  @ApiProperty({ example: true })
  ok: true;
}
