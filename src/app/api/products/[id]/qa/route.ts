import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/products/[id]/qa
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const productId = resolvedParams.id;

    // We store Q&A as reviews with a special flag — in production add a separate QA table
    // For now using a lightweight approach via the Review model with rating=0 as Q&A marker
    const questions = await prisma.review.findMany({
      where: { productId, rating: 0 },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ questions }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/products/[id]/qa — buyer asks a question
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Login required to ask a question' }, { status: 401 });

    const userId = (session.user as any).id;
    const resolvedParams = await params;
    const productId = resolvedParams.id;
    const { question } = await req.json();

    if (!question || question.trim().length < 5) {
      return NextResponse.json({ message: 'Question must be at least 5 characters' }, { status: 400 });
    }

    // Store as a rating-0 review (Q&A entry)
    const qa = await prisma.review.create({
      data: {
        userId,
        productId,
        rating: 0, // 0 = Q&A, not a review
        comment: question.trim(),
        verifiedPurchase: false,
      }
    });

    return NextResponse.json({ message: 'Question submitted. The seller will answer soon.', qa }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH /api/products/[id]/qa — seller answers a question
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'SELLER') {
      return NextResponse.json({ message: 'Seller account required' }, { status: 403 });
    }

    const resolvedParams = await params;
    const { qaId, answer } = await req.json();

    await prisma.review.update({
      where: { id: qaId },
      data: { sellerResponseText: answer }
    });

    return NextResponse.json({ message: 'Answer posted successfully' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
