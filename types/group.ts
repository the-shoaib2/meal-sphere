import { RoomMember, User } from "@prisma/client";

export interface Group {
  id: string;
  name: string;
  description?: string;
  isPrivate: boolean;
  password?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  createdByUser: User;
  memberCount: number;
  features?: Record<string, boolean>;
  category?: string;
  tags?: string[];
  members: RoomMember[];
  role?: string;
  joinedAt?: string;
} 