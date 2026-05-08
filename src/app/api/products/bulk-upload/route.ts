import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SessionUser } from '@/types';

interface BulkProductRow {
  title?: string;
  description?: string;
  basePrice?: string | number;
  stockCount?: string | number;
  category?: string;
  sizes?: string;
  colors?: string;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as SessionUser)?.role !== 'SELLER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return NextResponse.json({ error: 'No worksheet found' }, { status: 400 });
    }
    const data: BulkProductRow[] = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header row
      data.push({
        title: row.getCell(1).value?.toString(),
        description: row.getCell(2).value?.toString(),
        basePrice: row.getCell(3).value,
        stockCount: row.getCell(4).value,
        category: row.getCell(5).value?.toString(),
        sizes: row.getCell(6).value?.toString(),
        colors: row.getCell(7).value?.toString(),
      });
    });

    const profile = await prisma.sellerProfile.findUnique({
      where: { userId: (session.user as SessionUser).id }
    });

    if (!profile) {
      return NextResponse.json({ error: 'Seller profile not found' }, { status: 404 });
    }

    const results = { success: 0, failed: 0, errors: [] as string[] };
    
    for (const row of data) {
      try {
        const typedRow = row;
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
            basePrice: typeof typedRow.basePrice === 'string' ? parseFloat(typedRow.basePrice) : typedRow.basePrice,
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
            price: typeof typedRow.basePrice === 'string' ? parseFloat(typedRow.basePrice) : typedRow.basePrice,
            stockCount: typeof typedRow.stockCount === 'string' ? parseInt(typedRow.stockCount) : (typedRow.stockCount || 0),
          }
        });

        results.success++;
      } catch (err: unknown) {
        results.failed++;
        results.errors.push(`Error: ${(err as Error).message}`);
      }
    }

    return NextResponse.json(results);
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
