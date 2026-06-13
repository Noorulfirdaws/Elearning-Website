import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import Anthropic from '@anthropic-ai/sdk';
import { ConfigService } from '@nestjs/config';

// Ordre pédagogique des matières (au lieu de l'alphabétique)
const SUBJECT_ORDER = [
  'Mathématiques',
  'Physique-Chimie',
  'Physique',
  'Chimie',
  'SVT',
  'Sciences de la Vie et de la Terre',
  'Français',
  'Anglais',
  'Histoire-Géographie',
  'Histoire',
  'Géographie',
];
function subjectRank(nom: string): number {
  const i = SUBJECT_ORDER.indexOf(nom);
  return i === -1 ? SUBJECT_ORDER.length : i;
}
function sortMatieres<T extends { nom: string }>(matieres: T[]): T[] {
  return [...matieres].sort((a, b) => {
    const r = subjectRank(a.nom) - subjectRank(b.nom);
    return r !== 0 ? r : a.nom.localeCompare(b.nom);
  });
}

@Injectable()
export class EducationService {
  private anthropic: Anthropic;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.anthropic = new Anthropic({
      apiKey: this.config.get('app.anthropic.apiKey'),
    });
  }

  // ─── NIVEAUX ────────────────────────────────────────────────────────────────

  async getAllNiveaux() {
    return this.prisma.niveau.findMany({
      orderBy: { ordre: 'asc' },
      include: {
        _count: { select: { matieres: true } },
      },
    });
  }

  async getNiveauById(id: string) {
    const niveau = await this.prisma.niveau.findUnique({
      where: { id },
      include: {
        matieres: {
          orderBy: { nom: 'asc' },
          include: {
            _count: { select: { chapitres: true } },
          },
        },
      },
    });
    if (!niveau) throw new NotFoundException('Niveau introuvable');
    if (niveau.matieres) niveau.matieres = sortMatieres(niveau.matieres);
    return niveau;
  }

  // ─── MATIÈRES ───────────────────────────────────────────────────────────────

  async getMatieresByNiveau(niveauId: string) {
    const matieres = await this.prisma.matiere.findMany({
      where: { niveauId },
      include: {
        _count: { select: { chapitres: true } },
        chapitres: {
          where: { isPublished: true },
          select: { id: true, titre: true, ordre: true },
          orderBy: { ordre: 'asc' },
        },
      },
    });
    return sortMatieres(matieres);
  }

  async getMatiereById(id: string) {
    const matiere = await this.prisma.matiere.findUnique({
      where: { id },
      include: {
        niveau: true,
        chapitres: {
          where: { isPublished: true },
          orderBy: { ordre: 'asc' },
          select: {
            id: true,
            titre: true,
            ordre: true,
            youtubeUrl: true,
            khanAcademyUrl: true,
            versionId: true,
            isPublished: true,
          },
        },
      },
    });
    if (!matiere) throw new NotFoundException('Matière introuvable');
    return matiere;
  }

  // ─── CHAPITRES ──────────────────────────────────────────────────────────────

  async getChapitreById(id: string, userId?: string) {
    const chapitre = await this.prisma.chapitre.findUnique({
      where: { id },
      include: {
        matiere: { include: { niveau: true } },
      },
    });
    if (!chapitre) throw new NotFoundException('Chapitre introuvable');

    // Progression de l'élève si connecté
    let progression = null;
    if (userId) {
      progression = await this.prisma.chapitreProgress.findUnique({
        where: { userId_chapitreId: { userId, chapitreId: id } },
      });
    }

    return { ...chapitre, progression };
  }

  async rechercheChapitres(q: string, niveauId?: string, matiereId?: string) {
    const where: any = { isPublished: true };
    if (q) where.titre = { contains: q, mode: 'insensitive' };
    if (matiereId) where.matiereId = matiereId;
    if (niveauId) where.matiere = { niveauId };

    return this.prisma.chapitre.findMany({
      where,
      orderBy: [{ matiere: { niveauId: 'asc' } }, { ordre: 'asc' }],
      take: 40,
      select: {
        id: true,
        titre: true,
        ordre: true,
        matiere: {
          select: {
            id: true,
            nom: true,
            icone: true,
            couleur: true,
            niveau: { select: { id: true, nom: true, cycle: true } },
          },
        },
      },
    });
  }

  async getChapitresByMatiere(matiereId: string) {
    return this.prisma.chapitre.findMany({
      where: { matiereId, isPublished: true },
      orderBy: { ordre: 'asc' },
      select: {
        id: true,
        titre: true,
        ordre: true,
        youtubeUrl: true,
        khanAcademyUrl: true,
        versionId: true,
      },
    });
  }

  // ─── PROGRESSION ÉLÈVE ──────────────────────────────────────────────────────

  async saveProgression(userId: string, chapitreId: string, data: {
    estComplete?: boolean;
    scoreQuiz?: number;
    tempsLecture?: number;
  }) {
    return this.prisma.chapitreProgress.upsert({
      where: { userId_chapitreId: { userId, chapitreId } },
      create: {
        userId,
        chapitreId,
        ...data,
        tentativesQuiz: data.scoreQuiz !== undefined ? 1 : 0,
        completedAt: data.estComplete ? new Date() : undefined,
      },
      update: {
        ...data,
        tentativesQuiz: data.scoreQuiz !== undefined
          ? { increment: 1 }
          : undefined,
        completedAt: data.estComplete ? new Date() : undefined,
      },
    });
  }

  async getProgressionEleve(userId: string) {
    return this.prisma.chapitreProgress.findMany({
      where: { userId },
      include: {
        chapitre: {
          select: {
            id: true,
            titre: true,
            matiere: {
              select: {
                nom: true,
                niveau: { select: { nom: true } },
              },
            },
          },
        },
      },
    });
  }

  // ─── GÉNÉRATION AI (invisible pour l'élève) ─────────────────────────────────

  async genererContenuChapitre(chapitreId: string, niveau: string, matiere: string, titre: string) {
    const prompt = `Rôle : Tu es un professeur expert des programmes scolaires francophones (collège et lycée de Djibouti).

Mission : Génère un contenu de cours ultra-structuré, pédagogique et complet pour le chapitre demandé.
Le contenu doit être optimisé pour des élèves sur smartphone, avec des explications simples, des exemples clairs, des exercices d'application et un quiz de validation.

Paramètres :
- Niveau : ${niveau}
- Matière : ${matiere}
- Chapitre : ${titre}

RÈGLES JSON OBLIGATOIRES :
1. Renvoie UNIQUEMENT du JSON valide — aucun texte avant ou après.
2. Utilise des guillemets droits " pour toutes les chaînes (jamais de guillemets typographiques).
3. Les apostrophes dans le texte français doivent être échappées ou remplacées : écris "n inconnue" ou "l'inconnue" (avec apostrophe droite ').
4. Aucune virgule trailing après le dernier élément d'un tableau ou objet.
5. Toutes les chaînes sur une seule ligne (pas de retours à la ligne dans les valeurs).

Renvoie UNIQUEMENT un objet JSON valide, sans texte avant ni après, structuré exactement comme ceci :
{
  "contenuCours": {
    "introduction": "Résumé simple en 2 phrases",
    "points_cles": [
      {"titre": "Point clé", "explication": "Explication courte et claire", "formule": "Formule si applicable ou null"}
    ]
  },
  "exemples": [
    {
      "situation": "Situation concrète ou problème type",
      "resolution_pas_a_pas": "Résolution détaillée étape par étape"
    }
  ],
  "exercices": [
    {
      "enonce": "Consigne claire",
      "corrige_detaille": "Correction complète étape par étape"
    }
  ],
  "quiz": [
    {
      "question": "Question à choix multiple",
      "options": ["Option A", "Option B", "Option C"],
      "reponse_correcte": "L'option exacte",
      "explication_pedagogique": "Pourquoi cette réponse est correcte"
    }
  ],
  "youtubeMotsCles": "mots-clés de recherche YouTube pour ce chapitre",
  "khanAcademyUrl": "URL Khan Academy si disponible en français sinon null"
}`;

    const message = await this.anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Génération échouée — format invalide');

    let parsed: any;
    const raw = jsonMatch[0];

    // Reparation JSON robuste (les LLMs generent parfois de vrais \n dans les strings)
    const repaired = raw
      .replace(/\r\n/g, ' ').replace(/\r/g, ' ').replace(/\n/g, ' ') // newlines -> espaces
      .replace(/,\s*([}\]])/g, '$1')                                   // trailing commas
      .replace(/\\(?!["\\/bfnrtu])/g, '\\\\')                         // backslashes non echappes
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');             // caracteres de controle

    try {
      parsed = JSON.parse(repaired);
    } catch (e) {
      throw new Error(`JSON invalide: ${(e as Error).message}`);
    }

    // Mettre à jour le chapitre avec le contenu généré
    await this.prisma.chapitre.update({
      where: { id: chapitreId },
      data: {
        contenuCours: parsed.contenuCours,
        exemples: parsed.exemples || [],
        exercices: parsed.exercices || [],
        quiz: parsed.quiz || [],
        youtubeMotsCles: parsed.youtubeMotsCles || null,
        khanAcademyUrl: parsed.khanAcademyUrl || null,
        isPublished: true,
        versionId: { increment: 1 },
      },
    });

    return { success: true, chapitreId };
  }

  // ─── ADMIN — CRUD ────────────────────────────────────────────────────────────

  async createChapitre(data: {
    id: string;
    matiereId: string;
    titre: string;
    ordre: number;
    youtubeUrl?: string;
    isPublished?: boolean;
  }) {
    const { isPublished, ...rest } = data;
    return this.prisma.chapitre.create({
      data: {
        ...rest,
        contenuCours: {},
        exemples: [],
        exercices: [],
        quiz: [],
        isPublished: isPublished ?? false,
      },
    });
  }

  async updateChapitre(id: string, data: any) {
    return this.prisma.chapitre.update({ where: { id }, data });
  }

  async createMatiere(data: { nom: string; niveauId: string; icone?: string; couleur?: string }) {
    return this.prisma.matiere.create({ data });
  }
}
