import { prisma } from '@/lib/services/prisma';
import { unstable_cache, revalidateTag as _revalidateTag } from 'next/cache';
const revalidateTag = _revalidateTag as any;
import { encryptData, decryptData } from '@/lib/encryption';
import { CACHE_TTL } from "@/lib/cache/cache-keys";
import { createBkashPayment, queryBkashPayment } from '@/lib/services/bkash-service';
import { v4 as uuidv4 } from 'uuid';
import { createCustomNotification } from "@/lib/utils/notification-utils";
import { invalidatePaymentCache } from "@/lib/cache/cache-invalidation";
import { PaymentMethod } from '@prisma/client';
import { getCurrentPeriod } from './period-service';

export async function fetchPaymentsData(userId: string, groupId: string) {
    const cacheKey = `payments-data-${userId}-${groupId}`;
    
    const cachedFn = unstable_cache(
        async () => {
            const [
                payments,
                activePeriod,
                room
            ] = await Promise.all([
                prisma.payment.findMany({
                    where: { roomId: groupId },
                    include: {
                        user: {
                            select: { id: true, name: true, image: true }
                        }
                    },
                    orderBy: { date: 'desc' }
                }),
                getCurrentPeriod(groupId),
                prisma.room.findUnique({
                    where: { id: groupId },
                    select: { periodMode: true }
                })
            ]);

            return encryptData({
                payments,
                currentPeriod: activePeriod,
                roomData: room
            });
        },
        [cacheKey, 'payments-page-data'],
        {
            revalidate: 60,
            tags: [`group-${groupId}-payments`, `group-${groupId}-periods`]
        }
    );

    const encrypted = await cachedFn();
    return decryptData(encrypted);
}


export async function fetchPayments(userId: string, roomId?: string) {
    const cacheKey = `payments-${userId}-${roomId || 'all'}`;
    
    const cachedFn = unstable_cache(
        async () => {
            const whereClause: any = { userId };
            if (roomId) whereClause.roomId = roomId;

            const payments = await prisma.payment.findMany({
                where: whereClause,
                include: {
                    room: {
                        select: { id: true, name: true }
                    }
                },
                orderBy: { date: 'desc' }
            });
            
            return encryptData(payments);
        },
        [cacheKey, 'payments-list'],
        {
            revalidate: 60,
            tags: [`user-${userId}`, roomId ? `group-${roomId}` : ''].filter(Boolean) as string[]
        }
    );

    const encrypted = await cachedFn();
    return decryptData(encrypted);
}

export async function createManualPayment(userId: string, roomId: string, amount: number, method: PaymentMethod, description?: string) {
    const payment = await prisma.payment.create({
        data: {
            userId,
            roomId,
            amount: Number(amount),
            method,
            status: "COMPLETED",
            description,
            date: new Date()
        }
    });

    return payment;
}

export async function initiateBkashPayment(userId: string, roomId: string, amount: number) {
     // Generate invoice ID
     const invoiceId = `MS-${uuidv4().substring(0, 8)}-${Date.now()}`;

     // Create Pending Payment
     const payment = await prisma.payment.create({
         data: {
             userId,
             roomId,
             amount: Number(amount),
             method: "BKASH",
             status: "PENDING",
             description: `Bkash payment - Invoice #${invoiceId}`,
             date: new Date()
         }
     });

     // Call Bkash API Wrapper
     const callbackURL = `${process.env.NEXTAUTH_URL}/api/payments/bkash/callback`; // We rely on API route for callback handling for now?
     // Actually, if we refactor, the callback URL should point to a route that uses this service.
     // But we are not changing external URLs right now to avoid breaking existing integrations if any.
     
     const bkashPayment = await createBkashPayment(Number(amount), invoiceId, callbackURL);

     // Create Bkash Record
     await prisma.bkashPayment.create({
         data: {
             paymentId: bkashPayment.paymentID,
             invoiceId,
             amount: Number(amount),
             status: bkashPayment.transactionStatus, // 'Initiated'
             userId,
             roomId,
             paymentRecordId: payment.id
         }
     });

     return {
         paymentId: bkashPayment.paymentID,
         bkashURL: bkashPayment.bkashURL
     };
}

export async function processBkashCallback(paymentId: string, status: string) {
    const bkashPayment = await prisma.bkashPayment.findUnique({
        where: { paymentId }
    });

    if (!bkashPayment) throw new Error("Payment not found");

    if (status === "success" || status === "Completed") { // Match bKash status
         const paymentData = await queryBkashPayment(paymentId);

         await prisma.bkashPayment.update({
             where: { paymentId },
             data: {
                 status: paymentData.transactionStatus,
                 trxId: paymentData.trxID,
                 customerMsisdn: paymentData.customerMsisdn,
                 updatedAt: new Date()
             }
         });

         const isCompleted = paymentData.transactionStatus === "Completed";
         
         await prisma.payment.update({
             where: { id: bkashPayment.paymentRecordId },
             data: {
                 status: isCompleted ? "COMPLETED" : "FAILED",
                 description: `Bkash payment - TrxID: ${paymentData.trxID}`
             }
         });

         return { success: isCompleted, paymentId };

    } else {
         // Failed/Cancelled
         await prisma.bkashPayment.update({
             where: { paymentId },
             data: { status: "Failed", updatedAt: new Date() }
         });
         
         await prisma.payment.update({
             where: { id: bkashPayment.paymentRecordId },
             data: { status: "FAILED", description: "Bkash payment failed" }
         });

         return { success: false, paymentId };
    }
}
