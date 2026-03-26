# 🏢 Thông Tin Doanh Nghiệp (Company)

Thông tin tổng quan, cổ đông, ban lãnh đạo, công ty con, sự kiện, tin tức.

---

## VCI (VietCap) — GraphQL

**Tất cả request:**
```
POST https://trading.vietcap.com.vn/data-mt/graphql
```

### 1. Tổng quan công ty

**Body:**
```json
{
  "query": "query Query($ticker: String!) {\n  CompanyListingInfo(ticker: $ticker) {\n    ticker\n    organName\n    enOrganName\n    organShortName\n    icbName3\n    enIcbName3\n    icbName4\n    comTypeCode\n    icbCode1\n    icbCode2\n    icbCode3\n    icbCode4\n    issueShare\n    history\n    companyProfile\n    __typename\n  }\n}",
  "variables": {"ticker": "VCB"}
}
```

> `history` và `companyProfile` chứa HTML, cần strip tags.

### 2. Thông tin giá & chỉ số tài chính nhanh

**Body:**
```json
{
  "query": "query Query($ticker: String!) {\n  TickerPriceInfo(ticker: $ticker) {\n    ticker\n    exchange\n    ceilingPrice\n    floorPrice\n    referencePrice\n    matchPrice\n    closePrice\n    priceChange\n    percentPriceChange\n    highestPrice\n    lowestPrice\n    totalVolume\n    totalValue\n    highestPrice1Year\n    lowestPrice1Year\n    foreignTotalVolume\n    foreignCurrentRoom\n    foreignTotalRoom\n    averageMatchVolume2Week\n    financialRatio {\n      yearReport\n      lengthReport\n      revenue\n      revenueGrowth\n      netProfit\n      netProfitGrowth\n      roe\n      roa\n      pe\n      pb\n      eps\n      currentRatio\n      grossMargin\n      netProfitMargin\n    }\n    __typename\n  }\n}",
  "variables": {"ticker": "VCB"}
}
```

### 3. Cổ đông lớn

**Body:**
```json
{
  "query": "query Query($ticker: String!) {\n  OrganizationShareHolders(ticker: $ticker) {\n    ownerFullName\n    quantity\n    percentage\n    updateDate\n    __typename\n  }\n}",
  "variables": {"ticker": "VCB"}
}
```

### 4. Ban lãnh đạo

**Body:**
```json
{
  "query": "query Query($ticker: String!) {\n  OrganizationManagers(ticker: $ticker) {\n    fullName\n    positionName\n    updateDate\n    percentage\n    quantity\n    __typename\n  }\n}",
  "variables": {"ticker": "VCB"}
}
```

### 5. Công ty con/liên kết

**Body:**
```json
{
  "query": "query Query($ticker: String!) {\n  Subsidiary(ticker: $ticker) {\n    percentage\n    subOrListingInfo {\n      organName\n      enOrganName\n    }\n    __typename\n  }\n}",
  "variables": {"ticker": "VCB"}
}
```

### 6. Sự kiện công ty

**Body:**
```json
{
  "query": "query Query($ticker: String!) {\n  OrganizationEvents(ticker: $ticker) {\n    eventTitle\n    publicDate\n    issueDate\n    eventListCode\n    ratio\n    value\n    recordDate\n    exrightDate\n    eventListName\n    __typename\n  }\n}",
  "variables": {"ticker": "VCB"}
}
```

### 7. Tin tức

**Body:**
```json
{
  "query": "query Query($ticker: String!, $langCode: String!) {\n  News(ticker: $ticker, langCode: $langCode) {\n    newsTitle\n    newsImageUrl\n    newsSourceLink\n    publicDate\n    newsShortContent\n    __typename\n  }\n}",
  "variables": {"ticker": "VCB", "langCode": "vi"}
}
```

### 8. Query tổng hợp (1 request lấy hết)

Kết hợp tất cả query trên vào 1 request duy nhất — chỉ cần nối các query block trong cùng một `query` string. Xem [vietnam_stock_api_reference.md](../vietnam_stock_api_reference.md) để biết full query.

---

## KBS (KB Securities)

### 1. Profile công ty

```
GET https://kbbuddywts.kbsec.com.vn/iis-server/investment/stockinfo/profile/{SYMBOL}?l=1
```

| Param | Type | Mô tả |
|-------|------|--------|
| `l` | int | Ngôn ngữ (`1` = vi) |

**Response key mapping:**

| Key | Ý nghĩa |
|-----|---------|
| `SM` | Mô hình kinh doanh |
| `SB` | Mã CK |
| `FD` | Ngày thành lập |
| `CC` | Vốn điều lệ (VND) |
| `HM` | Số nhân viên |
| `EX` | Sàn (`HSX`=HOSE, `HNX`, `UPCOM`) |
| `LD` | Ngày niêm yết |
| `FV` | Mệnh giá |
| `LP` | Giá niêm yết |
| `VL` | KL niêm yết |
| `CTP` | Tên CEO |
| `ADD` | Địa chỉ |
| `PHONE` | SĐT |
| `EMAIL` | Email |
| `URL` | Website |

**Response cũng chứa các mảng:**
- `Leaders` — Ban lãnh đạo
- `Shareholders` — Cổ đông lớn
- `Subsidiaries` — Công ty con
- `Ownership` — Cơ cấu sở hữu
- `CharterCapital` — Lịch sử vốn điều lệ
- `LaborStructure` — Cơ cấu lao động

### 2. Sự kiện

```
GET https://kbbuddywts.kbsec.com.vn/iis-server/investment/stockinfo/event/{SYMBOL}
```

| Param | Mô tả |
|-------|--------|
| `l` | Ngôn ngữ (`1`=vi) |
| `p` | Trang |
| `s` | Số bản ghi/trang |
| `eID` | Loại: `1`=ĐHCĐ, `2`=Cổ tức, `3`=Phát hành, `4`=GD nội bộ, `5`=Khác |

### 3. Tin tức

```
GET https://kbbuddywts.kbsec.com.vn/iis-server/investment/stockinfo/news/{SYMBOL}?l=1&p=1&s=10
```

### 4. Giao dịch nội bộ

```
GET https://kbbuddywts.kbsec.com.vn/iis-server/investment/stockinfo/news/internal-trading/{SYMBOL}?l=1&p=1&s=10
```
