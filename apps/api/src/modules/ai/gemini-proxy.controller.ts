/**
 * GeminiProxyController
 * =====================
 * Route proxy sécurisée : le frontend NE TOUCHE JAMAIS la clé API Gemini.
 * Seul le backend NestJS connaît GOOGLE_API_KEY.
 *
 * Sécurités :
 *   - JWT obligatoire (guard global)
 *   - Rate-limit : 10 appels / heure par userId (anti-abus)
 *   - Sanitisation des inputs (pas d'injection de prompt via URL params)
 *   - La clé API n'apparaît JAMAIS dans les réponses ni les logs
 */

import {
  Controller, Post, Body, UseGuards, HttpCode, HttpStatus,
  BadRequestException, Logger, ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';

// Types stricts — refuse toute requête hors whitelist
const MODELES_AUTORISES = ['gemini-2.0-flash', 'gemini-1.5-flash'] as const;
type ModeleAutorise = typeof MODELES_AUTORISES[number];

interface GeminiProxyRequest {
  modele?: ModeleAutorise;
  prompt: string;
  maxTokens?: number;
}

@ApiTags('ai-proxy')
@Controller('ai/gemini')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GeminiProxyController {
  private readonly logger = new Logger(GeminiProxyController.name);
  private readonly GEMINI_API = 'https://generativelanguage.googleapis.com/v1beta/models';

  constructor(private config: ConfigService) {}

  /**
   * POST /ai/gemini/generer
   * Proxy sécurisé vers Gemini. La clé reste EXCLUSIVEMENT côté serveur.
   * Rate-limit : 10 req/heure par utilisateur (throttler NestJS).
   */
  @Post('generer')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 3600_000 } }) // 10 req/heure
  @ApiOperation({ summary: 'Génération IA via proxy sécurisé (clé server-side uniquement)' })
  async generer(
    @CurrentUser('id') userId: string,
    @Body() body: GeminiProxyRequest,
  ) {
    const { prompt, modele = 'gemini-2.0-flash', maxTokens = 2048 } = body;

    // ── Validation stricte ────────────────────────────────────────────────
    if (!prompt || typeof prompt !== 'string') {
      throw new BadRequestException('prompt requis (string)');
    }
    if (prompt.length > 8000) {
      throw new BadRequestException('prompt trop long (max 8000 caractères)');
    }
    if (!MODELES_AUTORISES.includes(modele)) {
      throw new ForbiddenException(`Modèle non autorisé: ${modele}`);
    }
    if (maxTokens < 128 || maxTokens > 4096) {
      throw new BadRequestException('maxTokens doit être entre 128 et 4096');
    }

    // ── Récupération de la clé côté serveur UNIQUEMENT ────────────────────
    const apiKey = this.config.get<string>('GOOGLE_API_KEY');
    if (!apiKey) {
      throw new ForbiddenException('Service IA non configuré');
      // NE PAS logger l'absence de clé avec des détails — attaquant reconnaîtrait le chemin
    }

    const url = `${this.GEMINI_API}/${modele}:generateContent?key=${apiKey}`;

    const payload = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.7,
        maxOutputTokens: maxTokens,
      },
    };

    this.logger.log(`[GeminiProxy] user=${userId} modele=${modele} tokens=${maxTokens}`);
    // ⚠️ NE JAMAIS logger `url` (contient la clé) ni `apiKey`

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errBody = await res.text();
        // Sanitiser : ne pas exposer les détails internes Gemini au client
        this.logger.error(`[GeminiProxy] Erreur Gemini HTTP ${res.status}`);
        throw new BadRequestException('Erreur du service IA. Réessayez dans quelques instants.');
      }

      const data = await res.json() as any;
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        throw new BadRequestException('Réponse IA vide');
      }

      return { success: true, texte: text };

    } catch (err) {
      if (err instanceof BadRequestException || err instanceof ForbiddenException) throw err;
      this.logger.error(`[GeminiProxy] Erreur réseau: ${err.message}`);
      throw new BadRequestException('Impossible de joindre le service IA');
    }
  }
}
