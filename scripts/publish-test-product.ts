import 'dotenv/config';
import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Locating category and seller profile...');

  // Get or create category
  let category = await prisma.category.findFirst();
  if (!category) {
    category = await prisma.category.create({
      data: {
        name: 'Uncategorized',
        slug: 'uncategorized',
      },
    });
    console.log('✅ Created fallback category:', category.name);
  } else {
    console.log('✅ Found category:', category.name);
  }

  // Get or create seller
  let sellerUser = await prisma.user.findUnique({
    where: { email: 'seller@seller.com' },
    include: { sellerProfile: true },
  });

  if (!sellerUser) {
    // If seller@seller.com is missing, fetch first seller profile
    const profile = await prisma.sellerProfile.findFirst({
      include: { user: true },
    });
    if (profile) {
      sellerUser = profile.user as any;
      sellerUser!.sellerProfile = profile;
    }
  }

  if (!sellerUser || !sellerUser.sellerProfile) {
    // Let's create a seller
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash('seller1234', 12);
    const user = await prisma.user.create({
      data: {
        email: 'seller@seller.com',
        name: 'Seller Account',
        passwordHash,
        role: 'SELLER',
        emailVerified: new Date(),
      },
    });
    const profile = await prisma.sellerProfile.create({
      data: {
        userId: user.id,
        storeName: 'Demo Store',
        status: 'ACTIVE',
      },
    });
    sellerUser = { ...user, sellerProfile: profile } as any;
    console.log('✅ Created fallback seller account:', sellerUser.email);
  } else {
    // Ensure the seller profile is active
    if (sellerUser.sellerProfile.status !== 'ACTIVE') {
      await prisma.sellerProfile.update({
        where: { id: sellerUser.sellerProfile.id },
        data: { status: 'ACTIVE' },
      });
      console.log('✅ Activated seller profile:', sellerUser.sellerProfile.storeName);
    } else {
      console.log('✅ Found active seller profile:', sellerUser.sellerProfile.storeName);
    }
  }

  const timestamp = Date.now();
  const slug = `test-product-${timestamp}`;
  const title = 'test';

  console.log(`🚀 Publishing product "${title}" for 200 EGP...`);

  const product = await prisma.product.create({
    data: {
      title,
      slug,
      description: 'This is a published test product.',
      basePrice: 200,
      published: true,
      categoryId: category.id,
      sellerId: sellerUser.sellerProfile.id,
      variants: {
        create: {
          sku: `test-sku-${timestamp}`,
          title: 'Default',
          attributes: '{}',
          price: 200,
          stockCount: 100,
        },
      },
      images: {
        create: {
          url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=600&auto=format&fit=crop',
          isPrimary: true,
        },
      },
    },
    include: {
      variants: true,
      images: true,
      category: true,
      seller: true,
    },
  });

  console.log('🎉 Product successfully published!');
  console.log('----------------------------------------');
  console.log('ID:        ', product.id);
  console.log('Title:     ', product.title);
  console.log('Price:     ', product.basePrice, 'EGP');
  console.log('Slug:      ', product.slug);
  console.log('Seller:    ', product.seller.storeName);
  console.log('Category:  ', product.category.name);
  console.log('Link:      ', `https://www.lolozozo.shop/product/${product.slug}`);
  console.log('----------------------------------------');
}

main()
  .catch(err => {
    console.error('❌ Failed to publish product:', err);
  })
  .finally(() => prisma.$disconnect());
