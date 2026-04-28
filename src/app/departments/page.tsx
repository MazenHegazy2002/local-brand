import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export default async function DepartmentsPage() {
  const categories = await prisma.category.findMany({
    include: { 
      products: { where: { published: true }, select: { id: true } }
    },
    orderBy: { name: 'asc' }
  });

  const totalProducts = categories.reduce((acc, cat) => acc + cat.products.length, 0);

  return (
    <main className="min-h-screen bg-[hsl(var(--background))]">
      <Navbar />
      <div className="container py-12 md:py-24">
        <div className="mb-12">
          <h1 className="text-4xl md:text-6xl font-serif font-bold text-white mb-4">
            All <span className="text-[hsl(var(--accent))]">Departments</span>
          </h1>
          <p className="text-white/50 text-lg max-w-2xl">
            Browse through all our product categories and discover local brands across {categories.length} departments.
          </p>
          <div className="mt-4 text-white/70 text-sm">
            {totalProducts} products across {categories.length} departments
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {categories.map((cat: any) => (
            <Link
              key={cat.id}
              href={`/category/${cat.slug}`}
              className="group block p-6 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:bg-white/10 hover:border-[hsl(var(--accent))]/50 transition-all duration-300"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-[hsl(var(--accent))]/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  {cat.name.toLowerCase().includes('electronic') ? '⚡' :
                   cat.name.toLowerCase().includes('fashion') ? '👔' :
                   cat.name.toLowerCase().includes('home') ? '🏠' :
                   cat.name.toLowerCase().includes('health') ? '💊' :
                   cat.name.toLowerCase().includes('sport') ? '⚽' :
                   cat.name.toLowerCase().includes('grocery') ? '🛒' : '📦'}
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-bold text-lg group-hover:text-[hsl(var(--accent))] transition-colors">
                    {cat.name}
                  </h3>
                  <p className="text-white/50 text-sm">{cat.products.length} products</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/30 text-xs">View department →</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/30 group-hover:text-[hsl(var(--accent))] group-hover:translate-x-1 transition-all">
                  <path d="M6 12l4-4-4-4"/>
                </svg>
              </div>
            </Link>
          ))}
        </div>

        {categories.length === 0 && (
          <div className="text-center py-24 glass rounded-3xl border border-white/5">
            <div className="text-6xl mb-4">🏪</div>
            <h2 className="text-2xl font-serif text-white/50 mb-2">No departments yet</h2>
            <p className="text-white/30">Categories will appear here once added to the database.</p>
          </div>
        )}
      </div>
    </main>
  );
}
