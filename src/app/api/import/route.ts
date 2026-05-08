import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SessionUser } from '@/types';
import ExcelJS from 'exceljs';

interface ImportRow {
  Title?: string;
  'Base Price'?: string | number;
  Category?: string;
  Seller?: string;
  Description?: string;
  Published?: string | boolean;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as SessionUser)?.role !== 'ADMIN') {
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
    const data: ImportRow[] = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header row
      data.push({
        Title: row.getCell(1).value?.toString(),
        'Base Price': row.getCell(2).value,
        Category: row.getCell(3).value?.toString(),
        Seller: row.getCell(4).value?.toString(),
        Description: row.getCell(5).value?.toString(),
        Published: row.getCell(6).value?.toString(),
      });
    });

    const results = { success: 0, failed: 0, errors: [] as string[] };
    
    for (const row of data) {
      try {
        if (!row.Title || !row['Base Price']) {
          results.failed++;
          results.errors.push(`Skipped row: missing Title or Base Price`);
          continue;
        }

        // Find or create category
        let categoryId = '';
        if (row.Category) {
          const category = await prisma.category.findFirst({
            where: { name: row.Category }
          });
          if (category) categoryId = category.id;
        }

        // Find seller by store name
        let sellerId = '';
        if (row.Seller) {
          const sellerProfile = await prisma.sellerProfile.findFirst({
            where: { storeName: row.Seller }
          });
          if (sellerProfile) sellerId = sellerProfile.id;
        }

        await prisma.product.create({
          data: {
            title: row.Title,
            description: row.Description || '',
            basePrice: typeof row['Base Price'] === 'string' ? parseFloat(row['Base Price']) : (row['Base Price'] as number),
            sellerId: sellerId,
            categoryId: categoryId,
            published: row.Published !== 'false' && row.Published !== false,
            slug: row.Title.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
          }
        });

        results.success++;
      } catch (err: unknown) {
        results.failed++;
        const message = err instanceof Error ? err.message : 'Unknown error';
        results.errors.push(`Error: ${message}`);
      }
    }

    return NextResponse.json(results);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Import failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
