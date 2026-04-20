import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📊 CHECKING SEEDED DATA\n');

  // Total counts
  const totalTopics = await prisma.topic.count();
  const totalVocab = await prisma.vocabulary.count();

  console.log(`✅ Total Topics: ${totalTopics}`);
  console.log(`✅ Total Vocabulary Items: ${totalVocab}\n`);

  // Count by level
  console.log('📚 Topics by Level:');
  const levels = ['NEWBIE', 'BEGINNER', 'INTERMEDIATE', 'UPPER', 'ADVANCED'];
  
  for (const level of levels) {
    const count = await prisma.topic.count({
      where: { level },
    });
    console.log(`   ${level}: ${count} topics`);
  }

  // Show some sample data from each level
  console.log('\n🎯 Sample Data from Each Level:\n');

  for (const level of levels) {
    const topics = await prisma.topic.findMany({
      where: { level },
      take: 3,
      include: {
        vocabulary: {
          take: 5,
        },
      },
    });

    if (topics.length > 0) {
      console.log(`\n📖 ${level}:`);
      for (const topic of topics) {
        console.log(`   Topic: ${topic.name} (${topic.vocabulary.length} vocab items shown)`);
        for (const vocab of topic.vocabulary) {
          console.log(`      - ${vocab.korean} (${vocab.english}) = ${vocab.vietnamese}`);
        }
      }
    }
  }

  // Show vocabulary count per topic for NEWBIE level
  console.log('\n\n📊 Vocabulary Count per Topic (NEWBIE Level):');
  const newbieTopics = await prisma.topic.findMany({
    where: { level: 'NEWBIE' },
    include: {
      _count: {
        select: { vocabulary: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  for (const topic of newbieTopics) {
    console.log(`   ${topic.name}: ${topic._count.vocabulary} items`);
  }

  console.log('\n✅ Data check complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
