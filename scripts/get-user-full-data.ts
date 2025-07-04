import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// npx tsx scripts/get-user-full-data.ts

async function main() {
  const userEmail = 'abrohoman019@gmail.com';

  // Fetch the user and include all related data
  const user = await prisma.user.findUnique({
    where: { email: userEmail },
    include: {
      rooms: {
        include: {
          room: true,
        },
      },
      accounts: true,
      createdRooms: true,
    //   extraExpenses: true,
    //   guestMeals: true,
    //   marketDates: true,
    //   meals: true,
    //   notifications: true,
    //   payments: true,
    //   sessions: true,
    //   shoppingItems: true,
      votes: true,
    //   createdInvitations: true,
      usedInvitations: true,
    //   joinRequests: true,
    //   messages: true,
    //   activityLogs: true,
    //   inviteTokens: true,
    //   announcements: true,
    //   groupNotificationSettings: true,
      autoMealSettings: true,
      accountTransactionsSent: true,
      accountTransactionsReceived: true,
      accountTransactionsCreated: true,
    },
  });

  if (!user) {
    console.log('User not found.');
    return;
  }

  console.dir(user, { depth: null });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 