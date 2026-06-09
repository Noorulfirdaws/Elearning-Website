/**
 * achat.dto.ts
 * ============
 * DTOs de validation strict pour les routes d'achats.
 * Chaque champ est validé avec class-validator.
 *
 * SÉCURITÉ :
 *   - Rejette tout champ non listé (whitelist: true dans main.ts)
 *   - Valide les enums côté serveur (pas de confiance client)
 *   - Limite la longueur des strings (anti-DoS)
 *   - Valide les UUIDs et slugs (anti-IDOR)
 */

import {
  IsEnum, IsString, IsNotEmpty, IsOptional, Matches, MaxLength, MinLength,
  IsUUID,
} from 'class-validator';
import { TypeAcces } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Regex pour les slugs LearnHub : "c3-maths-pythagore", "LT", "BREVET", etc.
// Accepte : lettres, chiffres, tirets — refuse tout le reste (injection, path traversal)
const SLUG_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9\-]{0,100}$/;

// Regex numéro de téléphone Djibouti : 77/78/25261XXXXXXX
const PHONE_REGEX = /^(25[25678]\d{7}|\d{8})$/;

// ─── Initier un achat ─────────────────────────────────────────────────────────

export class InitierAchatDto {
  @ApiProperty({ enum: TypeAcces, example: 'CHAPITRE' })
  @IsEnum(TypeAcces, { message: 'typeAcces doit être CHAPITRE, CLASSE ou EXAMEN' })
  typeAcces: TypeAcces;

  @ApiProperty({
    example: 'c3-maths-pythagore',
    description: 'ID du chapitre, niveau ou type d\'examen (slug ou BREVET/BAC)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Matches(SLUG_REGEX, { message: 'itemId invalide (caractères non autorisés)' })
  itemId: string;

  @ApiProperty({ example: '25261234567', description: 'Numéro Waafi/Zaad sans espace ni +' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @Matches(PHONE_REGEX, { message: 'Numéro de téléphone invalide (format Djibouti attendu)' })
  phoneNumber: string;

  @ApiPropertyOptional({ enum: ['WAAFI', 'DMONEY'], default: 'WAAFI' })
  @IsOptional()
  @IsEnum(['WAAFI', 'DMONEY'], { message: 'provider doit être WAAFI ou DMONEY' })
  provider?: 'WAAFI' | 'DMONEY';
}

// ─── Valider un achat ─────────────────────────────────────────────────────────

export class ValiderAchatDto {
  @ApiProperty({ enum: TypeAcces })
  @IsEnum(TypeAcces)
  typeAcces: TypeAcces;

  @ApiProperty({ example: 'c3-maths-pythagore' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Matches(SLUG_REGEX, { message: 'itemId invalide' })
  itemId: string;

  @ApiProperty({ description: 'requestId retourné par /achats/initier' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(200)
  // UUIDs ou tokens alphanumériques uniquement
  @Matches(/^[a-zA-Z0-9\-_]{8,200}$/, { message: 'requestId invalide' })
  requestId: string;

  @ApiProperty({ description: 'transactionId WaafiPay' })
  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  @MaxLength(200)
  @Matches(/^[a-zA-Z0-9\-_]{4,200}$/, { message: 'transactionId invalide' })
  transactionId: string;
}

// ─── Annuler un achat ────────────────────────────────────────────────────────

export class AnnulerAchatDto {
  @ApiProperty({ enum: TypeAcces })
  @IsEnum(TypeAcces)
  typeAcces: TypeAcces;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Matches(SLUG_REGEX, { message: 'itemId invalide' })
  itemId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Matches(/^[a-zA-Z0-9\-_]{4,200}$/, { message: 'transactionId invalide' })
  transactionId?: string;
}

// ─── Admin : offrir accès ────────────────────────────────────────────────────

export class OffrirAccesDto {
  @ApiProperty({ description: 'UUID de l\'utilisateur bénéficiaire' })
  @IsUUID(4, { message: 'userId doit être un UUID valide' })
  userId: string;

  @ApiProperty({ enum: TypeAcces })
  @IsEnum(TypeAcces)
  typeAcces: TypeAcces;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Matches(SLUG_REGEX, { message: 'itemId invalide' })
  itemId: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
