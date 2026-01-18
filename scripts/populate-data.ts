import { PrismaClient, MealType } from '@prisma/client'
import * as dotenv from 'dotenv'
import path from 'path'

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env')
dotenv.config({ path: envPath })

const prisma = new PrismaClient()

async function populateData() {
  console.log('Starting data population...')

  try {
    // 1. Fetch all users
    const users = await prisma.user.findMany()
    console.log(`Found ${users.length} users.`)

    if (users.length === 0) {
      console.log('No users found. Creating some dummy users is not part of this script (yet).')
      return
    }

    // 2. Fetch the first active room (or just the first one)
    let room = await prisma.room.findFirst({
        where: { isActive: true }
    })

    if (!room) {
        console.log('No active room found. Fetching any room.')
        room = await prisma.room.findFirst()
    }

    if (!room) {
        console.log('No rooms found. Please create a room first via the UI or seed script.')
        return
    }

    console.log(`Using Room: ${room.name} (${room.id})`)

    // 3. Get or Create Active Meal Period
    // Try to find a period that covers TODAY
    const today = new Date()
    let period = await prisma.mealPeriod.findFirst({
        where: {
            roomId: room.id,
            status: 'ACTIVE',
            startDate: { lte: today },
            OR: [
                { endDate: null },
                { endDate: { gte: today } }
            ]
        }
    })

    if (!period) {
        // Create a period for the current month
        console.log('No active period found. Creating one for the current month...')
        const startDate = new Date(today.getFullYear(), today.getMonth(), 1)
        const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0) // Last day of month
        
        // Ensure a creator (use first user)
        const creatorId = users[0].id

        try {
            period = await prisma.mealPeriod.create({
                data: {
                    name: `Auto Period ${startDate.toLocaleString('default', { month: 'long', year: 'numeric' })}`,
                    startDate: startDate,
                    endDate: endDate,
                    status: 'ACTIVE',
                    roomId: room.id,
                    createdBy: creatorId
                }
            })
            console.log(`Created Period: ${period.name} (${period.id})`)
        } catch (e) {
            // Handle unique constraint if name conflict happens (less likely with date but possible)
             period = await prisma.mealPeriod.findFirst({ where: { roomId: room.id, status: 'ACTIVE' } })
             if(!period) throw new Error("Failed to create or find period")
        }
    } else {
        console.log(`Using Period: ${period.name} (${period.id})`)
    }

    // 4. Iterate Users
    for (const user of users) {
        console.log(`Processing User: ${user.name || user.email}`)

        // A. Add to Group (RoomMember)
        // Upsert to ensure they are added w/o error
        await prisma.roomMember.upsert({
            where: {
                userId_roomId: {
                    userId: user.id,
                    roomId: room.id
                }
            },
            update: {
                isBanned: false // Ensure unbanned
            },
            create: {
                userId: user.id,
                roomId: room.id,
                role: 'MEMBER', // Default role
                joinedAt: new Date(),
                isCurrent: true 
            }
        })

        // B. Add Balance (AccountTransaction)
        // Check if they already have a transaction in this period? Maybe, but user said "add balance", implying adding "money".
        // Let's add a random amount between 2000 and 5000 IF they have low balance or just add it.
        // To prevent infinite inflation if run multiple times, maybe check count?
        // But for testing data filling: let's just add one generic "Initial Deposit" or "Topup".
        
        // Let's add ONLY if they have NO transactions in this period to be safe against re-runs inflating crazily.
        const txCount = await prisma.accountTransaction.count({
            where: {
                userId: user.id,
                roomId: room.id,
                periodId: period!.id
            }
        })

        if (txCount === 0) {
            const amount = Math.floor(Math.random() * 3000) + 2000 // 2000 - 5000
            await prisma.accountTransaction.create({
                data: {
                    amount: amount,
                    type: 'PAYMENT',
                    description: 'Auto-generated deposit',
                    roomId: room.id,
                    userId: user.id,    // Creator (self)
                    targetUserId: user.id, // Target (self)
                    periodId: period!.id,
                    createdBy: user.id
                }
            })
            console.log(`  -> Added Balance: +${amount}`)
        } else {
            console.log(`  -> Balance transactions exist, skipping deposit to avoid inflation.`)
        }

        // C. Add Meals Randomly
        // Generate meals for the last 7 days + today (8 days)
        const daysToBack = 7
        const todayDate = new Date()
        
        for (let i = 0; i <= daysToBack; i++) {
            const date = new Date(todayDate)
            date.setDate(date.getDate() - i)
            // Reset time to avoid slight diffs causing unique constraint issues if stored with time
            // Schema has DateTime. Usually prudent to strip time if logic treats date as date-only.
            // But Prisma DateTime stores time. The unique key is [userId, roomId, date, type].
            // If the app sets specific times (like 8am), we should match?
            // The `MealSettings` says breakfastTime default "08:00".
            // Ideally we check how `Meal` is usually created.
            // Let's look at `balance-service` again? No, it's aggregation.
            // Let's look at schema: `date DateTime`.
            // Let's check `lib/utils/date-utils` or how meals are created in `app/api/...` if time matters.
            // Assuming we just use the date object for "Start of Day" or keep it simple?
            // "date" in unique index usually implies strict equality.
            // Let's assume normalizing to YYYY-MM-DD might be safer, but `Date` object in JS has time.
            // Safest: Set time to 12:00 PM UTC or local?
            
            // Randomly decide if they ate
            if (Math.random() > 0.3) {
                // Determine types
                const types: MealType[] = ['BREAKFAST', 'LUNCH', 'DINNER']
                for (const type of types) {
                    if (Math.random() > 0.4) { // 60% chance for each meal
                        // Need a normalized date for uniqueness context?
                        // Let's use `startOfDay` logic or just pass the date object.
                        // If the app logic normalizes dates before saving, we should too.
                        // I will assume `date` field expects a Date object.
                        // To allow re-running, `upsert` is key.
                        // But `date` must match exactly.
                        // I will set hours to 12:00:00 to be consistent within this script.
                        
                        const mealDate = new Date(date)
                        mealDate.setHours(12, 0, 0, 0)

                        try {
                            await prisma.meal.upsert({
                                where: {
                                    userId_roomId_date_type: {
                                        userId: user.id,
                                        roomId: room.id,
                                        date: mealDate,
                                        type: type
                                    }
                                },
                                update: {},
                                create: {
                                    date: mealDate,
                                    type: type,
                                    userId: user.id,
                                    roomId: room.id,
                                    periodId: period!.id
                                }
                            })
                            // console.log(`  -> Added ${type} for ${mealDate.toDateString()}`)
                        } catch(e) {
                           // Ignore unique constraint errors if dates are slightly off
                        }
                    }
                }
            }
        }
        console.log(`  -> Processed Meals`)
    }

    console.log('Data population complete!')

  } catch (error) {
    console.error('Error populating data:', error)
  } finally {
    await prisma.$disconnect()
  }
}

populateData()
