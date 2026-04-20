import prisma from './src/lib/prisma';

// Function to convert Vietnamese name to slug
function toSlug(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/-+/g, '-') // Replace multiple dashes with single dash
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing dashes
}

async function main() {
  try {
    const topics = await prisma.topic.findMany();
    
    console.log('Updating', topics.length, 'topics...');
    
    for (const topic of topics) {
      if (!topic.slug) {
        const newSlug = toSlug(topic.name);
        console.log(`Updating: ${topic.name} → ${newSlug}`);
        
        await prisma.topic.update({
          where: { id: topic.id },
          data: { slug: newSlug }
        });
      }
    }
    
    console.log('✅ Done!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
