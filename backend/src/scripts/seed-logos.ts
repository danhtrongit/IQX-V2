/**
 * Seed Logo: Cập nhật logoUrl cho tất cả mã CK từ Simplize CDN
 * Pattern: https://cdn.simplize.vn/simplizevn/logo/{SYMBOL}.jpeg
 *
 * Tối ưu:
 * - Batch processing với concurrency pool (20 concurrent requests)
 * - HTTP HEAD check để verify logo tồn tại trước khi lưu
 * - Batch upsert thay vì từng row
 *
 * Chạy: npx tsx src/scripts/seed-logos.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import axios from 'axios';

const CDN_BASE = 'https://cdn.simplize.vn/simplizevn/logo';
const CONCURRENCY = 20;
const BATCH_SIZE = 100;

async function checkLogoExists(symbol: string): Promise<string | null> {
  const url = `${CDN_BASE}/${symbol}.jpeg`;
  try {
    const resp = await axios.head(url, {
      timeout: 5000,
      validateStatus: (status) => status < 500,
    });
    return resp.status === 200 ? url : null;
  } catch {
    return null;
  }
}

async function processBatch<T, R>(
  items: T[],
  concurrency: number,
  processor: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const currentIndex = index++;
      results[currentIndex] = await processor(items[currentIndex]);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

async function main() {
  console.log('🖼️  Bắt đầu seed logo CK từ Simplize CDN...\n');

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const stocks = await prisma.stock.findMany({
      select: { id: true, symbol: true, logoUrl: true },
      orderBy: { symbol: 'asc' },
    });

    // Filter: chỉ xử lý mã chưa có logo
    const needLogo = stocks.filter((s) => !s.logoUrl);
    const alreadyHave = stocks.length - needLogo.length;

    console.log(`📊 Tổng mã: ${stocks.length}`);
    console.log(`✅ Đã có logo: ${alreadyHave}`);
    console.log(`🔍 Cần kiểm tra: ${needLogo.length}`);
    console.log(`⚡ Concurrency: ${CONCURRENCY}\n`);

    let found = 0;
    let notFound = 0;
    let processed = 0;

    // Batch update buffer
    const updateBuffer: { id: string; logoUrl: string }[] = [];

    const _results = await processBatch(
      needLogo,
      CONCURRENCY,
      async (stock) => {
        const logoUrl = await checkLogoExists(stock.symbol);
        processed++;

        if (logoUrl) {
          found++;
          updateBuffer.push({ id: stock.id, logoUrl });
        } else {
          notFound++;
        }

        if (processed % 100 === 0 || processed === needLogo.length) {
          const pct = ((processed / needLogo.length) * 100).toFixed(1);
          console.log(
            `  → ${processed}/${needLogo.length} (${pct}%) | ✅ ${found} | ❌ ${notFound}`,
          );
        }

        return logoUrl;
      },
    );

    // Batch update DB
    if (updateBuffer.length > 0) {
      console.log(
        `\n💾 Đang lưu ${updateBuffer.length} logo vào DB (batch ${BATCH_SIZE})...`,
      );

      for (let i = 0; i < updateBuffer.length; i += BATCH_SIZE) {
        const batch = updateBuffer.slice(i, i + BATCH_SIZE);
        await Promise.all(
          batch.map((item) =>
            prisma.stock.update({
              where: { id: item.id },
              data: { logoUrl: item.logoUrl },
            }),
          ),
        );

        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(updateBuffer.length / BATCH_SIZE);
        console.log(`  → Batch ${batchNum}/${totalBatches} saved`);
      }
    }

    // Summary
    const totalWithLogo = await prisma.stock.count({
      where: { logoUrl: { not: null } },
    });

    console.log('\n📊 === SUMMARY ===');
    console.log(`  Tổng mã CK: ${stocks.length}`);
    console.log(
      `  Có logo: ${totalWithLogo} (${((totalWithLogo / stocks.length) * 100).toFixed(1)}%)`,
    );
    console.log(`  Mới tìm thấy: ${found}`);
    console.log(`  Không có logo: ${notFound}`);
    console.log('\n✅ Seed logo hoàn tất!');
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('❌ Seed logo failed:', err);
  process.exit(1);
});
