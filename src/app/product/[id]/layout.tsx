import type { Metadata, ResolvingMetadata } from 'next';
import { prisma } from '@/lib/prisma';
import { PLATFORM_URL } from '@/lib/constants';

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { id } = await params;

  // Pull only what metadata needs — title, slug-friendly description, and the
  // primary image. Anything missing falls back to the parent layout's defaults.
  let product: {
    title: string;
    slug: string;
    description: string;
    images: { url: string; isPrimary: boolean }[];
  } | null = null;
  try {
    product = await prisma.product.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        published: true,
        deletedAt: null,
      },
      select: {
        title: true,
        slug: true,
        description: true,
        images: { select: { url: true, isPrimary: true } },
      },
    });
  } catch {
    // DB unavailable during build / dev — fall through to parent metadata.
  }

  if (!product) {
    return { title: 'Product Not Found | Brandy' };
  }

  const primaryImage = product.images.find(i => i.isPrimary)?.url || product.images[0]?.url;
  const description = product.description.slice(0, 160);
  const previousImages = (await parent).openGraph?.images || [];
  const url = `${PLATFORM_URL}/product/${product.slug}`;

  return {
    title: `${product.title} | Brandy Egypt`,
    description,
    openGraph: {
      title: product.title,
      description,
      url,
      siteName: 'Brandy',
      images: primaryImage
        ? [{ url: primaryImage, width: 800, height: 800, alt: product.title }, ...previousImages]
        : previousImages,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: product.title,
      description,
      images: primaryImage ? [primaryImage] : undefined,
    },
  };
}

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
