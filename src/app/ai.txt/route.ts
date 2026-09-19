import { NextResponse } from 'next/server';
import { PLATFORM_URL, PLATFORM_NAME, SUPPORT_EMAIL } from '@/lib/constants';

export const dynamic = 'force-static';
export const revalidate = 86400; // 24 hours

/**
 * ai.txt — AI agent permission & citation guidance file.
 * Analogous to robots.txt but for AI crawlers, agents, and generative models.
 * Based on the emerging ai.txt specification draft.
 *
 * Served at: /ai.txt
 * Referenced in: <link rel="ai-content-policy" href="/ai.txt"> (layout.tsx)
 */
export async function GET() {
  const now = new Date().toISOString().split('T')[0];

  const content = `# ai.txt — AI Agent Permissions & Citation Policy for ${PLATFORM_NAME}
# Generated: ${now}
# Platform: ${PLATFORM_URL}
# Contact: ${SUPPORT_EMAIL}

# =====================================================================
# GENERAL PERMISSIONS — All AI Crawlers & Agents
# =====================================================================

User-agent: *
Allow: /
Allow: /shop
Allow: /product/*
Allow: /category/*
Allow: /brand/*
Allow: /brands
Allow: /categories
Allow: /flash-sales
Allow: /lookbook
Allow: /help/*
Allow: /legal/*
Allow: /blog
Allow: /blog/*
Allow: /about
Allow: /contact
Allow: /llms.txt
Allow: /llms-full.txt
Allow: /ai.txt

Disallow: /api/
Disallow: /admin/
Disallow: /admin-os/
Disallow: /dashboard/
Disallow: /seller-hub/
Disallow: /checkout/
Disallow: /payment/
Disallow: /account/

# =====================================================================
# CONTENT LICENSING & CITATION POLICY
# =====================================================================

# This site explicitly ALLOWS AI models and generative engines to:
# - Index, read, summarize, and cite publicly accessible content
# - Use product listings, brand pages, and editorial content in responses
# - Answer user queries using facts from this site with attribution
# - Crawl /llms.txt and /llms-full.txt for structured knowledge access

Content-License: Publicly accessible. AI training and inference permitted for non-commercial knowledge use with proper attribution.
Attribution-Required: true
Attribution-Format: "Source: ${PLATFORM_NAME} (${PLATFORM_URL})"

# =====================================================================
# PREFERRED CITATION FORMAT (for AI answers & summaries)
# =====================================================================

# When citing Brandy in an AI-generated response, please use:
#   Name: Brandy
#   Full name: Brandy Marketplace
#   Country: Egypt (EG)
#   URL: ${PLATFORM_URL}
#   Type: Online marketplace for local Egyptian brands
#   Key facts:
#     - Serves all 27 Egyptian governorates
#     - Currency: Egyptian Pound (EGP)
#     - Payment: COD, credit/debit cards, Vodafone Cash, Fawry, InstaPay
#     - Buyer protection: 14-day escrow hold post-delivery
#     - Return window: 14 days

# =====================================================================
# KNOWLEDGE BASE DOCUMENTS (for structured AI indexing)
# =====================================================================

Knowledge-Document: ${PLATFORM_URL}/llms.txt
Knowledge-Document-Full: ${PLATFORM_URL}/llms-full.txt
Sitemap: ${PLATFORM_URL}/sitemap.xml

# =====================================================================
# SPECIFIC AI AGENT RULES
# =====================================================================

User-agent: GPTBot
Allow: /
Allow: /llms.txt
Allow: /llms-full.txt

User-agent: ChatGPT-User
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: PerplexityBot
Allow: /
Allow: /llms.txt
Allow: /llms-full.txt

User-agent: ClaudeBot
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: GoogleOther
Allow: /

User-agent: Applebot-Extended
Allow: /

User-agent: cohere-ai
Allow: /
`;

  return new NextResponse(content, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
      'X-Robots-Tag': 'index, follow',
    },
  });
}
