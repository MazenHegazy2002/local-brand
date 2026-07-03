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
import Navbar from '@/components/Navbar';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { headers } from 'next/headers';
import ProductCard from '@/components/ProductCard';
import { getDictionary } from '@/lib/i18n/server';
import { en } from '@/lib/i18n/dicts';

interface PageProps {
  params: Promise<{ slug: string }>;
}

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

async function fetchProductsByCategory(categorySlug: string, limit: number) {
  try {
    return await prisma.product.findMany({
      where: {
        category: { slug: categorySlug },
        published: true,
      },
      take: limit,
      include: {
        images: true,
        seller: { select: { storeName: true } },
      },
    });
  } catch (e) {
    console.error('Error fetching CMS block products:', e);
    return [];
  }
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

// ── Visual Block Components ────────────────────────────────────────────────

function CmsHeroBlock({ title, description, bgImage, btnText, btnLink }: any) {
  return (
    <div
      className="relative bg-slate-900 text-white rounded-3xl overflow-hidden py-16 px-8 md:px-12 my-8 border border-slate-800 text-center md:text-left flex flex-col md:flex-row items-center gap-8 shadow-md"
      style={
        bgImage
          ? {
              backgroundImage: `linear-gradient(to right, rgba(15, 23, 42, 0.8), rgba(15, 23, 42, 0.6)), url(${bgImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : {}
      }
    >
      <div className="max-w-xl space-y-4 relative z-10">
        <h2 className="text-3xl md:text-4xl font-black leading-tight">{title}</h2>
        {description && (
          <p className="text-sm md:text-base text-slate-350 leading-relaxed">{description}</p>
        )}
        {btnText && btnLink && (
          <a
            href={btnLink}
            className="inline-block bg-[#1e3b8a] hover:bg-blue-800 text-white text-xs md:text-sm font-bold py-3 px-6 rounded-xl transition shadow-sm"
          >
            {btnText}
          </a>
        )}
      </div>
    </div>
  );
}

function CmsRichTextBlock({ content }: any) {
  const rendered = naiveMarkdownToHtml(content || '');
  const safeHtml = sanitizeHtml(rendered);
  return (
    <div
      className="cms-body my-8 leading-relaxed text-slate-650"
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
}

function CmsBannerBlock({ emoji, message }: any) {
  return (
    <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl flex items-start gap-4 my-6 shadow-sm">
      {emoji && <span className="text-2xl shrink-0">{emoji}</span>}
      <p className="text-sm font-medium text-slate-705 leading-relaxed">{message}</p>
    </div>
  );
}

function CmsProductGridBlock({ title, products, dict }: any) {
  if (!products || products.length === 0) return null;
  return (
    <div className="my-10">
      {title && <h2 className="text-lg font-black text-slate-900 mb-6">{title}</h2>}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.map((p: any, idx: number) => (
          <ProductCard
            key={p.id}
            product={{
              ...p,
              name: p.title,
              image: p.images[0]?.url,
              brand: p.seller?.storeName || dict.Brandy || 'Local Brand',
              brandSlug: p.seller?.storeName
                ? p.seller.storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
                : '',
            }}
            index={idx}
          />
        ))}
      </div>
    </div>
  );
}

function CmsFeatureGridBlock({ items }: any) {
  if (!items || items.length === 0) return null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-10">
      {items.map((item: any, idx: number) => (
        <div
          key={idx}
          className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-center shadow-sm"
        >
          {item.emoji && (
            <div className="w-12 h-12 rounded-full bg-blue-50 text-[#1e3b8a] flex items-center justify-center text-xl font-bold mx-auto mb-4">
              {item.emoji}
            </div>
          )}
          <h3 className="font-bold text-slate-900 text-base mb-2">{item.title}</h3>
          {item.description && (
            <p className="text-xs text-slate-500 leading-relaxed">{item.description}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function CmsFaqBlock({ items }: any) {
  if (!items || items.length === 0) return null;
  return (
    <div className="my-10 space-y-4">
      {items.map((item: any, idx: number) => (
        <details
          key={idx}
          className="group bg-white rounded-2xl border border-slate-100 p-6 [&_summary::-webkit-details-marker]:hidden cursor-pointer transition hover:border-slate-200"
        >
          <summary className="flex items-center justify-between gap-4 font-bold text-slate-900 text-sm md:text-base">
            <span>{item.question}</span>
            <span className="transition group-open:-rotate-180 text-[#1e3b8a]">▼</span>
          </summary>
          <p className="mt-4 text-xs md:text-sm text-slate-650 leading-relaxed pr-6">
            {item.answer}
          </p>
        </details>
      ))}
    </div>
  );
}

// ── Main Page Renderer ─────────────────────────────────────────────────────

export default async function CmsPage({ params }: PageProps) {
  const { slug } = await params;
  const page = await loadPage(slug);
  if (!page) notFound();

  const reqHeaders = await headers();
  const lang = reqHeaders.get('x-lang') || 'en';
  const body = lang === 'ar' ? page.bodyAr || page.bodyEn : page.bodyEn;
  const title = lang === 'ar' ? page.titleAr || page.titleEn : page.titleEn;

  let dict = en;
  try {
    const d = await getDictionary();
    if (d) dict = d;
  } catch {}

  let blocks: any[] | null = null;
  if (body && body.trim().startsWith('[')) {
    try {
      blocks = JSON.parse(body);
    } catch (e) {
      console.error('Failed to parse CMS blocks JSON:', e);
    }
  }

  // If parsed blocks correctly, resolve categories on the server side
  const resolvedBlocks = [];
  if (blocks && Array.isArray(blocks)) {
    for (const block of blocks) {
      if (block.type === 'productGrid' && block.categorySlug) {
        const products = await fetchProductsByCategory(block.categorySlug, block.limit || 4);
        resolvedBlocks.push({ ...block, products });
      } else {
        resolvedBlocks.push(block);
      }
    }
  }

  if (resolvedBlocks.length > 0) {
    return (
      <main className="cms-blocks-page min-h-screen bg-slate-50/50 pb-16">
        <Navbar />
        <div className="max-w-5xl mx-auto px-4 py-8">
          <header className="mb-8">
            <h1 className="text-3xl md:text-4xl font-black text-slate-900">{title}</h1>
          </header>
          <div className="space-y-4">
            {resolvedBlocks.map((block: any, idx: number) => {
              switch (block.type) {
                case 'hero':
                  return <CmsHeroBlock key={idx} {...block} />;
                case 'richtext':
                  return <CmsRichTextBlock key={idx} {...block} />;
                case 'banner':
                  return <CmsBannerBlock key={idx} {...block} />;
                case 'productGrid':
                  return <CmsProductGridBlock key={idx} {...block} dict={dict} />;
                case 'featureGrid':
                  return <CmsFeatureGridBlock key={idx} {...block} />;
                case 'faq':
                  return <CmsFaqBlock key={idx} {...block} />;
                default:
                  return null;
              }
            })}
          </div>
        </div>
      </main>
    );
  }

  const rendered = naiveMarkdownToHtml(body || '');
  const safeHtml = sanitizeHtml(rendered);

  return (
    <main className="cms-page">
      <Navbar />
      <article>
        <h1>{title}</h1>
        <div className="cms-body" dangerouslySetInnerHTML={{ __html: safeHtml }} />
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
