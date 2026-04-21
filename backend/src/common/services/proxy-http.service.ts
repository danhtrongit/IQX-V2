import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosRequestConfig } from 'axios';
import {
  DEFAULT_HEADERS,
  USER_AGENTS,
  DATA_SOURCES,
} from '../constants/data-sources.constant';

@Injectable()
export class ProxyHttpService {
  private readonly logger = new Logger(ProxyHttpService.name);

  private getRandomUserAgent(): string {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  }

  private buildHeaders(
    sourceHeaders?: Record<string, string>,
  ): Record<string, string> {
    return {
      ...DEFAULT_HEADERS,
      'User-Agent': this.getRandomUserAgent(),
      ...sourceHeaders,
    };
  }

  async get<T = any>(
    url: string,
    sourceHeaders?: Record<string, string>,
    timeout = 10000,
  ): Promise<T> {
    const config: AxiosRequestConfig = {
      headers: this.buildHeaders(sourceHeaders),
      timeout,
    };
    const { data } = await axios.get<T>(url, config);
    return data;
  }

  async post<T = any>(
    url: string,
    body: any,
    sourceHeaders?: Record<string, string>,
    timeout = 10000,
  ): Promise<T> {
    const config: AxiosRequestConfig = {
      headers: this.buildHeaders(sourceHeaders),
      timeout,
    };
    const { data } = await axios.post<T>(url, body, config);
    return data;
  }

  /** KBS GET shorthand */
  async kbsGet<T = any>(
    path: string,
    params?: Record<string, any>,
  ): Promise<T> {
    const url = new URL(`${DATA_SOURCES.KBS.BASE_URL}${path}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) =>
        url.searchParams.set(k, String(v)),
      );
    }
    return this.get<T>(url.toString(), DATA_SOURCES.KBS.HEADERS);
  }

  /** KBS SAS GET shorthand */
  async kbsSasGet<T = any>(
    path: string,
    params?: Record<string, any>,
  ): Promise<T> {
    const url = new URL(`${DATA_SOURCES.KBS.SAS_URL}${path}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) =>
        url.searchParams.set(k, String(v)),
      );
    }
    return this.get<T>(url.toString(), DATA_SOURCES.KBS.HEADERS);
  }

  /** KBS POST shorthand */
  async kbsPost<T = any>(
    path: string,
    body: any,
    extraHeaders?: Record<string, string>,
  ): Promise<T> {
    const url = `${DATA_SOURCES.KBS.BASE_URL}${path}`;
    return this.post<T>(url, body, {
      ...DATA_SOURCES.KBS.HEADERS,
      ...extraHeaders,
    });
  }

  /** VCI GET shorthand */
  async vciGet<T = any>(path: string): Promise<T> {
    const url = `${DATA_SOURCES.VCI.BASE_URL}${path}`;
    return this.get<T>(url, DATA_SOURCES.VCI.HEADERS);
  }

  /** VCI POST shorthand */
  async vciPost<T = any>(path: string, body: any): Promise<T> {
    const url = `${DATA_SOURCES.VCI.BASE_URL}${path}`;
    return this.post<T>(url, body, DATA_SOURCES.VCI.HEADERS);
  }

  /** VCI GraphQL shorthand */
  async vciGraphql<T = any>(
    query: string,
    variables: Record<string, any> = {},
  ): Promise<T> {
    return this.post<T>(
      DATA_SOURCES.VCI.GRAPHQL_URL,
      { query, variables },
      DATA_SOURCES.VCI.HEADERS,
    );
  }

  /** VCI IQ Insight GET shorthand */
  async vciIqGet<T = any>(
    path: string,
    params?: Record<string, any>,
  ): Promise<T> {
    const url = new URL(`${DATA_SOURCES.VCI.IQ_BASE_URL}${path}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
      });
    }
    return this.get<T>(url.toString(), DATA_SOURCES.VCI.HEADERS);
  }

  /** VCI AI News GET shorthand */
  async vciAiNewsGet<T = any>(
    path: string,
    params?: Record<string, any>,
  ): Promise<T> {
    const url = new URL(`${DATA_SOURCES.VCI.AI_NEWS_BASE_URL}${path}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '')
          url.searchParams.set(k, String(v));
      });
    }
    return this.get<T>(url.toString(), DATA_SOURCES.VCI.AI_NEWS_HEADERS);
  }

  /** MSN GET shorthand */
  async msnGet<T = any>(
    path: string,
    params?: Record<string, any>,
  ): Promise<T> {
    const url = new URL(`${DATA_SOURCES.MSN.BASE_URL}${path}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) =>
        url.searchParams.set(k, String(v)),
      );
    }
    return this.get<T>(url.toString(), DATA_SOURCES.MSN.HEADERS);
  }

  /** MAS GET shorthand */
  async masGet<T = unknown>(
    path: string,
    params?: Record<string, unknown>,
  ): Promise<T> {
    const url = new URL(`${DATA_SOURCES.MAS.BASE_URL}${path}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
      });
    }
    return this.get<T>(url.toString(), DATA_SOURCES.MAS.HEADERS);
  }

  /** MBK POST (x-www-form-urlencoded) shorthand */
  async mbkPost<T = unknown>(
    body: Record<string, string | number>,
  ): Promise<T> {
    const form = new URLSearchParams();
    Object.entries(body).forEach(([k, v]) => form.append(k, String(v)));

    const config: AxiosRequestConfig = {
      headers: {
        ...this.buildHeaders(DATA_SOURCES.MBK.HEADERS),
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
      timeout: 10000,
    };
    const { data } = await axios.post<T>(
      `${DATA_SOURCES.MBK.BASE_URL}/data/reportdatatopbynormtype`,
      form.toString(),
      config,
    );
    return data;
  }

  /** FMARKET GET shorthand */
  async fmarketGet<T = unknown>(path: string): Promise<T> {
    const url = `${DATA_SOURCES.FMARKET.BASE_URL}${path}`;
    return this.get<T>(url, DATA_SOURCES.FMARKET.HEADERS);
  }

  /** FMARKET POST shorthand */
  async fmarketPost<T = unknown>(path: string, body: unknown): Promise<T> {
    const url = `${DATA_SOURCES.FMARKET.BASE_URL}${path}`;
    return this.post<T>(url, body, DATA_SOURCES.FMARKET.HEADERS);
  }

  /** VNDIRECT GET shorthand */
  async vndGet<T = unknown>(
    path: string,
    params?: Record<string, unknown>,
  ): Promise<T> {
    const url = new URL(`${DATA_SOURCES.VND.BASE_URL}${path}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
      });
    }
    return this.get<T>(url.toString(), DATA_SOURCES.VND.HEADERS);
  }

  /** Simplize GET shorthand */
  async simplizeGet<T = unknown>(
    path: string,
    params?: Record<string, unknown>,
  ): Promise<T> {
    const url = new URL(`${DATA_SOURCES.SIMPLIZE.BASE_URL}${path}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
      });
    }
    return this.get<T>(url.toString(), DATA_SOURCES.SIMPLIZE.HEADERS);
  }

  /** Dukascopy GET shorthand */
  async dukascopyGet<T = unknown>(path: string): Promise<T> {
    const url = `${DATA_SOURCES.DUKASCOPY.BASE_URL}${path}`;
    return this.get<T>(url, DATA_SOURCES.DUKASCOPY.HEADERS);
  }

  /** Binance GET shorthand */
  async binanceGet<T = unknown>(
    path: string,
    params?: Record<string, unknown>,
  ): Promise<T> {
    const url = new URL(`${DATA_SOURCES.BINANCE.BASE_URL}${path}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
      });
    }
    return this.get<T>(url.toString(), DATA_SOURCES.BINANCE.HEADERS);
  }

  /** VCI Screener GET shorthand */
  async vciScreenerGet<T = unknown>(
    path: string,
    params?: Record<string, unknown>,
  ): Promise<T> {
    const url = new URL(`${DATA_SOURCES.VCI.IQ_BASE_URL}${path}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
      });
    }
    return this.get<T>(url.toString(), DATA_SOURCES.VCI.SCREENER_HEADERS);
  }

  /** VCI Screener POST shorthand */
  async vciScreenerPost<T = unknown>(path: string, body: unknown): Promise<T> {
    const url = `${DATA_SOURCES.VCI.IQ_BASE_URL}${path}`;
    return this.post<T>(url, body, DATA_SOURCES.VCI.SCREENER_HEADERS);
  }

  /** Try primary source, fallback to secondary on error or empty result */
  async withFallback<T>(
    primary: () => Promise<T>,
    fallback: () => Promise<T>,
    context: string,
  ): Promise<T> {
    try {
      const result = await primary();
      // Fall back if result is empty array or falsy
      if (Array.isArray(result) && result.length === 0) {
        this.logger.debug(
          `[${context}] Nguồn chính trả về rỗng, chuyển sang nguồn dự phòng`,
        );
        return fallback();
      }
      return result;
    } catch (error: any) {
      this.logger.warn(
        `[${context}] Nguồn chính lỗi (${error.message}), chuyển sang nguồn dự phòng`,
      );
      return fallback();
    }
  }
}
