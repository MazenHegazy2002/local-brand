import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@/generated/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * Category landing pages API
 * GET /api/categories — list all categories with product counts
 * GET /api/categories?slug=fashion — get category + subcategories + products
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get('slug');
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(24, parseInt(searchParams.get('limit') || '12'));
  const sort = searchParams.get('sort') || 'newest';
  const session = await getServerSession(authOptions);
  const isAuthenticated = !!session;

  try {
    if (slug) {
      // Single category with products
      const category = await prisma.category.findUnique({
        where: { slug },
        include: { children: true },
      });

      if (!category) return NextResponse.json({ message: 'Category not found' }, { status: 404 });

      const where: Prisma.ProductWhereInput = {
        categoryId: category.id,
        published: true,
        deletedAt: null,
      };
      const orderBy: Prisma.ProductOrderByWithRelationInput = ({
        newest: { createdAt: 'desc' },
        price_asc: { basePrice: 'asc' },
        price_desc: { basePrice: 'desc' },
        featured: { isFeatured: 'desc' },
      }[sort as string] as Prisma.ProductOrderByWithRelationInput) || {
        createdAt: 'desc' as const,
      };

      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy,
          include: {
            images: { where: { isPrimary: true } },
            seller: { select: { storeName: true } },
            _count: { select: { reviews: true } },
          },
        }),
        prisma.product.count({ where }),
      ]);

      // Public-safe category view: strip internal IDs for guests
      const safeCategory = isAuthenticated
        ? category
        : { name: category.name, slug: category.slug, nameAr: (category as any).nameAr };

      const safeSubcategories = isAuthenticated
        ? category.children
        : category.children.map(c => ({ name: c.name, slug: c.slug }));

      return NextResponse.json({
        category: safeCategory,
        subcategories: safeSubcategories,
        products,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    }

    // All categories with product counts — exclude empty ones and test placeholders
    const allCategories = await prisma.category.findMany({
      where: { parentId: null }, // only top-level
      include: {
        children: true,
        _count: { select: { products: { where: { published: true, deletedAt: null } } } },
      },
      orderBy: { name: 'asc' },
    });

    // Filter out categories with zero products and any test/placeholder categories
    const categories = allCategories.filter(
      cat =>
        cat._count.products > 0 &&
        cat.name.toLowerCase() !== 'testcategory' &&
        !cat.name.toLowerCase().startsWith('test')
    );

    // Strip internal IDs for unauthenticated requests
    const safeCategories = isAuthenticated
      ? categories
      : categories.map(cat => ({
          name: cat.name,
          slug: cat.slug,
          nameAr: (cat as any).nameAr,
          count: cat._count.products,
          children: cat.children.map(c => ({ name: c.name, slug: c.slug })),
        }));

    return NextResponse.json({ categories: safeCategories });
  } catch (_error) {
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
