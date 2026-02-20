/**
 * One-time deduplication script for GuestMeal table.
 * Merges rows that share the same (userId, roomId, date, type)
 * by summing their counts into the earliest record and deleting the rest.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Finding duplicate guest meal rows...');

  // Fetch all guest meals ordered by createdAt ascending
  const allGuestMeals = await prisma.guestMeal.findMany({
    orderBy: { createdAt: 'asc' }
  });

  // Group by composite key
  const grouped = new Map<string, typeof allGuestMeals>();
  for (const meal of allGuestMeals) {
    const dateStr = meal.date.toISOString().split('T')[0];
    const key = `${meal.userId}|${meal.roomId}|${dateStr}|${meal.type}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(meal);
  }

  let mergedGroups = 0;
  let deletedRows = 0;

  for (const [key, meals] of grouped.entries()) {
    if (meals.length <= 1) continue;

    console.log(`  ⚠️  Duplicate found: ${key} (${meals.length} rows)`);

    // Keep the first (earliest) record, merge counts of all into it
    const [keeper, ...duplicates] = meals;
    const totalCount = meals.reduce((sum, m) => sum + m.count, 0);

    await prisma.guestMeal.update({
      where: { id: keeper.id },
      data: { count: totalCount }
    });

    await prisma.guestMeal.deleteMany({
      where: { id: { in: duplicates.map(m => m.id) } }
    });

    console.log(`  ✅  Merged ${meals.length} rows into id=${keeper.id} with count=${totalCount}`);
    mergedGroups++;
    deletedRows += duplicates.length;
  }

  if (mergedGroups === 0) {
    console.log('✅ No duplicates found. DB is clean.');
  } else {
    console.log(`\n🎉 Done. Merged ${mergedGroups} duplicate group(s), deleted ${deletedRows} extra row(s).`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
