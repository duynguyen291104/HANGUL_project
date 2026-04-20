import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany()
  const topics = await prisma.topic.findMany()
  const vocabs = await prisma.vocabulary.findMany()
  
  console.log('\n✅ SEEDED DATA:\n')
  console.log(`👤 Users: ${users.length}`)
  users.forEach(u => console.log(`   - ${u.email} (${u.name})`))
  
  console.log(`\n📚 Topics: ${topics.length}`)
  topics.forEach(t => console.log(`   - ${t.name}`))
  
  console.log(`\n📝 Vocabulary: ${vocabs.length}`)
  vocabs.slice(0, 5).forEach(v => console.log(`   - ${v.korean} (${v.english})`))
  if (vocabs.length > 5) console.log(`   ... and ${vocabs.length - 5} more`)
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
