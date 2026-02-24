import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting data cleanup process...');

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Delete transactional history/logs first to handle dependencies
      console.log('🧹 Clearing transaction histories...');
      const historyCount = await tx.transactionHistory.deleteMany({});
      console.log(`✅ Deleted ${historyCount.count} transaction history records.`);

      console.log('🧹 Clearing account transactions...');
      const accountTxCount = await tx.accountTransaction.deleteMany({});
      console.log(`✅ Deleted ${accountTxCount.count} account transactions.`);

      // 2. Clear payments
      console.log('🧹 Clearing bKash payments...');
      const bkashCount = await tx.bkashPayment.deleteMany({});
      console.log(`✅ Deleted ${bkashCount.count} bKash payments.`);

      console.log('🧹 Clearing general payments...');
      const paymentCount = await tx.payment.deleteMany({});
      console.log(`✅ Deleted ${paymentCount.count} payments.`);

      // 3. Clear meal related info
      console.log('🧹 Clearing meals...');
      const mealCount = await tx.meal.deleteMany({});
      console.log(`✅ Deleted ${mealCount.count} meals.`);

      console.log('🧹 Clearing guest meals...');
      const guestMealCount = await tx.guestMeal.deleteMany({});
      console.log(`✅ Deleted ${guestMealCount.count} guest meals.`);

      // 4. Clear shopping and expenses
      console.log('🧹 Clearing shopping items...');
      const shoppingCount = await tx.shoppingItem.deleteMany({});
      console.log(`✅ Deleted ${shoppingCount.count} shopping items.`);

      console.log('🧹 Clearing extra expenses...');
      const expenseCount = await tx.extraExpense.deleteMany({});
      console.log(`✅ Deleted ${expenseCount.count} extra expenses.`);

      // 5. Clear group interactions
      console.log('🧹 Clearing votes...');
      const voteCount = await tx.vote.deleteMany({});
      console.log(`✅ Deleted ${voteCount.count} votes.`);

      console.log('🧹 Clearing group messages...');
      const messageCount = await tx.groupMessage.deleteMany({});
      console.log(`✅ Deleted ${messageCount.count} messages.`);

      console.log('🧹 Clearing activity logs...');
      const activityCount = await tx.groupActivityLog.deleteMany({});
      console.log(`✅ Deleted ${activityCount.count} activity logs.`);

      console.log('🧹 Clearing announcements...');
      const announcementCount = await tx.announcement.deleteMany({});
      console.log(`✅ Deleted ${announcementCount.count} announcements.`);

      // 6. Clear requests and invitations
      console.log('🧹 Clearing join requests...');
      const joinRequestCount = await tx.joinRequest.deleteMany({});
      console.log(`✅ Deleted ${joinRequestCount.count} join requests.`);

      console.log('🧹 Clearing invitations...');
      const invitationCount = await tx.invitation.deleteMany({});
      console.log(`✅ Deleted ${invitationCount.count} invitations.`);

      console.log('🧹 Clearing invite tokens...');
      const tokenCount = await tx.inviteToken.deleteMany({});
      console.log(`✅ Deleted ${tokenCount.count} invite tokens.`);

      // 7. Clear settings and periods
      console.log('🧹 Clearing auto meal settings...');
      const autoMealCount = await tx.autoMealSettings.deleteMany({});
      console.log(`✅ Deleted ${autoMealCount.count} auto meal settings.`);

      console.log('🧹 Clearing notifications...');
      const notificationCount = await tx.notification.deleteMany({});
      console.log(`✅ Deleted ${notificationCount.count} notifications.`);

      console.log('🧹 Clearing group notification settings...');
      const groupNotifCount = await tx.groupNotificationSettings.deleteMany({});
      console.log(`✅ Deleted ${groupNotifCount.count} group notification settings.`);

      console.log('🧹 Clearing meal settings...');
      const mealSettingsCount = await tx.mealSettings.deleteMany({});
      console.log(`✅ Deleted ${mealSettingsCount.count} meal settings.`);

      console.log('🧹 Clearing meal periods...');
      const periodCount = await tx.mealPeriod.deleteMany({});
      console.log(`✅ Deleted ${periodCount.count} meal periods.`);

      console.log('🧹 Clearing market dates...');
      const marketDateCount = await tx.marketDate.deleteMany({});
      console.log(`✅ Deleted ${marketDateCount.count} market dates.`);

      // 8. Finally clear RoomMembers and Rooms
      console.log('🧹 Clearing room members...');
      const memberCount = await tx.roomMember.deleteMany({});
      console.log(`✅ Deleted ${memberCount.count} room members.`);

      console.log('🧹 Clearing rooms...');
      const roomCount = await tx.room.deleteMany({});
      console.log(`✅ Deleted ${roomCount.count} rooms.`);

      console.log('✨ Transactional data cleanup complete.');
    });

    console.log('🎉 All data except User and Account information has been successfully cleared.');
  } catch (error) {
    console.error('❌ Data cleanup failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
