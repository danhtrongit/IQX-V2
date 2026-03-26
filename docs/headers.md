# 🔑 Headers Chung

## Headers mặc định

Tất cả request đều cần headers giả lập trình duyệt:

```json
{
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9,vi-VN;q=0.8,vi;q=0.7",
  "Connection": "keep-alive",
  "Content-Type": "application/json",
  "Cache-Control": "no-cache",
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-site",
  "DNT": "1",
  "Pragma": "no-cache",
  "sec-ch-ua-platform": "\"Windows\"",
  "sec-ch-ua-mobile": "?0",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
}
```

## Headers bổ sung theo nguồn

### VCI (VietCap)

```json
{
  "Referer": "https://trading.vietcap.com.vn/",
  "Origin": "https://trading.vietcap.com.vn/"
}
```

### KBS (KB Securities)

Không cần headers bổ sung. Riêng endpoint **Price Board** (`POST /stock/iss`) cần thêm:

```json
{
  "Accept-Language": "en-US,en;q=0.9,vi;q=0.8",
  "x-lang": "vi"
}
```

### MSN Finance

```json
{
  "Referer": "https://www.msn.com/",
  "Origin": "https://www.msn.com/"
}
```

## User-Agent ngẫu nhiên (khuyến nghị)

Để tránh bị block, nên xoay vòng User-Agent:

```python
import random

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_2_1) AppleWebKit/605.1.15 Version/16.3 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Brave/120.0.0.0 Safari/537.36",
]

headers = {
    # ... headers mặc định ...
    "User-Agent": random.choice(USER_AGENTS)
}
```
