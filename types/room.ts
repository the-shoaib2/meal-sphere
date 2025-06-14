import { Room, Prisma } from '@prisma/client';

export type RoomWithMembers = Room & {
  members: Array<{
    id: string;
    role: string;
    user: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    };
  }>;
};

export type CreateRoomInput = Omit<Prisma.RoomCreateInput, 'id' | 'createdAt' | 'updatedAt' | 'isActive' | 'memberCount' | 'createdByUser' | 'members' | 'meals' | 'payments' | 'shopping' | 'votes'> & {
  password?: string;
  isPrivate?: boolean;
  maxMembers?: number | null;
};

export type UpdateRoomInput = Partial<CreateRoomInput>;
