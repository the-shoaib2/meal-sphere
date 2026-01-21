import { RoomMember, User, Room } from "@prisma/client";

export interface Group extends Omit<Room, 'createdBy'> {
  createdByUser: Pick<User, 'id' | 'name' | 'email' | 'image'>;
  members?: Array<{
    id: string;
    userId: string;
    role: string;
    joinedAt: string;
    user: {
      id: string;
      name: string | null;
      email: string | null;
      image: string | null;
    };
  }>;
  userRole?: string;
  permissions?: string[];
  joinedAt?: string;
  _count?: {
    members: number;
  };
}

export interface JoinRequest {
  id: string;
  userId: string;
  roomId: string;
  message?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
}

export interface Candidate {
  id: string;
  name: string;
  image?: string;
}

export interface Voter {
  id: string;
  name: string;
  image?: string;
}

export interface Vote {
  id: string;
  title: string;
  description?: string | null;
  type: string;
  isActive: boolean;
  startDate: Date;
  endDate: Date;
  roomId: string;
  createdById: string;
  options: Candidate[];
  results: Record<string, Voter[]>;
  winner?: Candidate | null;
  totalVotes?: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: {
    id: string;
    name: string | null;
    image: string | null;
  };
}