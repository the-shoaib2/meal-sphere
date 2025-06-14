import { Prisma } from '@prisma/client';
import prisma from "./prisma";

type NotificationType = 
  | 'MEAL_ADDED'
  | 'MEAL_UPDATED'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_APPROVED'
  | 'PAYMENT_REJECTED'
  | 'SHOPPING_ADDED'
  | 'GUEST_MEAL_ADDED'
  | 'EXTRA_EXPENSE_ADDED'
  | 'VOTE_STARTED'
  | 'VOTE_ENDED'
  | 'MARKET_DATE_UPDATED'
  | 'ROLE_CHANGED'
  | 'MEMBER_ADDED'
  | 'MEMBER_REMOVED'
  | 'GENERAL';

type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  message: string;
  read?: boolean;
};

const validateUserId = (userId: string): void => {
  if (!userId || typeof userId !== 'string') {
    throw new Error('Invalid user ID');
  }
};

export async function createNotification({ userId, type, message, read = false }: CreateNotificationInput) {
  try {
    validateUserId(userId);
    if (!message?.trim()) throw new Error('Message is required');
    
    return await prisma.notification.create({
      data: {
        userId,
        type,
        message,
        read,
      },
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error instanceof Error ? error : new Error('Failed to create notification');
  }
}

export async function createMealReminder(userId: string) {
  try {
    validateUserId(userId);
    return await createNotification({
      userId,
      type: 'MEAL_ADDED',
      message: "Don't forget to mark your meals for today!",
    });
  } catch (error) {
    console.error('Error creating meal reminder:', error);
    throw error;
  }
}

export async function createPaymentDueNotification(userId: string, amount: number, dueDate: Date) {
  try {
    validateUserId(userId);
    if (isNaN(amount) || amount <= 0) throw new Error('Invalid amount');
    if (!(dueDate instanceof Date) || isNaN(dueDate.getTime())) throw new Error('Invalid due date');

    return await createNotification({
      userId,
      type: 'PAYMENT_RECEIVED',
      message: `You have a payment of ৳${amount} due on ${dueDate.toLocaleDateString()}.`,
    });
  } catch (error) {
    console.error('Error creating payment due notification:', error);
    throw error;
  }
}

export async function createVoteStartedNotification(userId: string, roomName: string, voteType: string) {
  try {
    validateUserId(userId);
    if (!roomName?.trim()) throw new Error('Room name is required');
    if (!voteType?.trim()) throw new Error('Vote type is required');

    return await createNotification({
      userId,
      type: 'VOTE_STARTED',
      message: `A new ${voteType} vote has started in ${roomName}.`,
    });
  } catch (error) {
    console.error('Error creating vote started notification:', error);
    throw error;
  }
}

export async function createVoteEndedNotification(userId: string, roomName: string, voteType: string, winner: string) {
  try {
    validateUserId(userId);
    if (!roomName?.trim()) throw new Error('Room name is required');
    if (!voteType?.trim()) throw new Error('Vote type is required');
    if (!winner?.trim()) throw new Error('Winner is required');

    return await createNotification({
      userId,
      type: 'VOTE_ENDED',
      message: `The ${voteType} vote in ${roomName} has ended. ${winner} has won.`,
    });
  } catch (error) {
    console.error('Error creating vote ended notification:', error);
    throw error;
  }
}

export async function createManagerChangedNotification(userId: string, roomName: string, managerName: string) {
  try {
    validateUserId(userId);
    if (!roomName?.trim()) throw new Error('Room name is required');
    if (!managerName?.trim()) throw new Error('Manager name is required');

    return await createNotification({
      userId,
      type: 'ROLE_CHANGED',
      message: `${managerName} is now the manager of ${roomName}.`,
    });
  } catch (error) {
    console.error('Error creating manager changed notification:', error);
    throw error;
  }
}

export async function createShoppingAddedNotification(userId: string, roomName: string, amount: number) {
  try {
    validateUserId(userId);
    if (!roomName?.trim()) throw new Error('Room name is required');
    if (isNaN(amount) || amount <= 0) throw new Error('Invalid amount');

    return await createNotification({
      userId,
      type: 'SHOPPING_ADDED',
      message: `New shopping items worth ৳${amount} have been added to ${roomName}.`,
    });
  } catch (error) {
    console.error('Error creating shopping added notification:', error);
    throw error;
  }
}

export async function createCustomNotification(userId: string, message: string) {
  try {
    validateUserId(userId);
    if (!message?.trim()) throw new Error('Message is required');

    return await createNotification({
      userId,
      type: 'GENERAL',
      message,
    });
  } catch (error) {
    console.error('Error creating custom notification:', error);
    throw error;
  }
}

export async function notifyAllRoomMembers(roomId: string, notificationType: NotificationType, message: string) {
  try {
    if (!roomId?.trim()) throw new Error('Room ID is required');
    if (!message?.trim()) throw new Error('Message is required');

    // Get all members of the room
    const roomMembers = await prisma.roomMember.findMany({
      where: { roomId },
      select: { userId: true },
    });

    if (!roomMembers.length) {
      console.warn(`No members found for room ${roomId}`);
      return [];
    }

    // Create notifications for each member
    const notificationPromises = roomMembers.map(member =>
      createNotification({
        userId: member.userId,
        type: notificationType,
        message,
      })
    );

    return await Promise.all(notificationPromises);
  } catch (error) {
    console.error('Error notifying room members:', error);
    throw error;
  }
}
