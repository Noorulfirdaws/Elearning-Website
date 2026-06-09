# Guide — Générateur de masse LearnHub Djibouti

## Vue d'ensemble

`generate-all-courses.mjs` génère **175 chapitres** pour les 7 niveaux scolaires
(6ème → Terminale) × 5 matières × 5 chapitres chacun.

Chaque chapitre contient :
- **Cours** : introduction + 3 points clés avec formules
- **3 exemples** résolus pas à pas
- **3 exercices** avec corrigés détaillés  
- **5 questions de quiz** (QCM avec explication pédagogique)

---

## Étape 1 — Obtenir la clé Google AI Studio

1. Aller sur **https://aistudio.google.com/apikey**
2. Cliquer sur **"Create API Key"**
3. Copier la clé (commence par `AIza...`)

**Quota gratuit Gemini 2.0 Flash :**
- 15 requêtes / minute
- 1 500 requêtes / jour  
- 1 million tokens / minute

Avec 5s de pause entre chapitres, le script reste bien en dessous des limites.

---

## Étape 2 — Ajouter la clé dans .env

```
# apps/api/.env — ajouter cette ligne :
GOOGLE_API_KEY=AIzaSy...votre_cle_ici
```

---

## Étape 3 — Lancer le script

```powershell
# Depuis la racine du projet
cd C:\Users\nooru\Documents\noorulfirdaws\lms-platform

# Test rapide (3ème uniquement, ~3 min, sans confirmation)
node scripts/generate-all-courses.mjs --niveau C3 --yes

# Un seul niveau + matière (test ~3 min)
node scripts/generate-all-courses.mjs --niveau C3 --matiere Maths --yes

# Tout générer (175 chapitres, ~15 min, demande confirmation)
node scripts/generate-all-courses.mjs

# Tout générer sans confirmation
node scripts/generate-all-courses.mjs --yes

# Reprendre après interruption
node scripts/generate-all-courses.mjs --resume

# Régénérer même si déjà fait
node scripts/generate-all-courses.mjs --force --niveau LT
```

---

## Options disponibles

| Option | Description |
|---|---|
| `--dry-run` | Voir ce qui serait généré sans appeler l'API |
| `--niveau C3` | Un seul niveau (C6, C5, C4, C3, LS, LP, LT) |
| `--matiere Maths` | Une seule matière (partiel, insensible à la casse) |
| `--resume` | Reprendre depuis la dernière interruption |
| `--force` | Régénérer même si le contenu existe déjà |
| `--yes` | Ne pas demander confirmation pour les gros volumes |

---

## Ordre recommandé de génération

```powershell
# Jour 1 matin (~15 min) — 3ème + Terminale (priorité Brevet/Bac)
node scripts/generate-all-courses.mjs --niveau C3 --yes
node scripts/generate-all-courses.mjs --niveau LT --yes

# Jour 1 après-midi (~30 min) — reste du lycée
node scripts/generate-all-courses.mjs --niveau LP --yes
node scripts/generate-all-courses.mjs --niveau LS --yes

# Jour 2 (~60 min) — tout le collège restant
node scripts/generate-all-courses.mjs --niveau C4 --yes
node scripts/generate-all-courses.mjs --niveau C5 --yes
node scripts/generate-all-courses.mjs --niveau C6 --yes
```

---

## Fichier de progression

Le script sauvegarde sa progression dans :
```
scripts/.progress/generation-progress.json
```

Ce fichier contient l'état de chaque chapitre (`done: true/false`).
Utilisez `--resume` pour reprendre sans re-générer les chapitres déjà faits.

---

## En cas de problème

**Rate limit (erreur 429)** : Le script attend automatiquement 30s et réessaye.

**Erreur réseau** : Le script passe au chapitre suivant (3 tentatives par chapitre).

**JSON invalide** : Le script répare automatiquement les JSON malformés de Gemini.

**API LearnHub non démarrée** :
```powershell
pm2 start apps/api/ecosystem.config.js
pm2 logs lms-api --lines 10 --nostream
```

---

## Structure des IDs générés

Format : `{niveauId}-{matiereSlug}-{chapitreSlug}`

Exemples :
- `c3-maths-pythagore`
- `lt-maths-integrale`
- `ls-physique-mecanique-mouvement`
- `c6-svt-cellule-unite`
