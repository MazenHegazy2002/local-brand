import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SessionUser } from '@/types';
import ExcelJS from 'exceljs';

// GET /api/admin/export/merchant-warehouses — Export Merchant Warehouses Excel matching Merchant_Warehouses.xlsx
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as SessionUser).role !== 'ADMIN') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const sellers = await prisma.sellerProfile.findMany({
      where: { deletedAt: null },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet1');

    // Title header
    worksheet.addRow(['Merchant_Warehouses']);
    worksheet.addRow([]);
    worksheet.addRow([]);

    // Table Headers (Row 4)
    const headerRow = worksheet.addRow([
      'Pickup Location',
      'Full Address',
      'City',
      'Zone',
      'Subzone',
      'Geolocation',
      'Hub',
      'Contact Telephone',
      'Contact Name',
    ]);

    // Style Header Row (Dark Blue / Red header styling)
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3B8A' },
    };

    // Data rows
    sellers.forEach(seller => {
      const fullAddress = [seller.pickupStreet, seller.pickupBuilding]
        .filter(Boolean)
        .join(', ');

      worksheet.addRow([
        seller.governorate || seller.city || 'القاهرة',
        fullAddress || seller.city || seller.storeName,
        seller.city || seller.governorate || 'القاهرة',
        seller.pickupZone || seller.city || seller.governorate || 'قسم اول القاهرة الجديدة',
        seller.pickupSubzone || seller.pickupZone || seller.city || 'قسم اول القاهرة الجديدة',
        seller.pickupGeo || '30.067807, 31.518141',
        seller.logisticsHub || 'المركز اللوجيستي الرئيسي',
        seller.pickupPhone || seller.user?.phone || '01000000000',
        seller.pickupContactName || seller.storeName || seller.user?.name || 'Merchant',
      ]);
    });

    worksheet.addRow([]);
    const footerRow = worksheet.addRow(['This is system generated excel sheet.']);
    footerRow.font = { italic: true, color: { argb: 'FF64748B' } };

    // Format Column Widths
    worksheet.columns = [
      { width: 20 },
      { width: 45 },
      { width: 22 },
      { width: 30 },
      { width: 30 },
      { width: 28 },
      { width: 30 },
      { width: 22 },
      { width: 25 },
    ];

    const buf = await workbook.xlsx.writeBuffer();

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Merchant_Warehouses_${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[export/merchant-warehouses] error:', err);
    return NextResponse.json({ message: err.message || 'Failed to export' }, { status: 500 });
  }
}
