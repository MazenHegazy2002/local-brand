import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SessionUser } from '@/types';
import { isAllowedImageUrl } from '@/lib/allowed-image-hosts';

interface BulkProductRow {
  title?: string;
  description?: string;
  basePrice?: string | number;
  stockCount?: string | number;
  category?: string;
  sizes?: string;
  colors?: string;
  imageUrl?: string;
  sku?: string;
  upc?: string;
}

const COLUMNS: Array<{
  key: keyof BulkProductRow;
  header: string;
  width: number;
  required?: boolean;
  example?: string;
}> = [
  { key: 'title', header: 'Title', width: 32, required: true, example: 'Cotton T-Shirt' },
  {
    key: 'description',
    header: 'Description',
    width: 48,
    required: false,
    example: 'Premium combed cotton, regular fit.',
  },
  { key: 'basePrice', header: 'Price (EGP)', width: 14, required: true, example: '299' },
  { key: 'stockCount', header: 'Stock', width: 12, required: false, example: '25' },
  { key: 'category', header: 'Category', width: 18, required: false, example: 'Men' },
  { key: 'sizes', header: 'Sizes (csv)', width: 18, required: false, example: 'S, M, L, XL' },
  { key: 'colors', header: 'Colors (csv)', width: 18, required: false, example: 'Black, White' },
  {
    key: 'imageUrl',
    header: 'Image URL',
    width: 50,
    required: false,
    example: 'https://example.com/img.jpg',
  },
  // Optional inventory codes — skipped for sellers who don't have them.
  { key: 'sku', header: 'SKU', width: 20, required: false, example: 'TEE-BLACK-M-001' },
  { key: 'upc', header: 'UPC (8-14 digits)', width: 20, required: false, example: '012345678905' },
];

/**
 * GET /api/products/bulk-upload
 * Returns the empty Excel template the seller fills in. The first row is
 * the header, the second row is an example, and subsequent rows are blank.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !['SELLER', 'ADMIN'].includes((session.user as SessionUser).role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Brandy';
  wb.created = new Date();

  const ws = wb.addWorksheet('Products');
  ws.columns = COLUMNS.map(c => ({
    header: c.header + (c.required ? ' *' : ''),
    key: c.key,
    width: c.width,
  }));

  // Style header row
  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  header.alignment = { vertical: 'middle', horizontal: 'center' };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3B8A' } };
  header.height = 22;

  // Example row (greyed)
  const example = ws.addRow(Object.fromEntries(COLUMNS.map(c => [c.key, c.example || ''])));
  example.font = { italic: true, color: { argb: 'FF94A3B8' } };

  // Add 50 blank rows so the seller has plenty of space
  for (let i = 0; i < 50; i++) {
    ws.addRow({});
  }

  // Freeze the header
  ws.views = [{ state: 'frozen', ySplit: 1 }];

  // Add an "Instructions" sheet
  const inst = wb.addWorksheet('Instructions');
  inst.columns = [{ width: 18 }, { width: 80 }];
  inst.getCell('A1').value = 'Brandy bulk product import';
  inst.getCell('A1').font = { bold: true, size: 16 };
  inst.mergeCells('A1:B1');

  const lines = [
    ['Required', 'Title and Price are required for every row.'],
    ['Stock', 'Defaults to 0 if left blank.'],
    ['Category', 'Must match an existing category name (Women, Men, Kids, Electronics, etc).'],
    [
      'Image URL',
      'Optional. Products without an image can NEVER be published — you must add an image from the seller hub before they go live.',
    ],
    ['Sizes/Colors', 'Comma-separated lists. Each combination becomes its own variant.'],
    [
      'SKU',
      'Optional. Your internal stock code. Auto-generated from the product slug if you leave it blank. Duplicates get a -2/-3 suffix.',
    ],
    [
      'UPC',
      'Optional. Universal Product Code / EAN / GTIN — 8-14 digits. Only fill this if you have a real barcode from GS1 or the manufacturer.',
    ],
    [
      'Sheet 1',
      'Fill in the "Products" sheet then upload it from Seller Hub → Inventory → Bulk import.',
    ],
    ['', ''],
    ['Limit', 'Maximum 500 rows per upload.'],
    [
      'Result',
      "You'll see a per-row import report after upload — successful rows are kept as drafts until they have an image attached.",
    ],
  ];
  lines.forEach(row => {
    const r = inst.addRow(row);
    r.getCell(1).font = { bold: true };
    r.getCell(2).alignment = { wrapText: true };
  });

  const buffer = await wb.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="brandy-products-template.xlsx"',
    },
  });
}

/**
 * POST /api/products/bulk-upload
 * Imports the filled-in Excel back into the database.
 * - Products are created as DRAFTS (`published: false`) until they have at
 *   least one image attached. The seller can publish them from the seller
 *   hub once they upload images.
 * - If an `imageUrl` column is provided we attach it as the primary image
 *   and the product is published immediately.
 */
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
    const worksheet = workbook.getWorksheet('Products') ?? workbook.worksheets[0];
    if (!worksheet) {
      return NextResponse.json(
        { error: 'No worksheet found in the uploaded file.' },
        { status: 400 }
      );
    }

    const data: BulkProductRow[] = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header row

      // Skip the example row from our template (it always says "Cotton T-Shirt").
      const title = row.getCell(1).value?.toString().trim();
      if (!title) return;
      if (rowNumber === 2 && title === 'Cotton T-Shirt') return;

      data.push({
        title,
        description: row.getCell(2).value?.toString(),
        basePrice: row.getCell(3).value as string | number | undefined,
        stockCount: row.getCell(4).value as string | number | undefined,
        category: row.getCell(5).value?.toString(),
        sizes: row.getCell(6).value?.toString(),
        colors: row.getCell(7).value?.toString(),
        imageUrl: row.getCell(8).value?.toString(),
        sku: row.getCell(9).value?.toString(),
        upc: row.getCell(10).value?.toString(),
      });
    });

    if (data.length > 500) {
      return NextResponse.json(
        { error: 'Up to 500 rows can be imported per file.' },
        { status: 400 }
      );
    }

    const profile = await prisma.sellerProfile.findUnique({
      where: { userId: (session.user as SessionUser).id },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Seller profile not found' }, { status: 404 });
    }

    const results = {
      success: 0,
      drafts: 0, // Created but not published (no image yet)
      published: 0, // Created and published (had an image URL)
      failed: 0,
      errors: [] as string[],
    };

    for (const [index, row] of data.entries()) {
      const rowNumber = index + 3; // header + example
      try {
        if (!row.title || !row.basePrice) {
          results.failed++;
          results.errors.push(`Row ${rowNumber}: missing title or price.`);
          continue;
        }

        const basePrice =
          typeof row.basePrice === 'string' ? parseFloat(row.basePrice) : row.basePrice;
        if (!Number.isFinite(basePrice) || basePrice <= 0) {
          results.failed++;
          results.errors.push(`Row ${rowNumber}: invalid price "${row.basePrice}".`);
          continue;
        }

        const category = row.category
          ? await prisma.category.findFirst({
              where: { name: { equals: row.category, mode: 'insensitive' } },
            })
          : null;

        if (row.category && !category) {
          results.failed++;
          results.errors.push(`Row ${rowNumber}: category "${row.category}" not found.`);
          continue;
        }

        // Pick or create a default category if the seller didn't specify one.
        const fallback = category || (await prisma.category.findFirst());
        if (!fallback) {
          results.failed++;
          results.errors.push(`Row ${rowNumber}: no categories exist on the platform.`);
          continue;
        }

        // Validate image URL host against the platform allow-list
        const rawImageUrl = row.imageUrl?.trim();
        if (rawImageUrl && !isAllowedImageUrl(rawImageUrl)) {
          let badHost = rawImageUrl;
          try {
            badHost = new URL(rawImageUrl).hostname;
          } catch {
            /* keep raw */
          }
          results.errors.push(
            `Row ${rowNumber}: image host "${badHost}" is not allowed — product saved as draft. ` +
              'Upload via Seller Hub > Products > Upload Image instead.'
          );
        }
        const hasImage = !!(rawImageUrl && isAllowedImageUrl(rawImageUrl));
        const product = await prisma.product.create({
          data: {
            title: row.title,
            description: row.description || '',
            basePrice,
            sellerId: profile.id,
            categoryId: fallback.id,
            // No image → forced draft.
            published: hasImage,
            slug: `${row.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}-${index}`,
          },
        });

        if (hasImage && rawImageUrl) {
          await prisma.productImage.create({
            data: { productId: product.id, url: rawImageUrl, isPrimary: true },
          });
        }

        const stockCount =
          typeof row.stockCount === 'string' ? parseInt(row.stockCount, 10) : row.stockCount || 0;

        // Resolve a unique SKU. Prefer the seller-supplied value, fall back
        // to a slug-based candidate, append -2/-3 if the chosen one is
        // already taken so a duplicate doesn't fail the entire row.
        const desiredSku = row.sku?.trim();
        let sku: string;
        if (desiredSku) {
          let candidate = desiredSku.toUpperCase();
          let suffix = 2;
          while (await prisma.productVariant.findUnique({ where: { sku: candidate } })) {
            candidate = `${desiredSku.toUpperCase()}-${suffix++}`;
            if (suffix > 50) break;
          }
          sku = candidate;
        } else {
          sku = `${product.slug.toUpperCase().slice(0, 24)}-${Date.now().toString().slice(-5)}-${index}`;
        }

        const upcRaw = row.upc?.toString().trim();
        const upc = upcRaw && /^\d{8,14}$/.test(upcRaw) ? upcRaw : null;

        await prisma.productVariant.create({
          data: {
            productId: product.id,
            sku,
            upc,
            title: 'Default',
            attributes: JSON.stringify({}),
            price: basePrice,
            stockCount: Number.isFinite(stockCount) ? Number(stockCount) : 0,
          },
        });

        results.success++;
        if (hasImage) results.published++;
        else results.drafts++;
      } catch (err: unknown) {
        results.failed++;
        results.errors.push(`Row ${rowNumber}: ${(err as Error).message}`);
      }
    }

    return NextResponse.json(results);
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
