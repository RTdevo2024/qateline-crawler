import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // SourceSite: یدک مارکت
  await prisma.sourceSite.upsert({
    where: { slug: 'yadakmarket' },
    update: {},
    create: {
      name: 'یدک مارکت',
      slug: 'yadakmarket',
      baseUrl: 'https://yadakmarket.com',
      adapterKey: 'yadakmarket',
      requiresBrowser: false,
      isActive: true,
    },
  });

  // Settings پیش‌فرض
  const defaults = [
    { key: 'rate_limit_per_second', value: 2 },
    { key: 'ai_model', value: 'claude-sonnet-4-6' },
    { key: 'max_tokens', value: 2048 },
  ] as const;

  for (const setting of defaults) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: {
        key: setting.key,
        value: setting.value,
      },
    });
  }

  console.log('Seed completed.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
