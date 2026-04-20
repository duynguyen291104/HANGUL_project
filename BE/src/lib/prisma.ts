import { PrismaClient } from '@prisma/client';

// Singleton pattern to prevent multiple PrismaClient instances
// In development, hot-reloading can create multiple instances which exhausts DB connections

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['warn', 'error'] 
      : ['error'],
    errorFormat: 'pretty',
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing Prisma connection...');
  await prisma.$disconnect();
  process.exit(0);
});

export default prisma;
