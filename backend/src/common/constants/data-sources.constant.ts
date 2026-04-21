export const DATA_SOURCES = {
  VCI: {
    BASE_URL: 'https://trading.vietcap.com.vn/api',
    GRAPHQL_URL: 'https://trading.vietcap.com.vn/data-mt/graphql',
    IQ_BASE_URL: 'https://iq.vietcap.com.vn/api/iq-insight-service/v1',
    AI_NEWS_BASE_URL: 'https://ai.vietcap.com.vn/api',
    HEADERS: {
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      Referer: 'https://trading.vietcap.com.vn/',
      Origin: 'https://trading.vietcap.com.vn/',
    },
    AI_NEWS_HEADERS: {
      Accept: 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9,vi;q=0.8',
      'Content-Type': 'application/json',
      Referer: 'https://trading.vietcap.com.vn/',
      Origin: 'https://trading.vietcap.com.vn',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-site',
      'sec-ch-ua': '"Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
    },
    SCREENER_HEADERS: {
      Accept: 'application/json',
      'Accept-Language': 'en-US,en;q=0.9,vi;q=0.8',
      'Content-Type': 'application/json',
      Referer: 'https://trading.vietcap.com.vn/',
      Origin: 'https://trading.vietcap.com.vn',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-site',
    },
  },
  KBS: {
    BASE_URL: 'https://kbbuddywts.kbsec.com.vn/iis-server/investment',
    SAS_URL: 'https://kbbuddywts.kbsec.com.vn/sas/kbsv-stock-data-store',
    HEADERS: {
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      Referer: 'https://kbbuddywts.kbsec.com.vn/',
      Origin: 'https://kbbuddywts.kbsec.com.vn',
    },
    PRICE_BOARD_HEADERS: {
      'Accept-Language': 'en-US,en;q=0.9,vi;q=0.8',
      Connection: 'keep-alive',
      DNT: '1',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
      'x-lang': 'vi',
    },
    DERIVATIVE_HEADERS: {
      'Accept-Language': 'en-US,en;q=0.9,vi;q=0.8',
      Connection: 'keep-alive',
      DNT: '1',
      Referer: 'https://kbbuddywts.kbsec.com.vn/DER',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
      'x-lang': 'vi',
    },
  },
  MAS: {
    BASE_URL: 'https://masboard.masvn.com/api',
    HEADERS: {
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      Referer: 'https://masboard.masvn.com',
      Origin: 'https://masboard.masvn.com',
    },
  },
  MBK: {
    BASE_URL: 'https://data.maybanktrade.com.vn',
    HEADERS: {
      Accept: 'application/json, text/plain, */*',
      Referer: 'https://data.maybanktrade.com.vn',
      Origin: 'https://data.maybanktrade.com.vn',
    },
  },
  FMARKET: {
    BASE_URL: 'https://api.fmarket.vn',
    HEADERS: {
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      Referer: 'https://fmarket.vn/',
      Origin: 'https://fmarket.vn/',
    },
  },
  VND: {
    BASE_URL: 'https://api-finfo.vndirect.com.vn/v4',
    DCHART_URL: 'https://dchart-api.vndirect.com.vn/dchart',
    HEADERS: {
      Accept: 'application/json, text/plain, */*',
      Referer: 'https://mkw.vndirect.com.vn',
      Origin: 'https://mkw.vndirect.com.vn',
    },
  },
  SIMPLIZE: {
    BASE_URL: 'https://api.simplize.vn/api',
    HEADERS: {
      Accept: 'application/json',
      'User-Agent': 'vns_market_data/1.0',
    },
  },
  DUKASCOPY: {
    BASE_URL: 'https://jetta.dukascopy.com/v1',
    HEADERS: {
      Accept: 'application/json, text/plain, */*',
      Referer: 'https://widgets.dukascopy.com/en/historical-data-export',
      Origin: 'https://widgets.dukascopy.com',
    },
  },
  BINANCE: {
    BASE_URL: 'https://api.binance.com/api/v3',
    HEADERS: {
      Accept: 'application/json, text/plain, */*',
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
