
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import prisma from "@/lib/prisma";
import { getCurrentPeriod } from "@/lib/period-utils";
import { format, eachDayOfInterval } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);

    // 1. Auth check (Optimistic: parallel with data fetching)
    const authPromise = (async () => {
        if (!session?.user?.id) throw new Error("Unauthorized");
        const { searchParams } = new URL(request.url);
        const roomId = searchParams.get("roomId");
        if (!roomId) throw new Error("Room ID is required");

        const member = await prisma.roomMember.findUnique({
            where: {
                userId_roomId: {
                    userId: session.user.id,
                    roomId: roomId,
                },
            },
            include: {
                room: { select: { periodMode: true } }
            }
        });

        if (!member) throw new Error("Access denied");
        return { roomId, userId: session.user.id, role: member.role };
    })();

    try {
        const { searchParams } = new URL(request.url);
        const roomId = searchParams.get("roomId");
        const userId = session?.user?.id;

        // Safety check for optimisitc fetching
        if (!roomId || !userId) {
            await authPromise; // This will throw the specific error
            return NextResponse.json({ error: "Invalid Request" }, { status: 400 });
        }

        // 2. Data Fetching (Parallel)
        // We need to determine the period ID. If not passed, we look for active.
        // However, we can't efficiently fetch meals without knowing the period ID first 
        // unless we trust the "current period" logic.
        // So we fetch Period info FIRST (or in parallel if we can guess).

        // Let's fetch the current period and settings in parallel.
        // Meals depend on the period ID.

        const baseDataPromise = Promise.all([
            // Get Meal Settings
            prisma.mealSettings.findUnique({ where: { roomId } }),

            // Get Auto Meal Settings
            prisma.autoMealSettings.findUnique({
                where: { userId_roomId: { userId, roomId } }
            }),

            // Get Current/Active Period
            getCurrentPeriod(roomId)
        ]);

        const [settings, autoSettings, currentPeriod] = await baseDataPromise;

        // Now we know the period. If no active period, we might need the "most recent" one 
        // to show history, mimicking the hook's fallback?
        // The hook falls back to "most recent" if no active period exists.
        // Let's implement that fallback logic efficiently.

        let targetPeriod = currentPeriod;
        if (!targetPeriod) {
            // Fallback: get most recent period
            targetPeriod = await prisma.mealPeriod.findFirst({
                where: { roomId },
                orderBy: { startDate: 'desc' }
            });
        }

        // If still no period, we return empty data
        if (!targetPeriod) {
            // Wait for auth verification before returning
            await authPromise;

            return NextResponse.json({
                settings: settings || createDefaultSettings(),
                autoSettings: autoSettings || createDefaultAutoSettings(userId, roomId),
                meals: [],
                guestMeals: [],
                userStats: null,
                period: null
            });
        }

        // 3. Fetch Meals & Guest Meals for the target period
        const periodId = targetPeriod.id;

        const mealsDataPromise = Promise.all([
            // Fetch ALL meals for the period (for the room view)
            prisma.meal.findMany({
                where: {
                    roomId,
                    periodId
                },
                include: {
                    user: { select: { id: true, name: true, image: true } }
                },
                orderBy: { date: 'desc' }
            }),

            // Fetch ALL guest meals for the period
            prisma.guestMeal.findMany({
                where: {
                    roomId,
                    periodId
                },
                include: {
                    user: { select: { id: true, name: true, image: true } }
                },
                orderBy: { date: 'desc' }
            })
        ]);

        const [meals, guestMeals] = await mealsDataPromise;

        // 4. In-Memory User Stats Calculation
        // Use the fetched data to calculate stats for the current user
        const userMeals = meals.filter(m => m.userId === userId).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const userGuestMeals = guestMeals.filter(m => m.userId === userId).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const userStats = calculateUserStats(userMeals, userGuestMeals, targetPeriod, { id: userId, name: session!.user!.name, image: session!.user!.image });

        // 5. Final Auth Verification
        await authPromise;

        return NextResponse.json({
            settings: settings || await getOrCreateDefaultSettings(roomId),
            autoSettings: autoSettings || await getOrCreateDefaultAutoSettings(userId, roomId),
            meals,
            guestMeals,
            userStats,
            period: targetPeriod
        }, {
            headers: {
                'Cache-Control': 'private, s-maxage=10, stale-while-revalidate=30'
            }
        });

    } catch (error: any) {
        console.error("Error in unified meal API:", error);
        if (error.message === "Unauthorized" || error.message === "Access denied") {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// Helper functions for defaults and calculations
function createDefaultSettings() {
    return {
        breakfastTime: "08:00", lunchTime: "13:00", dinnerTime: "20:00",
        autoMealEnabled: false, mealCutoffTime: "22:00", maxMealsPerDay: 3,
        allowGuestMeals: true, guestMealLimit: 5
    };
}

async function getOrCreateDefaultSettings(roomId: string) {
    // If we didn't find settings, we should create them in DB or just return object?
    // The original API creates them. Let's return object for speed, lazy create on write.
    return { ...createDefaultSettings(), roomId, createdAt: new Date() };
}

function createDefaultAutoSettings(userId: string, roomId: string) {
    return {
        userId, roomId, isEnabled: false,
        breakfastEnabled: true, lunchEnabled: true, dinnerEnabled: true,
        guestMealEnabled: false, startDate: new Date(),
        excludedDates: [], excludedMealTypes: []
    };
}

async function getOrCreateDefaultAutoSettings(userId: string, roomId: string) {
    return { ...createDefaultAutoSettings(userId, roomId), createdAt: new Date() };
}

function calculateUserStats(userMeals: any[], userGuestMeals: any[], period: any, userInfo: any) {
    const totalRegularMeals = userMeals.length;
    const totalGuestMeals = userGuestMeals.reduce((sum: any, meal: any) => sum + meal.count, 0);
    const totalMeals = totalRegularMeals + totalGuestMeals;

    // Count by types
    const regularByType = {
        breakfast: userMeals.filter(m => m.type === 'BREAKFAST').length,
        lunch: userMeals.filter(m => m.type === 'LUNCH').length,
        dinner: userMeals.filter(m => m.type === 'DINNER').length,
    };

    const guestByType = {
        breakfast: userGuestMeals.filter(m => m.type === 'BREAKFAST').reduce((sum: any, m: any) => sum + m.count, 0),
        lunch: userGuestMeals.filter(m => m.type === 'LUNCH').reduce((sum: any, m: any) => sum + m.count, 0),
        dinner: userGuestMeals.filter(m => m.type === 'DINNER').reduce((sum: any, m: any) => sum + m.count, 0),
    };

    // Daily breakdown
    const startDate = new Date(period.startDate);
    const endDate = period.endDate ? new Date(period.endDate) : new Date();
    // Safety check for insane ranges
    if (endDate.getTime() - startDate.getTime() > 1000 * 60 * 60 * 24 * 365) {
        // limit to last 31 days if period is crazy long or open
        startDate.setTime(endDate.getTime() - 1000 * 60 * 60 * 24 * 31);
    }

    // Safe check if start > end
    if (startDate > endDate) endDate.setTime(startDate.getTime());

    const days = eachDayOfInterval({ start: startDate, end: endDate });

    const mealsByDate = new Map<string, any[]>();
    const guestMealsByDate = new Map<string, any[]>();

    userMeals.forEach(meal => {
        const d = format(new Date(meal.date), 'yyyy-MM-dd');
        if (!mealsByDate.has(d)) mealsByDate.set(d, []);
        mealsByDate.get(d)!.push(meal);
    });

    userGuestMeals.forEach(meal => {
        const d = format(new Date(meal.date), 'yyyy-MM-dd');
        if (!guestMealsByDate.has(d)) guestMealsByDate.set(d, []);
        guestMealsByDate.get(d)!.push(meal);
    });

    const dailyStats = days.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const dMeals = mealsByDate.get(dayStr) || [];
        const dGuest = guestMealsByDate.get(dayStr) || [];

        return {
            date: dayStr,
            breakfast: dMeals.filter(m => m.type === 'BREAKFAST').length,
            lunch: dMeals.filter(m => m.type === 'LUNCH').length,
            dinner: dMeals.filter(m => m.type === 'DINNER').length,
            guestBreakfast: dGuest.filter(m => m.type === 'BREAKFAST').reduce((s: any, m: any) => s + m.count, 0),
            guestLunch: dGuest.filter(m => m.type === 'LUNCH').reduce((s: any, m: any) => s + m.count, 0),
            guestDinner: dGuest.filter(m => m.type === 'DINNER').reduce((s: any, m: any) => s + m.count, 0),
            total: dMeals.length + dGuest.reduce((s: any, m: any) => s + m.count, 0)
        };
    });

    return {
        user: userInfo,
        period: {
            id: period.id,
            name: period.name,
            startDate: format(new Date(period.startDate), 'yyyy-MM-dd'),
            endDate: period.endDate ? format(new Date(period.endDate), 'yyyy-MM-dd') : null,
            status: period.status
        },
        totals: {
            regularMeals: totalRegularMeals,
            guestMeals: totalGuestMeals,
            total: totalMeals
        },
        byType: {
            breakfast: { regular: regularByType.breakfast, guest: guestByType.breakfast, total: regularByType.breakfast + guestByType.breakfast },
            lunch: { regular: regularByType.lunch, guest: guestByType.lunch, total: regularByType.lunch + guestByType.lunch },
            dinner: { regular: regularByType.dinner, guest: guestByType.dinner, total: regularByType.dinner + guestByType.dinner },
        },
        daily: dailyStats
    };
}
