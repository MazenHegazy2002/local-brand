// Run: npx tsx scripts/test-recovery.ts
// Validates that the backup API is healthy and the response is structurally sound.
// Point at your app with: NEXT_PUBLIC_APP_URL=https://lolozozo.shop npx tsx scripts/test-recovery.ts

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
const SECRET = process.env.CRON_SECRET ?? 'dev';

const REQUIRED_TABLES = ['users', 'products', 'orders', 'categories', 'sellerProfiles'];

async function main() {
  console.log(`\n🔍 Testing backup endpoint at ${BASE}/api/cron/backup`);
  console.log(
    `   Auth: Bearer ${SECRET.slice(0, 4)}${'*'.repeat(Math.max(0, SECRET.length - 4))}\n`
  );

  let res: Response;
  try {
    res = await fetch(`${BASE}/api/cron/backup`, {
      headers: { authorization: `Bearer ${SECRET}` },
    });
  } catch (e) {
    console.error('❌ FAIL — could not reach the endpoint:', (e as Error).message);
    console.error('   Is the dev server running? (npm run dev)');
    process.exit(1);
  }

  if (!res.ok) {
    const text = await res.text();
    console.error(`❌ FAIL — HTTP ${res.status}: ${text}`);
    process.exit(1);
  }

  const data = (await res.json()) as {
    success: boolean;
    exportedAt: string;
    rowCounts: Record<string, number>;
    blobUrl: string | null;
    storage: string;
    durationMs: number;
  };

  if (!data.success) {
    console.error('❌ FAIL — response.success is false:', data);
    process.exit(1);
  }

  console.log('Table row counts:');
  console.log('─'.repeat(36));
  for (const [table, count] of Object.entries(data.rowCounts ?? {})) {
    const ok = typeof count === 'number' && count >= 0;
    console.log(`  ${ok ? '✅' : '❌'}  ${table.padEnd(20)} ${count}`);
  }
  console.log('─'.repeat(36));

  const missing = REQUIRED_TABLES.filter(t => !(t in (data.rowCounts ?? {})));
  if (missing.length > 0) {
    console.error(`\n❌ FAIL — missing expected tables: ${missing.join(', ')}`);
    process.exit(1);
  }

  console.log(`\nStorage : ${data.storage}`);
  console.log(`Blob URL: ${data.blobUrl ?? '(not stored — BLOB_READ_WRITE_TOKEN not set)'}`);
  console.log(`Duration: ${data.durationMs}ms`);
  console.log(`Exported: ${data.exportedAt}`);
  console.log('\n✅ PASS — backup endpoint is healthy.\n');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
