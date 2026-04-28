import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'SELLER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    const profile = await prisma.sellerProfile.findUnique({
      where: { userId: (session.user as any).id }
    });

    if (!profile) {
      return NextResponse.json({ error: 'Seller profile not found' }, { status: 404 });
    }

    const results = { success: 0, failed: 0, errors: [] as string[] };
    
    for (const row of data) {
      try {
        const typedRow = row as any;
        // Expected columns: title, description, basePrice, stockCount, category, sizes, colors
        if (!typedRow.title || !typedRow.basePrice) {
          results.failed++;
          results.errors.push(`Skipped row: missing title or price`);
          continue;
        }

        const category = await prisma.category.findFirst({
          where: { name: typedRow.category || 'General' }
        });

        const product = await prisma.product.create({
          data: {
            title: typedRow.title,
            description: typedRow.description || '',
            basePrice: parseFloat(typedRow.basePrice),
            sellerId: profile.id,
            categoryId: category?.id || '',
            published: true,
            slug: typedRow.title.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
          }
        });

        // Create default variant
        await prisma.productVariant.create({
          data: {
            productId: product.id,
            sku: `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            title: 'Default',
            attributes: JSON.stringify({}),
            price: parseFloat(typedRow.basePrice),
            stockCount: parseInt(typedRow.stockCount) || 0,
          }
        });

        results.success++;
      } catch (err: any) {
        results.failed++;
        results.errors.push(`Error: ${err.message}`);
      }
    }

    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
