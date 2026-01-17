import { MealType } from '@prisma/client';
import prisma from '../lib/services/prisma';

// npx tsx scripts/manage-meals.ts

// Set these before running:
const userEmails = [
  'ratulkmsc@gmail.com',
  'abrohoman019@gmail.com',
  'khan23105101484@diu.edu.bd',
];
const days = [10]; // Only one day at a time, e.g., [10]
const types = ['LUNCH']; // Only one type at a time, e.g., ['LUNCH']

const FORCE_ADD = true;

async function getCurrentPeriodForUser(userId: string, roomId: string) {
  const currentPeriod = await prisma.mealPeriod.findFirst({
    where: {
      roomId,
      status: 'ACTIVE',
    },
  });
  if (!currentPeriod) {
    throw new Error(`No active period found for room ${roomId}`);
  }
  return currentPeriod;
}

function getDateForDay(day: number, targetMonth: any = null) {
  let year, month;
  if (targetMonth) {
    year = targetMonth.year;
    month = targetMonth.month - 1;
  } else {
    year = 2025;
    month = 6; // July (0-based)
  }
  return new Date(year, month, day);
}

async function addMeals() {
  for (const email of userEmails) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.log(`User not found: ${email}`);
      continue;
    }
    const roomMember = await prisma.roomMember.findFirst({ where: { userId: user.id } });
    if (!roomMember) {
      console.log(`No room found for user: ${email}`);
      continue;
    }
    try {
      const currentPeriod = await getCurrentPeriodForUser(user.id, roomMember.roomId);
      for (const day of days) {
        for (const type of types) {
          const date = getDateForDay(day);
          if (!FORCE_ADD) {
            if (currentPeriod.endDate && date > currentPeriod.endDate) continue;
            if (date < currentPeriod.startDate) continue;
          }
          try {
            await prisma.meal.upsert({
              where: {
                userId_roomId_date_type: {
                  userId: user.id,
                  roomId: roomMember.roomId,
                  date,
                  type: type as MealType,
                },
              },
              update: {
                periodId: currentPeriod.id,
              },
              create: {
                userId: user.id,
                roomId: roomMember.roomId,
                periodId: currentPeriod.id,
                date,
                type: type as MealType,
              },
            });
            console.log(`✅ Added meal: ${email} ${type} ${date.toDateString()} (Period: ${currentPeriod.name})`);
          } catch (e) {
            console.error(`❌ Failed to add meal for ${email} ${type} ${date.toDateString()}:`, e);
          }
        }
      }
    } catch (error) {
      console.error(`Error processing user ${email}:`, error);
    }
  }
}

async function main() {
  await addMeals();
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});