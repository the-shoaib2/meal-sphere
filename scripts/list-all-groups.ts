import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function listAllGroups() {
  try {
    console.log('🔍 Finding all groups...\n')
    
    // Get all groups with member count and meal settings
    const groups = await prisma.room.findMany({
      where: {
        isActive: true, // Only active groups
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        mealSettings: true,
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            members: true,
            meals: true,
            guestMeals: true,
            payments: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    if (groups.length === 0) {
      console.log('❌ No groups found')
      return
    }

    console.log(`📊 Found ${groups.length} groups:\n`)

    for (let i = 0; i < groups.length; i++) {
      const group = groups[i]
      console.log(`${i + 1}. 🏠 **${group.name}**`)
      console.log(`   📍 ID: ${group.id}`)
      console.log(`   📝 Description: ${group.description || 'No description'}`)
      console.log(`   🔒 Private: ${group.isPrivate ? 'Yes' : 'No'}`)
      console.log(`   👥 Members: ${group._count.members}`)
      console.log(`   👤 Created by: ${group.createdByUser.name} (${group.createdByUser.email})`)
      console.log(`   📅 Created: ${group.createdAt.toLocaleDateString()}`)
      console.log(`   🍽️  Meals: ${group._count.meals}`)
      console.log(`   👥 Guest Meals: ${group._count.guestMeals}`)
      console.log(`   💰 Payments: ${group._count.payments}`)
      
      // Auto meal status
      if (group.mealSettings) {
        console.log(`   ⚙️  Auto Meal System: ${group.mealSettings.autoMealEnabled ? '✅ Enabled' : '❌ Disabled'}`)
        if (group.mealSettings.autoMealEnabled) {
          console.log(`   🕐 Meal Times: B:${group.mealSettings.breakfastTime} L:${group.mealSettings.lunchTime} D:${group.mealSettings.dinnerTime}`)
        }
      } else {
        console.log(`   ⚙️  Auto Meal System: ❌ Not configured`)
      }

      // Member details
      console.log(`   👥 Members:`)
      group.members.forEach((member, index) => {
        const role = member.role
        const status = member.isCurrent ? '🟢 Active' : '🔴 Inactive'
        console.log(`      ${index + 1}. ${member.user.name} (${member.user.email}) - ${role} ${status}`)
      })

      console.log('') // Empty line for separation
    }

    // Summary statistics
    console.log('📈 **Summary Statistics:**')
    console.log(`   Total Groups: ${groups.length}`)
    console.log(`   Total Members: ${groups.reduce((sum, g) => sum + g._count.members, 0)}`)
    console.log(`   Groups with Auto Meals: ${groups.filter(g => g.mealSettings?.autoMealEnabled).length}`)
    console.log(`   Private Groups: ${groups.filter(g => g.isPrivate).length}`)
    console.log(`   Public Groups: ${groups.filter(g => !g.isPrivate).length}`)

    // Auto meal statistics
    const autoMealGroups = groups.filter(g => g.mealSettings?.autoMealEnabled)
    if (autoMealGroups.length > 0) {
      console.log('\n🤖 **Auto Meal Groups:**')
      autoMealGroups.forEach((group, index) => {
        console.log(`   ${index + 1}. ${group.name} (${group._count.members} members)`)
      })
    }

  } catch (error) {
    console.error('❌ Error listing groups:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
listAllGroups() 