# 📊 Vietnamese Stock Market - Direct API Reference

> Tài liệu truy cập trực tiếp các API dữ liệu chứng khoán Việt Nam.

## Nguồn dữ liệu

| Nguồn | Mô tả | Base URL |
|-------|--------|----------|
| **VCI** | VietCap Securities | `https://trading.vietcap.com.vn/api/` |
| **VCI IQ** | VietCap IQ Insight Service | `https://iq.vietcap.com.vn/api/iq-insight-service/v1/` |
| **KBS** | KB Securities | `https://kbbuddywts.kbsec.com.vn/iis-server/investment/` |
| **MSN** | MSN Finance | `https://assets.msn.com/service/Finance/` |

## Tài liệu

| File | Nội dung |
|------|----------|
| [headers.md](./headers.md) | Headers chung cho mọi request |
| [listing.md](./listing.md) | Danh sách mã, phân ngành, nhóm chỉ số |
| [quote.md](./quote.md) | Giá lịch sử OHLCV, dữ liệu khớp lệnh intraday |
| [company.md](./company.md) | Thông tin doanh nghiệp, cổ đông, lãnh đạo, sự kiện |
| [financial.md](./financial.md) | Báo cáo tài chính (CDKT, KQKD, LCTT, CSTC) |
| [trading.md](./trading.md) | Bảng giá realtime, dữ liệu giao dịch |
| [constants.md](./constants.md) | Mapping mã ngành, chỉ số, symbol IDs |

## Lưu ý chung

- Giá từ KBS cần **chia cho 1000** để ra đơn vị nghìn VND
- Dữ liệu realtime chỉ có trong giờ giao dịch (9:00-15:00 GMT+7)
- Nên implement retry + caching để tránh rate limit
- Tất cả API đều **không cần authentication**
