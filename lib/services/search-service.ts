import { prisma } from '@/lib/services/prisma';
import { unstable_cache } from 'next/cache';
import { encryptData, decryptData } from '@/lib/encryption';

export async function fetchSearchResults(query: string) {
    if (!query || query.length < 2) return { results: [] };

    // Split query into terms
    const terms = query.trim().split(/\s+/).filter(t => t.length > 0);
    // const searchRegex = terms.join('|'); // Not used in Prisma queries directly like regex usually

    const [users, rooms, shoppingItems, extraExpenses] = await Promise.all([
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
                isPrivate: false 
            },
            take: 5,
            select: { id: true, name: true, description: true, category: true }
        }),

        // 3. Search Shopping Items (Only Public Rooms)
        prisma.shoppingItem.findMany({
            where: {
                name: { contains: query, mode: 'insensitive' },
                room: { isPrivate: false }
            },
            take: 5,
            orderBy: { date: 'desc' },
            include: { room: { select: { name: true } } }
        }),

        // 4. Search Extra Expenses (Only Public Rooms)
        prisma.extraExpense.findMany({
            where: {
                description: { contains: query, mode: 'insensitive' },
                room: { isPrivate: false }
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
            subtitle: u.showEmail ? u.email : 'MealSphere User',
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

    return { results };
}
