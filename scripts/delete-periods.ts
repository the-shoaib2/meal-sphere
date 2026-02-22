import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const GROUP_ID = 'fa0d1dff-8144-434e-b405-7fba398c87c7';

async function main() {
  console.log(`🔍 Checking group ${GROUP_ID}...`);

  const group = await prisma.room.findUnique({
    where: { id: GROUP_ID },
    include: { _count: { select: { mealPeriods: true } } }
  });

  if (!group) {
    console.error(`❌ Group ${GROUP_ID} not found.`);
    return;
  }

  console.log(`✅ Found group: ${group.name} with ${group._count.mealPeriods} periods.`);

  if (group._count.mealPeriods === 0) {
    console.log('✅ No periods to delete.');
    return;
  }

  console.log('🧹 Cleaning up associated data references...');

  // Nullify periodId in all related tables to avoid FK constraint errors
  await prisma.meal.updateMany({
    where: { roomId: GROUP_ID, NOT: { periodId: null } },
    data: { periodId: null }
  });

  await prisma.guestMeal.updateMany({
    where: { roomId: GROUP_ID, NOT: { periodId: null } },
    data: { periodId: null }
  });

  await prisma.shoppingItem.updateMany({
    where: { roomId: GROUP_ID, NOT: { periodId: null } },
    data: { periodId: null }
  });

  await prisma.payment.updateMany({
    where: { roomId: GROUP_ID, NOT: { periodId: null } },
    data: { periodId: null }
  });

  await prisma.extraExpense.updateMany({
    where: { roomId: GROUP_ID, NOT: { periodId: null } },
    data: { periodId: null }
  });

  await prisma.marketDate.updateMany({
    where: { roomId: GROUP_ID, NOT: { periodId: null } },
    data: { periodId: null }
  });
  
  await prisma.accountTransaction.updateMany({
    where: { roomId: GROUP_ID, NOT: { periodId: null } },
    data: { periodId: null }
  });

  console.log('🗑️ Deleting all MealPeriods...');

  const deleted = await prisma.mealPeriod.deleteMany({
    where: { roomId: GROUP_ID }
  });

  console.log(`🎉 Success! Deleted ${deleted.count} periods for group "${group.name}".`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
