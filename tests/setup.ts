/* eslint-disable @typescript-eslint/no-require-imports */
// Polyfill global TextEncoder/TextDecoder, ReadableStream and Request/Response/Headers for Next.js under Jest Node environment
const { TextEncoder: UtilTextEncoder, TextDecoder: UtilTextDecoder } = require('util');
global.TextEncoder = global.TextEncoder || UtilTextEncoder;
global.TextDecoder = global.TextDecoder || UtilTextDecoder;

const { ReadableStream: StreamReadableStream } = require('node:stream/web');
global.ReadableStream = global.ReadableStream || StreamReadableStream;

const {
  Request: UndiciRequest,
  Response: UndiciResponse,
  Headers: UndiciHeaders,
} = require('undici');
global.Request = global.Request || UndiciRequest;
global.Response = global.Response || UndiciResponse;
global.Headers = global.Headers || UndiciHeaders;

// Test setup file
import '@testing-library/jest-dom';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: null, status: 'unauthenticated' }),
  signIn: jest.fn(),
  signOut: jest.fn(),
}));

// Mock the Redis client globally so tests don't try to connect to a real
// Redis server (which we don't run in CI). Each test that cares about
// Redis behavior overrides this mock locally.
jest.mock('@/lib/redis', () => ({
  redis: {
    get: jest.fn(async () => null),
    set: jest.fn(async () => 'OK'),
    del: jest.fn(async () => 0),
    incr: jest.fn(async () => 1),
    expire: jest.fn(async () => 1),
    scan: jest.fn(async () => ['0', []]),
    ping: jest.fn(async () => 'PONG'),
    publish: jest.fn(async () => 0),
    subscribe: jest.fn(),
    on: jest.fn(),
    quit: jest.fn(),
    hset: jest.fn(),
    hget: jest.fn(),
    hgetall: jest.fn(async () => ({})),
    hdel: jest.fn(),
  },
}));

// Default Prisma client mock. Individual tests can call
// `(prisma.<model>.<method> as jest.Mock).mockResolvedValue(...)` directly
// to stub specific responses. Every model/method that any test in this
// project might touch has to be present here — Jest's per-file `jest.mock`
// overrides don't always reliably replace this `setupFilesAfterEnv` mock
// (factory resolution order varies with the Next.js Jest transformer),
// so we keep a single union surface.
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    sellerProfile: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      upsert: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    productVariant: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    productImage: { create: jest.fn(), findMany: jest.fn() },
    order: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    },
    orderItem: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    },
    payout: {
      create: jest.fn(),
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
    cartItem: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
    address: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    category: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    coupon: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    couponUsage: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn() },
    loyaltyTransaction: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn() },
    review: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), aggregate: jest.fn() },
    productQA: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    dispute: { create: jest.fn(), findMany: jest.fn() },
    wishlist: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    notification: {
      create: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    auditLog: { create: jest.fn(), findMany: jest.fn() },
    homepageBanner: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    supportTicket: { findMany: jest.fn(), create: jest.fn() },
    returnRequest: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    shipment: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    conversation: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    message: { create: jest.fn() },
    passwordResetToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    verificationToken: { deleteMany: jest.fn() },
    systemSettings: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
    tag: { findMany: jest.fn(), create: jest.fn(), delete: jest.fn() },
    collection: { findMany: jest.fn(), create: jest.fn(), delete: jest.fn() },
    affiliate: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    affiliateTierConfig: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      create: jest.fn(),
    },
    affiliateGlobalSettings: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    promoCodeUsage: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    commission: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    affiliateReferral: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    affiliateBonus: {
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    affiliatePayout: {
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn((fn: any) =>
      Array.isArray(fn) ? Promise.all(fn) : typeof fn === 'function' ? fn({}) : Promise.resolve(fn)
    ),
    $queryRaw: jest.fn(),
    $disconnect: jest.fn(),
  },
}));
