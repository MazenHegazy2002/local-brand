import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NOTIFICATION_TYPES } from '@/lib/constants';

interface SendNotificationRequest {
  userId?: string;
  title: string;
  message: string;
  link?: string;
  targetAudience?: 'all' | 'sellers' | 'buyers';
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: (session.user as { id: string }).id },
      include: { sellerProfile: true },
    });

    const { userId, title, message, link, targetAudience } = await req.json() as SendNotificationRequest;

    let userIds: string[] = [];

    if (targetAudience === 'all') {
      const allUsers = await prisma.user.findMany({ select: { id: true } });
      userIds = allUsers.map(u => u.id);
    } else if (targetAudience === 'sellers') {
      const sellers = await prisma.sellerProfile.findMany({ select: { userId: true } });
      userIds = sellers.map(s => s.userId);
    } else if (targetAudience === 'buyers') {
      const buyers = await prisma.user.findMany({
        where: { sellerProfile: null },
        select: { id: true },
      });
      userIds = buyers.map(u => u.id);
    } else if (userId) {
      userIds = [userId];
    }

    if (userIds.length === 0) {
      return NextResponse.json({ message: 'No recipients found' }, { status: 400 });
    }

    await prisma.notification.createMany({
      data: userIds.map(id => ({
        userId: id,
        title,
        message,
        link,
        type: NOTIFICATION_TYPES.SYSTEM_ANNOUNCEMENT,
      })),
    });

    return NextResponse.json({ success: true, count: userIds.length }, { status: 201 });
  } catch (error) {
    console.error('Send Notification Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}