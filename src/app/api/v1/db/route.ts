import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

// Secret Master Key for Internal Server-to-Server communication only
const MASTER_API_KEY = process.env.MASTER_API_KEY || 'brandyy_master_key_2026_xyz999';

// Safe Read-only actions allowed on the internal API
const ALLOWED_ACTIONS = new Set([
  'findMany',
  'findFirst',
  'findUnique',
  'count',
  'aggregate',
  'groupBy',
]);

// Allowed models to prevent arbitrary access to internal system tables
const ALLOWED_MODELS = new Set([
  'user',
  'sellerProfile',
  'brand',
  'product',
  'productVariant',
  'productImage',
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
  'trafficLog',
  'marketingCampaign',
]);

function constantTimeCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function verifyInternalAccess(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  const headerKey = req.headers.get('x-api-key');
  const authHeader = req.headers.get('authorization');
  const bearerKey = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  const key = headerKey || bearerKey;
  if (!key || !constantTimeCompare(key, MASTER_API_KEY)) return false;

  // In production, block direct public browser requests attempting to bypass standard API routes
  if (process.env.NODE_ENV === 'production' && (origin || referer)) {
    const isInternalServerCall = req.headers.get('x-internal-server') === 'true';
    if (!isInternalServerCall) {
      return false;
    }
  }

  return true;
}

function sanitizeOutput(data: any): any {
  if (!data) return data;
  if (data instanceof Date) return data;
  if (Array.isArray(data)) {
    return data.map(sanitizeOutput);
  }
  if (typeof data === 'object') {
    const clone = { ...data };
    delete clone.passwordHash;
    delete clone.resetPasswordToken;
    delete clone.resetPasswordExpires;
    delete clone.verificationToken;
    for (const key of Object.keys(clone)) {
      if (typeof clone[key] === 'object' && clone[key] !== null) {
        clone[key] = sanitizeOutput(clone[key]);
      }
    }
    return clone;
  }
  return data;
}

// Map model names (case-insensitive) to actual Prisma delegate properties
function getPrismaModelDelegate(modelName: string) {
  if (!modelName) return null;
  const name = modelName.trim();
  const p = prisma as Record<string, any>;

  const aliases: Record<string, string> = {
    users: 'user',
    sellers: 'sellerProfile',
    seller: 'sellerProfile',
    sellerprofile: 'sellerProfile',
    brands: 'brand',
    products: 'product',
    categories: 'category',
    orders: 'order',
    orderitems: 'orderItem',
    orderitem: 'orderItem',
    reviews: 'review',
    coupons: 'coupon',
    disputes: 'dispute',
    wishlists: 'wishlist',
    notifications: 'notification',
    affiliates: 'affiliate',
    payouts: 'payout',
    tickets: 'supportTicket',
    supporttickets: 'supportTicket',
    supportticket: 'supportTicket',
    qa: 'productQA',
    productqa: 'productQA',
    variants: 'productVariant',
    productvariant: 'productVariant',
    images: 'productImage',
    productimage: 'productImage',
    trafficlogs: 'trafficLog',
    trafficlog: 'trafficLog',
  };

  let resolvedName = name;
  if (aliases[name.toLowerCase()]) {
    resolvedName = aliases[name.toLowerCase()];
  } else if (p[name]) {
    resolvedName = name;
  } else {
    const camelName = name.charAt(0).toLowerCase() + name.slice(1);
    if (p[camelName]) resolvedName = camelName;
  }

  if (!ALLOWED_MODELS.has(resolvedName)) {
    return null;
  }

  if (p[resolvedName] && typeof p[resolvedName].findMany === 'function') {
    return { delegate: p[resolvedName], resolvedName };
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
      supportedModels: Array.from(ALLOWED_MODELS),
      supportedActions: Array.from(ALLOWED_ACTIONS),
    });
  }

  const result = getPrismaModelDelegate(modelName);
  if (!result) {
    return NextResponse.json(
      { success: false, error: `Model '${modelName}' not found or unsupported` },
      { status: 400 }
    );
  }

  const { delegate, resolvedName } = result;

  try {
    const take = parseInt(searchParams.get('take') || '50', 10);
    const skip = parseInt(searchParams.get('skip') || '0', 10);

    const [data, total] = await Promise.all([
      delegate.findMany({ take: Math.min(take, 5000), skip }),
      delegate.count ? delegate.count() : Promise.resolve(0),
    ]);

    return NextResponse.json({
      success: true,
      model: resolvedName,
      total,
      take,
      skip,
      data: sanitizeOutput(data),
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

    if (!ALLOWED_ACTIONS.has(action)) {
      return NextResponse.json(
        {
          success: false,
          error: `Action '${action}' is not allowed. Only read operations are permitted.`,
        },
        { status: 403 }
      );
    }

    const result = getPrismaModelDelegate(model);
    if (!result) {
      return NextResponse.json(
        { success: false, error: `Model '${model}' not found or unsupported` },
        { status: 400 }
      );
    }

    const { delegate, resolvedName } = result;

    if (typeof delegate[action] !== 'function') {
      return NextResponse.json(
        { success: false, error: `Action '${action}' is not supported on model '${model}'` },
        { status: 400 }
      );
    }

    const queryResult = await delegate[action](args);

    return NextResponse.json({
      success: true,
      action,
      model: resolvedName,
      data: sanitizeOutput(queryResult),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to execute query' },
      { status: 500 }
    );
  }
}
