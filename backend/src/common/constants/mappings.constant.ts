/** KBS group name → API code mapping */
export const KBS_GROUP_MAP: Record<string, string> = {
  HOSE: 'HOSE',
  HNX: 'HNX',
  UPCOM: 'UPCOM',
  VN30: '30',
  VN100: '100',
  VNMidCap: 'MID',
  VNSmallCap: 'SML',
  VNSI: 'SI',
  VNX50: 'X50',
  VNXALL: 'XALL',
  VNALL: 'ALL',
  HNX30: 'HNX30',
  ETF: 'FUND',
  CW: 'CW',
  BOND: 'BOND',
  FU_INDEX: 'DER',
};

/** KBS interval → URL suffix */
export const KBS_INTERVAL_MAP: Record<string, string> = {
  '1m': '1P',
  '5m': '5P',
  '15m': '15P',
  '30m': '30P',
  '1H': '60P',
  '1D': 'day',
  '1W': 'week',
  '1M': 'month',
};

/** VCI interval → timeFrame */
export const VCI_INTERVAL_MAP: Record<string, string> = {
  '1m': 'ONE_MINUTE',
  '5m': 'ONE_MINUTE',
  '15m': 'ONE_MINUTE',
  '30m': 'ONE_MINUTE',
  '1H': 'ONE_HOUR',
  '1D': 'ONE_DAY',
  '1W': 'ONE_DAY',
  '1M': 'ONE_DAY',
};

/** KBS exchange code → standard name */
export const KBS_EXCHANGE_MAP: Record<string, string> = {
  HSX: 'HOSE',
  HNX: 'HNX',
  UPCOM: 'UPCOM',
};

/** VCI IQ Insight: user-facing label → API timeFrame */
export const VCI_IQ_TIMEFRAME_MAP: Record<string, string> = {
  D: 'ONE_DAY',
  W: 'ONE_WEEK',
  M: 'ONE_MONTH',
  Q: 'QUARTER',
  Y: 'YEAR',
};
