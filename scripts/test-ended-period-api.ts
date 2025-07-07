import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testEndedPeriodAPI() {
  try {
    console.log('Testing API logic for ended periods...\n');

    const roomId = '6852961df8c5bebb5b4c898a';
    const userId = '684d398784f925002d0c35e3';

    console.log(`Room ID: ${roomId}`);
    console.log(`User ID: ${userId}\n`);

    // Simulate the API logic
    console.log('🔍 Step 1: Check for active period');
    const currentPeriod = await prisma.mealPeriod.findFirst({
      where: {
        roomId,
        status: 'ACTIVE'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!currentPeriod) {
      console.log('❌ No active period found - API should return empty array');
      console.log('✅ This is the correct behavior for ended periods');
      return;
    }

    console.log(`✅ Found active period: ${currentPeriod.name} (${currentPeriod.id})`);

    // If we reach here, there's an active period, so get transactions
    console.log('\n🔍 Step 2: Get transactions for active period');
    const transactions = await prisma.accountTransaction.findMany({
      where: {
        roomId,
        periodId: currentPeriod.id,
        OR: [
          { userId },
          { targetUserId: userId },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            email: true,
          },
        },
        targetUser: {
          select: {
            id: true,
            name: true,
            image: true,
            email: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            image: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`📊 API would return ${transactions.length} transactions`);
    
    if (transactions.length > 0) {
      console.log('\nSample transactions:');
      transactions.slice(0, 3).forEach((t, i) => {
        console.log(`  ${i + 1}. ${t.type} - ${t.amount} - ${t.description}`);
      });
    }

  } catch (error) {
    console.error('Error testing API logic:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testEndedPeriodAPI(); 