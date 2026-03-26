# 💹 Bảng Giá & Giao Dịch Realtime (Trading)

Bảng giá realtime, dữ liệu bid/ask, thống kê giao dịch trong ngày.

---

## VCI (VietCap)

### Bảng giá realtime

```
POST https://trading.vietcap.com.vn/api/price/symbols/getList
```

**Body:**
```json
{
  "symbols": ["VCB", "FPT", "VNM"]
}
```

**Response mẫu:**
```json
[
  {
    "listingInfo": {
      "symbol": "VCB",
      "board": "HOSE",
      "organName": "Vietcombank",
      "enOrganName": "Vietcombank",
      "ceilingPrice": 96500,
      "floorPrice": 88500,
      "referencePrice": 92500,
      "openPrice": 92800,
      "closePrice": 93000,
      "highestPrice": 93500,
      "lowestPrice": 92000,
      "averageMatchVolume2Week": 3500000
    },
    "bidAsk": {
      "symbol": "VCB",
      "session": "CONTINUOUS",
      "bidPrices": [
        {"price": 92400, "volume": 15000},
        {"price": 92300, "volume": 12000},
        {"price": 92200, "volume": 8000}
      ],
      "askPrices": [
        {"price": 92500, "volume": 10000},
        {"price": 92600, "volume": 7000},
        {"price": 92700, "volume": 5000}
      ],
      "totalBidVolume": 35000,
      "totalAskVolume": 22000
    },
    "matchPrice": {
      "symbol": "VCB",
      "matchPrice": 92500,
      "matchVolume": 2500,
      "priceChange": 0,
      "percentPriceChange": 0,
      "totalVolume": 3500000,
      "totalValue": 323750000000,
      "foreignBuyVolume": 150000,
      "foreignSellVolume": 80000
    }
  }
]
```

**Cấu trúc response:**

| Block | Nội dung |
|-------|----------|
| `listingInfo` | Thông tin niêm yết: giá trần/sàn/TC, tên CK |
| `bidAsk` | 3 mức giá mua (bid) & 3 mức giá bán (ask) |
| `matchPrice` | Giá khớp, KL khớp, thay đổi giá, tổng KL/giá trị |

---

## KBS (KB Securities)

### Bảng giá realtime (Price Board)

```
POST https://kbbuddywts.kbsec.com.vn/iis-server/investment/stock/iss
```

**Headers bổ sung:**
```json
{
  "Accept-Language": "en-US,en;q=0.9,vi;q=0.8",
  "x-lang": "vi"
}
```

**Body:**
```json
{
  "code": "ACB,VCB,FPT"
}
```

> `code` là chuỗi các mã CK cách nhau bởi dấu phẩy.

**Response mẫu:**
```json
[
  {
    "SB": "ACB",
    "EX": "HSX",
    "CL": 26700,
    "FL": 23700,
    "RE": 25200,
    "OP": 25300,
    "CP": 25500,
    "HI": 25600,
    "LO": 25100,
    "CH": 300,
    "CHP": 1.19,
    "TT": 12500000,
    "TV": 316250000000,
    "B1": 25400, "V1": 15000,
    "B2": 25300, "V2": 12000,
    "B3": 25200, "V3": 8000,
    "S1": 25500, "U1": 10000,
    "S2": 25600, "U2": 7000,
    "S3": 25700, "U3": 5000,
    "FB": 500000,
    "FS": 300000,
    "FR": 200000
  }
]
```

**Mapping key:**

| Key | Ý nghĩa |
|-----|---------|
| `SB` | Mã CK |
| `EX` | Sàn (`HSX`=HOSE) |
| `CL` | Giá trần |
| `FL` | Giá sàn |
| `RE` | Giá tham chiếu |
| `OP` | Giá mở cửa |
| `CP` | Giá khớp hiện tại |
| `HI` | Giá cao nhất |
| `LO` | Giá thấp nhất |
| `CH` | Thay đổi giá (tuyệt đối) |
| `CHP` | Thay đổi giá (%) |
| `TT` | Tổng KL giao dịch |
| `TV` | Tổng giá trị giao dịch (VND) |
| `B1`, `B2`, `B3` | Giá mua 1, 2, 3 |
| `V1`, `V2`, `V3` | KL mua 1, 2, 3 |
| `S1`, `S2`, `S3` | Giá bán 1, 2, 3 |
| `U1`, `U2`, `U3` | KL bán 1, 2, 3 |
| `FB` | KL nước ngoài mua |
| `FS` | KL nước ngoài bán |
| `FR` | Room nước ngoài còn lại |

**Mapping sàn:**
| API | Chuẩn |
|-----|-------|
| `HSX` | `HOSE` |
| `HNX` | `HNX` |
| `UPCOM` | `UPCOM` |
