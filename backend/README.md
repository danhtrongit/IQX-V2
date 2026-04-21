# IQX Backend

Backend API cho nen tang phan tich chung khoan IQX - Cung cap cong cu phan tich chung khoan chuyen sau, bieu do ky thuat, du lieu tai chinh va tin tuc thi truong chung khoan Viet Nam theo thoi gian thuc.

## Kien truc

- **Framework**: NestJS 11
- **Database**: PostgreSQL + Prisma ORM
- **Cache**: Redis (ioredis + cache-manager)
- **Auth**: JWT
- **Docs**: Swagger (tai `/docs`)

## Cau truc du an

```
src/
  common/              # Shared logic (guards, filters, interceptors, services)
    constants/         # Data source configs, mappings, messages
    services/          # ProxyHttpService (HTTP client cho cac nguon du lieu)
    modules/           # Redis cache, rate limiter
  modules/
    auth/              # Xac thuc JWT
    users/             # Quan ly nguoi dung
    payments/          # Thanh toan SePay
    listing/           # Danh sach ma chung khoan, nganh
    quote/             # Gia lich su OHLCV, khop lenh intraday
    company/           # Ho so cong ty
    financial/         # Bao cao tai chinh
    trading/           # Bang gia realtime, chi so, sector signals
    stocks/            # Metadata co phieu (DB)
    arena/             # Giao dich ao
    chat/              # Chat cong dong
    ai-news/           # Tin tuc AI
    ai-insight/        # Phan tich AI
    ai-dashboard/      # Dashboard AI
    market-data/       # Cac API market-data mo rong
      reference/       # Tim kiem, su kien, trang thai thi truong
      fundamental/     # BCTC, chi so tai chinh
      macro/           # Du lieu vi mo (GDP, CPI, FX, lai suat)
      analysis/        # Top stocks, khoi ngoai, screener
      valuation/       # PE/PB thi truong, thong ke gia
      international/   # Dukascopy, Binance
      funds/           # Quy dau tu (FMARKET)
  prisma/              # Prisma service
```

## Nguon du lieu

| Source     | Vai tro chinh                                |
|------------|----------------------------------------------|
| VCI        | OHLCV, intraday, ICB, events, screener       |
| KBS        | Bang gia, OHLCV, tape, BCTC                  |
| MAS        | OHLCV, tape, trang thai thi truong, BCTC     |
| VNDIRECT   | Top stocks, khoi ngoai, PE/PB thi truong     |
| MBK        | Du lieu vi mo (GDP, CPI, FX, lai suat)       |
| Simplize   | Gia hang hoa OHLCV                           |
| FMARKET    | Quy dau tu, NAV history                      |
| Dukascopy  | Forex/commodity candles quoc te              |
| Binance    | Crypto klines, order book, ticker 24h        |

## Cai dat

```bash
npm install
cp .env.example .env
# Sua cac bien moi truong trong .env
npx prisma generate
npx prisma db push
```

## Chay

```bash
npm run start:dev    # Development
npm run build        # Build
npm run start:prod   # Production
```

## Test

```bash
npm test                      # Unit tests
npm test -- --runInBand       # Sequential
npm run test:e2e              # E2E tests
npm run lint                  # ESLint
```

## API Docs

Sau khi chay server, truy cap: `http://localhost:3001/docs`
