import { prisma } from '@/lib/services/prisma';
import { revalidateTag as _revalidateTag } from 'next/cache';
const revalidateTag = _revalidateTag as any;

export async function fetchPrivacySettings(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
             isSearchable: true,
             showEmail: true
        }
    });
    return user;
}

export async function updatePrivacySettings(userId: string, data: { isSearchable?: boolean; showEmail?: boolean }) {
    const user = await prisma.user.update({
        where: { id: userId },
        data: {
            ...data,
            updatedAt: new Date()
        }
    });

    revalidateTag(`user-${userId}`);
    return user;
}
