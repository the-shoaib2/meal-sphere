import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const userEmail = 'abrohoman019@gmail.com';
  const groupName = 'চিড়িয়াখানা ';
  const role = 'MEMBER';

  // Find the user
  const user = await prisma.user.findUnique({
    where: { email: userEmail },
  });
  if (!user) {
    throw new Error(`User with email ${userEmail} not found.`);
  }

  // Find the group
  const group = await prisma.room.findFirst({
    where: { name: groupName },
  });
  if (!group) {
    throw new Error(`Group with name ${groupName} not found.`);
  }

  // Check if already a member
  const existingMember = await prisma.roomMember.findFirst({
    where: {
      userId: user.id,
      roomId: group.id,
    },
  });
  if (existingMember) {
    console.log('User is already a member of the group.');
    return;
  }

  // Add as member
  await prisma.roomMember.create({
    data: {
      userId: user.id,
      roomId: group.id,
      role,
    },
  });
  console.log(`Added ${user.email} as a MEMBER to group '${group.name}'.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 