import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import {
  ElectronicsIcon, FashionIcon, HomeIcon, HealthIcon, SportsIcon, GroceryIcon,
  AccessoriesIcon, AppliancesIcon, AutoIcon, BeautyIcon, BooksIcon, FootwearIcon,
  FurnitureIcon, GardenIcon, JewelryIcon, KidsIcon, MenIcon, PetsIcon, PharmaIcon,
  ToysIcon, WomenIcon,
} from '@/components/icons';

type CategoryWithProducts = {
  id: string;
  name: string;
  slug: string;
  products: { id: string }[];
};

// Same icon mapping as the CategoriesBar so the listing matches the navbar.
function iconFor(name: string) {
  const lower = name.toLowerCase().trim();
  if (lower === 'accessories' || lower.includes('accessor') || lower.includes('watch') || lower.includes('bag')) return <AccessoriesIcon />;
  if (lower === 'appliances' || lower.includes('applian') || lower.includes('machine')) return <AppliancesIcon />;
  if (lower === 'auto' || lower.includes('auto') || lower.includes('car') || lower.includes('vehicle')) return <AutoIcon />;
  if (lower === 'beauty' || lower.includes('beaut') || lower.includes('cosmetic') || lower.includes('makeup')) return <BeautyIcon />;
  if (lower === 'books' || lower.includes('book') || lower.includes('novel') || lower.includes('magazine')) return <BooksIcon />;
  if (lower === 'electronics' || lower.includes('electron') || lower.includes('phone') || lower.includes('laptop')) return <ElectronicsIcon />;
  if (lower === 'footwear' || lower.includes('footwear') || lower.includes('shoe') || lower.includes('boot') || lower.includes('sandal')) return <FootwearIcon />;
  if (lower === 'furniture' || lower.includes('furni') || lower.includes('sofa') || lower.includes('chair')) return <FurnitureIcon />;
  if (lower === 'garden' || lower.includes('garden') || lower.includes('plant') || lower.includes('flower')) return <GardenIcon />;
  if (lower === 'groceries' || lower === 'grocery' || lower.includes('grocer') || lower.includes('food')) return <GroceryIcon />;
  if (lower === 'health' || lower.includes('health') || lower.includes('wellness') || lower.includes('fitness')) return <HealthIcon />;
  if (lower === 'home' || lower.includes('home') || lower.includes('decor') || lower.includes('kitchen')) return <HomeIcon />;
  if (lower === 'jewelry' || lower === 'jewellery' || lower.includes('jewel') || lower.includes('ring') || lower.includes('necklace')) return <JewelryIcon />;
  if (lower === 'kids' || lower.includes('kid') || lower.includes('child') || lower.includes('baby')) return <KidsIcon />;
  if (lower === 'men' || lower.includes('men') || lower.includes('shirt') || lower.includes('trouser')) return <MenIcon />;
  if (lower === 'pets' || lower.includes('pet') || lower.includes('dog') || lower.includes('cat')) return <PetsIcon />;
  if (lower === 'pharma' || lower === 'pharmacy' || lower.includes('pharm') || lower.includes('medicine')) return <PharmaIcon />;
  if (lower === 'sports' || lower === 'sport' || lower.includes('sport') || lower.includes('gym')) return <SportsIcon />;
  if (lower === 'toys' || lower.includes('toy') || lower.includes('game') || lower.includes('play')) return <ToysIcon />;
  if (lower === 'women' || lower.includes('women') || lower.includes('woman') || lower.includes('lady') || lower.includes('dress')) return <WomenIcon />;
  if (lower === 'fashion' || lower.includes('fashion')) return <FashionIcon />;
  return <GroceryIcon />;
}

export default async function CategoriesIndexPage() {
  const categories = await prisma.category.findMany({
    include: {
      products: { where: { published: true }, select: { id: true } },
    },
    orderBy: { name: 'asc' },
  });

  const totalProducts = categories.reduce((acc, c) => acc + c.products.length, 0);

  return (
    <main className="min-h-screen bg-[hsl(var(--background))]">
      <Navbar />

      <div className="container mx-auto px-4 py-10 md:py-14">
        <div className="mb-10">
          <p className="text-xs uppercase tracking-[0.2em] text-[hsl(var(--accent))] font-semibold mb-2">Browse</p>
          <h1 className="text-4xl md:text-5xl font-black text-[hsl(var(--foreground))] mb-3">
            All <span className="text-[hsl(var(--primary))]">Categories</span>
          </h1>
          <p className="text-[hsl(var(--muted-foreground))] text-base max-w-2xl">
            Explore every category on Brandy. {totalProducts.toLocaleString()} products across{' '}
            {categories.length} categories from verified Egyptian sellers.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {categories.map((cat: CategoryWithProducts) => (
            <Link
              key={cat.id}
              href={`/category/${cat.slug}`}
              className="group flex flex-col items-center justify-center gap-3 p-5 bg-white rounded-2xl border border-[hsl(var(--border))] hover:border-[hsl(var(--primary))] hover:shadow-md transition-all"
            >
              <div className="w-14 h-14 rounded-2xl bg-[hsl(var(--primary)/0.08)] flex items-center justify-center text-[hsl(var(--primary))] group-hover:bg-[hsl(var(--primary))] group-hover:text-white transition-colors">
                {iconFor(cat.name)}
              </div>
              <div className="text-center">
                <h3 className="text-sm font-bold text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--primary))] transition-colors">
                  {cat.name}
                </h3>
                <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">
                  {cat.products.length} {cat.products.length === 1 ? 'product' : 'products'}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {categories.length === 0 && (
          <div className="text-center py-24 bg-white rounded-3xl border border-[hsl(var(--border))]">
            <div className="text-6xl mb-4">🏪</div>
            <h2 className="text-2xl font-bold text-[hsl(var(--foreground))] mb-2">No categories yet</h2>
            <p className="text-[hsl(var(--muted-foreground))]">Categories will appear here once added to the database.</p>
          </div>
        )}
      </div>
    </main>
  );
}
