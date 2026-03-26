export const DATA_SOURCES = {
  VCI: {
    BASE_URL: 'https://trading.vietcap.com.vn/api',
    GRAPHQL_URL: 'https://trading.vietcap.com.vn/data-mt/graphql',
    IQ_BASE_URL: 'https://iq.vietcap.com.vn/api/iq-insight-service/v1',
    AI_NEWS_BASE_URL: 'https://ai.vietcap.com.vn/api',
    HEADERS: {
      Referer: 'https://trading.vietcap.com.vn/',
      Origin: 'https://trading.vietcap.com.vn/',
    },
  },
  KBS: {
    BASE_URL: 'https://kbbuddywts.kbsec.com.vn/iis-server/investment',
    SAS_URL: 'https://kbbuddywts.kbsec.com.vn/sas/kbsv-stock-data-store',
    HEADERS: {},
    PRICE_BOARD_HEADERS: {
      'Accept-Language': 'en-US,en;q=0.9,vi;q=0.8',
      'x-lang': 'vi',
    },
  },
  MSN: {
    BASE_URL: 'https://assets.msn.com/service/Finance',
    HEADERS: {
      Referer: 'https://www.msn.com/',
      Origin: 'https://www.msn.com/',
    },
  },
} as const;

export const DEFAULT_HEADERS: Record<string, string> = {
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9,vi-VN;q=0.8,vi;q=0.7',
  Connection: 'keep-alive',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-cache',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-site',
  DNT: '1',
  Pragma: 'no-cache',
  'sec-ch-ua-platform': '"Windows"',
  'sec-ch-ua-mobile': '?0',
};

export const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_2_1) AppleWebKit/605.1.15 Version/16.3 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Brave/120.0.0.0 Safari/537.36',
];
