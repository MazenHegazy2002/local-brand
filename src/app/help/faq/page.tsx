import type { Metadata } from 'next';
import { faqJsonLd, jsonLdScript } from '@/lib/jsonld';
import FAQClient, { FAQ_DATA } from './FAQClient';

export const metadata: Metadata = {
  title: 'FAQ — Help Center | Brandy',
  description:
    "Find answers to common questions about orders, shipping, returns, payments, and selling on Brandy — Egypt's marketplace for local sellers.",
};

/** Flatten all FAQ entries for the schema.org FAQPage structured data */
function buildFaqItems() {
  return Object.values(FAQ_DATA)
    .flat()
    .map(({ q, a }) => ({ question: q, answer: a }));
}

export default function FAQPage() {
  const schema = faqJsonLd({ items: buildFaqItems() });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(schema) }}
      />
      <FAQClient />
    </>
  );
}
