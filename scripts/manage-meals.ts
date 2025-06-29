import { MealType } from '@prisma/client';
import prisma from '../lib/prisma';


// npx tsx scripts/manage-meals.ts

const usersToMeals = [
  {
    email: 'ratulkmsc@gmail.com',
    days: [26,27,28,29,30],
    types: ['LUNCH', 'DINNER']
  },
  {
    email: 'abrohoman019@gmail.com',
    days: [26,27,28,29,30],
    types: ['LUNCH', 'DINNER']
  },
  {
    email: 'khan23105101484@diu.edu.bd',
    days: [26,27,28,29,30],
    types: ['LUNCH', 'DINNER']
  },
];

const year = new Date().getFullYear();
const month = new Date().getMonth(); // 0-based (current month)

async function addMeals() {
  for (const userInfo of usersToMeals) {
    const user = await prisma.user.findUnique({ where: { email: userInfo.email } });
    if (!user) {
      console.log(`User not found: ${userInfo.email}`);
      continue;
    }
    const roomMember = await prisma.roomMember.findFirst({ where: { userId: user.id } });
    if (!roomMember) {
      console.log(`No room found for user: ${userInfo.email}`);
      continue;
    }
    for (const day of userInfo.days) {
      for (const type of userInfo.types) {
        const date = new Date(year, month, day);
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
            update: {},
            create: {
              userId: user.id,
              roomId: roomMember.roomId,
              date,
              type: type as MealType,
            },
          });
          console.log(`Added meal: ${userInfo.email} ${type} ${date.toDateString()}`);
        } catch (e) {
          console.error(`Failed to add meal for ${userInfo.email} ${type} ${date.toDateString()}:`, e);
        }
      }
    }
  }
}

async function removeMeals() {
  for (const userInfo of usersToMeals) {
    const user = await prisma.user.findUnique({ where: { email: userInfo.email } });
    if (!user) {
      console.log(`User not found: ${userInfo.email}`);
      continue;
    }
    for (const type of userInfo.types) {
      await prisma.meal.deleteMany({
        where: {
          userId: user.id,
          type: type as MealType,
          date: {
            gte: new Date(year, month, Math.min(...userInfo.days)),
            lte: new Date(year, month, Math.max(...userInfo.days)),
          },
        },
      });
      console.log(`Removed meals for ${userInfo.email} type ${type}`);
    }
  }
}

async function main() {
  const arg = process.argv[2];
  if (arg === 'remove') {
    await removeMeals();
  } else {
    await addMeals();
  }
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});