// scripts/seed-affiliate-tiers.ts
// Run once after the migration: npx tsx scripts/seed-affiliate-tiers.ts

import { seedAffiliateTiers } from '../src/lib/affiliate';

async function main() {
  console.log('Seeding affiliate tier configs...');
  await seedAffiliateTiers();
  console.log('Done! Tier configs seeded:');
  console.log('  STARTER:  0 conversions → 5% commission');
  console.log('  SILVER:  20 conversions → 6% commission');
  console.log('  GOLD:    84 conversions → 8% commission');
  console.log('  PLATINUM: 200 conversions → 12% commission');
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
