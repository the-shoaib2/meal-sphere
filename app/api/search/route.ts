import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/services/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const query = searchParams.get('q');

        if (!query || query.length < 2) {
            return NextResponse.json({ results: [] });
        }

        // Split query into terms for more flexible search
        const terms = query.trim().split(/\s+/).filter(t => t.length > 0);
        const searchRegex = terms.join('|'); // Simple regex for "any term" logic, or use just the full query

        // Parallelize queries for maximum speed
        const [
            users,
            rooms,
            shoppingItems,
            extraExpenses
        ] = await Promise.all([
            // 1. Search Users (Respect Privacy)
            prisma.user.findMany({
                where: {
                    OR: [
                        { name: { contains: query, mode: 'insensitive' } },
                        { email: { contains: query, mode: 'insensitive' } }
                    ],
                    isActive: true,
                    isSearchable: true
                },
                take: 5,
                select: { id: true, name: true, email: true, image: true, showEmail: true }
            }),

            // 2. Search Rooms (Respect Privacy)
            prisma.room.findMany({
                where: {
                    OR: [
                        { name: { contains: query, mode: 'insensitive' } },
                        { description: { contains: query, mode: 'insensitive' } }
                    ],
                    isActive: true,
                    isPrivate: false // Only Public rooms
                },
                take: 5,
                select: { id: true, name: true, description: true, category: true }
            }),

            // 3. Search Shopping Items (Proxy for "Meals/Food") - Only in Public Rooms
            prisma.shoppingItem.findMany({
                where: {
                    name: { contains: query, mode: 'insensitive' },
                    room: {
                        isPrivate: false // Only from public rooms
                    }
                },
                take: 5,
                orderBy: { date: 'desc' },
                include: { room: { select: { name: true } } }
            }),

            // 4. Search Extra Expenses (Proxy for "Other costs") - Only in Public Rooms
            prisma.extraExpense.findMany({
                where: {
                    description: { contains: query, mode: 'insensitive' },
                    room: {
                        isPrivate: false // Only from public rooms
                    }
                },
                take: 5,
                orderBy: { date: 'desc' },
                include: { room: { select: { name: true } } }
            })
        ]);

        // Normalize Results
        const results = [
            ...users.map(u => ({
                id: u.id,
                type: 'user',
                title: u.name,
                subtitle: u.showEmail ? u.email : 'MealSphere User', // Respect showEmail
                image: u.image,
                url: `/profile/${u.id}`
            })),
            ...rooms.map(r => ({
                id: r.id,
                type: 'room',
                title: r.name,
                subtitle: r.description || r.category || 'Group',
                url: `/groups/${r.id}`
            })),
            ...shoppingItems.map(s => ({
                id: s.id,
                type: 'shopping',
                title: s.name,
                subtitle: `In ${s.room.name}`,
                url: `/groups/${s.roomId}/shopping?highlight=${s.id}`
            })),
            ...extraExpenses.map(e => ({
                id: e.id,
                type: 'expense',
                title: e.description,
                subtitle: `In ${e.room.name}`,
                url: `/groups/${e.roomId}/expenses?highlight=${e.id}`
            }))
        ];

        return NextResponse.json({ results });
    } catch (error) {
        console.error('[SEARCH_API_ERROR]', error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
