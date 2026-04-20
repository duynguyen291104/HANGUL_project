# 🌱 Database Seeding Guide

## Overview

This project uses **Prisma DB Seed** for consistent database initialization.

**Single Source of Truth:** `prisma/seed.ts`

---

## Quick Start

### Run Seeding
```bash
npm run seed
```

Equivalent to:
```bash
npx prisma db seed
```

### Fresh Database (Reset + Seed)
```bash
npm run seed:fresh
```

⚠️ **WARNING:** This will DELETE all data and reseed from scratch!

---

## Architecture

```
prisma/seed.ts (Master seed file)
  ├── seedUsers()        → Test accounts
  ├── seedRanks()        → Rank tiers (Bronze → Diamond)
  ├── seedTopics()       → Learning topics
  └── [Add more seeds here]
```

### Adding New Seeds

1. Create seed function in `prisma/seed.ts`:
```typescript
async function seedVocabulary() {
  // seed logic here
}
```

2. Call it in `main()`:
```typescript
async function main() {
  await seedRanks();
  await seedUsers();
  await seedVocabulary();  // ← Add here
}
```

3. Run:
```bash
npm run seed
```

---

## Environment Variables Required

Make sure your `.env` has:
```env
DATABASE_URL="postgresql://hangul:hangul123@localhost:5432/hangul_db"
```

---

## Test Accounts Created

| Email | Password | Name |
|-------|----------|------|
| demo@example.com | password123 | Demo User |
| tuheo@gmail.com | password123 | Tu Heo |
| user3@example.com | password123 | User Three |
| user4@example.com | password123 | User Four |
| user5@example.com | password123 | User Five |
| user6@example.com | password123 | User Six |

---

## Best Practices

✅ **DO:**
- Keep seed.ts as single source of truth
- Use idempotent seeds (check if exists first)
- Run seeds automatically in CI/CD
- Document seed data changes

❌ **DON'T:**
- Create multiple seed files
- Hardcode production data in seeds
- Skip error handling
- Forget to update seed.ts when schema changes

---

## Troubleshooting

### Seeds not running?
```bash
# Check Prisma is set up
npx prisma generate

# Try again
npm run seed
```

### Permission error?
```bash
# Ensure database user has CREATE permission
# Or run migrations first
npx prisma migrate deploy
```

### Data conflicts?
```bash
# Reset everything and reseed
npm run seed:fresh
```
