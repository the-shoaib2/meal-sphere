import prisma from '../lib/prisma';

const roomId = '6852961df8c5bebb5b4c898a';
const periodId = '686af44daff408ee70d84c26';
const forcedDate = new Date('2025-07-12T00:00:00.000Z');

async function main() {
  // 1. Force update the period's start and end date
  await prisma.mealPeriod.update({
    where: { id: periodId },
    data: {
      startDate: forcedDate,
      endDate: forcedDate,
    },
  });
  console.log(`Updated period ${periodId} start and end date to ${forcedDate.toISOString()}`);

  // 2. Get all users in the room
  const members = await prisma.roomMember.findMany({
    where: { roomId },
    include: { user: true },
  });

  for (const member of members) {
    const userId = member.userId;
    const userName = member.user.name;

    // 3. Count meals for this user in this period
    const mealCount = await prisma.meal.count({
      where: { userId, roomId, periodId },
    });

    // 4. Sum expenses for this user in this period
    const expenseSum = await prisma.extraExpense.aggregate({
      where: { userId, roomId, periodId },
      _sum: { amount: true },
    });
    const totalExpenses = expenseSum._sum.amount || 0;

    // 5. Sum payments for this user in this period
    const paymentSum = await prisma.payment.aggregate({
      where: { userId, roomId, periodId },
      _sum: { amount: true },
    });
    const totalPayments = paymentSum._sum.amount || 0;

    // 6. Account balance
    const accountBalance = totalPayments - totalExpenses;

    // 7. Print summary
    console.log(`User: ${userName} (${userId})`);
    console.log(`  Meals: ${mealCount}`);
    console.log(`  Expenses: ${totalExpenses}`);
    console.log(`  Payments: ${totalPayments}`);
    console.log(`  Account Balance: ${accountBalance}`);
    console.log('-----------------------------');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 