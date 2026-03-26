# 📊 Báo Cáo Tài Chính (Financial)

Bảng cân đối kế toán, Kết quả kinh doanh, Lưu chuyển tiền tệ, Chỉ số tài chính.

---

## VCI (VietCap) — GraphQL

**URL:**
```
POST https://trading.vietcap.com.vn/data-mt/graphql
```

### Bước 1: Lấy mapping field codes → tên thực tế

**Body:**
```json
{
  "query": "query Query {\n  ListFinancialRatio {\n    id\n    type\n    name\n    unit\n    isDefault\n    fieldName\n    en_Type\n    en_Name\n    tagName\n    comTypeCode\n    order\n    __typename\n  }\n}\n",
  "variables": {}
}
```

**Response mẫu:**
```json
{
  "data": {
    "ListFinancialRatio": [
      {
        "id": "1",
        "type": "Chỉ tiêu cân đối kế toán",
        "name": "Tổng tài sản",
        "unit": "Tỷ đồng",
        "fieldName": "BSA1",
        "en_Type": "Balance Sheet",
        "en_Name": "Total Assets",
        "comTypeCode": "CT",
        "order": 1
      },
      {
        "id": "2",
        "type": "Chỉ tiêu kết quả kinh doanh",
        "name": "Doanh thu thuần",
        "unit": "Tỷ đồng",
        "fieldName": "ISA1",
        "en_Type": "Income Statement",
        "en_Name": "Net Revenue",
        "comTypeCode": "CT",
        "order": 1
      }
    ]
  }
}
```

**Phân loại `comTypeCode`:**
| Code | Loại | Ý nghĩa |
|------|------|---------|
| `CT` | Company | Dùng cho tất cả công ty |
| `NH` | Bank | Chỉ dùng cho ngân hàng |
| `CK` | Securities | Chỉ dùng cho chứng khoán |
| `BH` | Insurance | Chỉ dùng cho bảo hiểm |

**Phân loại `type` (nhóm báo cáo):**
| Type | Ý nghĩa |
|------|---------|
| `Chỉ tiêu cân đối kế toán` | Balance Sheet |
| `Chỉ tiêu kết quả kinh doanh` | Income Statement |
| `Chỉ tiêu lưu chuyển tiền tệ` | Cash Flow |
| Các type khác | Financial Ratios |

---

### Bước 2: Lấy dữ liệu BCTC

**Body:**
```json
{
  "query": "fragment Ratios on CompanyFinancialRatio {\n  ticker\n  yearReport\n  lengthReport\n  updateDate\n  revenue\n  revenueGrowth\n  netProfit\n  netProfitGrowth\n  roe\n  roa\n  pe\n  pb\n  eps\n  currentRatio\n  grossMargin\n  netProfitMargin\n  BSA1\n  BSA2\n  ISA1\n  ISA2\n  CFA1\n  CFA2\n  __typename\n}\n\nquery Query($ticker: String!, $period: String!) {\n  CompanyFinancialRatio(ticker: $ticker, period: $period) {\n    ratio {\n      ...Ratios\n      __typename\n    }\n    period\n    __typename\n  }\n}\n",
  "variables": {
    "ticker": "VCB",
    "period": "Q"
  }
}
```

| Variable | Giá trị | Mô tả |
|----------|---------|--------|
| `ticker` | `"VCB"` | Mã chứng khoán |
| `period` | `"Q"` hoặc `"Y"` | Quý / Năm |

> ⚠️ **Fragment `Ratios` thực tế rất dài**, chứa hàng trăm field codes (BSA1-BSA210, ISA1-ISA23, ISB25-ISB41, CFA1-CFA38, CFB64-CFB80, ISI64, ISI87, ISI97, ISS141-ISS152, CFS191-CFS210...). Dùng Bước 1 để map các codes này về tên thực tế.

**Response mẫu:**
```json
{
  "data": {
    "CompanyFinancialRatio": {
      "ratio": [
        {
          "ticker": "VCB",
          "yearReport": 2024,
          "lengthReport": 4,
          "revenue": 55000,
          "revenueGrowth": 15.2,
          "netProfit": 28000,
          "roe": 22.5,
          "pe": 12.3,
          "pb": 2.8,
          "eps": 5042,
          "BSA1": 1800000,
          "ISA1": 55000
        },
        {
          "ticker": "VCB",
          "yearReport": 2024,
          "lengthReport": 3,
          "revenue": 48000,
          "netProfit": 24000
        }
      ],
      "period": "Q"
    }
  }
}
```

| Field | Ý nghĩa |
|-------|---------|
| `yearReport` | Năm báo cáo |
| `lengthReport` | Kỳ (1-4 cho quý, 5 cho năm) |
| `BSA*` | Balance Sheet items |
| `ISA*`, `ISB*`, `ISS*`, `ISI*` | Income Statement items |
| `CFA*`, `CFB*`, `CFS*` | Cash Flow items |

---

## KBS (KB Securities)

### Endpoint chung

```
GET https://kbbuddywts.kbsec.com.vn/sas/kbsv-stock-data-store/stock/finance-info/{SYMBOL}
```

### Params

| Param | Type | Bắt buộc | Mô tả | Giá trị |
|-------|------|----------|--------|---------|
| `page` | int | ✅ | Trang | `1` |
| `pageSize` | int | ✅ | Số kỳ mỗi trang | `4`, `8` |
| `type` | string | ✅ | Loại báo cáo | Xem bảng dưới |
| `unit` | int | ✅ | Đơn vị | `1000` (nghìn VND) |
| `termtype` | int | ✅ | Loại kỳ | `1`=năm, `2`=quý |
| `languageid` | int | ✅ | Ngôn ngữ | `1` (vi) |

### Loại báo cáo (`type`)

| `type` | Tên VI | Tên EN |
|--------|--------|--------|
| `CDKT` | Cân đối kế toán | Balance Sheet |
| `KQKD` | Kết quả kinh doanh | Income Statement |
| `LCTT` | Lưu chuyển tiền tệ | Cash Flow |
| `CSTC` | Chỉ số tài chính | Financial Ratios |

> ⚠️ Riêng `LCTT` (Cash Flow), cần thêm param `code={SYMBOL}` và dùng `termType` (camelCase) thay vì `termtype`.

### Ví dụ: Kết quả kinh doanh hàng năm

```
GET https://kbbuddywts.kbsec.com.vn/sas/kbsv-stock-data-store/stock/finance-info/ACB?page=1&pageSize=8&type=KQKD&unit=1000&termtype=1&languageid=1
```

### Response mẫu

```json
{
  "Audit": [
    {"AuditedStatusCode": 1, "Description": "Đã kiểm toán"}
  ],
  "Unit": [{"Unit": "Nghìn đồng"}],
  "Head": [
    {
      "YearPeriod": 2024,
      "TermName": "",
      "TermNameEN": "",
      "AuditedStatus": 1,
      "ReportDate": "2025-03-15"
    },
    {
      "YearPeriod": 2023,
      "TermName": "",
      "AuditedStatus": 1
    }
  ],
  "Content": {
    "Kết quả kinh doanh": [
      {
        "ID": 1,
        "Name": "Doanh thu bán hàng và cung cấp dịch vụ",
        "NameEn": "Net Revenue",
        "Unit": "Nghìn đồng",
        "Levels": 0,
        "Value1": 55000000000,
        "Value2": 48000000000,
        "Value3": 42000000000,
        "Value4": 38000000000,
        "RowNumber": null
      },
      {
        "ID": 2,
        "Name": "Giá vốn hàng bán",
        "NameEn": "Cost of Goods Sold",
        "Unit": "Nghìn đồng",
        "Levels": 0,
        "Value1": 35000000000,
        "Value2": 31000000000,
        "Value3": null,
        "Value4": null
      }
    ]
  }
}
```

### Cấu trúc response

| Key | Ý nghĩa |
|-----|---------|
| `Audit` | Trạng thái kiểm toán |
| `Unit` | Đơn vị tiền tệ |
| `Head` | Thông tin các kỳ báo cáo |
| `Content` | Dữ liệu chính, key là tên nhóm |

**Content keys theo `type`:**

| `type` | Content key |
|--------|------------|
| `CDKT` | `"Cân đối kế toán"` |
| `KQKD` | `"Kết quả kinh doanh"` |
| `LCTT` | `"Lưu chuyển tiền tệ gián tiếp"` hoặc `"Lưu chuyển tiền tệ trực tiếp"` |
| `CSTC` | `"Nhóm chỉ số Định giá"`, `"Nhóm chỉ số Sinh lợi"`, `"Nhóm chỉ số Tăng trưởng"`, `"Nhóm chỉ số Thanh khoản"`, `"Nhóm chỉ số Chất lượng tài sản"` |

**Mỗi item trong Content:**

| Key | Ý nghĩa |
|-----|---------|
| `ID` | Thứ tự dòng |
| `Name` | Tên chỉ tiêu (VI) |
| `NameEn` | Tên chỉ tiêu (EN) |
| `Unit` | Đơn vị |
| `Levels` | Mức phân cấp (0=gốc, 1=con) |
| `Value1` | Giá trị kỳ 1 (mới nhất, tương ứng Head[0]) |
| `Value2` | Giá trị kỳ 2 (tương ứng Head[1]) |
| `Value3` | Giá trị kỳ 3 |
| `Value4` | Giá trị kỳ 4 |

### Ví dụ: Cash Flow hàng quý

```
GET https://kbbuddywts.kbsec.com.vn/sas/kbsv-stock-data-store/stock/finance-info/ACB?page=1&pageSize=8&type=LCTT&unit=1000&termType=2&code=ACB
```

> Lưu ý: LCTT dùng `termType` (camelCase) thay vì `termtype`, và cần thêm `code`.

### Ví dụ: Chỉ số tài chính hàng năm

```
GET https://kbbuddywts.kbsec.com.vn/sas/kbsv-stock-data-store/stock/finance-info/ACB?page=1&pageSize=8&type=CSTC&unit=1000&termtype=1&languageid=1
```

Response chứa 5 nhóm chỉ số trong `Content`:
- Định giá (PE, PB, EPS...)
- Sinh lợi (ROE, ROA, Margin...)
- Tăng trưởng
- Thanh khoản
- Chất lượng tài sản
