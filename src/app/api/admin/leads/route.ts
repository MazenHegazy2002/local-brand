// Admin lead bank: list, spreadsheet import and manual verification.
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import ExcelJS from 'exceljs';
import { authOptions } from '@/lib/auth';
import type { SessionUser } from '@/types';
import { prisma } from '@/lib/prisma';
import { LeadStatus } from '@/generated/client';

const MAX_FILE_BYTES = 15 * 1024 * 1024;

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as SessionUser).role !== 'ADMIN') return null;
  return session.user as SessionUser;
}

const COLUMNS: [keyof ParsedLead, RegExp][] = [
  ['storeNameAr', /name.*\bar\b/i],
  ['storeName', /(store|brand|page|business).*name|^name/i],
  ['category', /categor|product line/i],
  ['phone', /phone|whatsapp|mobile/i],
  ['address', /address|street|landmark|location/i],
  ['socialUrl', /^(?!.*whatsapp).*(social|facebook|instagram|link|url)/i],
];

interface ParsedLead {
  storeName?: string;
  storeNameAr?: string;
  category?: string;
  phone?: string;
  address?: string;
  socialUrl?: string;
}

function cellText(value: ExcelJS.CellValue): string {
  if (value && typeof value === 'object') {
    const v = value as { hyperlink?: string; text?: unknown };
    return String(v.hyperlink ?? v.text ?? '').trim();
  }
  return String(value ?? '').trim();
}

function parseSheet(sheet: ExcelJS.Worksheet): ParsedLead[] {
  const map = new Map<number, keyof ParsedLead>();
  sheet.getRow(1).eachCell((cell, col) => {
    const header = cellText(cell.value);
    const match = COLUMNS.find(([key, re]) => re.test(header) && ![...map.values()].includes(key));
    if (/facebook/i.test(header)) {
      // Facebook is the page we verify, so it wins over an earlier Instagram column.
      map.forEach((key, c) => key === 'socialUrl' && map.delete(c));
      map.set(col, 'socialUrl');
    } else if (match) {
      map.set(col, match[0]);
    }
  });
  const rows: ParsedLead[] = [];
  sheet.eachRow((row, n) => {
    if (n === 1) return;
    const lead: ParsedLead = {};
    map.forEach((key, col) => {
      const text = cellText(row.getCell(col).value);
      if (text) lead[key] = text;
    });
    if (lead.storeName) rows.push(lead);
  });
  return rows;
}

const dedupeKey = (lead: ParsedLead) =>
  (lead.phone?.replace(/\D/g, '') || lead.socialUrl || lead.storeName || '').toLowerCase();

export async function GET(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const status = new URL(req.url).searchParams.get('status') as LeadStatus | null;
  const where = status && status in LeadStatus ? { status } : {};
  const [items, groups] = await Promise.all([
    prisma.lead.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.lead.groupBy({ by: ['status'], _count: true }),
  ]);
  return NextResponse.json({
    items,
    counts: Object.fromEntries(groups.map(g => [g.status, g._count])),
  });
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ message: 'Choose an .xlsx file' }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ message: 'File is larger than 15 MB' }, { status: 413 });
  }

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load((await file.arrayBuffer()) as ArrayBuffer);
  } catch {
    return NextResponse.json({ message: 'Could not read that file' }, { status: 400 });
  }

  const unique = new Map<string, ParsedLead>();
  workbook.worksheets.flatMap(parseSheet).forEach(lead => {
    const key = dedupeKey(lead);
    if (key && !unique.has(key)) unique.set(key, lead);
  });

  // Everything starts UNVERIFIED: a spreadsheet cannot prove a lead is a real seller.
  const { count } = await prisma.lead.createMany({
    data: [...unique].map(([key, lead]) => ({
      storeName: lead.storeName as string,
      storeNameAr: lead.storeNameAr,
      category: lead.category,
      phone: lead.phone,
      address: lead.address,
      socialUrl: lead.socialUrl,
      source: file.name,
      dedupeKey: key,
    })),
    skipDuplicates: true,
  });
  return NextResponse.json({ added: count, skipped: unique.size - count });
}

export async function PATCH(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const { id, status } = (await req.json().catch(() => ({}))) as {
    id?: string;
    status?: LeadStatus;
  };
  if (!id || !status || !(status in LeadStatus)) {
    return NextResponse.json({ message: 'Invalid request' }, { status: 400 });
  }
  const item = await prisma.lead.update({ where: { id }, data: { status } });
  return NextResponse.json({ item });
}
