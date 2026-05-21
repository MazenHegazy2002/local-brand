import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SessionUser } from '@/types';

// Q&A is now stored in its own ProductQA table (the legacy hack of overloading
// Review with rating=0 has been retired). Each row is one question; once a
// seller answers, `answer`/`answererId`/`answeredAt` populate.

// GET /api/products/[id]/qa
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: productId } = await params;

    const questions = await prisma.productQA.findMany({
      where: { productId },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ questions }, { status: 200 });
  } catch (error) {
    console.error('[products/qa] GET error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/products/[id]/qa — buyer asks a question
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: 'Login required to ask a question' }, { status: 401 });
    }

    const userId = (session.user as SessionUser).id;
    const { id: productId } = await params;
    const { question } = await req.json();

    if (!question || typeof question !== 'string' || question.trim().length < 5) {
      return NextResponse.json(
        { message: 'Question must be at least 5 characters' },
        { status: 400 }
      );
    }

    // Confirm the product exists & is published before accepting Q&A.
    const product = await prisma.product.findUnique({
      where: { id: productId, published: true, deletedAt: null },
      select: { id: true },
    });
    if (!product) {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }

    const qa = await prisma.productQA.create({
      data: {
        productId,
        userId,
        question: question.trim(),
      },
    });

    return NextResponse.json(
      { message: 'Question submitted. The seller will answer soon.', qa },
      { status: 201 }
    );
  } catch (error) {
    console.error('[products/qa] POST error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH /api/products/[id]/qa — seller (who owns the product) answers a question.
//
// Cross-seller tampering used to be possible because we only checked the role
// on the session, never that the seller actually owned the product whose Q&A
// they were editing. We now resolve the seller's profile and check ownership
// before allowing the update.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const role = (session.user as SessionUser).role;
    const userId = (session.user as SessionUser).id;
    if (role !== 'SELLER' && role !== 'ADMIN') {
      return NextResponse.json({ message: 'Seller account required' }, { status: 403 });
    }

    const { id: productId } = await params;
    const body = await req.json();
    const qaId: unknown = body?.qaId;
    const answer: unknown = body?.answer;

    if (typeof qaId !== 'string' || typeof answer !== 'string' || answer.trim().length < 1) {
      return NextResponse.json(
        { message: 'qaId and a non-empty answer are required' },
        { status: 400 }
      );
    }

    // Load the QA + the product's seller in one go so we can authorize.
    const qa = await prisma.productQA.findUnique({
      where: { id: qaId },
      include: { product: { select: { sellerId: true, id: true } } },
    });
    if (!qa) {
      return NextResponse.json({ message: 'Question not found' }, { status: 404 });
    }
    if (qa.productId !== productId) {
      return NextResponse.json(
        { message: 'Question does not belong to this product' },
        { status: 400 }
      );
    }

    if (role === 'SELLER') {
      const seller = await prisma.sellerProfile.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (!seller || seller.id !== qa.product.sellerId) {
        return NextResponse.json({ message: 'You do not own this product' }, { status: 403 });
      }
    }

    const updated = await prisma.productQA.update({
      where: { id: qaId },
      data: {
        answer: answer.trim(),
        answererId: userId,
        answeredAt: new Date(),
      },
    });

    return NextResponse.json(
      { message: 'Answer posted successfully', qa: updated },
      { status: 200 }
    );
  } catch (error) {
    console.error('[products/qa] PATCH error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
