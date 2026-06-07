import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @MaxLength(50)
  // Prevent HTML/script injection in names
  @Matches(/^[a-zA-Z\s'\-]+$/, { message: 'firstName must contain only letters, spaces, hyphens, or apostrophes' })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @MaxLength(50)
  @Matches(/^[a-zA-Z\s'\-]+$/, { message: 'lastName must contain only letters, spaces, hyphens, or apostrophes' })
  lastName: string;

  @ApiProperty({ minLength: 8, description: 'Min 8 chars, must include uppercase, lowercase, digit, and special character' })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  password: string;
}
