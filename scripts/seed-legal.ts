import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding legal CMS pages to database...');

  const pages = [
    {
      slug: 'legal-terms',
      titleEn: 'Terms of Service',
      bodyEn: `# Terms of Service

Welcome to Brandy Egypt. By accessing or using our marketplace, you agree to be bound by these Terms of Service and all applicable Egyptian laws and regulations.

## 1. Acceptance of Terms
By creating an account or making a purchase on Brandy, you agree to these terms and our Privacy Policy.

## 2. User Accounts
You are responsible for maintaining the security of your account. You may not share your credentials or register multiple accounts.

## 3. Prohibited Activities
Users may not list counterfeit goods, engage in price manipulation, or misrepresent product descriptions.

## 4. Dispute Resolution
All disputes between buyers and sellers shall be mediated by Brandy. Our decision is final and binding per Egyptian Commercial Law.

## 5. Governing Law
These terms are governed by the laws of the Arab Republic of Egypt.`,
      status: 'PUBLISHED' as const,
    },
    {
      slug: 'legal-privacy-policy',
      titleEn: 'Privacy Policy',
      bodyEn: `# Privacy Policy

Brandy Egypt is committed to protecting your personal data in compliance with Egypt's Personal Data Protection Law (Law No. 151 of 2020).

## Data We Collect
- Account information (name, email, phone)
- Order and transaction history
- Delivery addresses
- Browsing behavior on our platform

## How We Use Your Data
- To process orders and payments
- To communicate order updates
- To personalize your shopping experience

## Your Rights
You have the right to access, correct, and delete your personal data. Use our Data Export feature in Account Settings.

## Data Retention
Order data is retained for 7 years per Egyptian tax law. Personal data is anonymized upon account deletion.`,
      status: 'PUBLISHED' as const,
    },
    {
      slug: 'legal-returns-refunds',
      titleEn: 'Returns & Refunds',
      bodyEn: `# Return Policy

## 14-Day Return Window
All items may be returned within 14 days of delivery for a full refund, provided they are in original condition with all tags attached.

## Non-Returnable Items
Customized, personalized, or hygiene-sensitive products are not eligible for returns.

## Return Process
1. Go to your Order History
2. Select the item and click "Request Return"
3. Upload photos of the item
4. Ship the item via any courier
5. Refund processed within 5-7 business days of seller confirmation

## Refund Method
Refunds are returned to the original payment method or credited to your Brandy wallet.`,
      status: 'PUBLISHED' as const,
    },
    {
      slug: 'legal-shipping-policy',
      titleEn: 'Shipping Policy',
      bodyEn: `# Shipping Policy

We ship to all governorates of Egypt using premium courier partners.

## Transit Times
- Greater Cairo & Giza: 2-3 business days
- Alexandria & Delta: 3-4 business days
- Upper Egypt & Sinai: 4-6 business days

## Shipping Fees
Fees are calculated automatically at checkout based on your delivery governorate. Enjoy free shipping on orders above 1500 EGP.`,
      status: 'PUBLISHED' as const,
    },
    {
      slug: 'legal-seller-terms',
      titleEn: 'Seller Terms',
      bodyEn: `# Seller Agreement

## Seller Obligations
By becoming a Brandy seller, you agree to:
- List only authentic, accurately described products
- Fulfill orders within 2 business days of confirmation
- Accept returns per Brandy's return policy
- Maintain a seller rating above 3.5 stars

## Commission Structure
Brandy charges a 15% commission on every successful sale. Payouts are processed 7-14 days post-delivery.

## Prohibited Listings
Counterfeit goods, hazardous materials, and items banned under Egyptian law are strictly prohibited.

## Account Suspension
Brandy reserves the right to suspend seller accounts for policy violations, poor performance metrics, or fraudulent activity.

## Tax Obligations
Sellers are responsible for declaring income and paying applicable taxes under Egyptian tax law.`,
      status: 'PUBLISHED' as const,
    },
  ];

  for (const page of pages) {
    await prisma.page.upsert({
      where: { slug: page.slug },
      create: page,
      update: {
        titleEn: page.titleEn,
        bodyEn: page.bodyEn,
        status: page.status,
      },
    });
    console.log(`✅ Upserted CMS Page: ${page.slug} (${page.titleEn})`);
  }

  console.log('🎉 Legal pages seeded successfully!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
