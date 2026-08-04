import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SessionUser } from '@/types';
import ExcelJS from 'exceljs';

// POST /api/admin/export/orders/template — Export selected or all orders formatted according to NewTemplate.xlsx
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as SessionUser).role !== 'ADMIN') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const orderIds: string[] | undefined = Array.isArray(body.orderIds) ? body.orderIds : undefined;
    const status: string | undefined = typeof body.status === 'string' ? body.status : undefined;

    const where: any = {};
    if (orderIds && orderIds.length > 0) {
      where.id = { in: orderIds };
    } else if (status && status !== 'ALL') {
      where.status = status;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        user: { select: { name: true, phone: true, email: true } },
        shipments: true,
        items: {
          include: {
            variant: {
              include: {
                product: {
                  include: {
                    seller: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Orders');

    const headerRow = worksheet.addRow([
      'Package_Serial',
      'Description',
      'Total_Weight',
      'Package_volume',
      'COD_Value',
      'Item_Special_Notes',
      'Customer_Name',
      'Mobile_No',
      'Street',
      'City',
      'Package_Ref. Number',
      'Merchant_Name',
      'Warehouse_Name',
      'HasPOD',
      'SellerName',
      'Post_Id',
    ]);

    // Header styling (Bold white text on dark red header fill)
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFDC2626' }, // Red Header fill as specified in template
    };

    orders.forEach((order, index) => {
      let parsedAddress: any = {};
      try {
        if (order.shippingAddressSnapshot) {
          parsedAddress = JSON.parse(order.shippingAddressSnapshot);
        }
      } catch {
        parsedAddress = {};
      }

      const itemDescs = order.items.map(item => {
        const pTitle = item.productTitleSnapshot || item.variant?.product?.title || 'Product';
        const color = item.selectedColor ? `Color: ${item.selectedColor}` : '';
        const size = item.selectedSize ? `Size: ${item.selectedSize}` : '';
        const details = [color, size].filter(Boolean).join(', ');
        return `${pTitle} ${details ? `(${details})` : ''} x${item.quantity}`;
      });
      const fullDescription = itemDescs.join(' | ');

      const totalQty = order.items.reduce((acc, item) => acc + item.quantity, 0);

      let totalWeightGrams = 0;
      for (const item of order.items) {
        const perGrams = item.variant?.product?.weightGrams || 500;
        totalWeightGrams += perGrams * item.quantity;
      }
      const totalWeightKg = Math.max(0.5, totalWeightGrams / 1000).toFixed(1);

      const firstSeller = order.items[0]?.variant?.product?.seller;
      const merchantName = order.items[0]?.sellerNameSnapshot || firstSeller?.storeName || 'Store';
      const warehouseName = firstSeller?.governorate || firstSeller?.city || 'Cairo';
      const sellerContact = firstSeller?.pickupContactName || firstSeller?.storeName || 'Seller';

      const street = [
        parsedAddress.street || parsedAddress.address,
        parsedAddress.building,
        parsedAddress.floor ? `Floor ${parsedAddress.floor}` : null,
        parsedAddress.apartment ? `Apt ${parsedAddress.apartment}` : null,
      ]
        .filter(Boolean)
        .join(', ') || 'Cairo, Egypt';

      const trackingNum = order.shipments?.[0]?.trackingNumber || `POST-${order.id.slice(0, 6).toUpperCase()}`;

      worksheet.addRow([
        index + 1, // Package_Serial
        fullDescription,
        Number(totalWeightKg),
        totalQty,
        order.paymentMethod === 'CASH_ON_DELIVERY' ? order.totalAmount : 0,
        order.orderNotes || 'Handle with care',
        parsedAddress.fullName || parsedAddress.name || order.user?.name || 'Customer',
        parsedAddress.phone || order.user?.phone || '',
        street,
        parsedAddress.governorate || parsedAddress.city || 'Cairo',
        `#${order.id.slice(0, 8).toUpperCase()}`,
        merchantName,
        warehouseName,
        'YES',
        sellerContact,
        trackingNum,
      ]);
    });

    worksheet.columns = [
      { width: 15 },
      { width: 45 },
      { width: 15 },
      { width: 16 },
      { width: 15 },
      { width: 25 },
      { width: 25 },
      { width: 18 },
      { width: 40 },
      { width: 18 },
      { width: 22 },
      { width: 22 },
      { width: 20 },
      { width: 10 },
      { width: 20 },
      { width: 20 },
    ];

    const buf = await workbook.xlsx.writeBuffer();

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Orders_Export_${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[export/orders/template] error:', err);
    return NextResponse.json({ message: err.message || 'Failed to export orders' }, { status: 500 });
  }
}
