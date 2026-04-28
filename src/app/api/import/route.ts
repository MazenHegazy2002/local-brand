import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import * as XLSX from 'xlsx';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'ADMIN') {
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

    const results = { success: 0, failed: 0, errors: [] as string[] };
    
    for (const row of data) {
      try {
        const typedRow = row as any;
        if (!typedRow.Title || !typedRow['Base Price']) {
          results.failed++;
          results.errors.push(`Skipped row: missing Title or Base Price`);
          continue;
        }

        // Find or create category
        let categoryId = '';
        if (typedRow.Category) {
          const category = await prisma.category.findFirst({
            where: { name: typedRow.Category }
          });
          if (category) categoryId = category.id;
        }

        // Find seller by store name
        let sellerId = '';
        if (typedRow.Seller) {
          const sellerProfile = await prisma.sellerProfile.findFirst({
            where: { storeName: typedRow.Seller }
          });
          if (sellerProfile) sellerId = sellerProfile.id;
        }

        await prisma.product.create({
          data: {
            title: typedRow.Title,
            description: typedRow.Description || '',
            basePrice: parseFloat(typedRow['Base Price']),
            sellerId: sellerId,
            categoryId: categoryId,
            published: typedRow.Published !== 'false',
            slug: typedRow.Title.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
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
