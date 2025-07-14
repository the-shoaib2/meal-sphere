import { PrismaClient } from '@prisma/client'
import { format, parse } from 'date-fns'

const prisma = new PrismaClient()

async function testAutoMeals() {
  try {
    console.log('Testing auto meal functionality...')
    
    // Get current time
    const now = new Date()
    const currentTime = format(now, 'HH:mm')
    const currentDate = format(now, 'yyyy-MM-dd')
    
    console.log(`Current time: ${currentTime}, Date: ${currentDate}`)
    
    // Get all rooms with auto meal enabled
    const roomsWithAutoMeal = await prisma.mealSettings.findMany({
      where: {
        autoMealEnabled: true,
      },
      include: {
        room: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })
    
    console.log(`Found ${roomsWithAutoMeal.length} rooms with auto meal enabled`)
    
    for (const mealSettings of roomsWithAutoMeal) {
      console.log(`\nProcessing room: ${mealSettings.room.name}`)
      console.log(`Meal times: Breakfast ${mealSettings.breakfastTime}, Lunch ${mealSettings.lunchTime}, Dinner ${mealSettings.dinnerTime}`)
      
      // Get auto meal settings for this room
      const autoMealSettings = await prisma.autoMealSettings.findMany({
        where: { 
          roomId: mealSettings.roomId,
          isEnabled: true,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })
      
      console.log(`Found ${autoMealSettings.length} users with auto meal enabled`)
      
      for (const autoSetting of autoMealSettings) {
        console.log(`\nUser: ${autoSetting.user.name}`)
        console.log(`Enabled meals: Breakfast ${autoSetting.breakfastEnabled}, Lunch ${autoSetting.lunchEnabled}, Dinner ${autoSetting.dinnerEnabled}`)
        
        // Check each meal type
        const mealTypes = [
          { type: 'BREAKFAST' as const, time: mealSettings.breakfastTime, enabled: autoSetting.breakfastEnabled },
          { type: 'LUNCH' as const, time: mealSettings.lunchTime, enabled: autoSetting.lunchEnabled },
          { type: 'DINNER' as const, time: mealSettings.dinnerTime, enabled: autoSetting.dinnerEnabled },
        ]
        
        for (const mealType of mealTypes) {
          if (!mealType.enabled) {
            console.log(`  ${mealType.type}: Disabled for user`)
            continue
          }
          
          // Check if it's the right time (within 5 minutes)
          const mealTimeDate = parse(mealType.time, 'HH:mm', new Date())
          const currentTimeDate = parse(currentTime, 'HH:mm', new Date())
          const timeDiff = Math.abs(mealTimeDate.getTime() - currentTimeDate.getTime()) / (1000 * 60)
          
          if (timeDiff > 5) {
            console.log(`  ${mealType.type}: Not the right time (${timeDiff.toFixed(1)} minutes off)`)
            continue
          }
          
          // Check if user already has this meal
          const existingMeal = await prisma.meal.findUnique({
            where: {
              userId_roomId_date_type: {
                userId: autoSetting.userId,
                roomId: mealSettings.roomId,
                date: now,
                type: mealType.type,
              },
            },
          })
          
          if (existingMeal) {
            console.log(`  ${mealType.type}: User already has this meal`)
            continue
          }
          
          console.log(`  ${mealType.type}: Would add meal (time matches: ${mealType.time})`)
        }
      }
    }
    
  } catch (error) {
    console.error('Error testing auto meals:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testAutoMeals() 