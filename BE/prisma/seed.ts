/**
 * HANGUL - Master Seed File
 * =========================
 * Idempotent: safe to run multiple times (uses upsert, never drops user data).
 * Loads ALL vocabulary from prisma/data/** (NEWBIE → BEGINNER → INTERMEDIATE → UPPER → ADVANCED).
 * Data persists in Docker volume `postgres_data` across shutdowns.
 *
 * Run:
 *   npx ts-node --transpile-only prisma/seed.ts
 *   OR: npm run seed
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// ─── Levels in display order ─────────────────────────────────────────────────
const LEVEL_ORDER = ['NEWBIE', 'BEGINNER', 'INTERMEDIATE', 'UPPER', 'ADVANCED'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '');
}

/** Recursively collect every .json file under a directory */
function collectJsonFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) {
      results.push(...collectJsonFiles(full));
    } else if (entry.endsWith('.json')) {
      results.push(full);
    }
  }
  return results;
}

interface VocabEntry {
  korean: string;
  english: string;
  vietnamese: string;
  romanization?: string;
  type?: string;
}

interface JsonFile {
  topic: string;
  level: string;
  description?: string;
  vocabulary: VocabEntry[];
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║       HANGUL Master Seed — loading all data          ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');

  // ── 1. Default accounts ───────────────────────────────────────────────────
  console.log('👤  Upserting default accounts...');

  const defaultUsers = [
    { email: 'test@example.com',  name: 'Test User',  password: '123456',   role: 'USER' as const },
    { email: 'admin@example.com', name: 'Admin User', password: 'admin123', role: 'ADMIN' as const },
  ];

  for (const u of defaultUsers) {
    const hashed = await bcrypt.hash(u.password, 10);
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},   // ← never overwrite existing accounts
      create: {
        email: u.email,
        name: u.name,
        password: hashed,
        role: u.role,
        level: 'NEWBIE',
      },
    });

    // Ensure UserStats row exists
    await prisma.userStats.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, xp: 0, trophy: 0 },
    });
  }

  console.log(`✅  ${defaultUsers.length} accounts ready`);
  console.log('');

  // ── 2. Load JSON files ────────────────────────────────────────────────────
  const dataDir = path.join(__dirname, 'data');
  const jsonPaths = collectJsonFiles(dataDir);

  console.log(`📂  Found ${jsonPaths.length} JSON files in prisma/data`);
  console.log('');

  // ── 3. Parse & validate ──────────────────────────────────────────────────
  const files: JsonFile[] = [];
  for (const p of jsonPaths) {
    try {
      const raw = JSON.parse(fs.readFileSync(p, 'utf-8')) as JsonFile;
      if (raw.topic && Array.isArray(raw.vocabulary)) {
        files.push(raw);
      } else {
        console.warn(`⚠️  Skipped (missing topic/vocabulary): ${path.relative(dataDir, p)}`);
      }
    } catch {
      console.warn(`⚠️  Could not parse: ${path.relative(dataDir, p)}`);
    }
  }

  // Sort by canonical level order so topics are consistent
  files.sort((a, b) => {
    const ai = LEVEL_ORDER.indexOf(a.level ?? '');
    const bi = LEVEL_ORDER.indexOf(b.level ?? '');
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  // ── 4. Upsert topics & vocabulary ────────────────────────────────────────
  console.log('📚  Upserting topics and vocabulary...');
  console.log('');

  const stats: Record<string, { topics: number; vocab: number }> = {};
  for (const lvl of LEVEL_ORDER) stats[lvl] = { topics: 0, vocab: 0 };

  const topicCache = new Map<string, number>(); // slug → id

  for (const file of files) {
    const { topic, level, description, vocabulary } = file;
    const normalLevel = LEVEL_ORDER.includes(level) ? level : 'NEWBIE';
    const slug = toSlug(topic);

    // Upsert topic
    let topicId = topicCache.get(slug);
    if (!topicId) {
      const topicRecord = await prisma.topic.upsert({
        where: { slug },
        update: { name: topic, description, level: normalLevel },
        create: {
          name: topic,
          slug,
          description,
          level: normalLevel,
          type: 'vocabulary',
        },
      });
      topicId = topicRecord.id;
      topicCache.set(slug, topicId);
      stats[normalLevel].topics++;
    }

    // Upsert vocabulary items (unique on korean + topicId)
    for (const v of vocabulary) {
      if (!v.korean || !v.english || !v.vietnamese) continue;

      try {
        const existing = await prisma.vocabulary.findFirst({
          where: { korean: v.korean, topicId },
          select: { id: true },
        });

        if (existing) {
          await prisma.vocabulary.update({
            where: { id: existing.id },
            data: {
              english: v.english,
              vietnamese: v.vietnamese,
              romanization: v.romanization ?? '',
              type: v.type ?? 'noun',
              level: normalLevel,
              isActive: true,
            },
          });
        } else {
          await prisma.vocabulary.create({
            data: {
              korean: v.korean,
              english: v.english,
              vietnamese: v.vietnamese,
              romanization: v.romanization ?? '',
              type: v.type ?? 'noun',
              topicId,
              level: normalLevel,
              isActive: true,
            },
          });
          stats[normalLevel].vocab++;
        }
      } catch {
        // Concurrent duplicate or other transient error — skip silently
      }
    }
  }

  // ── 5. Upsert UserProgress for default accounts ───────────────────────────
  console.log('📊  Upserting user progress...');

  const allTopics = await prisma.topic.findMany({ select: { id: true } });
  const allUsers  = await prisma.user.findMany({ select: { id: true } });

  for (const t of allTopics) {
    for (const u of allUsers) {
      await prisma.userProgress.upsert({
        where: {
          userId_topicId_skillType: {
            userId: u.id,
            topicId: t.id,
            skillType: 'vocabulary',
          },
        },
        update: {},
        create: {
          userId: u.id,
          topicId: t.id,
          skillType: 'vocabulary',
          attempts: 0,
          completed: false,
        },
      });
    }
  }

  console.log(`✅  UserProgress: ${allTopics.length} topics × ${allUsers.length} users`);
  console.log('');

  // ── 6. Summary ────────────────────────────────────────────────────────────
  const totalTopics = Object.values(stats).reduce((s, v) => s + v.topics, 0);
  const totalVocab  = Object.values(stats).reduce((s, v) => s + v.vocab,  0);

  const totalVocabInDB = await prisma.vocabulary.count();
  const totalTopicsInDB = await prisma.topic.count();

  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║                  Seed Summary                        ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  for (const lvl of LEVEL_ORDER) {
    const s = stats[lvl];
    console.log(`║  ${lvl.padEnd(14)} → ${String(s.topics).padStart(2)} topics, ${String(s.vocab).padStart(4)} vocab (new)    ║`);
  }
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log(`║  New this run : ${String(totalTopics).padStart(3)} topics, ${String(totalVocab).padStart(4)} vocab items      ║`);
  console.log(`║  DB total     : ${String(totalTopicsInDB).padStart(3)} topics, ${String(totalVocabInDB).padStart(4)} vocab items      ║`);
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log('║  Default accounts:                                   ║');
  console.log('║    test@example.com   /  123456                      ║');
  console.log('║    admin@example.com  /  admin123                    ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log('║  View data:  http://localhost:5555  (Prisma Studio)  ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌  Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
