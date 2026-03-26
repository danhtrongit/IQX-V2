import { Injectable } from '@nestjs/common';
import { ProxyHttpService } from '../../common/services/proxy-http.service';
import { MESSAGES } from '../../common/constants/messages.constant';

@Injectable()
export class FinancialService {
  constructor(private http: ProxyHttpService) {}

  /** Báo cáo tài chính (KBS default, VCI fallback) */
  async getReport(
    symbol: string,
    type: string,
    termType: number,
    page = 1,
    pageSize = 4,
  ) {
    const data = await this.http.withFallback(
      () => this.getReportFromKbs(symbol, type, termType, page, pageSize),
      () => this.getReportFromVci(symbol, termType === 2 ? 'Q' : 'Y'),
      'financial.getReport',
    );
    return { message: MESSAGES.COMMON.SUCCESS, data };
  }

  /** Chỉ số tài chính nhanh (VCI) */
  async getRatios(symbol: string, period: string) {
    const query = `fragment Ratios on CompanyFinancialRatio {
  ticker yearReport lengthReport updateDate
  revenue revenueGrowth netProfit netProfitGrowth
  roe roa pe pb eps currentRatio grossMargin netProfitMargin
  BSA1 BSA2 ISA1 ISA2 CFA1 CFA2
  __typename
}
query Query($ticker: String!, $period: String!) {
  CompanyFinancialRatio(ticker: $ticker, period: $period) {
    ratio { ...Ratios __typename }
    period
    __typename
  }
}`;
    const result = await this.http.vciGraphql<any>(query, {
      ticker: symbol.toUpperCase(),
      period: period.toUpperCase(),
    });
    return {
      message: MESSAGES.COMMON.SUCCESS,
      data: result?.data?.CompanyFinancialRatio || null,
    };
  }

  /** Mapping field codes → tên (VCI) */
  async getFieldMapping() {
    const query = `query Query {
  ListFinancialRatio {
    id type name unit isDefault fieldName en_Type en_Name tagName comTypeCode order __typename
  }
}`;
    const result = await this.http.vciGraphql<any>(query);
    return {
      message: MESSAGES.COMMON.SUCCESS,
      data: result?.data?.ListFinancialRatio || [],
    };
  }

  // ---------- KBS ----------

  private async getReportFromKbs(
    symbol: string,
    type: string,
    termType: number,
    page: number,
    pageSize: number,
  ) {
    const isLCTT = type.toUpperCase() === 'LCTT';
    const params: Record<string, any> = {
      page,
      pageSize,
      type: type.toUpperCase(),
      unit: 1000,
      languageid: 1,
    };

    if (isLCTT) {
      params.termType = termType;
      params.code = symbol.toUpperCase();
    } else {
      params.termtype = termType;
    }

    return this.http.kbsSasGet<any>(
      `/stock/finance-info/${symbol.toUpperCase()}`,
      params,
    );
  }

  // ---------- VCI ----------

  private async getReportFromVci(symbol: string, period: string) {
    return this.getRatios(symbol, period).then((r) => r.data);
  }
}
