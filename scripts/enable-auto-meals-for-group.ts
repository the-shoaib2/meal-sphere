import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function enableAutoMealsForGroup() {
  const groupId = '686cdfc0b3a65d7bdb142715'
  
  try {
    console.log(`Enabling auto meals for group: ${groupId}`)
    
    // First, check if the group exists and enable auto meal system
    const group = await prisma.room.findUnique({
      where: { id: groupId },
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
      },
    })

    if (!group) {
      console.error(`Group with ID ${groupId} not found`)
      return
    }

    console.log(`Found group: ${group.name}`)
    console.log(`Members: ${group.members.length}`)

    // Enable auto meal system for the group if not already enabled
    let mealSettings = group.mealSettings
    if (!mealSettings) {
      console.log('Creating meal settings for the group...')
      mealSettings = await prisma.mealSettings.create({
        data: {
          roomId: groupId,
          autoMealEnabled: true,
          breakfastTime: '08:00',
          lunchTime: '13:00',
          dinnerTime: '20:00',
          maxMealsPerDay: 3,
          allowGuestMeals: true,
          guestMealLimit: 5,
        },
      })
      console.log('✅ Auto meal system enabled for the group')
    } else if (!mealSettings.autoMealEnabled) {
      console.log('Enabling auto meal system for the group...')
      await prisma.mealSettings.update({
        where: { id: mealSettings.id },
        data: { autoMealEnabled: true },
      })
      console.log('✅ Auto meal system enabled for the group')
    } else {
      console.log('✅ Auto meal system already enabled for the group')
    }

    // Enable auto meals for all members
    let enabledCount = 0
    let updatedCount = 0

    for (const member of group.members) {
      console.log(`\nProcessing member: ${member.user.name} (${member.user.email})`)
      
      // Check if auto meal settings already exist
      const existingSettings = await prisma.autoMealSettings.findUnique({
        where: {
          userId_roomId: {
            userId: member.user.id,
            roomId: groupId,
          },
        },
      })

      if (existingSettings) {
        // Update existing settings
        await prisma.autoMealSettings.update({
          where: { id: existingSettings.id },
          data: {
            isEnabled: true,
            breakfastEnabled: false, // Disable breakfast as requested
            lunchEnabled: true,      // Enable lunch
            dinnerEnabled: true,     // Enable dinner
            guestMealEnabled: false, // Disable guest meals by default
            startDate: new Date(),
            excludedDates: [],
            excludedMealTypes: [],
            updatedAt: new Date(),
          },
        })
        updatedCount++
        console.log(`✅ Updated auto meal settings for ${member.user.name}`)
      } else {
        // Create new settings
        await prisma.autoMealSettings.create({
          data: {
            userId: member.user.id,
            roomId: groupId,
            isEnabled: true,
            breakfastEnabled: false, // Disable breakfast as requested
            lunchEnabled: true,      // Enable lunch
            dinnerEnabled: true,     // Enable dinner
            guestMealEnabled: false, // Disable guest meals by default
            startDate: new Date(),
            excludedDates: [],
            excludedMealTypes: [],
          },
        })
        enabledCount++
        console.log(`✅ Created auto meal settings for ${member.user.name}`)
      }
    }

    console.log(`\n🎉 Auto meal setup completed!`)
    console.log(`📊 Summary:`)
    console.log(`   - Group: ${group.name}`)
    console.log(`   - Total members: ${group.members.length}`)
    console.log(`   - New auto meal settings created: ${enabledCount}`)
    console.log(`   - Existing settings updated: ${updatedCount}`)
    console.log(`   - Auto meal system: ✅ Enabled`)
    console.log(`   - Meal types enabled: Lunch ✅, Dinner ✅, Breakfast ❌`)
    console.log(`\n⏰ Auto meals will be processed automatically at:`)
    console.log(`   - Lunch: ${mealSettings?.lunchTime || '13:00'}`)
    console.log(`   - Dinner: ${mealSettings?.dinnerTime || '20:00'}`)

  } catch (error) {
    console.error('Error enabling auto meals:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
enableAutoMealsForGroup() 