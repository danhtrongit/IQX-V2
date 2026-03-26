# 📈 Giá Lịch Sử & Khớp Lệnh (Quote)

Dữ liệu OHLCV lịch sử và dữ liệu khớp lệnh trong ngày (intraday).

---

## VCI (VietCap)

### 1. Giá lịch sử OHLCV

```
POST https://trading.vietcap.com.vn/api/chart/OHLCChart/gap-chart
```

**Body:**
```json
{
  "timeFrame": "ONE_DAY",
  "symbols": ["VCB"],
  "to": 1711180800,
  "countBack": 365
}
```

| Field | Type | Bắt buộc | Mô tả |
|-------|------|----------|--------|
| `timeFrame` | string | ✅ | Khung thời gian |
| `symbols` | string[] | ✅ | Mảng mã CK (có thể nhiều mã) |
| `to` | int | ✅ | Unix timestamp kết thúc (giây) |
| `countBack` | int | ✅ | Số nến cần lấy |

**Mapping interval → `timeFrame`:**

| Interval | `timeFrame` | Ghi chú |
|----------|------------|---------|
| `1m` | `ONE_MINUTE` | Dữ liệu gốc |
| `5m` | `ONE_MINUTE` | Cần resample |
| `15m` | `ONE_MINUTE` | Cần resample |
| `30m` | `ONE_MINUTE` | Cần resample |
| `1H` | `ONE_HOUR` | Dữ liệu gốc |
| `1D` | `ONE_DAY` | Dữ liệu gốc |
| `1W` | `ONE_DAY` | Cần resample |
| `1M` | `ONE_DAY` | Cần resample |

**Response mẫu:**
```json
[
  {
    "t": [1704067200, 1704153600, 1704240000],
    "o": [92500, 93000, 92800],
    "h": [93200, 93500, 93100],
    "l": [92000, 92500, 92300],
    "c": [93000, 92800, 93000],
    "v": [5230000, 4800000, 5100000]
  }
]
```

| Key | Ý nghĩa | Đơn vị |
|-----|---------|--------|
| `t` | Unix timestamp | Giây |
| `o` | Giá mở cửa | VND |
| `h` | Giá cao nhất | VND |
| `l` | Giá thấp nhất | VND |
| `c` | Giá đóng cửa | VND |
| `v` | Khối lượng | Cổ phiếu |

> **Lưu ý:** Response là mảng, mỗi phần tử chứa mảng giá trị cho 1 symbol trong `symbols`.

---

### 2. Khớp lệnh Intraday

```
POST https://trading.vietcap.com.vn/api/market-watch/LEData/getAll
```

**Body:**
```json
{
  "symbol": "VCB",
  "limit": 100,
  "truncTime": null
}
```

| Field | Type | Mô tả |
|-------|------|--------|
| `symbol` | string | Mã chứng khoán |
| `limit` | int | Số bản ghi tối đa (~30.000) |
| `truncTime` | int/null | Epoch timestamp (ms) để phân trang. `null` = lấy từ đầu |

**Phân trang:** Dùng `truncTime` của bản ghi cuối cùng làm giá trị cho request tiếp theo.

**Response mẫu:**
```json
[
  {
    "truncTime": 1711090800000,
    "matchPrice": 93500,
    "matchVol": 1200,
    "matchType": "B",
    "id": "unique-trade-id"
  },
  {
    "truncTime": 1711090795000,
    "matchPrice": 93400,
    "matchVol": 800,
    "matchType": "S",
    "id": "unique-trade-id-2"
  }
]
```

| Key | Ý nghĩa |
|-----|---------|
| `truncTime` | Timestamp (milliseconds) |
| `matchPrice` | Giá khớp (VND) |
| `matchVol` | Khối lượng khớp |
| `matchType` | `B` = Mua, `S` = Bán |
| `id` | ID giao dịch duy nhất |

---

## KBS (KB Securities)

### 1. Giá lịch sử OHLCV

#### Cổ phiếu:
```
GET https://kbbuddywts.kbsec.com.vn/iis-server/investment/stocks/{SYMBOL}/data_{INTERVAL}
```

#### Chỉ số:
```
GET https://kbbuddywts.kbsec.com.vn/iis-server/investment/index/{INDEX}/data_{INTERVAL}
```

**Query params:**

| Param | Type | Bắt buộc | Mô tả | Ví dụ |
|-------|------|----------|--------|-------|
| `sdate` | string | ✅ | Ngày bắt đầu (DD-MM-YYYY) | `01-01-2024` |
| `edate` | string | ✅ | Ngày kết thúc (DD-MM-YYYY) | `31-12-2024` |

**Mapping interval → `{INTERVAL}`:**

| Interval | URL suffix | Ví dụ URL |
|----------|-----------|-----------|
| `1m` | `1P` | `/stocks/ACB/data_1P` |
| `5m` | `5P` | `/stocks/ACB/data_5P` |
| `15m` | `15P` | `/stocks/ACB/data_15P` |
| `30m` | `30P` | `/stocks/ACB/data_30P` |
| `1H` | `60P` | `/stocks/ACB/data_60P` |
| `1D` | `day` | `/stocks/ACB/data_day` |
| `1W` | `week` | `/stocks/ACB/data_week` |
| `1M` | `month` | `/stocks/ACB/data_month` |

**Ví dụ đầy đủ:**
```
GET https://kbbuddywts.kbsec.com.vn/iis-server/investment/stocks/ACB/data_day?sdate=01-01-2024&edate=31-12-2024
```

**Response mẫu:**
```json
{
  "data_day": [
    {
      "t": "2024-01-02T00:00:00",
      "o": 25200,
      "h": 25500,
      "l": 25000,
      "c": 25300,
      "v": 12500000,
      "va": 316250000000,
      "re": 25100,
      "cl": 26600,
      "fl": 23600,
      "fb": 500000,
      "fs": 300000,
      "fnet": 200000
    }
  ]
}
```

> ⚠️ **Giá KBS cần chia cho 1000!** VD: `25200` → giá thực = `25.2` (nghìn VND)

| Key | Ý nghĩa | Xử lý |
|-----|---------|-------|
| `t` | Thời gian | Parse datetime |
| `o` | Giá mở cửa | ÷ 1000 |
| `h` | Giá cao nhất | ÷ 1000 |
| `l` | Giá thấp nhất | ÷ 1000 |
| `c` | Giá đóng cửa | ÷ 1000 |
| `v` | Khối lượng | Giữ nguyên |
| `va` | Giá trị giao dịch (VND) | Giữ nguyên |
| `re` | Giá tham chiếu | ÷ 1000 |
| `cl` | Giá trần | ÷ 1000 |
| `fl` | Giá sàn | ÷ 1000 |
| `fb` | KL nước ngoài mua | Giữ nguyên |
| `fs` | KL nước ngoài bán | Giữ nguyên |
| `fnet` | KL nước ngoài ròng | Giữ nguyên |

> **Response key** trùng với URL suffix: `data_day`, `data_week`, `data_1P`...

---

### 2. Khớp lệnh Intraday

```
GET https://kbbuddywts.kbsec.com.vn/iis-server/investment/trade/history/{SYMBOL}
```

> ⚠️ Không hỗ trợ cho chỉ số (index).

**Query params:**

| Param | Type | Mô tả | Mặc định |
|-------|------|--------|----------|
| `page` | int | Số trang | `1` |
| `limit` | int | Số bản ghi/trang | `100` |

**Response mẫu:**
```json
{
  "data": [
    {
      "t": "2024-03-22 14:27:23:15",
      "TD": "22/03/2024",
      "SB": "ACB",
      "FT": "14:27:23",
      "LC": "B",
      "FMP": 25300,
      "FCV": 100,
      "FV": 1500,
      "AVO": 12000000,
      "AVA": 303600000000
    }
  ]
}
```

| Key | Ý nghĩa | Xử lý |
|-----|---------|-------|
| `t` | Full timestamp | Parse (format đặc biệt `HH:MM:SS:ms` dùng `:` thay `.`) |
| `TD` | Ngày giao dịch | DD/MM/YYYY |
| `SB` | Mã CK | — |
| `FT` | Giờ khớp | HH:MM:SS |
| `LC` | Hướng khớp | `B` = Mua, `S` = Bán |
| `FMP` | Giá khớp | ÷ 1000 |
| `FCV` | Thay đổi giá | — |
| `FV` | KL khớp | Giữ nguyên |
| `AVO` | KL tích lũy | Giữ nguyên |
| `AVA` | Giá trị tích lũy | VND |

---

## MSN Finance

### Giá lịch sử

```
GET https://assets.msn.com/service/Finance/Charts?ids={SYMBOL_ID}&timeframe={TIMEFRAME}
```

> Xem [constants.md](./constants.md) để biết mapping `SYMBOL_ID`.

**Response mẫu:**
```json
{
  "timeStamps": [1704067200, 1704153600],
  "openPrices": [92.5, 93.0],
  "pricesHigh": [93.2, 93.5],
  "pricesLow": [92.0, 92.5],
  "prices": [93.0, 92.8],
  "volumes": [5230000, 4800000]
}
```
