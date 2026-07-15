// Server component — loads legal page content from the CMS (Page model).
// Falls back to the provided staticContent if the DB record doesn't exist yet.
// The admin can edit the content at /admin-os → Pages.

import { prisma } from '@/lib/prisma';
import { PageStatus } from '@/generated/client';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SessionUser } from '@/types';

interface Props {
  /** DB slug for this legal page, e.g. "legal-privacy-policy" */
  dbSlug: string;
  /** Fallback HTML to render when the DB record hasn't been seeded yet */
  staticContent: React.ReactNode;
  /** Page heading shown in the breadcrumb fallback */
  staticTitle: string;
}

// Thin markdown renderer — mirrors the one in /p/[slug]/page.tsx
function renderMarkdown(md: string): string {
  const escape = (s: string) =>
    s.replace(
      /[&<>"']/g,
      m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m] as string
    );

  const inline = (s: string) =>
    s
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  const lines = md.split(/\r?\n/);
  const out: string[] = [];
  let inList: 'ul' | 'ol' | null = null;
  let para: string[] = [];

  const flushPara = () => {
    if (para.length) {
      out.push(`<p>${inline(para.join(' '))}</p>`);
      para = [];
    }
  };
  const flushList = () => {
    if (inList) {
      out.push(`</${inList}>`);
      inList = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line) {
      flushPara();
      flushList();
      continue;
    }
    const h = line.match(/^(#{1,6})\s+(.*)/);
    if (h) {
      flushPara();
      flushList();
      const level = h[1].length;
      out.push(`<h${level}>${inline(escape(h[2]))}</h${level}>`);
      continue;
    }
    const ul = line.match(/^[-*]\s+(.*)/);
    if (ul) {
      flushPara();
      if (inList !== 'ul') {
        flushList();
        out.push('<ul>');
        inList = 'ul';
      }
      out.push(`<li>${inline(escape(ul[1]))}</li>`);
      continue;
    }
    const ol = line.match(/^\d+\.\s+(.*)/);
    if (ol) {
      flushPara();
      if (inList !== 'ol') {
        flushList();
        out.push('<ol>');
        inList = 'ol';
      }
      out.push(`<li>${inline(escape(ol[1]))}</li>`);
      continue;
    }
    flushList();
    para.push(escape(line));
  }
  flushPara();
  flushList();
  return out.join('\n');
}

export default async function LegalPageLoader({
  dbSlug,
  staticContent,
  staticTitle: _staticTitle,
}: Props) {
  const session = await getServerSession(authOptions);
  const isAdmin = (session?.user as SessionUser | undefined)?.role === 'ADMIN';

  // Try to load from the CMS
  let cmsContent: string | null = null;
  let cmsTitle: string | null = null;
  try {
    const page = await prisma.page.findUnique({ where: { slug: dbSlug } });
    if (page && page.status === PageStatus.PUBLISHED) {
      cmsContent = renderMarkdown(page.bodyEn);
      cmsTitle = page.titleEn;
    }
  } catch {
    // DB unavailable — fall through to static
  }

  if (cmsContent) {
    return (
      <div className="min-h-screen bg-[#faf9f6]">
        <Navbar />
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <div className="mb-8">
            <Link href="/legal" className="text-sm text-[#1e3b8a] hover:underline mb-4 block">
              ← Back to Legal
            </Link>
            <h1 className="text-4xl font-black text-gray-900 mb-2">{cmsTitle}</h1>
            {isAdmin && (
              <p className="text-xs text-gray-400">
                Content managed via Admin → Pages (slug: <code>{dbSlug}</code>)
              </p>
            )}
          </div>
          <div className="bg-white rounded-2xl p-8 border border-[#e8dfd1] shadow-sm">
            <div
              className="prose prose-slate max-w-none"
              dangerouslySetInnerHTML={{ __html: cmsContent }}
            />
          </div>
        </div>
        <style>{`
          .prose h2 { font-size: 1.4rem; font-weight: 700; margin-top: 2rem; margin-bottom: 0.75rem; }
          .prose h3 { font-size: 1.15rem; font-weight: 600; margin-top: 1.5rem; margin-bottom: 0.5rem; }
          .prose p  { margin-bottom: 1rem; color: #4b5563; line-height: 1.75; }
          .prose ul, .prose ol { margin-left: 1.5rem; margin-bottom: 1rem; }
          .prose li { margin-bottom: 0.4rem; color: #4b5563; }
          .prose code { background: #f1f5f9; padding: 2px 5px; border-radius: 4px; font-size: 0.875rem; }
          .prose a { color: #1e3b8a; text-decoration: underline; }
          .prose strong { font-weight: 700; }
        `}</style>
      </div>
    );
  }

  // Static fallback — renders the original hardcoded content
  return <>{staticContent}</>;
}
