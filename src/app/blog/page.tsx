import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { blogJsonLd, jsonLdScript, type BlogArticle } from '@/lib/jsonld';

export const metadata = {
  title: 'Blog & Local Brand Stories — Brandy',
  description:
    'Discover fashion guides, seller success stories, Egyptian streetwear trends, and marketplace news on the Brandy Blog.',
};

const ARTICLES = [
  {
    slug: 'top-egyptian-streetwear-brands-2026',
    title: 'Top Egyptian Streetwear Brands You Need to Know in 2026',
    excerpt:
      'From Cairo graphic tees to oversized hoodies, local Egyptian streetwear brands are taking over. Here are the top standout creators this season.',
    category: 'Style & Trends',
    readTime: '5 min read',
    date: 'Sep 12, 2026',
    image: '👕',
  },
  {
    slug: 'how-to-scale-local-brand-egypt',
    title: 'How to Launch & Scale Your Local Fashion Brand in Egypt',
    excerpt:
      'A practical guide for independent designers: supply chain tips, customer trust, social media marketing, and listing on digital marketplaces.',
    category: 'Seller Guides',
    readTime: '8 min read',
    date: 'Sep 08, 2026',
    image: '📈',
  },
  {
    slug: 'virtual-tryon-future-of-local-shopping',
    title: 'Why Virtual AI Try-On is Changing How Egyptians Shop Online',
    excerpt:
      'How AI fitting technology helps buyers test clothes accurately, cuts down product return rates, and boosts seller sales.',
    category: 'Technology',
    readTime: '4 min read',
    date: 'Sep 01, 2026',
    image: '🤖',
  },
  {
    slug: 'behind-the-craft-alexandria-leather-artisans',
    title: 'Behind the Craft: Meet Alexandria’s Finest Leather Crafters',
    excerpt:
      'An inside look at how handcrafted leather bags and footwear are made by local artisans across Egypt.',
    category: 'Brand Stories',
    readTime: '6 min read',
    date: 'Aug 25, 2026',
    image: '👞',
  },
];

export default function BlogPage() {
  const schema = blogJsonLd(ARTICLES as BlogArticle[]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--background))] via-white to-[hsl(var(--accent)/0.06)] text-[hsl(var(--foreground))]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(schema) }}
      />
      <Navbar />

      {/* Hero Header */}
      <section className="py-16 px-4 text-center max-w-4xl mx-auto">
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[hsl(var(--primary)/0.08)] text-[hsl(var(--primary))] text-xs font-extrabold uppercase tracking-wider mb-4 border border-[hsl(var(--primary)/0.15)]">
          📰 Brandy Journal & News
        </span>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 leading-tight">
          Stories, Guides & <br />
          <span className="text-[hsl(var(--primary))]">Egyptian Local Brand Culture</span>
        </h1>
        <p className="mt-4 text-gray-600 text-base max-w-xl mx-auto leading-relaxed">
          Stay updated with local fashion trends, merchant growth tips, and news from Egypt&apos;s
          thriving brand ecosystem.
        </p>
      </section>

      {/* Articles Grid */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {ARTICLES.map((article, idx) => (
            <article
              key={idx}
              className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col justify-between hover:shadow-2xl transition-all group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="text-xs font-bold px-3 py-1 bg-gray-100 text-gray-700 rounded-full">
                    {article.category}
                  </span>
                  <span className="text-xs text-gray-400">{article.readTime}</span>
                </div>
                <div className="text-4xl mb-4 p-4 rounded-2xl bg-[hsl(var(--primary)/0.06)] w-fit border border-[hsl(var(--primary)/0.12)]">
                  {article.image}
                </div>
                <h2 className="text-xl font-bold text-gray-900 group-hover:text-[hsl(var(--primary))] transition-colors leading-snug">
                  {article.title}
                </h2>
                <p className="text-xs text-gray-500 mt-3 leading-relaxed">{article.excerpt}</p>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs">
                <span className="text-gray-400">{article.date}</span>
                <span className="font-bold text-[hsl(var(--primary))] group-hover:underline">
                  Read Article →
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-gray-200 bg-white py-6 text-center text-gray-500 text-xs">
        <p>© {new Date().getFullYear()} Brandy Marketplace. All rights reserved.</p>
      </footer>
    </div>
  );
}
