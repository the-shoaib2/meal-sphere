import { prisma } from '@/lib/services/prisma';
import { unstable_cache, revalidateTag as _revalidateTag } from 'next/cache';
const revalidateTag = _revalidateTag as any;
import { encryptData, decryptData } from '@/lib/encryption';

export async function fetchUserProfile(viewerId: string, profileId: string) {
    const cacheKey = `user-profile-${viewerId}-${profileId}`;

    const cachedFn = unstable_cache(
        async () => {
            const user = await prisma.user.findUnique({
                where: { id: profileId },
                select: {
                    id: true, name: true, email: true, image: true, createdAt: true,
                    showEmail: true, profileVisibility: true,
                    rooms: {
                        select: {
                            role: true,
                            room: {
                                select: {
                                    id: true, name: true, description: true, category: true,
                                    memberCount: true, isPrivate: true
                                }
                            }
                        }
                    }
                }
            });

            if (!user) return encryptData(null);

             // Privacy Logic
             const isSelf = viewerId === user.email; // Wait, viewerId is ID usually, user.email is email. Need to check calling convention.
             // Usually fetchUserProfile is called with IDs.
             // I need to fetch viewer's email to compare? Or just check IDs?
             // Ah, session.user.id is passed as viewerId.
             const isSelfId = viewerId === user.id;

             if (!isSelfId && user.profileVisibility === 'PRIVATE') {
                 return encryptData({
                     id: user.id, name: user.name, image: user.image, isPrivate: true
                 });
             }

             const email = (isSelfId || user.showEmail) ? user.email : null;
             
             const visibleRooms = user.rooms.filter(m => {
                 if (isSelfId) return true;
                 return !m.room.isPrivate;
             }).map(m =>({
                 role: m.role,
                 room: m.room
             }));

             return encryptData({
                 id: user.id,
                 name: user.name,
                 email,
                 image: user.image,
                 createdAt: user.createdAt,
                 rooms: visibleRooms,
                 profileVisibility: user.profileVisibility
             });
        },
        [cacheKey, 'user-profile'],
        {
            revalidate: 60,
            tags: [`user-${profileId}`]
        }
    );

    const encrypted = await cachedFn();
    return decryptData(encrypted);
}

export async function updateUserProfile(userId: string, data: any) {
    const user = await prisma.user.update({
        where: { id: userId },
        data: {
            ...data,
            updatedAt: new Date()
        }
    });

    revalidateTag(`user-${userId}`, 'max');
    return user;
}
