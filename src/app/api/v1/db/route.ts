import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Secret Master Key for Internal Server-to-Server communication only
const MASTER_API_KEY = process.env.MASTER_API_KEY || 'brandyy_master_key_2026_xyz999';

function verifyInternalAccess(req: NextRequest): boolean {
  // Block any requests coming directly from public client browsers or unauthorized origin
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  const headerKey = req.headers.get('x-api-key');
  const authHeader = req.headers.get('authorization');
  const bearerKey = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  const key = headerKey || bearerKey;

  // Key must match MASTER_API_KEY
  if (key !== MASTER_API_KEY) return false;

  // In production, block direct public browser requests attempting to bypass standard API routes
  if (process.env.NODE_ENV === 'production' && (origin || referer)) {
    // If request comes from a browser client origin, reject direct DB manipulation
    const isInternalServerCall = req.headers.get('x-internal-server') === 'true';
    if (!isInternalServerCall) {
      return false;
    }
  }

  return true;
}

// Map model names (case-insensitive) to actual Prisma delegate properties
function getPrismaModelDelegate(modelName: string) {
  if (!modelName) return null;
  const name = modelName.trim();
  const p = prisma as Record<string, any>;

  if (p[name] && typeof p[name].findMany === 'function') return p[name];

  const camelName = name.charAt(0).toLowerCase() + name.slice(1);
  if (p[camelName] && typeof p[camelName].findMany === 'function') return p[camelName];

  const aliases: Record<string, string> = {
    users: 'user',
    sellers: 'sellerProfile',
    seller: 'sellerProfile',
    brands: 'brand',
    products: 'product',
    categories: 'category',
    orders: 'order',
    orderitems: 'orderItem',
    reviews: 'review',
    coupons: 'coupon',
    disputes: 'dispute',
    wishlists: 'wishlist',
    notifications: 'notification',
    affiliates: 'affiliate',
    payouts: 'payout',
    tickets: 'supportTicket',
    supporttickets: 'supportTicket',
    qa: 'productQA',
    variants: 'productVariant',
    images: 'productImage',
  };

  const aliasTarget = aliases[name.toLowerCase()];
  if (aliasTarget && p[aliasTarget] && typeof p[aliasTarget].findMany === 'function') {
    return p[aliasTarget];
  }

  return null;
}

export async function GET(req: NextRequest) {
  if (!verifyInternalAccess(req)) {
    return NextResponse.json(
      { success: false, error: 'Access Denied: Internal server environment access only.' },
      { status: 403 }
    );
  }

  const searchParams = req.nextUrl.searchParams;
  const modelName = searchParams.get('model') || searchParams.get('table');

  if (!modelName || searchParams.get('help') === 'true') {
    return NextResponse.json({
      success: true,
      message: 'Brandyy Restricted Internal Server API v1',
      supportedModels: [
        'user',
        'sellerProfile',
        'brand',
        'product',
        'productVariant',
        'category',
        'order',
        'orderItem',
        'review',
        'coupon',
        'dispute',
        'wishlist',
        'notification',
        'affiliate',
        'payout',
        'supportTicket',
        'productQA',
      ],
    });
  }

  const delegate = getPrismaModelDelegate(modelName);
  if (!delegate) {
    return NextResponse.json(
      { success: false, error: `Model '${modelName}' not found` },
      { status: 400 }
    );
  }

  try {
    const take = parseInt(searchParams.get('take') || '50', 10);
    const skip = parseInt(searchParams.get('skip') || '0', 10);

    const [data, total] = await Promise.all([
      delegate.findMany({ take, skip }),
      delegate.count ? delegate.count() : Promise.resolve(0),
    ]);

    return NextResponse.json({
      success: true,
      model: modelName,
      total,
      take,
      skip,
      data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Database error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (!verifyInternalAccess(req)) {
    return NextResponse.json(
      { success: false, error: 'Access Denied: Internal server environment access only.' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { action = 'findMany', model, args = {} } = body;

    if (!model) {
      return NextResponse.json(
        { success: false, error: 'Missing required body field: "model"' },
        { status: 400 }
      );
    }

    const delegate = getPrismaModelDelegate(model);
    if (!delegate) {
      return NextResponse.json(
        { success: false, error: `Model '${model}' not found or unsupported` },
        { status: 400 }
      );
    }

    if (typeof delegate[action] !== 'function') {
      return NextResponse.json(
        { success: false, error: `Action '${action}' is not supported on model '${model}'` },
        { status: 400 }
      );
    }

    const result = await delegate[action](args);

    return NextResponse.json({
      success: true,
      action,
      model,
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to execute query' },
      { status: 500 }
    );
  }
}
