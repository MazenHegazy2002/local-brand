// Public CMS page renderer.
//
// Pages live in the Page Prisma model and are managed at /admin-os →
// Pages. Drafts return 404; published pages render their bodyEn (or
// bodyAr if the request is RTL) through the shared sanitizer.
//
// SEO: page-level seoTitle/seoDescription/ogImageUrl override the
// catalog defaults from `admin-settings-registry.ts`.
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { sanitizeHtml } from '@/lib/utils';
import { PageStatus } from '@/generated/client';

interface PageProps {
  params: Promise<{ slug: string }>;
}

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

async function loadPage(slug: string) {
  const page = await prisma.page.findUnique({
    where: { slug },
  });
  if (!page) return null;
  if (page.status !== PageStatus.PUBLISHED) {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'ADMIN') {
      return null;
    }
  }
  return page;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await loadPage(slug);
  if (!page) return { title: 'Not found' };
  return {
    title: page.seoTitle || page.titleEn,
    description: page.seoDescription || undefined,
    openGraph: {
      title: page.seoTitle || page.titleEn,
      description: page.seoDescription || undefined,
      images: page.ogImageUrl ? [page.ogImageUrl] : undefined,
    },
  };
}

export default async function CmsPage({ params }: PageProps) {
  const { slug } = await params;
  const page = await loadPage(slug);
  if (!page) notFound();

  // Naïve markdown-to-HTML: convert headings, bold, italic, paragraphs.
  // For full markdown we'd pull in `marked`/`remark`, but that's overkill
  // for what's basically static-page bodies. The sanitizer hardens against
  // anything sketchy.
  const rendered = naiveMarkdownToHtml(page.bodyEn);
  const safeHtml = sanitizeHtml(rendered);

  return (
    <main className="cms-page">
      <article>
        <h1>{page.titleEn}</h1>
        <div
          className="cms-body"
          // The HTML here is sanitized via DOMPurify. New blocks added to
          // the markdown emitter must be safe under DOMPurify's default
          // allowlist (see lib/utils.ts).
          dangerouslySetInnerHTML={{ __html: safeHtml }}
        />
      </article>

      <style>{`
        .cms-page { max-width: 720px; margin: 0 auto; padding: 48px 24px; }
        .cms-page h1 {
          font-size: 32px; font-weight: 700; color: hsl(var(--foreground));
          margin-bottom: 24px;
        }
        .cms-body { font-size: 16px; line-height: 1.75; color: hsl(var(--foreground)); }
        .cms-body h2 { font-size: 22px; font-weight: 700; margin-top: 32px; margin-bottom: 12px; }
        .cms-body h3 { font-size: 18px; font-weight: 600; margin-top: 24px; margin-bottom: 8px; }
        .cms-body p { margin-bottom: 16px; }
        .cms-body ul, .cms-body ol { margin-left: 24px; margin-bottom: 16px; }
        .cms-body li { margin-bottom: 6px; }
        .cms-body a { color: hsl(var(--primary)); text-decoration: underline; }
        .cms-body code { background: hsl(var(--muted)); padding: 2px 6px; border-radius: 4px; font-size: 14px; }
      `}</style>
    </main>
  );
}

/**
 * Tiny markdown emitter — covers headings, bold, italic, links, lists,
 * paragraphs. Anything unrecognized is HTML-escaped. The output runs
 * through `sanitizeHtml` before reaching the DOM, so even a sloppy
 * rule here can't introduce an XSS surface.
 */
function naiveMarkdownToHtml(md: string): string {
  // Escape HTML special chars first, so any literal `<` in the source
  // doesn't get interpreted as a tag.
  const escape = (s: string) =>
    s.replace(
      /[&<>"']/g,
      m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m] as string
    );

  const lines = md.split(/\r?\n/);
  const out: string[] = [];
  let inList: 'ul' | 'ol' | null = null;
  let para: string[] = [];

  const flushPara = () => {
    if (para.length) {
      const inline = inlineMd(para.join(' '));
      out.push(`<p>${inline}</p>`);
      para = [];
    }
  };
  const flushList = () => {
    if (inList) {
      out.push(`</${inList}>`);
      inList = null;
    }
  };

  for (const line of lines) {
    if (/^### /.test(line)) {
      flushPara();
      flushList();
      out.push(`<h3>${inlineMd(escape(line.slice(4)))}</h3>`);
    } else if (/^## /.test(line)) {
      flushPara();
      flushList();
      out.push(`<h2>${inlineMd(escape(line.slice(3)))}</h2>`);
    } else if (/^# /.test(line)) {
      flushPara();
      flushList();
      out.push(`<h1>${inlineMd(escape(line.slice(2)))}</h1>`);
    } else if (/^- /.test(line) || /^\* /.test(line)) {
      flushPara();
      if (inList !== 'ul') {
        flushList();
        out.push('<ul>');
        inList = 'ul';
      }
      out.push(`<li>${inlineMd(escape(line.slice(2)))}</li>`);
    } else if (/^\d+\. /.test(line)) {
      flushPara();
      if (inList !== 'ol') {
        flushList();
        out.push('<ol>');
        inList = 'ol';
      }
      out.push(`<li>${inlineMd(escape(line.replace(/^\d+\. /, '')))}</li>`);
    } else if (line.trim() === '') {
      flushPara();
      flushList();
    } else {
      flushList();
      para.push(escape(line));
    }
  }
  flushPara();
  flushList();
  return out.join('\n');

  function inlineMd(s: string): string {
    return s
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
        // Only allow http(s) and root-relative links — reject javascript: etc.
        const safe = /^(https?:\/\/|\/)/.test(href);
        if (!safe) return label;
        return `<a href="${href}" rel="noopener">${label}</a>`;
      });
  }
}
