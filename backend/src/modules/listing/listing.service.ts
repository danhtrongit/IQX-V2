import { Injectable, Logger } from '@nestjs/common';
import { ProxyHttpService } from '../../common/services/proxy-http.service';
import { KBS_GROUP_MAP, KBS_EXCHANGE_MAP } from '../../common/constants/mappings.constant';
import { MESSAGES } from '../../common/constants/messages.constant';

@Injectable()
export class ListingService {
  private readonly logger = new Logger(ListingService.name);

  constructor(private http: ProxyHttpService) {}

  /** Tất cả mã chứng khoán */
  async getAllSymbols() {
    const data = await this.http.withFallback(
      () => this.getSymbolsFromKbs(),
      () => this.getSymbolsFromVci(),
      'listing.getAllSymbols',
    );
    return { message: MESSAGES.COMMON.SUCCESS, data };
  }

  /** Mã theo nhóm chỉ số */
  async getSymbolsByGroup(group: string) {
    const data = await this.http.withFallback(
      () => this.getSymbolsByGroupFromKbs(group),
      () => this.getSymbolsByGroupFromVci(group),
      'listing.getSymbolsByGroup',
    );
    return { message: MESSAGES.COMMON.SUCCESS, data };
  }

  /** Danh sách ngành (KBS only) */
  async getSectors() {
    const data = await this.http.kbsGet<any[]>('/sector/all');
    return { message: MESSAGES.COMMON.SUCCESS, data };
  }

  /** Mã theo ngành */
  async getStocksBySector(code: number) {
    const raw = await this.http.kbsGet<any>('/sector/stock', { code, l: 1 });
    const stocks = (raw?.stocks || []).map((s: any) => s.sb || s.SB || s.symbol);
    return { message: MESSAGES.COMMON.SUCCESS, data: stocks };
  }

  /** Phân ngành ICB (VCI GraphQL) */
  async getIcbClassification() {
    const query = `{
  CompaniesListingInfo {
    ticker
    organName
    enOrganName
    icbName3
    enIcbName3
    icbName2
    enIcbName2
    icbName4
    enIcbName4
    comTypeCode
    icbCode1
    icbCode2
    icbCode3
    icbCode4
    __typename
  }
}`;
    const result = await this.http.vciGraphql<any>(query);
    return {
      message: MESSAGES.COMMON.SUCCESS,
      data: result?.data?.CompaniesListingInfo || [],
    };
  }

  /** Danh sách ICB codes (VCI GraphQL) */
  async getIcbCodes() {
    const query = `query Query {
  ListIcbCode {
    icbCode
    level
    icbName
    enIcbName
    __typename
  }
}`;
    const result = await this.http.vciGraphql<any>(query);
    return {
      message: MESSAGES.COMMON.SUCCESS,
      data: result?.data?.ListIcbCode || [],
    };
  }

  // ---------- KBS providers ----------

  private async getSymbolsFromKbs(): Promise<any[]> {
    const raw = await this.http.kbsGet<any[]>('/stock/search/data');
    return raw.map((item) => ({
      symbol: item.symbol,
      name: item.name,
      nameEn: item.nameEn,
      exchange: KBS_EXCHANGE_MAP[item.exchange] || item.exchange,
      type: item.type,
      referencePrice: item.re ? item.re / 1000 : null,
      ceilingPrice: item.ceiling ? item.ceiling / 1000 : null,
      floorPrice: item.floor ? item.floor / 1000 : null,
    }));
  }

  private async getSymbolsByGroupFromKbs(group: string): Promise<string[]> {
    const code = KBS_GROUP_MAP[group] || group;
    const raw = await this.http.kbsGet<any>(`/index/${code}/stocks`);
    return raw?.data || raw || [];
  }

  // ---------- VCI providers ----------

  private async getSymbolsFromVci(): Promise<any[]> {
    const raw = await this.http.vciGet<any[]>('/price/symbols/getAll');
    return raw.map((item) => ({
      symbol: item.symbol,
      name: item.organName,
      nameEn: item.enOrganName,
      exchange: item.board,
      type: item.type?.toLowerCase() || 'stock',
      referencePrice: null,
      ceilingPrice: null,
      floorPrice: null,
    }));
  }

  private async getSymbolsByGroupFromVci(group: string): Promise<string[]> {
    const raw = await this.http.vciGet<any[]>(`/price/symbols/getByGroup?group=${group}`);
    return raw.map((item) => item.symbol);
  }
}
