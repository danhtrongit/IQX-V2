/**
 * Seed script: Đưa toàn bộ mã CK + ngành vào DB
 * Nguồn: KBS (symbols) + VCI (ICB) + KBS (sectors)
 *
 * Chạy: npx tsx src/scripts/seed-stocks.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import axios from 'axios';

const DEFAULT_HEADERS = {
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9,vi-VN;q=0.8,vi;q=0.7',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-cache',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
};

const KBS_HEADERS = { ...DEFAULT_HEADERS };
const VCI_HEADERS = {
  ...DEFAULT_HEADERS,
  Referer: 'https://trading.vietcap.com.vn/',
  Origin: 'https://trading.vietcap.com.vn/',
};

const KBS_EXCHANGE_MAP: Record<string, string> = {
  HSX: 'HOSE',
  HNX: 'HNX',
  UPCOM: 'UPCOM',
};

async function main() {
  console.log('🚀 Bắt đầu seed dữ liệu chứng khoán...\n');

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    // ===== 1. Fetch KBS sectors =====
    console.log('📦 [1/4] Fetching KBS sectors...');
    const sectorsRaw = await axios.get(
      'https://kbbuddywts.kbsec.com.vn/iis-server/investment/sector/all',
      { headers: KBS_HEADERS, timeout: 15000 },
    );
    const sectors: any[] = sectorsRaw.data || [];
    console.log(`  → ${sectors.length} ngành`);

    // ===== 2. Fetch KBS all symbols =====
    console.log('📦 [2/4] Fetching KBS symbols...');
    const symbolsRaw = await axios.get(
      'https://kbbuddywts.kbsec.com.vn/iis-server/investment/stock/search/data',
      { headers: KBS_HEADERS, timeout: 15000 },
    );
    const kbsSymbols: any[] = symbolsRaw.data || [];
    console.log(`  → ${kbsSymbols.length} mã từ KBS`);

    // ===== 3. Fetch KBS sector → stock mapping =====
    console.log('📦 [3/4] Fetching sector-stock mapping...');
    const sectorStockMap = new Map<string, { code: string; name: string }>();

    for (const sector of sectors) {
      try {
        const res = await axios.get(
          `https://kbbuddywts.kbsec.com.vn/iis-server/investment/sector/stock?code=${sector.code}&l=1`,
          { headers: KBS_HEADERS, timeout: 10000 },
        );
        const stocks = res.data?.stocks || [];
        for (const s of stocks) {
          const sym = s.sb || s.SB;
          if (sym) {
            sectorStockMap.set(sym.toUpperCase(), {
              code: String(sector.code),
              name: sector.name,
            });
          }
        }
      } catch {
        // Skip failed sector
      }
    }
    console.log(`  → Mapped ${sectorStockMap.size} mã → ngành`);

    // ===== 4. Fetch VCI ICB =====
    console.log('📦 [4/4] Fetching VCI ICB classification...');
    const icbQuery = `{
  CompaniesListingInfo {
    ticker organName enOrganName icbName3 enIcbName3
    icbCode1 icbCode2 icbCode3 icbCode4 comTypeCode __typename
  }
}`;
    const icbMap = new Map<
      string,
      {
        icbCode1: string;
        icbCode2: string;
        icbCode3: string;
        icbCode4: string;
        icbName3: string;
        enIcbName3: string;
        comTypeCode: string;
        organName: string;
        enOrganName: string;
      }
    >();

    try {
      const icbRes = await axios.post(
        'https://trading.vietcap.com.vn/data-mt/graphql',
        { query: icbQuery, variables: {} },
        { headers: VCI_HEADERS, timeout: 15000 },
      );
      const icbList: any[] = icbRes.data?.data?.CompaniesListingInfo || [];
      for (const item of icbList) {
        icbMap.set(item.ticker?.toUpperCase(), {
          icbCode1: item.icbCode1,
          icbCode2: item.icbCode2,
          icbCode3: item.icbCode3,
          icbCode4: item.icbCode4,
          icbName3: item.icbName3,
          enIcbName3: item.enIcbName3,
          comTypeCode: item.comTypeCode,
          organName: item.organName,
          enOrganName: item.enOrganName,
        });
      }
      console.log(`  → ${icbMap.size} mã có ICB`);
    } catch (err: any) {
      console.warn(
        `  ⚠ VCI ICB fetch failed: ${err.message}. Tiếp tục không có ICB.`,
      );
    }

    // ===== Upsert sectors =====
    console.log('\n💾 Saving sectors...');
    let sectorCount = 0;
    for (const sector of sectors) {
      await prisma.sector.upsert({
        where: { code: String(sector.code) },
        update: { name: sector.name },
        create: { code: String(sector.code), name: sector.name },
      });
      sectorCount++;
    }
    console.log(`  ✅ ${sectorCount} sectors saved`);

    // ===== Upsert stocks =====
    console.log('💾 Saving stocks...');
    let stockCount = 0;
    let skipped = 0;

    for (const item of kbsSymbols) {
      const symbol = item.symbol?.toUpperCase();
      if (!symbol) {
        skipped++;
        continue;
      }

      const sectorInfo = sectorStockMap.get(symbol);
      const icbInfo = icbMap.get(symbol);
      const exchange =
        KBS_EXCHANGE_MAP[item.exchange] || item.exchange || 'UNKNOWN';

      const data = {
        name: icbInfo?.organName || item.name || symbol,
        nameEn: icbInfo?.enOrganName || item.nameEn || null,
        exchange,
        type: item.type || 'stock',
        sectorCode: sectorInfo?.code || null,
        sectorName: sectorInfo?.name || null,
        icbCode1: icbInfo?.icbCode1 || null,
        icbCode2: icbInfo?.icbCode2 || null,
        icbCode3: icbInfo?.icbCode3 || null,
        icbCode4: icbInfo?.icbCode4 || null,
        icbName3: icbInfo?.icbName3 || null,
        enIcbName3: icbInfo?.enIcbName3 || null,
        comTypeCode: icbInfo?.comTypeCode || null,
      };

      await prisma.stock.upsert({
        where: { symbol },
        update: data,
        create: { symbol, ...data },
      });
      stockCount++;

      if (stockCount % 200 === 0) {
        console.log(`  → ${stockCount}/${kbsSymbols.length} ...`);
      }
    }

    console.log(`  ✅ ${stockCount} stocks saved (${skipped} skipped)`);

    // ===== Create default ArenaSettings =====
    console.log('💾 Creating default Arena settings...');
    await prisma.arenaSettings.upsert({
      where: { id: 'default' },
      update: {},
      create: {
        id: 'default',
        buyFeeRate: 0.0015,
        sellFeeRate: 0.0015,
        sellTaxRate: 0.001,
        tPlusDays: 0,
        initialBalance: 1000000000,
        isActive: true,
      },
    });
    console.log('  ✅ Arena settings created');

    // ===== Summary =====
    const totalStocks = await prisma.stock.count();
    const totalSectors = await prisma.sector.count();
    const byExchange = await prisma.stock.groupBy({
      by: ['exchange'],
      _count: true,
    });

    console.log('\n📊 === SUMMARY ===');
    console.log(`  Tổng mã CK: ${totalStocks}`);
    console.log(`  Tổng ngành: ${totalSectors}`);
    console.log(`  Có ICB: ${icbMap.size}`);
    console.log('  Theo sàn:');
    for (const ex of byExchange) {
      console.log(`    ${ex.exchange}: ${ex._count} mã`);
    }
    console.log('\n✅ Seed hoàn tất!');
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
