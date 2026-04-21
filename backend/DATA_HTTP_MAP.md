# Bản đồ HTTP trực tiếp: tham chiếu, giao dịch, cơ bản, vĩ mô, phân tích và định giá

Ngày kiểm tra thực tế: **2026-04-20**

Tài liệu này chỉ mô tả **request HTTP trực tiếp**. Toàn bộ URL, tham số, header và mẫu phản hồi bên dưới đều được gom lại để bạn có thể gọi thẳng bằng **Node.js** hoặc bất kỳ HTTP client nào khác.

File được tổ chức theo 6 nhóm:

- Dữ Liệu Tham Chiếu
- Dữ Liệu Giao Dịch
- Dữ Liệu Cơ Bản
- Dữ Liệu Vĩ Mô & Hàng Hóa
- Phân Tích Chuyên Sâu
- Thống Kê & Định Giá

## 0. Cách dùng chung

### 0.1. Header theo từng nguồn

```js
export const HEADERS = {
  VCI: {
    Accept: "application/json, text/plain, */*",
    "Content-Type": "application/json",
    Referer: "https://trading.vietcap.com.vn/",
    Origin: "https://trading.vietcap.com.vn/",
    "User-Agent": "Mozilla/5.0"
  },

  VCI_SCREENER: {
    Accept: "application/json",
    "Accept-Language": "en-US,en;q=0.9,vi;q=0.8",
    "Content-Type": "application/json",
    Referer: "https://trading.vietcap.com.vn/",
    Origin: "https://trading.vietcap.com.vn",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-site",
    "User-Agent": "Mozilla/5.0"
  },

  KBS: {
    Accept: "application/json, text/plain, */*",
    "Content-Type": "application/json",
    Referer: "https://kbbuddywts.kbsec.com.vn/",
    Origin: "https://kbbuddywts.kbsec.com.vn",
    "User-Agent": "Mozilla/5.0"
  },

  KBS_POST: {
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9,vi;q=0.8",
    Connection: "keep-alive",
    "Content-Type": "application/json",
    DNT: "1",
    Referer: "https://kbbuddywts.kbsec.com.vn/",
    Origin: "https://kbbuddywts.kbsec.com.vn",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
    "User-Agent": "Mozilla/5.0",
    "x-lang": "vi"
  },

  KBS_DERIVATIVE_POST: {
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9,vi;q=0.8",
    Connection: "keep-alive",
    "Content-Type": "application/json",
    DNT: "1",
    Referer: "https://kbbuddywts.kbsec.com.vn/DER",
    Origin: "https://kbbuddywts.kbsec.com.vn",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
    "User-Agent": "Mozilla/5.0",
    "x-lang": "vi"
  },

  MAS: {
    Accept: "application/json, text/plain, */*",
    "Content-Type": "application/json",
    Referer: "https://masboard.masvn.com",
    Origin: "https://masboard.masvn.com",
    "User-Agent": "Mozilla/5.0"
  },

  MBK: {
    Accept: "application/json, text/plain, */*",
    Referer: "https://data.maybanktrade.com.vn",
    Origin: "https://data.maybanktrade.com.vn",
    "User-Agent": "Mozilla/5.0"
  },

  FMARKET: {
    Accept: "application/json, text/plain, */*",
    "Content-Type": "application/json",
    Referer: "https://fmarket.vn/",
    Origin: "https://fmarket.vn/",
    "User-Agent": "Mozilla/5.0"
  },

  VND: {
    Accept: "application/json, text/plain, */*",
    Referer: "https://mkw.vndirect.com.vn",
    Origin: "https://mkw.vndirect.com.vn",
    "User-Agent": "Mozilla/5.0"
  },

  DUKASCOPY: {
    Accept: "application/json, text/plain, */*",
    Referer: "https://widgets.dukascopy.com/en/historical-data-export",
    Origin: "https://widgets.dukascopy.com",
    "User-Agent": "Mozilla/5.0"
  },

  FXSB: {
    Accept: "*/*",
    Referer: "https://data.forexsb.com/data-app",
    Origin: "https://data.forexsb.com",
    "User-Agent": "Mozilla/5.0"
  },

  BINANCE: {
    Accept: "application/json, text/plain, */*",
    "User-Agent": "Mozilla/5.0"
  },

  CAFEF: {
    Accept: "application/json, text/plain, */*",
    Referer: "https://s.cafef.vn/lich-su-giao-dich-vnindex-3.chn",
    Origin: "https://s.cafef.vn",
    "User-Agent": "Mozilla/5.0"
  }
};
```

### 0.2. Helper Node.js dùng cho JSON

```js
export async function requestJson(url, { method = "GET", headers = {}, query, body } = {}) {
  const finalUrl = new URL(url);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (Array.isArray(value)) {
        for (const item of value) finalUrl.searchParams.append(key, String(item));
      } else if (value !== undefined && value !== null) {
        finalUrl.searchParams.set(key, String(value));
      }
    }
  }

  const res = await fetch(finalUrl, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await res.text();
  let data;

  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return {
    status: res.status,
    headers: Object.fromEntries(res.headers.entries()),
    data
  };
}
```

### 0.3. Helper Node.js cho file nhị phân / gzip

```js
import { gunzipSync } from "node:zlib";

export async function requestBuffer(url, { headers = {} } = {}) {
  const res = await fetch(url, { headers });
  const arrayBuffer = await res.arrayBuffer();
  return {
    status: res.status,
    buffer: Buffer.from(arrayBuffer)
  };
}

export function maybeGunzip(buffer) {
  if (buffer[0] === 0x1f && buffer[1] === 0x8b) {
    return gunzipSync(buffer);
  }
  return buffer;
}
```

## 1. Dữ Liệu Tham Chiếu

## 1.1. VCI / Vietcap

### A. Danh sách toàn bộ mã

- Method: `GET`
- URL: `https://trading.vietcap.com.vn/api/price/symbols/getAll`
- Query: không có
- Headers: dùng `HEADERS.VCI`

Mẫu phản hồi:

```json
[
  {
    "id": 8425620,
    "symbol": "YTC",
    "type": "STOCK",
    "board": "UPCOM",
    "enOrganName": "Ho Chi Minh City Medical Import Export Joint Stock Company",
    "organName": "Công ty Cổ phần Xuất nhập khẩu Y tế Thành phố Hồ Chí Minh",
    "productGrpID": "UPX",
    "icbCode2": "4500"
  }
]
```

Node.js:

```js
const res = await requestJson(
  "https://trading.vietcap.com.vn/api/price/symbols/getAll",
  { headers: HEADERS.VCI }
);
```

### B. Danh sách theo nhóm

- Method: `GET`
- URL: `https://trading.vietcap.com.vn/api/price/symbols/getByGroup`
- Query:
  - `group=VN30`
  - `group=HOSE`
  - `group=ETF`
  - `group=CW`
  - `group=BOND`
  - `group=FU_INDEX`
  - `group=FU_BOND`

Mẫu phản hồi:

```json
[
  { "symbol": "ACB" },
  { "symbol": "BID" }
]
```

Kết quả kiểm tra thực tế:

- `ETF` trả về kiểu:

```json
[
  { "symbol": "E1VFVN30" },
  { "symbol": "FUEABVND" }
]
```

- `BOND` trả về kiểu:

```json
[
  { "symbol": "BAB123032" },
  { "symbol": "BAB124015" }
]
```

- `FU_BOND` trả về kiểu:

```json
[
  { "symbol": "41B5G6000" },
  { "symbol": "41B5G9000" }
]
```

- `CW` trả về kiểu:

```json
[
  { "symbol": "CACB2510" },
  { "symbol": "CACB2511" }
]
```

- `FU_INDEX` trả về kiểu:

```json
[
  { "symbol": "41I1G5000" },
  { "symbol": "41I1G6000" }
]
```

Node.js:

```js
const res = await requestJson(
  "https://trading.vietcap.com.vn/api/price/symbols/getByGroup",
  {
    headers: HEADERS.VCI,
    query: { group: "VN30" }
  }
);
```

### C. Danh mục ngành ICB

- Method: `GET`
- URL: `https://iq.vietcap.com.vn/api/iq-insight-service/v1/sectors/icb-codes`
- Query: không có

Mẫu phản hồi:

```json
{
  "data": [
    {
      "name": "2733",
      "enSector": "Electrical Components & Equipment",
      "viSector": "Hàng điện và điện tử",
      "icbLevel": 4,
      "marketCap": 4218198514300.0
    }
  ]
}
```

### D. Search-bar công ty / ngành

- Method: `GET`
- URL: `https://iq.vietcap.com.vn/api/iq-insight-service/v2/company/search-bar`
- Query:
  - `language=1` tiếng Việt
  - `language=2` tiếng Anh

Mẫu phản hồi:

```json
{
  "status": 200,
  "successful": true,
  "data": [
    {
      "id": "767",
      "name": "Công ty Cổ phần Sợi Thế Kỷ",
      "floor": "HOSE",
      "code": "STK",
      "shortName": "Sợi Thế Kỷ",
      "organCode": "CENTURY",
      "icbLv1": { "code": "3000", "name": "Hàng Tiêu dùng", "level": 1 },
      "icbLv2": { "code": "3700", "name": "Hàng cá nhân & Gia dụng", "level": 2 },
      "icbLv3": { "code": "3760", "name": "Hàng cá nhân", "level": 3 },
      "icbLv4": { "code": "3763", "name": "Hàng May mặc", "level": 4 },
      "comTypeCode": "CT",
      "currentPrice": 14150.0,
      "targetPrice": 25500.0
    }
  ]
}
```

### E. Lịch sự kiện doanh nghiệp

- Method: `GET`
- URL: `https://iq.vietcap.com.vn/api/iq-insight-service/v1/events`
- Query:
  - `fromDate=YYYYMMDD`
  - `toDate=YYYYMMDD`
  - `page=0`
  - `size=200`
  - `eventCode=ISS,DIV` nếu muốn lọc

Mẫu phản hồi:

```json
{
  "data": {
    "content": [
      {
        "ticker": "VHM",
        "eventCode": "DDINS",
        "eventTitleVi": "Tập đoàn Vingroup - Đăng ký Bán 59,001,762 VHM",
        "displayDate1": "2026-04-02T00:00:00",
        "displayDate2": "2026-04-13T00:00:00",
        "category": "MAJOR_SHAREHOLDER_TRADING"
      }
    ]
  }
}
```

Node.js:

```js
const res = await requestJson(
  "https://iq.vietcap.com.vn/api/iq-insight-service/v1/events",
  {
    headers: HEADERS.VCI,
    query: {
      fromDate: "20260401",
      toDate: "20260405",
      page: 0,
      size: 5
    }
  }
);
```

### F. GraphQL thông tin công ty

- Method: `POST`
- URL: `https://trading.vietcap.com.vn/data-mt/graphql`
- Headers: `HEADERS.VCI`
- Body tối thiểu:

```json
{
  "query": "query Query($ticker: String!, $lang: String!) { News(ticker: $ticker, langCode: $lang) { id ticker newsTitle publicDate } }",
  "variables": {
    "ticker": "TCB",
    "lang": "vi"
  }
}
```

Kết quả kiểm tra thực tế:

```json
{}
```

Ghi chú:

- Route này hiện **trả 200 nhưng dữ liệu rỗng** với query tối giản.
- Không nên dùng làm nguồn chính cho hồ sơ công ty ở thời điểm kiểm tra này.

## 1.2. KBS / KB Securities

### A. Hồ sơ công ty

- Method: `GET`
- URL: `https://kbbuddywts.kbsec.com.vn/iis-server/investment/stockinfo/profile/{symbol}`
- Query:
  - `l=1`

Ví dụ:

`https://kbbuddywts.kbsec.com.vn/iis-server/investment/stockinfo/profile/TCB?l=1`

Mẫu phản hồi:

```json
{
  "SB": "TCB",
  "FD": "06/08/1993",
  "CC": 70862,
  "HM": 12705,
  "EX": "HOSE",
  "Subsidiaries": [
    {
      "D": "2025-12-31T00:00:00",
      "NM": "CTCP Quản lý Quỹ Kỹ thương",
      "OR": 88.99
    }
  ],
  "Leaders": [
    {
      "FD": "2004",
      "PN": "CTHĐQT",
      "NM": "Ông Hồ Hùng Anh"
    }
  ]
}
```

Node.js:

```js
const res = await requestJson(
  "https://kbbuddywts.kbsec.com.vn/iis-server/investment/stockinfo/profile/TCB",
  {
    headers: HEADERS.KBS,
    query: { l: 1 }
  }
);
```

### B. Tóm tắt nhanh một mã

- Method: `GET`
- URL: `https://kbbuddywts.kbsec.com.vn/iis-server/investment/stockinfo/info/{symbol}`
- Query:
  - `l=1`

Mẫu phản hồi:

```json
{
  "SB": "TCB",
  "MAP52": 41300,
  "MAD52": "2025-10-13",
  "MIP52": 24501,
  "MID52": "2025-04-22",
  "FTO": 22.5386,
  "DIV": 1000,
  "BT": 1.09
}
```

### C. Tin tức, sự kiện, giao dịch nội bộ

- Tin tức:
  - `GET https://kbbuddywts.kbsec.com.vn/iis-server/investment/stockinfo/news/{symbol}?l=1&p=1&s=10`
- Sự kiện:
  - `GET https://kbbuddywts.kbsec.com.vn/iis-server/investment/stockinfo/event/{symbol}?l=1&p=1&s=10`
- Nội bộ:
  - `GET https://kbbuddywts.kbsec.com.vn/iis-server/investment/stockinfo/news/internal-trading/{symbol}?l=1&p=1&s=10`

Tham số chung:

- `l=1`
- `p=page`
- `s=pageSize`

### D. Danh sách toàn bộ mã

- Method: `GET`
- URL: `https://kbbuddywts.kbsec.com.vn/iis-server/investment/stock/search/data`

Mẫu phản hồi:

```json
[
  {
    "symbol": "DPP",
    "nameEn": "Dong Nai Pharmaceutical Joint Stock Company",
    "exchange": "UPCOM",
    "re": 28000,
    "ceiling": 39200,
    "floor": 16800,
    "type": "stock"
  }
]
```

### E. Thành phần theo nhóm / sàn / ETF / CW / trái phiếu / phái sinh

- Method: `GET`
- URL: `https://kbbuddywts.kbsec.com.vn/iis-server/investment/index/{groupCode}/stocks`

Mapping `groupCode` thường dùng:

- `30` -> VN30
- `100` -> VN100
- `MID` -> VNMidCap
- `SML` -> VNSmallCap
- `SI` -> VNSI
- `X50` -> VNX50
- `XALL` -> VNXALL
- `ALL` -> VNALL
- `HOSE` -> HOSE
- `HNX` -> HNX
- `UPCOM` -> UPCOM
- `FUND` -> ETF
- `CW` -> Chứng quyền
- `BOND` -> Trái phiếu doanh nghiệp
- `DER` -> Phái sinh

Mẫu phản hồi:

```json
{
  "status": 200,
  "data": ["ACB", "BID"]
}
```

Ví dụ kiểm tra thực tế:

- `.../index/FUND/stocks`

```json
{
  "status": 200,
  "data": ["E1VFVN30", "FUCTVGF3"]
}
```

- `.../index/BOND/stocks`

```json
{
  "status": 200,
  "data": ["BAB123032", "BAB124015"]
}
```

- `.../index/DER/stocks`

```json
{
  "status": 200,
  "data": ["41I1G5000", "41I1G6000"]
}
```

### F. Danh sách ngành

- Toàn bộ ngành:
  - `GET https://kbbuddywts.kbsec.com.vn/iis-server/investment/sector/all`
- Theo mã ngành:
  - `GET https://kbbuddywts.kbsec.com.vn/iis-server/investment/sector/all?code=27&l=1`

Mẫu phản hồi:

```json
[
  {
    "name": "Thiết bị điện",
    "code": 27,
    "change": 2.722377
  },
  {
    "name": "Công nghệ và thông tin",
    "code": 6,
    "change": 1.023729
  }
]
```

Ghi chú:

- Endpoint `?code=...` hiện vẫn trả về danh sách, không phải lúc nào cũng chỉ một dòng duy nhất.

### G. Tỷ lệ margin

- Method: `GET`
- URL: `https://kbbuddywts.kbsec.com.vn/sas/kbsv-stock-data-store/stock/trading-margin`
- Query:
  - `code=TCB`
  - `languageID=1`

Kết quả kiểm tra thực tế:

```text
404 No context-path matches the request URI.
```

## 1.3. FMARKET

### A. Danh sách quỹ

- Method: `POST`
- URL: `https://api.fmarket.vn/res/products/filter`
- Body mẫu:

```json
{
  "types": ["NEW_FUND", "TRADING_FUND"],
  "issuerIds": [],
  "sortOrder": "DESC",
  "sortField": "navTo6Months",
  "page": 1,
  "pageSize": 100,
  "isIpo": false,
  "fundAssetTypes": [],
  "bondRemainPeriods": [],
  "searchField": "",
  "isBuyByReward": false,
  "thirdAppIds": []
}
```

Mẫu phản hồi:

```json
{
  "data": {
    "rows": [
      {
        "id": 38,
        "shortName": "VNDAF",
        "name": "QUỸ ĐẦU TƯ CHỦ ĐỘNG VND",
        "nav": 21061.61,
        "managementFee": 1.5
      }
    ]
  }
}
```

### B. Chi tiết quỹ

- Method: `GET`
- URL: `https://api.fmarket.vn/res/products/{id}`

Ví dụ:

`https://api.fmarket.vn/res/products/23`

Mẫu phản hồi:

```json
{
  "status": 200,
  "code": 200,
  "message": "Thành công",
  "data": {
    "id": 23,
    "name": "QUỸ ĐẦU TƯ CỔ PHIẾU TIẾP CẬN THỊ TRƯỜNG VINACAPITAL",
    "shortName": "VESAF",
    "code": "VESAF",
    "tradeCode": "VESAFN002",
    "nav": 34958.07,
    "managementFee": 1.75,
    "website": "https://wm.vinacapital.com/quy-dau-tu-co-phieu-tiep-can-thi-truong-viet-nam-vesaf",
    "productTradingSession": {
      "tradingTimeString": "21/04/2026",
      "closedOrderBookTimeString": "14:40 20/04/2026"
    }
  }
}
```

## 1.4. MAS / MASVN

### Trạng thái thị trường

- Method: `GET`
- URL: `https://masboard.masvn.com/api/v1/market/marketStatus`

Mẫu phản hồi:

```json
[
  {
    "market": "UPCOM",
    "type": "EQUITY",
    "status": "LO",
    "time": 1776651315001,
    "lastTradingDate": 1776661202304
  }
]
```

## 1.5. Dukascopy

### Danh mục instrument quốc tế

- Method: `GET`
- URL: `https://jetta.dukascopy.com/v1/instruments`

Mẫu phản hồi:

```json
{
  "instruments": [
    {
      "id": 31912,
      "code": "0005.HK-HKD",
      "description": "HSBC Holdings Plc",
      "pipValue": 0.01,
      "priceScale": 3,
      "platformGroupId": "STK_CASH"
    }
  ]
}
```

## 2. Dữ Liệu Giao Dịch

## 2.1. VCI / Vietcap

### A. OHLCV chart

- Method: `POST`
- URL: `https://trading.vietcap.com.vn/api/chart/OHLCChart/gap-chart`
- Body mẫu:

```json
{
  "timeFrame": "ONE_DAY",
  "symbols": ["TCB"],
  "to": 1776652800,
  "countBack": 5
}
```

Mẫu phản hồi:

```json
[
  {
    "symbol": "TCB",
    "o": [32400, 32400, 31850],
    "h": [32550, 32550, 32100],
    "l": [31850, 31850, 31800],
    "c": [32050, 31850, 31900],
    "v": [9838400, 12297700, 8572900],
    "t": ["1776124800", "1776211200", "1776297600"]
  }
]
```

Node.js:

```js
const res = await requestJson(
  "https://trading.vietcap.com.vn/api/chart/OHLCChart/gap-chart",
  {
    method: "POST",
    headers: HEADERS.VCI,
    body: {
      timeFrame: "ONE_DAY",
      symbols: ["TCB"],
      to: 1776652800,
      countBack: 5
    }
  }
);
```

### B. Khớp lệnh intraday

- Method: `POST`
- URL: `https://trading.vietcap.com.vn/api/market-watch/LEData/getAll`
- Body:

```json
{
  "symbol": "TCB",
  "limit": 5,
  "truncTime": null
}
```

Mẫu phản hồi:

```json
[
  {
    "id": 465501877,
    "symbol": "TCB",
    "truncTime": "1776652834",
    "matchType": "s",
    "matchVol": "100.0",
    "matchPrice": "32600.0",
    "accumulatedVolume": "2447800.0",
    "accumulatedValue": "79678.08"
  }
]
```

### C. Khớp theo từng mức giá

- Method: `POST`
- URL: `https://trading.vietcap.com.vn/api/market-watch/AccumulatedPriceStepVol/getSymbolData`
- Body:

```json
{ "symbol": "TCB" }
```

### D. Bảng giá nhiều mã

- Method: `POST`
- URL: `https://trading.vietcap.com.vn/api/price/symbols/getList`
- Body:

```json
{ "symbols": ["TCB", "VCI"] }
```

Mẫu phản hồi rút gọn:

```json
[
  {
    "listingInfo": {
      "symbol": "TCB",
      "ceiling": 34500,
      "floor": 30000,
      "refPrice": 32250,
      "board": "HSX",
      "listedShare": 7086240414
    },
    "bidAsk": {
      "askPrices": [{ "price": 32650, "volume": 76400 }],
      "bidPrices": [{ "price": 32600, "volume": 122100 }]
    },
    "matchPrice": {
      "matchPrice": 32600,
      "highest": 32800,
      "lowest": 32350,
      "accumulatedVolume": 2447800,
      "accumulatedValue": 79678.08,
      "foreignBuyVolume": 5000,
      "foreignSellVolume": 24900
    }
  }
]
```

### E. Price history

- Method: `GET`
- URL: `https://iq.vietcap.com.vn/api/iq-insight-service/v1/company/{symbol}/price-history`
- Query:
  - `timeFrame=ONE_DAY|ONE_WEEK|ONE_MONTH|ONE_QUARTER|ONE_YEAR`
  - `page=0`
  - `size=100`
  - có thể thêm `fromDate`, `toDate`

Mẫu phản hồi:

```json
{
  "data": {
    "content": [
      {
        "ticker": "TCB",
        "tradingDate": "2026-04-17T00:00:00",
        "marketCap": 228531253351500.0,
        "ceilingPrice": 34100.0,
        "floorPrice": 29700.0,
        "referencePrice": 31900.0,
        "openPrice": 32150.0,
        "closePrice": 32250.0,
        "matchPrice": 32250.0,
        "totalMatchVolume": 12206220.0,
        "totalDealVolume": 25600.0,
        "foreignBuyVolumeTotal": 364200.0,
        "foreignSellVolumeTotal": 265600.0
      }
    ]
  }
}
```

### F. Price history summary

- Method: `GET`
- URL: `https://iq.vietcap.com.vn/api/iq-insight-service/v1/company/{symbol}/price-history-summary`
- Query:
  - `timeFrame=ONE_DAY`
  - `page=0`
  - `size=5`

Mẫu phản hồi:

```json
{
  "data": {
    "averageMatchVolume": 8821403.53,
    "averageMatchValue": 309911480831.7,
    "totalMatchVolume": 17360522149.0,
    "totalDealVolume": 5605727020.0,
    "foreignBuyVolumeTotal": 1710019433.0,
    "foreignSellVolumeTotal": 1700800226.0
  }
}
```

### G. Tự doanh

- Method: `GET`
- URL: `https://iq.vietcap.com.vn/api/iq-insight-service/v1/company/{symbol}/proprietary-history`
- Query:
  - `page`
  - `size`

Mẫu phản hồi:

```json
{
  "data": {
    "content": [
      {
        "ticker": "TCB",
        "tradingDate": "2026-04-17T00:00:00",
        "totalBuyTradeVolume": 1067200.0,
        "totalSellTradeVolume": 1008600.0,
        "totalTradeNetVolume": 58600.0,
        "totalTradeNetValue": 1886495000.0
      }
    ]
  }
}
```

### H. Giao dịch nội bộ

- Method: `GET`
- URL: `https://iq.vietcap.com.vn/api/iq-insight-service/v1/company/{symbol}/insider-transaction`
- Query:
  - `page`
  - `size`

Mẫu phản hồi:

```json
{
  "data": {
    "content": [
      {
        "ticker": "TCB",
        "eventCode": "DDIND",
        "publicDate": "2025-11-04T00:00:00",
        "shareRegister": 800000.0,
        "shareAcquire": 800000.0,
        "actionTypeCode": "B",
        "actionTypeVi": "Mua"
      }
    ]
  }
}
```

### I. Lô lẻ

- Method: `POST`
- URL: `https://trading.vietcap.com.vn/api/price/symbols/oddLot/getList`
- Body:

```json
{ "symbols": ["AAA", "AAM"] }
```

Mẫu phản hồi rút gọn:

```json
[
  {
    "listingInfo": {
      "symbol": "AAA",
      "ceiling": 7520,
      "floor": 6540,
      "refPrice": 7030,
      "board": "HSX",
      "listedShare": 393742730
    },
    "bidAsk": {
      "askPrices": [
        { "price": 7120, "volume": 20 }
      ],
      "bidPrices": [
        { "price": 7080, "volume": 14 }
      ]
    },
    "matchPrice": {
      "accumulatedValue": 3.26276,
      "accumulatedVolume": 463,
      "foreignBuyVolume": 0,
      "foreignSellVolume": 0
    }
  }
]
```

### J. Thỏa thuận intraday

- Method: `GET`
- URL: `https://trading.vietcap.com.vn/api/price/putThrough/allIntradayPutThrough`
- Query:
  - `group=HOSE`

Mẫu phản hồi:

```json
[
  {
    "id": 802312,
    "code": "VN000000PPC6",
    "symbol": "PPC",
    "ptMatchPrice": 9440,
    "ptChange": -710,
    "ptChangePercent": -0.06995073891625615,
    "ptMatchValue": 9440,
    "ptMatchVolume": 1,
    "ptAccumulatedValue": 28320,
    "ptAccumulatedVolume": 3,
    "time": "2026-04-20T02:54:23.591Z"
  }
]
```

## 2.2. KBS / KB Securities

### A. OHLCV cổ phiếu và chỉ số

- Method: `GET`
- URL cổ phiếu:
  - `https://kbbuddywts.kbsec.com.vn/iis-server/investment/stocks/{symbol}/data_{intervalCode}`
- URL chỉ số:
  - `https://kbbuddywts.kbsec.com.vn/iis-server/investment/index/{symbol}/data_{intervalCode}`
- Query:
  - `sdate=DD-MM-YYYY`
  - `edate=DD-MM-YYYY`

Mapping `intervalCode`:

- `1m` -> `1P`
- `5m` -> `5P`
- `15m` -> `15P`
- `30m` -> `30P`
- `1H` -> `60P`
- `1D` -> `day`
- `1W` -> `week`
- `1M` -> `month`

Ví dụ:

`https://kbbuddywts.kbsec.com.vn/iis-server/investment/stocks/TCB/data_day?sdate=01-04-2026&edate=19-04-2026`

Mẫu phản hồi:

```json
{
  "data_day": [
    {
      "t": "2026-04-17 07:00",
      "o": 32150,
      "h": 32450,
      "l": 32000,
      "c": 32250,
      "v": 12197000,
      "va": 394400760000
    }
  ]
}
```

### B. Tape intraday

- Method: `GET`
- URL: `https://kbbuddywts.kbsec.com.vn/iis-server/investment/trade/history/{symbol}`
- Query:
  - `page=1`
  - `limit=1000`

Mẫu phản hồi:

```json
{
  "data": [
    {
      "t": "2026-04-20 09:40:34:38",
      "TD": "20/04/2026",
      "SB": "TCB",
      "FT": "09:40:34",
      "LC": "S",
      "FMP": 32600,
      "FCV": 350,
      "FV": 100,
      "AVO": 2447800,
      "AVA": 79678080000
    }
  ]
}
```

### C. Historical quotes tổng hợp

- Method: `GET`
- URL: `https://kbbuddywts.kbsec.com.vn/iis-server/investment/{symbol}/historical-quotes`
- Query:
  - `limit`
  - `offset`
  - `startDate=YYYY-MM-DD`
  - `endDate=YYYY-MM-DD`

Mẫu phản hồi:

```json
[
  {
    "StockCode": "TCB",
    "TradingDate": "17/04/2026",
    "Change": 350,
    "PerChange": 1.1,
    "ClosePrice": 32250,
    "MT_TotalVol": 12197000,
    "PT_TotalVol": 25600,
    "AvrPrice": 32331
  }
]
```

### D. Bảng giá cơ sở / chứng quyền

- Method: `POST`
- URL: `https://kbbuddywts.kbsec.com.vn/iis-server/investment/stock/iss`
- Headers: `HEADERS.KBS_POST`
- Body:

```json
{ "code": "TCB,VCI" }
```

Mẫu phản hồi cổ phiếu:

```json
[
  {
    "SB": "TCB",
    "RE": 32250,
    "CL": 34500,
    "FL": 30000,
    "CP": 32600,
    "HI": 32800,
    "LO": 32350,
    "TV": 79815090000,
    "FB": 5000,
    "FS": 24900,
    "B1": "32600.0",
    "S1": "32650.0",
    "U1": 84400,
    "t": 1776652877876
  }
]
```

Mẫu phản hồi chứng quyền:

```json
[
  {
    "SB": "CACB2511",
    "ULS": "ACB",
    "EP": "23000.0",
    "ER": "2:1",
    "CPR": 23800,
    "CWT": "C",
    "RE": 1520,
    "CP": 1520,
    "CL": 2340,
    "FL": 700,
    "B1": "1520.0",
    "S1": "1530.0",
    "FO": 13000000,
    "FR": 12915000,
    "t": 1776653554865
  }
]
```

### E. Phái sinh

- Method: `POST`
- URL: `https://kbbuddywts.kbsec.com.vn/iis-server/investment/derivative/iss`
- Headers: `HEADERS.KBS_DERIVATIVE_POST`
- Body:

```json
{ "code": "41I1G5000" }
```

Mẫu phản hồi:

```json
{
  "status": 200,
  "data": [
    {
      "SB": "41I1G5000",
      "ULS": "VN30",
      "FN": "VN30 Index Futures 052026",
      "RE": 1987.9,
      "CP": 1988.6,
      "CL": 2127,
      "FL": 1848.8,
      "OI": "32596",
      "FB": 2052,
      "FS": 965,
      "LTD": "21/05/2026",
      "FTD": "20/03/2026",
      "t": 1776653566866
    }
  ]
}
```

### F. Lô lẻ

- Method: `POST`
- URL: `https://kbbuddywts.kbsec.com.vn/iis-server/investment/odd-lot/iss`
- Headers: `HEADERS.KBS_POST`
- Body theo mã:

```json
{ "code": "AAA,AAM" }
```

- Hoặc theo sàn:

```json
{ "exchange": "HOSE" }
```

### G. Thỏa thuận

- Method: `GET`
- URL: `https://kbbuddywts.kbsec.com.vn/iis-server/investment/put-through/trade/history/{exchange}`
- Query:
  - `page=1`
  - `pageSize=1000`

Mẫu phản hồi:

```json
{
  "data": [
    {
      "SB": "HAG",
      "PR": "16650.0",
      "MVL": 200000,
      "TD": "20/04/2026",
      "TI": "09:39:46",
      "MC": "HOSE"
    }
  ]
}
```

### H. Xếp hạng khối ngoại realtime

- Method: `GET`
- URL: `https://kbbuddywts.kbsec.com.vn/iis-server/investment/rtranking/foreignTotal`
- Query:
  - `top=10`

Mẫu phản hồi:

```json
[
  {
    "SB": "HPG",
    "EX": "HOSE",
    "RE": 28000,
    "CL": 29950,
    "FL": 26050,
    "CP": 28250,
    "FB": 860000,
    "FS": 619000,
    "FT": 1479000
  }
]
```

### I. Tóm tắt chỉ số

- Method: `POST`
- URL: `https://kbbuddywts.kbsec.com.vn/iis-server/investment/index`
- Headers: `HEADERS.KBS_POST`
- Body:

```json
{ "code": "HOSE,30,100,HNX,HNX30,UPCOM" }
```

Mẫu phản hồi:

```json
[
  {
    "MI": 1224.15,
    "ICH": -15.27,
    "IPC": -1.23,
    "OP": 1232.11,
    "HI": 1234.72,
    "LO": 1218.09,
    "RE": 1239.42,
    "AV": 564123456,
    "TVA": 13254890000000,
    "PTV": 1842000000000
  }
]
```

## 2.3. MAS / MASVN

### A. OHLCV

- Method: `GET`
- URL: `https://masboard.masvn.com/api/v1/tradingview/history`
- Query:
  - `symbol=TCB`
  - `resolution=1D|1|5|15|30|60|1W|1M`
  - `from=<unix seconds>`
  - `to=<unix seconds>`

Mẫu phản hồi:

```json
{
  "t": [1711984099, 1712070550],
  "o": [22462.1245, 22485.744],
  "h": [22532.9829, 22674.6998],
  "l": [22131.4518, 22202.3102],
  "c": [22414.8855, 22509.3634],
  "v": [8561000, 13559100],
  "s": "ok"
}
```

### B. Tape intraday

- Method: `GET`
- URL: `https://masboard.masvn.com/api/v1/market/{symbol}/quote`
- Query:
  - `symbol={symbol}`
  - `fetchCount=5`

Mẫu phản hồi:

```json
{
  "data": [
    {
      "ti": 1776652834329,
      "c": 32600,
      "mv": 100,
      "mb": "SELL",
      "va": 79678000000,
      "vo": 2447800
    }
  ]
}
```

### C. Quote summary

- Method: `GET`
- URL: `https://masboard.masvn.com/api/v1/market/quoteSummary`
- Query:
  - `symbol=TCB`

Mẫu phản hồi:

```json
[
  {
    "price": 32350,
    "volume": 53300,
    "buyVolume": 46500,
    "sellVolume": 6800,
    "bsVolume": 0,
    "buyRate": 0.8724,
    "sellRate": 0.1276
  }
]
```

## 2.4. VNDIRECT

### OHLCV

- Method: `GET`
- URL: `https://dchart-api.vndirect.com.vn/dchart/history`
- Query:
  - `resolution=D|W|M|1|5|15|30|60`
  - `symbol=TCB`
  - `from=<unix seconds>`
  - `to=<unix seconds>`

Mẫu phản hồi:

```json
{
  "t": [1711929600, 1712016000],
  "o": [22.462, 22.486],
  "h": [22.533, 22.675],
  "l": [22.131, 22.202],
  "c": [22.415, 22.509],
  "v": [8561000, 13559100],
  "s": "ok"
}
```

Ghi chú:

- Route intraday công khai của nguồn này hiện không còn ổn định để dùng như trước.

## 2.5. FMARKET

### Lịch sử NAV

- Method: `POST`
- URL đúng: `https://api.fmarket.vn/res/product/get-nav-history`
- Body:

```json
{
  "isAllData": 1,
  "productId": 23,
  "fromDate": null,
  "toDate": "20260420"
}
```

Mẫu phản hồi:

```json
{
  "status": 200,
  "code": 200,
  "message": "Thành công",
  "data": [
    {
      "id": 2203,
      "nav": 10000.0,
      "navDate": "2017-04-25",
      "productId": 23
    },
    {
      "id": 2204,
      "nav": 10058.0,
      "navDate": "2017-04-29",
      "productId": 23
    }
  ]
}
```

Ghi chú:

- Đường dẫn `https://api.fmarket.vn/res/get-nav-history` hiện trả `404`.
- Đường dẫn chạy được là `https://api.fmarket.vn/res/product/get-nav-history`.

## 2.6. CafeF

Các route cũ còn thấy trên public web:

- `GET https://s.cafef.vn/Ajax/PageNew/DataHistory/PriceHistory.ashx`
- `GET https://s.cafef.vn/Ajax/PageNew/DataHistory/GDKhoiNgoai.ashx`
- `GET https://s.cafef.vn/Ajax/PageNew/DataHistory/GDTuDoanh.ashx`
- `GET https://s.cafef.vn/Ajax/PageNew/DataHistory/ThongKeDL.ashx`
- `GET https://s.cafef.vn/Ajax/PageNew/DataHistory/GDCoDong.ashx`

Tham số thường dùng:

- `Symbol`
- `StartDate`
- `EndDate`
- `PageIndex`
- `PageSize`

Kết quả kiểm tra trực tiếp:

```json
{
  "Data": null,
  "Message": "symbol is null or empty",
  "Success": false
}
```

Ghi chú:

- Bộ endpoint này có dấu hiệu đã đổi hành vi hoặc bị thay lớp xác thực/redirect.

## 2.7. Dukascopy

### A. Daily candles

- Method: `GET`
- URL: `https://jetta.dukascopy.com/v1/candles/day/{symbol}/{side}`
- Ví dụ:
  - `https://jetta.dukascopy.com/v1/candles/day/EUR-USD/BID`

Mẫu phản hồi:

```json
{
  "timestamp": 1767225600000,
  "multiplier": 0.00001,
  "open": 1.17387,
  "high": 1.17507,
  "low": 1.17387,
  "close": 1.17506,
  "shift": 86400000,
  "times": [0, 1, 2, 1],
  "opens": [0, 122, -306, -153]
}
```

### B. Minute candles

- Method: `GET`
- URL: `https://jetta.dukascopy.com/v1/candles/minute/{symbol}/{side}/{year}/{month}/{day}`

### C. Tick

- Method: `GET`
- URL: `https://jetta.dukascopy.com/v1/ticks/{symbol}/{year}/{month}/{day}/{hour}`

Ghi chú:

- Dữ liệu trả về là **delta-encoded arrays**, không phải nến OHLC đã bung sẵn.
- Cần tự giải mã:
  - `timestamp`
  - `shift`
  - `multiplier`
  - `times`
  - `opens`, `highs`, `lows`, `closes`

## 2.8. FXSB

### File lịch sử `.lb.gz`

- Method: `GET`
- URL:
  - `https://data.forexsb.com/datafeed/data/dukascopy/{symbol}{interval}.lb.gz`

Ví dụ:

- `EURUSD1.lb.gz`
- `EURUSD5.lb.gz`
- `EURUSD30.lb.gz`

Đặc điểm phản hồi:

- Không phải JSON
- Là file **nhị phân gzip**
- Sau khi giải nén cần parse theo block nhị phân cố định

Ví dụ Node.js:

```js
const { status, buffer } = await requestBuffer(
  "https://data.forexsb.com/datafeed/data/dukascopy/EURUSD30.lb.gz",
  { headers: HEADERS.FXSB }
);

const raw = maybeGunzip(buffer);
console.log(status, raw.length);
```

## 2.9. Binance

### A. OHLCV

- Method: `GET`
- URL: `https://api.binance.com/api/v3/uiKlines`
- Query:
  - `symbol=BTCUSDT`
  - `interval=1d`
  - `limit=2`

Mẫu phản hồi:

```json
[
  [
    1776556800000,
    "75691.76000000",
    "76240.66000000",
    "73762.90000000",
    "73801.79000000",
    "11369.82232000",
    1776643199999,
    "854915370.44079150",
    2739751,
    "5458.61875000",
    "410654487.05263240",
    "0"
  ]
]
```

### B. Order book

- Method: `GET`
- URL: `https://api.binance.com/api/v3/depth`
- Query:
  - `symbol=BTCUSDT`
  - `limit=2`

Mẫu phản hồi:

```json
{
  "lastUpdateId": 92320883973,
  "bids": [
    ["74457.52000000", "0.55240000"],
    ["74457.51000000", "0.00035000"]
  ],
  "asks": [
    ["74457.53000000", "2.12509000"],
    ["74457.54000000", "0.00014000"]
  ]
}
```

### C. Quote 24h

- Method: `GET`
- URL: `https://api.binance.com/api/v3/ticker/24hr`
- Query:
  - `symbol=BTCUSDT`

Mẫu phản hồi:

```json
{
  "symbol": "BTCUSDT",
  "priceChange": "-1100.23000000",
  "priceChangePercent": "-1.456",
  "weightedAvgPrice": "75024.19933285",
  "prevClosePrice": "75557.76000000",
  "lastPrice": "74457.53000000",
  "bidPrice": "74457.52000000",
  "askPrice": "74457.53000000",
  "openPrice": "75557.76000000"
}
```

Các endpoint công khai khác của cùng nhóm:

- `GET /api/v3/klines`
- `GET /api/v3/trades`
- `GET /api/v3/aggTrades`
- `GET /api/v3/historicalTrades`
- `GET /api/v3/avgPrice`
- `GET /api/v3/ticker/tradingDay`
- `GET /api/v3/ticker/price`
- `GET /api/v3/ticker`
- `GET /api/v3/ticker/bookTicker`

## 3. Dữ Liệu Cơ Bản

## 3.1. MAS / MASVN

### Báo cáo tài chính GraphQL-style qua query string

- Method: `GET`
- URL: `https://masboard.masvn.com/api/v2/vs/financialReport`
- Query duy nhất:

```text
query=query{vsFinancialReportList(StockCode:"TCB",Type:"KQKD",TermType:"Q"){_id,ID,TermCode,YearPeriod,Content{Values{Name,NameEn,Value}}}}
```

Mapping `Type`:

- `CDKT` -> bảng cân đối kế toán
- `KQKD` -> kết quả kinh doanh
- `LCTT` -> lưu chuyển tiền tệ
- `CSTC` -> chỉ số tài chính
- `CTKH` -> kế hoạch năm

Mapping `TermType`:

- `Y` -> năm
- `Q` -> quý

Mẫu phản hồi:

```json
[
  {
    "_id": "TCB_KQKD_Q4/2025",
    "ID": 1,
    "TermCode": "Q4",
    "YearPeriod": 2025,
    "Content": [
      {
        "Values": [
          {
            "Name": "1. Thu nhập lãi và các khoản thu nhập tương tự",
            "NameEn": "1. Interest income and similar income",
            "Value": "19164244000000"
          }
        ]
      }
    ]
  }
]
```

Node.js:

```js
const query =
  'query{vsFinancialReportList(StockCode:"TCB",Type:"KQKD",TermType:"Q"){_id,ID,TermCode,YearPeriod,Content{Values{Name,NameEn,Value}}}}';

const res = await requestJson(
  "https://masboard.masvn.com/api/v2/vs/financialReport",
  {
    headers: HEADERS.MAS,
    query: { query }
  }
);
```

## 3.2. VCI / Vietcap

### A. Financial statement

- Method: `GET`
- URL: `https://iq.vietcap.com.vn/api/iq-insight-service/v1/company/{symbol}/financial-statement`
- Query:
  - `section=INCOME_STATEMENT`
  - `section=BALANCE_SHEET`
  - `section=CASH_FLOW`
  - `section=NOTE`

Mẫu phản hồi:

```json
{
  "data": {
    "years": [
      {
        "organCode": "TCB",
        "yearReport": 2018,
        "lengthReport": 5,
        "publicDate": "2019-03-25T00:00:00",
        "isa16": 10661016000000.0,
        "isb25": 21413626000000.0
      }
    ],
    "quarters": [
      {
        "organCode": "TCB",
        "yearReport": 2025,
        "lengthReport": 4
      }
    ]
  }
}
```

### B. Statistics / ratio

- Method: `GET`
- URL: `https://iq.vietcap.com.vn/api/iq-insight-service/v1/company/{symbol}/statistics-financial`

Mẫu phản hồi:

```json
{
  "data": [
    {
      "year": "2018",
      "quarter": 2,
      "ratioType": "RATIO_TTM",
      "marketCap": 97205262048000.0,
      "pe": 10.8486033885,
      "pb": 2.0494710047,
      "roe": 0.2560279145,
      "roa": 0.0312549251,
      "grossMargin": 0.7111113932,
      "debtToEquity": 5.3337203222
    }
  ]
}
```

### C. Metrics dictionary

- Method: `GET`
- URL: `https://iq.vietcap.com.vn/api/iq-insight-service/v1/company/{symbol}/financial-statement/metrics`

Mẫu phản hồi:

```json
{
  "data": {
    "BALANCE_SHEET": [
      {
        "level": 1,
        "parent": null,
        "titleEn": "TOTAL ASSETS",
        "titleVi": "TỔNG TÀI SẢN",
        "field": "bsa53",
        "name": "BSA53"
      }
    ],
    "INCOME_STATEMENT": [],
    "CASH_FLOW": [],
    "NOTE": []
  }
}
```

Ghi chú:

- Endpoint này rất hữu ích để map các field mã hóa như `bsa53`, `isa16`, `cfa21`.

## 3.3. KBS / KB Securities

### Financial report document-style

- Method: `GET`
- URL: `https://kbbuddywts.kbsec.com.vn/iis-server/investment/stock/finance-info/{symbol}`
- Query:
  - `page=1`
  - `pageSize=1`
  - `type=KQKD|CDKT|LCTT|CSTC|CTKH|BCTT`
  - `unit=1000`
  - `termtype=1|2`
  - `languageid=1`

Mapping `termtype`:

- `1` -> năm
- `2` -> quý

Mẫu phản hồi:

```json
{
  "Audit": [
    {
      "AuditedStatusCode": "SX",
      "Description": "Soát xét"
    }
  ],
  "Unit": [
    {
      "UnitedCode": "HN",
      "UnitedName": "Hợp nhất"
    }
  ],
  "Head": [
    {
      "YearPeriod": 2025,
      "TermCode": "Q4",
      "TermName": "Quý 4",
      "United": "HN",
      "AuditedStatus": "CKT"
    }
  ],
  "Content": {
    "Kết quả kinh doanh": [
      {
        "Name": "1. Thu nhập lãi và các khoản thu nhập tương tự",
        "NameEn": "1. Interest income and similar income",
        "Levels": 0,
        "Value1": 14950024000
      }
    ]
  }
}
```

Node.js:

```js
const res = await requestJson(
  "https://kbbuddywts.kbsec.com.vn/iis-server/investment/stock/finance-info/TCB",
  {
    headers: HEADERS.KBS,
    query: {
      page: 1,
      pageSize: 1,
      type: "KQKD",
      unit: 1000,
      termtype: 2,
      languageid: 1
    }
  }
);
```

## 4. Dữ Liệu Vĩ Mô & Hàng Hóa

## 4.1. MBK / Maybank Trade

### Endpoint dùng chung cho toàn bộ dữ liệu vĩ mô

- Method: `POST`
- URL: `https://data.maybanktrade.com.vn/data/reportdatatopbynormtype`
- Headers:
  - `Content-Type: application/x-www-form-urlencoded; charset=UTF-8`
  - `Referer: https://data.maybanktrade.com.vn`
  - `Origin: https://data.maybanktrade.com.vn`

Body chuẩn:

```text
type=<periodCode>&fromYear=<YYYY>&toYear=<YYYY>&from=<x>&to=<y>&normTypeID=<id>
```

Mapping `type`:

- `1` -> ngày
- `2` -> tháng
- `3` -> quý
- `4` -> năm

Mapping `normTypeID`:

- `43` -> GDP
- `52` -> CPI
- `46` -> Sản xuất công nghiệp
- `48` -> Xuất nhập khẩu
- `47` -> Bán lẻ
- `50` -> FDI
- `51` -> Cung tiền / tín dụng
- `53` -> Tỷ giá
- `55` -> Dân số & lao động
- `66` -> Lãi suất

Quy ước `from` / `to`:

- với `type=1` hoặc `type=4`: thường để `0`
- với `type=2`: dùng tháng `1..12`
- với `type=3`: dùng chỉ số quý `0..3`
  - `0` = Quý 1
  - `1` = Quý 2
  - `2` = Quý 3
  - `3` = Quý 4

### A. GDP

Ví dụ body:

```text
type=3&fromYear=2024&toYear=2026&from=0&to=1&normTypeID=43
```

Mẫu phản hồi:

```json
[
  {
    "ReportDataID": 474088,
    "TermID": 19,
    "TermYear": 2025,
    "TernDay": "/Date(1759683600000)/",
    "NormID": 240,
    "GroupName": "Giá trị GDP hiện hành",
    "NormGroupID": 26,
    "NormName": "Dịch vụ",
    "UnitCode": "Tỷ VNĐ",
    "CssStyle": "Padding1",
    "NormTypeID": 43,
    "FromSource": "Tổng cục thống kê",
    "NormValue": 3926710.1,
    "ReportTime": "9 tháng/2025"
  }
]
```

### B. Tỷ giá

Ví dụ body:

```text
type=1&fromYear=2026&toYear=2026&from=0&to=0&normTypeID=53
```

Mẫu phản hồi:

```json
[
  {
    "ReportDataID": 568147,
    "TermID": 1,
    "TermYear": 2026,
    "TernDay": "/Date(1776618000000)/",
    "NormID": 300,
    "GroupName": "",
    "NormGroupID": 0,
    "NormName": "Liên ngân hàng",
    "UnitCode": "USD/VNĐ",
    "CssStyle": "Padding1",
    "NormTypeID": 53,
    "FromSource": "Ngân hàng Nhà nước Việt Nam",
    "NormValue": null,
    "ReportTime": "20/04/2026"
  },
  {
    "ReportDataID": 568146,
    "NormName": "Tỷ giá trung tâm (từ 04/01/2016)",
    "UnitCode": "USD/VNĐ",
    "NormValue": 25103.0,
    "ReportTime": "20/04/2026"
  }
]
```

### C. Lãi suất

Ví dụ body:

```text
type=1&fromYear=2026&toYear=2026&from=0&to=0&normTypeID=66
```

Mẫu phản hồi:

```json
[
  {
    "ReportDataID": 568137,
    "GroupName": "Lãi suất bình quân liên ngân hàng (%/năm)",
    "NormName": "12 tháng",
    "UnitCode": "%",
    "NormTypeID": 66,
    "NormValue": null,
    "ReportTime": "16/04/2026"
  },
  {
    "ReportDataID": 568136,
    "GroupName": "Lãi suất bình quân liên ngân hàng (%/năm)",
    "NormName": "9 tháng",
    "UnitCode": "%",
    "NormValue": 8.3,
    "ReportTime": "16/04/2026"
  }
]
```

### D. CPI

Ví dụ body:

```text
type=2&fromYear=2025&toYear=2026&from=1&to=4&normTypeID=52
```

Mẫu phản hồi:

```json
[
  {
    "ReportDataID": 462249,
    "NormName": "Chỉ số giá tiêu dùng",
    "UnitCode": "%",
    "NormTypeID": 52,
    "FromSource": "Tổng cục thống kê",
    "NormValue": 0.05,
    "ReportTime": "Tháng 8/2025"
  },
  {
    "ReportDataID": 462248,
    "NormName": "So sánh với cùng kỳ năm trước",
    "UnitCode": "%",
    "NormValue": 3.24,
    "ReportTime": "Tháng 8/2025"
  }
]
```

Node.js với `application/x-www-form-urlencoded`:

```js
const form = new URLSearchParams({
  type: "3",
  fromYear: "2024",
  toYear: "2026",
  from: "0",
  to: "1",
  normTypeID: "43"
});

const res = await fetch(
  "https://data.maybanktrade.com.vn/data/reportdatatopbynormtype",
  {
    method: "POST",
    headers: {
      ...HEADERS.MBK,
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
    },
    body: form.toString()
  }
);
```

Ghi chú:

- Tất cả chỉ số vĩ mô ở nguồn này đều đi qua **cùng một endpoint**, chỉ khác `normTypeID` và `type`.
- Trường `TernDay` dùng format kiểu `/Date(1776618000000)/`.
- Trường `NormValue` có thể `null` ở một số nhãn mô tả hoặc nhóm trung gian.

## 4.2. SPL / Simplize

### Endpoint dùng chung cho toàn bộ giá hàng hóa

- Method: `GET`
- URL: `https://api.simplize.vn/api/historical/prices/ohlcv`
- Query:
  - `ticker=<mã hàng hóa>`
  - `interval=1d|1h|1m`
  - `type=commodity`
  - `from=<unix seconds>`
  - `to=<unix seconds>`
- Headers:
  - `Accept: application/json`
  - `User-Agent: vns_market_data/1.0`

Mẫu phản hồi chuẩn:

```json
{
  "status": 200,
  "message": "Success",
  "data": [
    [1776297600, 4813.6, 4861.3, 4792.1, 4808.3, 106170.0],
    [1776384000, 4811.8, 4917.7, 4785.9, 4879.6, 130529.0]
  ]
}
```

Ý nghĩa từng phần tử trong `data`:

- `[time, open, high, low, close, volume]`

### Mapping ticker hàng hóa

- Vàng Việt Nam mua vào: `GOLD:VN:BUY`
- Vàng Việt Nam bán ra: `GOLD:VN:SELL`
- Vàng thế giới: `GC=F`
- Xăng RON92 Việt Nam: `GAS:RON92:VN`
- Xăng RON95 Việt Nam: `GAS:RON95:VN`
- Dầu DO Việt Nam: `GAS:DO:VN`
- Dầu thô: `CL=F`
- Khí tự nhiên: `NG=F`
- Than cốc: `ICEEUR:NCF1!`
- Thép D10 Việt Nam: `STEEL:D10:VN`
- Thép HRC quốc tế: `COMEX:HRC1!`
- Quặng sắt: `COMEX:TIO1!`
- Phân ure: `CBOT:UME1!`
- Đậu tương: `ZM=F`
- Ngô: `ZC=F`
- Đường: `SB=F`
- Heo hơi miền Bắc Việt Nam: `PIG:NORTH:VN`
- Heo hơi Trung Quốc: `PIG:CHINA`

### A. Vàng thế giới

Ví dụ query:

```text
ticker=GC=F&interval=1d&type=commodity&from=1776297600&to=1776733200
```

Mẫu phản hồi:

```json
{
  "status": 200,
  "message": "Success",
  "data": [
    [1776297600, 4813.6, 4861.3, 4792.1, 4808.3, 106170.0],
    [1776384000, 4811.8, 4917.7, 4785.9, 4879.6, 130529.0]
  ]
}
```

### B. Vàng Việt Nam mua vào

Ví dụ query:

```text
ticker=GOLD:VN:BUY&interval=1d&type=commodity&from=1776297600&to=1776733200
```

Mẫu phản hồi:

```json
{
  "status": 200,
  "message": "Success",
  "data": [
    [1776297600, null, null, null, 167700.0, null],
    [1776384000, null, null, null, 167500.0, null]
  ]
}
```

Ghi chú:

- Với một số chuỗi giá nội địa, API chỉ có `close`, còn `open/high/low/volume` sẽ là `null`.

Node.js:

```js
const res = await requestJson(
  "https://api.simplize.vn/api/historical/prices/ohlcv",
  {
    headers: {
      Accept: "application/json",
      "User-Agent": "vns_market_data/1.0"
    },
    query: {
      ticker: "GC=F",
      interval: "1d",
      type: "commodity",
      from: 1776297600,
      to: 1776733200
    }
  }
);
```

## 4.3. Ghi chú phân loại

- Hàng hóa dạng **nghiên cứu / chuỗi ngày** nên ưu tiên `SPL`.
- Ngoại hối, hàng hóa và chỉ số quốc tế dạng **candle / tick intraday** đã có ở:
  - `2.7 Dukascopy`
  - `2.8 FXSB`
  - `2.9 Binance`

## 5. Phân Tích Chuyên Sâu

## 5.1. VNDIRECT: Top movers / ranking

### A. Endpoint top stock dùng chung

- Method: `GET`
- URL: `https://api-finfo.vndirect.com.vn/v4/top_stocks`
- Query chung:
  - `q=<biểu thức lọc>`
  - `size=<limit>`
  - `sort=<field>`

Mapping chỉ số:

- `VNINDEX` -> `VNIndex`
- `HNX` -> `HNX`
- `VN30` -> `VN30`

Mẫu phản hồi:

```json
{
  "data": [
    {
      "code": "VVS",
      "index": "VNINDEX",
      "lastPrice": 133.7,
      "lastUpdated": "2026-04-20 10:13",
      "priceChgCr1D": 8.699999999999989,
      "priceChgPctCr1D": 6.959999999999988,
      "accumulatedVal": 2821070000.0,
      "nmVolumeAvgCr20D": 231810.0,
      "nmVolNmVolAvg20DPctCr": 9.10228204132695
    }
  ],
  "currentPage": 1,
  "size": 3,
  "totalElements": 150,
  "totalPages": 50
}
```

Các mẫu query phổ biến:

- `gainer`

```text
q=index:VNIndex~nmVolumeAvgCr20D:gte:10000~priceChgPctCr1D:gt:0
sort=priceChgPctCr1D
```

- `loser`

```text
q=index:VNIndex~nmVolumeAvgCr20D:gte:10000~priceChgPctCr1D:lt:0
sort=priceChgPctCr1D:asc
```

- `value`

```text
q=index:VNIndex~accumulatedVal:gt:0
sort=accumulatedVal
```

- `volume`

```text
q=index:VNIndex~nmVolumeAvgCr20D:gte:10000~nmVolNmVolAvg20DPctCr:gte:100
sort=nmVolNmVolAvg20DPctCr
```

- `deal`

```text
q=index:VNIndex~nmVolumeAvgCr20D:gte:10000
sort=ptVolTotalVolAvg20DPctCr
```

Node.js:

```js
const res = await requestJson(
  "https://api-finfo.vndirect.com.vn/v4/top_stocks",
  {
    headers: HEADERS.VND,
    query: {
      q: "index:VNIndex~nmVolumeAvgCr20D:gte:10000~priceChgPctCr1D:gt:0",
      size: 10,
      sort: "priceChgPctCr1D"
    }
  }
);
```

### B. Khối ngoại mua / bán ròng

- Method: `GET`
- URL: `https://api-finfo.vndirect.com.vn/v4/foreigns`
- Query:
  - `q=type:STOCK,IFC,ETF~netVal:gt:0~tradingDate:2026-04-17`
  - `sort=tradingDate~netVal:desc`
  - `size=10`
  - `fields=code,netVal,tradingDate`

Mẫu phản hồi `foreign_buy`:

```json
{
  "data": [
    { "code": "VIC", "tradingDate": "2026-04-17", "netVal": 314591460800.0 },
    { "code": "MWG", "tradingDate": "2026-04-17", "netVal": 194883512400.0 },
    { "code": "MSN", "tradingDate": "2026-04-17", "netVal": 98851501600.0 }
  ],
  "totalElements": 139
}
```

Mẫu phản hồi `foreign_sell`:

```json
{
  "data": [
    { "code": "VIX", "tradingDate": "2026-04-17", "netVal": -66905070000.0 },
    { "code": "CII", "tradingDate": "2026-04-17", "netVal": -52425653800.0 },
    { "code": "SSI", "tradingDate": "2026-04-17", "netVal": -48925240650.0 }
  ],
  "totalElements": 193
}
```

## 5.2. VCI / Vietcap: Screener criteria

- Method: `GET`
- URL: `https://iq.vietcap.com.vn/api/iq-insight-service/v1/screening/criteria`
- Headers nên dùng: `HEADERS.VCI_SCREENER`

Mẫu phản hồi:

```json
{
  "status": 200,
  "successful": true,
  "data": [
    {
      "category": "general",
      "name": "sectorLv1",
      "order": 1,
      "selectType": "multiple",
      "conditionOptions": [
        { "type": "value", "viName": "Dịch vụ Tiêu dùng", "enName": "Consumer Services", "value": "5000" },
        { "type": "value", "viName": "Nguyên vật liệu", "enName": "Basic Materials", "value": "1000" }
      ]
    }
  ]
}
```

Ý nghĩa:

- Dùng để lấy toàn bộ danh sách tiêu chí lọc khả dụng.
- Đây là nguồn tốt nhất để sinh UI filter hoặc auto-map bộ lọc trong Node.js.

## 5.3. VCI / Vietcap: Screener paging

- Method: `POST`
- URL: `https://iq.vietcap.com.vn/api/iq-insight-service/v1/screening/paging`
- Headers: `HEADERS.VCI_SCREENER`

Payload tối giản chạy được:

```json
{
  "page": 0,
  "pageSize": 3,
  "sortFields": [],
  "sortOrders": [],
  "filter": [
    {
      "name": "sectorLv1",
      "conditionOptions": [
        { "type": "value", "value": "1000" },
        { "type": "value", "value": "3000" },
        { "type": "value", "value": "2000" }
      ]
    },
    {
      "name": "exchange",
      "conditionOptions": [
        { "type": "value", "value": "hsx" },
        { "type": "value", "value": "hnx" },
        { "type": "value", "value": "upcom" }
      ]
    },
    {
      "name": "marketCap",
      "conditionOptions": [{ "from": 0, "to": 2000000000000000 }]
    },
    {
      "name": "marketPrice",
      "conditionOptions": [{ "from": 0, "to": 2000000 }]
    },
    {
      "name": "ttmPe",
      "conditionOptions": [{ "from": 0, "to": 100 }]
    },
    {
      "name": "ttmPb",
      "conditionOptions": [{ "from": 0, "to": 100 }]
    },
    {
      "name": "ttmRoe",
      "conditionOptions": [{ "from": -50, "to": 50 }]
    }
  ]
}
```

Mẫu phản hồi:

```json
{
  "status": 200,
  "successful": true,
  "data": {
    "content": [
      {
        "ticker": "A32",
        "exchange": "UPCOM",
        "refPrice": 33100.0,
        "ceiling": 38000.0,
        "marketPrice": 33100.0,
        "floor": 28200.0,
        "accumulatedValue": 0.0,
        "accumulatedVolume": 0.0,
        "marketCap": 225080000000.0,
        "dailyPriceChangePercent": 0.0,
        "adtv30Days": 3502996.6666666665,
        "avgVolume30Days": 104.93333333333334,
        "ttmPe": 4.4244110032,
        "ttmPb": 0.9753350362,
        "ttmRoe": 22.51526455,
        "viOrganName": "Công ty Cổ phần 32",
        "viSector": "Hàng cá nhân & Gia dụng",
        "stockStrength": 45
      }
    ]
  }
}
```

Ghi chú:

- Đây là route rất mạnh nếu bạn muốn tự dựng bộ lọc đa tiêu chí.
- Có thể lọc đồng thời theo định giá, thanh khoản, tăng trưởng, kỹ thuật.

## 5.4. Báo cáo phân tích doanh nghiệp

- Method: `POST`
- URL: `https://trading.vietcap.com.vn/data-mt/graphql`
- Query GraphQL tối thiểu:

```json
{
  "query": "query Query($ticker: String!, $lang: String!) { AnalysisReportFiles(ticker: $ticker, langCode: $lang) { date description link name } }",
  "variables": {
    "ticker": "TCB",
    "lang": "vi"
  }
}
```

Kết quả kiểm tra thực tế:

```json
{}
```

Ghi chú:

- Route này có dấu hiệu không ổn định ở thời điểm kiểm tra.
- Nếu bạn chỉ cần `targetPrice`, `projectedTsrPercentage`, `upsideToTpPercentage`, route `search-bar` ở mục `1.1.D` hiện ổn định hơn.

## 6. Thống Kê & Định Giá

## 6.1. VNDIRECT: định giá thị trường PE / PB

### Endpoint dùng chung

- Method: `GET`
- URL: `https://api-finfo.vndirect.com.vn/v4/ratios`
- Query:
  - `q=ratioCode:<RATIO>~code:<INDEX>~reportDate:gte:<YYYY-MM-DD>`
  - `sort=reportDate:desc`
  - `size=10000`
  - `fields=value,reportDate`

Mã chỉ số đã kiểm tra hoạt động:

- `VNINDEX`
- `VNIndex`
- `HNX`
- `VN30`

### A. P/E thị trường

- `ratioCode=PRICE_TO_EARNINGS`

Mẫu phản hồi:

```json
{
  "data": [
    { "reportDate": "2026-04-17", "value": 15.108386035837569 },
    { "reportDate": "2026-04-16", "value": 15.13341857365099 }
  ],
  "currentPage": 1,
  "size": 3,
  "totalElements": 319,
  "totalPages": 107
}
```

### B. P/B thị trường

- `ratioCode=PRICE_TO_BOOK`

Mẫu phản hồi:

```json
{
  "data": [
    { "reportDate": "2026-04-17", "value": 2.174561541134308 },
    { "reportDate": "2026-04-16", "value": 2.1813692297137477 }
  ],
  "currentPage": 1,
  "size": 3,
  "totalElements": 319,
  "totalPages": 107
}
```

### C. Evaluation

- Không có endpoint riêng.
- `evaluation` là kết quả ghép:
  - một call `PRICE_TO_EARNINGS`
  - một call `PRICE_TO_BOOK`
  - join theo `reportDate`

Node.js:

```js
const pe = await requestJson(
  "https://api-finfo.vndirect.com.vn/v4/ratios",
  {
    headers: HEADERS.VND,
    query: {
      q: "ratioCode:PRICE_TO_EARNINGS~code:VNINDEX~reportDate:gte:2025-01-01",
      sort: "reportDate:desc",
      size: 10000,
      fields: "value,reportDate"
    }
  }
);

const pb = await requestJson(
  "https://api-finfo.vndirect.com.vn/v4/ratios",
  {
    headers: HEADERS.VND,
    query: {
      q: "ratioCode:PRICE_TO_BOOK~code:VNINDEX~reportDate:gte:2025-01-01",
      sort: "reportDate:desc",
      size: 10000,
      fields: "value,reportDate"
    }
  }
);
```

## 6.2. VCI / Vietcap: thống kê doanh nghiệp

### A. Statistics financial

- Method: `GET`
- URL: `https://iq.vietcap.com.vn/api/iq-insight-service/v1/company/{symbol}/statistics-financial`

Mẫu phản hồi:

```json
{
  "data": [
    {
      "year": "2018",
      "quarter": 2,
      "ratioType": "RATIO_TTM",
      "marketCap": 97205262048000.0,
      "pe": 10.8486033885,
      "pb": 2.0494710047,
      "roe": 0.2560279145,
      "roa": 0.0312549251,
      "grossMargin": 0.7111113932,
      "debtToEquity": 5.3337203222
    }
  ]
}
```

### B. Metrics dictionary

- Method: `GET`
- URL: `https://iq.vietcap.com.vn/api/iq-insight-service/v1/company/{symbol}/financial-statement/metrics`

Mẫu phản hồi:

```json
{
  "data": {
    "BALANCE_SHEET": [
      {
        "level": 1,
        "parent": null,
        "titleEn": "TOTAL ASSETS",
        "titleVi": "TỔNG TÀI SẢN",
        "field": "bsa53",
        "name": "BSA53"
      }
    ]
  }
}
```

### C. Price history summary

- Method: `GET`
- URL: `https://iq.vietcap.com.vn/api/iq-insight-service/v1/company/{symbol}/price-history-summary`
- Query:
  - `timeFrame=ONE_DAY`
  - `page=0`
  - `size=5`

Mẫu phản hồi:

```json
{
  "data": {
    "averageMatchVolume": 8821403.53,
    "averageMatchValue": 309911480831.7,
    "totalMatchVolume": 17360522149.0,
    "totalDealVolume": 5605727020.0,
    "foreignBuyVolumeTotal": 1710019433.0,
    "foreignSellVolumeTotal": 1700800226.0
  }
}
```

Ý nghĩa:

- Đây là route thống kê tổng hợp rất hữu ích để tính thanh khoản trung bình, quy mô giao dịch và hoạt động khối ngoại.

## 6.3. KBS / KB Securities: nhóm chỉ số định giá

- Method: `GET`
- URL: `https://kbbuddywts.kbsec.com.vn/iis-server/investment/stock/finance-info/{symbol}`
- Query:
  - `page=1`
  - `pageSize=1`
  - `type=CSTC`
  - `unit=1000`
  - `termtype=2`
  - `languageid=1`

Mẫu phản hồi:

```json
{
  "Head": [
    {
      "YearPeriod": 2025,
      "TermCode": "Q4",
      "TermName": "Quý 4",
      "ReportDate": "2026-01-20T00:00:00"
    }
  ],
  "Content": {
    "Nhóm chỉ số Định giá": [
      {
        "Name": "Thu nhập trên mỗi cổ phần của 4 quý gần nhất (EPS)",
        "NameEn": "Trailing EPS",
        "Unit": "VNĐ",
        "Value1": 3506.16
      },
      {
        "Name": "Giá trị sổ sách của cổ phiếu (BVPS)",
        "NameEn": "Book value per share (BVPS)",
        "Unit": "VNĐ",
        "Value1": 21791.35
      }
    ]
  }
}
```

Ghi chú:

- Đây là route hợp lý nếu bạn muốn lấy các chỉ số định giá theo dạng báo cáo đọc được ngay.
- Các nhóm con trong `Content` có thể bao gồm định giá, hiệu quả, đòn bẩy và các tỷ suất tài chính khác tùy doanh nghiệp.

## 7. Ghi Chú Thực Chiến

### 7.1. Các route đang có vấn đề

- `https://trading.vietcap.com.vn/data-mt/graphql` hiện trả `200` nhưng có thể trả `{}`.
- `https://kbbuddywts.kbsec.com.vn/sas/kbsv-stock-data-store/stock/trading-margin` hiện trả `404`.
- `https://api.fmarket.vn/res/get-nav-history` hiện `404`, route đúng là `https://api.fmarket.vn/res/product/get-nav-history`.
- Bộ route lịch sử cũ của CafeF có dấu hiệu không còn dùng ổn định.

### 7.2. Những điểm phải tự xử lý trong Node.js

- Dukascopy: cần tự giải mã dữ liệu delta-encoded.
- FXSB: cần tải file nhị phân `.lb.gz`, giải nén `gzip`, rồi parse buffer.
- KBS: nhiều endpoint `POST` yêu cầu header gần giống trình duyệt thật hơn `GET`.
- VCI / MAS / VND / Binance: trả JSON thẳng, dễ gọi hơn nhiều.

### 7.3. Gợi ý tổ chức code Node.js

- Tách theo nguồn: `vci.js`, `kbs.js`, `mas.js`, `fmarket.js`, `vnd.js`, `dukascopy.js`, `fxsb.js`, `binance.js`
- Tách theo loại dữ liệu:
  - `reference/`
  - `market/`
  - `fundamental/`
- Chuẩn hóa đầu ra về cùng schema:
  - `time`
  - `symbol`
  - `open`
  - `high`
  - `low`
  - `close`
  - `volume`
  - `price`
  - `bid_*`
  - `ask_*`

### 7.4. Nguồn nào nên ưu tiên

- Dữ liệu tham chiếu trong nước:
  - ưu tiên `VCI` và `KBS`
- Dữ liệu giao dịch cổ phiếu Việt Nam:
  - ưu tiên `KBS` cho tape / board
  - ưu tiên `VCI` cho lịch sử, tự doanh, nội bộ
- Dữ liệu cơ bản:
  - ưu tiên `MAS` hoặc `KBS` nếu muốn format báo cáo đọc được
  - ưu tiên `VCI` nếu muốn data field-level để tự map chỉ tiêu
- Dữ liệu quỹ:
  - ưu tiên `FMARKET`
- Quốc tế:
  - `Dukascopy`, `FXSB`, `Binance`
