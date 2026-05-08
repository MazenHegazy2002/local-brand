import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SessionUser } from '@/types';

interface ImportVariant {
  sku?: string;
  title?: string;
  attributes?: Record<string, any>;
  price?: number;
  stock?: number;
}

interface ImportProduct {
  title: string;
  description?: string;
  basePrice?: number;
  price?: number;
  category?: string;
  sellerId: string;
  variants?: ImportVariant[];
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as SessionUser)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string || 'products';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const text = await file.text();
    const data = JSON.parse(text) as ImportProduct[];

    if (type === 'products') {
      for (const item of data) {
        try {
          let category = await prisma.category.findUnique({ 
            where: { name: item.category || 'General' } 
          });
          if (!category) {
            category = await prisma.category.create({ 
              data: { name: item.category || 'General', slug: (item.category || 'general').toLowerCase() } 
            });
          }

          const product = await prisma.product.create({
            data: {
              title: item.title,
              description: item.description || '',
              basePrice: item.basePrice || item.price || 0,
              slug: (item.title + '-' + Date.now()).toLowerCase().replace(/ /g, '-'),
              sellerId: item.sellerId,
              categoryId: category.id,
            }
          });

          if (item.variants && item.variants.length > 0) {
            await prisma.productVariant.createMany({
              data: item.variants.map((v: ImportVariant) => ({
                productId: product.id,
                sku: v.sku || `SKU-${Date.now()}`,
                title: v.title || 'Standard',
                attributes: JSON.stringify(v.attributes || {}),
                price: v.price || product.basePrice,
                stockCount: v.stock || 0,
              }))
            });
          }
        } catch (e) {
          console.error('Error importing product:', item.title, e);
        }
      }
    }

    return NextResponse.json({ success: true, count: data.length });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
}
