# 📋 Thông Tin Niêm Yết (Listing)

Danh sách mã chứng khoán, phân ngành ICB, nhóm chỉ số.

---

## VCI (VietCap)

### 1. Tất cả mã theo sàn

```
GET https://trading.vietcap.com.vn/api/price/symbols/getAll
```

**Không cần params.**

**Response mẫu:**
```json
[
  {
    "symbol": "VCB",
    "board": "HOSE",
    "type": "STOCK",
    "organName": "Ngân hàng TMCP Ngoại thương Việt Nam",
    "enOrganName": "Joint Stock Commercial Bank for Foreign Trade of Vietnam",
    "organShortName": "Vietcombank",
    "enOrganShortName": "Vietcombank",
    "id": 123
  },
  {
    "symbol": "FPT",
    "board": "HOSE",
    "type": "STOCK",
    "organName": "CTCP FPT",
    "enOrganName": "FPT Corporation",
    "organShortName": "FPT",
    "enOrganShortName": "FPT",
    "id": 456
  }
]
```

---

### 2. Mã theo nhóm chỉ số

```
GET https://trading.vietcap.com.vn/api/price/symbols/getByGroup?group={GROUP}
```

| Param | Type | Mô tả |
|-------|------|--------|
| `group` | string | Tên nhóm |

**Giá trị `group` hỗ trợ:**

| Group | Mô tả |
|-------|--------|
| `VN30` | 30 CP vốn hóa lớn nhất HOSE |
| `VN100` | 100 CP vốn hóa lớn nhất HOSE |
| `VNMidCap` | Mid-Cap Index |
| `VNSmallCap` | Small-Cap Index |
| `VNAllShare` | Tất cả HOSE + HNX |
| `HOSE` | Sàn HOSE |
| `HNX` | Sàn HNX |
| `UPCOM` | Sàn UPCOM |
| `HNX30` | 30 CP HNX |
| `ETF` | Quỹ ETF |
| `FU_INDEX` | Phái sinh chỉ số |
| `FU_BOND` | Phái sinh trái phiếu |
| `BOND` | Trái phiếu |
| `CW` | Chứng quyền |

**Response mẫu:**
```json
[
  {"symbol": "ACB"},
  {"symbol": "BID"},
  {"symbol": "CTG"},
  {"symbol": "FPT"}
]
```

---

### 3. Phân ngành ICB (GraphQL)

```
POST https://trading.vietcap.com.vn/data-mt/graphql
```

**Body:**
```json
{
  "query": "{\n  CompaniesListingInfo {\n    ticker\n    organName\n    enOrganName\n    icbName3\n    enIcbName3\n    icbName2\n    enIcbName2\n    icbName4\n    enIcbName4\n    comTypeCode\n    icbCode1\n    icbCode2\n    icbCode3\n    icbCode4\n    __typename\n  }\n}\n",
  "variables": {}
}
```

**Response mẫu:**
```json
{
  "data": {
    "CompaniesListingInfo": [
      {
        "ticker": "VCB",
        "organName": "Ngân hàng TMCP Ngoại thương Việt Nam",
        "enOrganName": "Vietcombank",
        "icbName3": "Ngân hàng",
        "enIcbName3": "Banks",
        "icbName2": "Tài chính",
        "enIcbName2": "Financial Services",
        "icbName4": "Ngân hàng",
        "enIcbName4": "Banks",
        "comTypeCode": "NH",
        "icbCode1": "8000",
        "icbCode2": "8300",
        "icbCode3": "8350",
        "icbCode4": "8355"
      }
    ]
  }
}
```

**Phân loại `comTypeCode`:**

| Code | Ý nghĩa |
|------|---------|
| `CT` | Công ty (Company) |
| `CK` | Chứng khoán (Securities) |
| `NH` | Ngân hàng (Bank) |
| `BH` | Bảo hiểm (Insurance) |

---

### 4. Danh sách ICB Code (GraphQL)

```
POST https://trading.vietcap.com.vn/data-mt/graphql
```

**Body:**
```json
{
  "query": "query Query {\n  ListIcbCode {\n    icbCode\n    level\n    icbName\n    enIcbName\n    __typename\n  }\n  CompaniesListingInfo {\n    ticker\n    icbCode1\n    icbCode2\n    icbCode3\n    icbCode4\n    __typename\n  }\n}",
  "variables": {}
}
```

**Response mẫu:**
```json
{
  "data": {
    "ListIcbCode": [
      {
        "icbCode": "8000",
        "level": 1,
        "icbName": "Tài chính",
        "enIcbName": "Financials"
      },
      {
        "icbCode": "8300",
        "level": 2,
        "icbName": "Ngân hàng",
        "enIcbName": "Banks"
      }
    ],
    "CompaniesListingInfo": [
      {
        "ticker": "VCB",
        "icbCode1": "8000",
        "icbCode2": "8300",
        "icbCode3": "8350",
        "icbCode4": "8355"
      }
    ]
  }
}
```

---

## KBS (KB Securities)

### 1. Tìm kiếm tất cả mã

```
GET https://kbbuddywts.kbsec.com.vn/iis-server/investment/stock/search/data
```

**Không cần params.**

**Response mẫu:**
```json
[
  {
    "symbol": "ACB",
    "name": "Ngân hàng TMCP Á Châu",
    "nameEn": "Asia Commercial Joint Stock Bank",
    "exchange": "HOSE",
    "type": "stock",
    "index": 1,
    "re": 25200,
    "ceiling": 26700,
    "floor": 23700
  }
]
```

> **Lưu ý:** `re`, `ceiling`, `floor` đơn vị VND (đã nhân 1000).

---

### 2. Mã theo nhóm chỉ số

```
GET https://kbbuddywts.kbsec.com.vn/iis-server/investment/index/{GROUP_CODE}/stocks
```

**Mapping `group` → `GROUP_CODE`:**

| Group | Code | Mô tả |
|-------|------|--------|
| `HOSE` | `HOSE` | Sàn HOSE |
| `HNX` | `HNX` | Sàn HNX |
| `UPCOM` | `UPCOM` | Sàn UPCOM |
| `VN30` | `30` | VN30 Index |
| `VN100` | `100` | VN100 Index |
| `VNMidCap` | `MID` | Mid-Cap |
| `VNSmallCap` | `SML` | Small-Cap |
| `VNSI` | `SI` | Vietnam Small-Cap Index |
| `VNX50` | `X50` | VNX50 Index |
| `VNXALL` | `XALL` | VNX All Index |
| `VNALL` | `ALL` | VN All |
| `HNX30` | `HNX30` | HNX30 Index |
| `ETF` | `FUND` | ETF/Quỹ |
| `CW` | `CW` | Chứng quyền |
| `BOND` | `BOND` | Trái phiếu |
| `FU_INDEX` | `DER` | Phái sinh |

**Response mẫu:**
```json
{
  "status": 200,
  "data": ["ACB", "BID", "CTG", "FPT", "HPG"]
}
```

---

### 3. Danh sách ngành

```
GET https://kbbuddywts.kbsec.com.vn/iis-server/investment/sector/all
```

**Response mẫu:**
```json
[
  {"code": 11, "name": "Ngân hàng"},
  {"code": 3, "name": "Bất động sản"},
  {"code": 5, "name": "Chứng khoán"},
  {"code": 19, "name": "Thực phẩm - Đồ uống"}
]
```

---

### 4. Mã theo ngành

```
GET https://kbbuddywts.kbsec.com.vn/iis-server/investment/sector/stock?code={CODE}&l=1
```

| Param | Type | Mô tả |
|-------|------|--------|
| `code` | int | Mã ngành (từ endpoint danh sách ngành) |
| `l` | int | Ngôn ngữ (`1` = vi) |

**Response mẫu:**
```json
{
  "stocks": [
    {"sb": "ACB"},
    {"sb": "BID"},
    {"sb": "CTG"},
    {"sb": "VCB"}
  ]
}
```
