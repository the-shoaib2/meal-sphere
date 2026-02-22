"use server"

import { prisma } from '@/lib/services/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';

export async function globalSearchAction(query: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return { success: false, message: "Unauthorized", results: [] };
        }

        if (!query || query.length < 2) {
            return { success: true, results: [] };
        }

        const [users, rooms, shoppingItems, extraExpenses] = await Promise.all([
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
            prisma.shoppingItem.findMany({
                where: {
                    name: { contains: query, mode: 'insensitive' },
                    room: { isPrivate: false }
                },
                take: 5,
                orderBy: { date: 'desc' },
                include: { room: { select: { name: true } } }
            }),
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

        const results = [
            ...users.map(u => ({ id: u.id, type: 'user', title: String(u.name), subtitle: u.showEmail ? String(u.email) : 'MealSphere User', image: u.image ? String(u.image) : undefined, url: `/profile/${u.id}` })),
            ...rooms.map(r => ({ id: r.id, type: 'room', title: r.name, subtitle: r.description || r.category || 'Group', url: `/groups/${r.id}` })),
            ...shoppingItems.map(s => ({ id: s.id, type: 'shopping', title: s.name, subtitle: `In ${s.room.name}`, url: `/groups/${s.roomId}/shopping?highlight=${s.id}` })),
            ...extraExpenses.map(e => ({ id: e.id, type: 'expense', title: e.description, subtitle: `In ${e.room.name}`, url: `/groups/${e.roomId}/expenses?highlight=${e.id}` }))
        ];

        return { success: true, results };
    } catch (error: any) {
        console.error('[SEARCH_ACTION_ERROR]', error);
        return { success: false, message: "Internal Error", results: [] };
    }
}
