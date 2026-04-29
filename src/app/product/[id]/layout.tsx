import { Metadata, ResolvingMetadata } from 'next';
import { MOCK_PRODUCTS } from '@/lib/data'; // Currently using mock data for demo SSR

type Props = {
  params: Promise<{ id: string }>
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { id } = await params;
  const product = MOCK_PRODUCTS.find(p => String(p.id) === id);

  if (!product) {
    return {
      title: 'Product Not Found | Local Brand',
    };
  }

  const previousImages = (await parent).openGraph?.images || [];

  return {
    title: `${product.name} | Local Brand Egypt`,
    description: product.description.substring(0, 160),
    openGraph: {
      title: product.name,
      description: product.description.substring(0, 160),
      url: `https://localbrand-egypt.com/product/${id}`,
      siteName: 'LocalBrand',
      images: [
        {
          url: product.image,
          width: 800,
          height: 800,
          alt: product.name,
        },
        ...previousImages,
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description: product.description.substring(0, 160),
      images: [product.image],
    },
  };
}

export default function ProductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
