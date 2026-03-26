# 📘 Constants & Mapping

Các bảng tra cứu mã ngành, chỉ số, symbol IDs dùng cho các API.

---

## 1. Chỉ số thị trường Việt Nam

| Symbol | ID | Mô tả |
|--------|-----|--------|
| `VN30` | 5 | 30 CP vốn hóa lớn nhất & thanh khoản tốt nhất HOSE |
| `VNMID` | 6 | Mid-Cap Index |
| `VNSML` | 7 | Small-Cap Index |
| `VN100` | 8 | 100 CP vốn hóa lớn nhất HOSE |
| `VNALL` | 9 | Tất cả CP trên HOSE và HNX |
| `VNDIAMOND` | 2 | CP triển vọng đầu ngành |
| `VNFINLEAD` | 3 | CP tài chính đầu ngành |
| `VNFINSELECT` | 4 | CP tài chính chọn lọc |

---

## 2. Phân ngành ICB (VCI)

| Sector ID | Ngành |
|-----------|-------|
| 126 | Dịch vụ viễn thông |
| 130 | Hàng tiêu dùng |
| 133 | Hàng tiêu dùng thiết yếu |
| 135 | Chăm sóc sức khoẻ |
| 138 | Tài chính |
| 143 | Nguyên vật liệu |
| 150 | Dịch vụ tiện ích |
| 154 | Năng lượng |
| 155 | Công nghiệp |
| 159 | Công nghệ thông tin |
| 166 | Bất động sản |

---

## 3. Phân ngành KBS

| Code | Ngành |
|------|-------|
| 1 | Bán buôn |
| 2 | Bảo hiểm |
| 3 | Bất động sản |
| 5 | Chứng khoán |
| 6 | Công nghệ và thông tin |
| 7 | Bán lẻ |
| 8 | Chăm sóc sức khỏe |
| 10 | Khai khoáng |
| 11 | Ngân hàng |
| 12 | Nông - Lâm - Ngư |
| 15 | SX Thiết bị, máy móc |
| 19 | Thực phẩm - Đồ uống |
| 21 | Vật liệu xây dựng |
| 22 | Tiện ích |
| 23 | Vận tải - kho bãi |
| 24 | Xây dựng |

---

## 4. KBS Group Mapping

| Group name | API code | Mô tả |
|------------|----------|--------|
| `HOSE` | `HOSE` | Sàn HOSE |
| `HNX` | `HNX` | Sàn HNX |
| `UPCOM` | `UPCOM` | Sàn UPCOM |
| `VN30` | `30` | VN30 Index |
| `VN100` | `100` | VN100 Index |
| `VNMidCap` | `MID` | Mid-Cap |
| `VNSmallCap` | `SML` | Small-Cap |
| `VNSI` | `SI` | Vietnam Small-Cap Index |
| `VNX50` | `X50` | VNX50 |
| `VNXALL` | `XALL` | VNX All |
| `VNALL` | `ALL` | VN All |
| `HNX30` | `HNX30` | HNX30 |
| `ETF` | `FUND` | ETF/Quỹ |
| `CW` | `CW` | Chứng quyền |
| `BOND` | `BOND` | Trái phiếu |
| `FU_INDEX` | `DER` | Phái sinh |

---

## 5. KBS Chỉ số (Index Mapping)

Các chỉ số hỗ trợ khi truy vấn giá lịch sử qua KBS endpoint `/index/{INDEX}/data_{interval}`:

| Symbol | Mô tả |
|--------|--------|
| `VNINDEX` | VN Index |
| `VN30` | VN30 Index |
| `VN100` | VN100 |
| `VNMIDCAP` | VNMidCap |
| `VNSMALLCAP` | VNSmallCap |
| `VNALLSHARE` | VNAllShare |
| `HNX` | HNX Index |
| `HNX30` | HNX30 |
| `UPCOM` | UPCOM Index |
| `VNX50` | VNX50 |
| `VNXALLSHARE` | VNXAllShare |

---

## 6. KBS Exchange Code Mapping

| API value | Tên chuẩn |
|-----------|-----------|
| `HSX` | `HOSE` |
| `HNX` | `HNX` |
| `UPCOM` | `UPCOM` |

---

## 7. MSN Symbol IDs

### Tỷ giá

| Cặp tiền | MSN ID |
|----------|--------|
| `USDVND` | `avyufr` |
| `EURVND` | `av93ec` |
| `JPYVND` | `ave8sm` |
| `GBPVND` | `avyjtc` |
| `AUDVND` | `auxrkr` |
| `CNYVND` | `av55fr` |
| `KRWVND` | `avfg9c` |
| `SGDVND` | `avjx4c` |
| `THBVND` | `avntjs` |
| `HKDVND` | `avc7fh` |
| `TWDVND` | `avwdxo` |
| `CHFVND` | `av1bes` |
| `CADNVD` | `auxo1c` |
| `MYRWVND` | `avhy3s` |
| `NZDVND` | `avj0gs` |

### Crypto

| Coin | MSN ID |
|------|--------|
| `BTC` | `c2111` |
| `ETH` | `c2112` |
| `BNB` | `c2113` |
| `USDT` | `c2115` |
| `SOL` | `c2116` |
| `XRP` | `c2117` |
| `ADA` | `c2118` |
| `DOGE` | `c2119` |
| `DOT` | `c2120` |
| `TRX` | `c2125` |

### Chỉ số quốc tế

| Chỉ số | MSN ID | Tên |
|--------|--------|-----|
| `INX` | `a33k6h` | S&P 500 |
| `DJI` | `a6qja2` | Dow Jones |
| `COMP` | `a3oxnm` | Nasdaq Composite |
| `N225` | `a9j7bh` | Nikkei 225 |
| `HSI` | `ah7etc` | Hang Seng |
| `VNI` | `aqk2nm` | VN Index |
| `FTSE` | `a2a1ye` | FTSE 100 |
| `DAX` | `a13rnm` | DAX |
| `KOSPI` | `a95t48` | KOSPI |
| `SHCOMP` | `a8cpb2` | Shanghai Composite |

---

## 8. KBS Interval Mapping

| Input | URL suffix | Ý nghĩa |
|-------|-----------|---------|
| `1m` | `1P` | 1 phút |
| `5m` | `5P` | 5 phút |
| `15m` | `15P` | 15 phút |
| `30m` | `30P` | 30 phút |
| `1H` | `60P` | 1 giờ |
| `1D` | `day` | 1 ngày |
| `1W` | `week` | 1 tuần |
| `1M` | `month` | 1 tháng |

---

## 9. VCI Interval Mapping

| Input | `timeFrame` | Ghi chú |
|-------|------------|---------|
| `1m` | `ONE_MINUTE` | Gốc |
| `5m` | `ONE_MINUTE` | Resample |
| `15m` | `ONE_MINUTE` | Resample |
| `30m` | `ONE_MINUTE` | Resample |
| `1H` | `ONE_HOUR` | Gốc |
| `1D` | `ONE_DAY` | Gốc |
| `1W` | `ONE_DAY` | Resample |
| `1M` | `ONE_DAY` | Resample |

---

## 10. VCI Financial Report Field Codes

Prefix conventions cho BCTC:

| Prefix | Báo cáo |
|--------|---------|
| `BSA` | Balance Sheet - Tài sản |
| `BSB` | Balance Sheet - Nguồn vốn |
| `ISA` | Income Statement - Doanh thu |
| `ISB` | Income Statement - Chi phí |
| `ISI` | Income Statement - Insurance specific |
| `ISS` | Income Statement - Securities specific |
| `CFA` | Cash Flow - Hoạt động |
| `CFB` | Cash Flow - Bank specific |
| `CFS` | Cash Flow - Securities specific |

> Dùng GraphQL query `ListFinancialRatio` (xem [financial.md](./financial.md)) để lấy mapping đầy đủ field code → tên.
