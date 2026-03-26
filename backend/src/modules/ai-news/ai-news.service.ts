import { Injectable, Logger } from '@nestjs/common';
import { ProxyHttpService } from '../../common/services/proxy-http.service';
import { MESSAGES } from '../../common/constants/messages.constant';
import {
  RedisCacheService,
  CacheType,
} from '../../common/modules/redis-cache/redis-cache.service';

@Injectable()
export class AiNewsService {
  private readonly logger = new Logger(AiNewsService.name);

  constructor(
    private http: ProxyHttpService,
    private cacheService: RedisCacheService,
  ) {}

  async getNews(params: {
    ticker?: string;
    industry?: string;
    sentiment?: string;
    newsfrom?: string;
    updateFrom?: string;
    updateTo?: string;
    page?: number;
    pageSize?: number;
    language?: string;
  }) {
    const cacheKey = this.generateCacheKey('news', params);

    try {
      const cached = await this.cacheService.get<any>(cacheKey, CacheType.AI_NEWS);
      if (cached) {
        this.logger.debug(`Cache HIT for news: ${cacheKey}`);
        return cached;
      }
    } catch (error) {
      this.logger.warn(`Cache get failed for news: ${error.message}`);
    }

    const raw = await this.http.vciAiNewsGet<any>('/v3/news_info', {
      ticker: params.ticker,
      industry: params.industry,
      sentiment: params.sentiment,
      newsfrom: params.newsfrom,
      update_from: params.updateFrom,
      update_to: params.updateTo,
      page: params.page ?? 1,
      page_size: params.pageSize ?? 12,
      language: params.language ?? 'vi',
    });

    const items: any[] = raw?.news_info || [];
    const response = {
      message: MESSAGES.COMMON.SUCCESS,
      data: items.map((r: any) => ({
        id: r.id,
        ticker: r.ticker,
        industry: r.industry,
        title: r.news_title,
        shortContent: r.news_short_content,
        sourceLink: r.news_source_link,
        imageUrl: r.news_image_url,
        updatedAt: r.update_date,
        source: r.news_from,
        sourceName: r.news_from_name,
        sentiment: r.sentiment,
        score: r.score,
        slug: r.slug,
        maleAudioDuration: r.male_audio_duration ?? null,
        femaleAudioDuration: r.female_audio_duration ?? null,
      })),
      pagination: {
        total: raw?.total_records ?? 0,
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 12,
      },
    };

    try {
      await this.cacheService.set(cacheKey, response, CacheType.AI_NEWS);
    } catch (error) {
      this.logger.warn(`Cache set failed for news: ${error.message}`);
    }

    return response;
  }

  async getExchangeNews(params: {
    ticker?: string;
    newsfrom?: string;
    updateFrom?: string;
    updateTo?: string;
    page?: number;
    pageSize?: number;
    language?: string;
  }) {
    const cacheKey = this.generateCacheKey('xnews', params);

    try {
      const cached = await this.cacheService.get<any>(cacheKey, CacheType.AI_NEWS);
      if (cached) {
        this.logger.debug(`Cache HIT for exchange news: ${cacheKey}`);
        return cached;
      }
    } catch (error) {
      this.logger.warn(`Cache get failed for exchange news: ${error.message}`);
    }

    const raw = await this.http.vciAiNewsGet<any>('/v3/xnews_info', {
      ticker: params.ticker,
      newsfrom: params.newsfrom,
      update_from: params.updateFrom,
      update_to: params.updateTo,
      page: params.page ?? 1,
      page_size: params.pageSize ?? 12,
      language: params.language ?? 'vi',
    });

    const items: any[] = raw?.news_info || [];
    const response = {
      message: MESSAGES.COMMON.SUCCESS,
      data: items.map((r: any) => ({
        id: r.id,
        ticker: r.ticker,
        title: r.news_title,
        sourceLink: r.news_source_link,
        updatedAt: r.update_date,
        source: r.news_from,
        slug: r.slug,
      })),
      pagination: {
        total: raw?.total_records ?? 0,
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 12,
      },
    };

    try {
      await this.cacheService.set(cacheKey, response, CacheType.AI_NEWS);
    } catch (error) {
      this.logger.warn(`Cache set failed for exchange news: ${error.message}`);
    }

    return response;
  }

  async getArticle(slug: string, language = 'vi') {
    const cacheKey = `article:${slug}:${language}`;

    try {
      const cached = await this.cacheService.get<any>(cacheKey, CacheType.AI_NEWS);
      if (cached) {
        this.logger.debug(`Cache HIT for article: ${slug}`);
        return cached;
      }
    } catch (error) {
      this.logger.warn(`Cache get failed for article: ${error.message}`);
    }

    const raw = await this.http.vciAiNewsGet<any>('/v3/news_from_slug', {
      slug,
      language,
    });

    if (!raw?.id) {
      return { message: MESSAGES.COMMON.SUCCESS, data: null };
    }

    const response = {
      message: MESSAGES.COMMON.SUCCESS,
      data: {
        id: raw.id,
        ticker: raw.ticker,
        companyName: raw.company_name,
        industry: raw.industry,
        title: raw.news_title,
        shortContent: raw.news_short_content,
        summary: raw.summary,
        highlightPosition: raw.highlight_position,
        fullContent: raw.news_full_content,
        sourceLink: raw.news_source_link,
        imageUrl: raw.news_image_url,
        updatedAt: raw.update_date,
        source: raw.news_from,
        sourceName: raw.news_from_name,
        sentiment: raw.sentiment,
        score: raw.score,
        slug: raw.slug,
        newsType: raw.news_type,
        maleAudioDuration: raw.male_audio_duration ?? null,
        femaleAudioDuration: raw.female_audio_duration ?? null,
        fileAttachments: raw.file_attachment || [],
      },
    };

    try {
      await this.cacheService.set(cacheKey, response, CacheType.AI_NEWS);
    } catch (error) {
      this.logger.warn(`Cache set failed for article: ${error.message}`);
    }

    return response;
  }

  async getTickerScore(ticker: string, language = 'vi') {
    const cacheKey = `ticker-score:${ticker.toUpperCase()}:${language}`;

    try {
      const cached = await this.cacheService.get<any>(cacheKey, CacheType.AI_NEWS);
      if (cached) {
        this.logger.debug(`Cache HIT for ticker score: ${ticker}`);
        return cached;
      }
    } catch (error) {
      this.logger.warn(`Cache get failed for ticker score: ${error.message}`);
    }

    const raw = await this.http.vciAiNewsGet<any>('/v3/ticker_score', {
      ticker: ticker.toUpperCase(),
      language,
    });

    const info = raw?.ticker_info?.[0];
    const response = !info
      ? { message: MESSAGES.COMMON.SUCCESS, data: null }
      : {
          message: MESSAGES.COMMON.SUCCESS,
          data: {
            ticker: info.ticker,
            companyName: info.organ_name,
            industry: info.industry,
            logo: info.logo,
            newsCount: info.cnt_news,
            score: info.score,
            sentiment: info.sentiment,
            countPositive: info.count_pos,
            countNeutral: info.count_neu,
            countNegative: info.count_neg,
            summaries: (info.extractive_summaries || []).map(
              (text: string, i: number) => ({
                text,
                sentiment: info.extractive_sentiments?.[i] ?? null,
                highlight: info.extractive_positions?.[i] ?? null,
              }),
            ),
            recentNews: (info.news_from || []).map((n: any) => ({
              id: n.id,
              source: n.name,
              url: n.url,
              slug: n.slug,
            })),
            indices: {
              hose: !!info.hose,
              vn30: !!info.vn30,
              vn100: !!info.vn100,
              vnMidCap: !!info.vn_midcap,
              vnSmallCap: !!info.vn_smallcap,
            },
          },
        };

    if (info) {
      try {
        await this.cacheService.set(cacheKey, response, CacheType.AI_NEWS);
      } catch (error) {
        this.logger.warn(`Cache set failed for ticker score: ${error.message}`);
      }
    }

    return response;
  }

  async getIndustries(language = 'vi') {
    const cacheKey = `industries:${language}`;

    try {
      const cached = await this.cacheService.get<any>(cacheKey, CacheType.STATIC);
      if (cached) {
        this.logger.debug(`Cache HIT for industries`);
        return cached;
      }
    } catch (error) {
      this.logger.warn(`Cache get failed for industries: ${error.message}`);
    }

    const raw = await this.http.vciAiNewsGet<any[]>('/get_industry_info');
    const items = Array.isArray(raw) ? raw : [];
    const response = {
      message: MESSAGES.COMMON.SUCCESS,
      data: items.map((r: any) => ({
        name: language === 'vi' ? r.viName : r.enName,
        value: r.value,
      })),
    };

    try {
      await this.cacheService.set(cacheKey, response, CacheType.STATIC);
    } catch (error) {
      this.logger.warn(`Cache set failed for industries: ${error.message}`);
    }

    return response;
  }

  async getSources(language = 'vi') {
    const cacheKey = `sources:${language}`;

    try {
      const cached = await this.cacheService.get<any>(cacheKey, CacheType.STATIC);
      if (cached) {
        this.logger.debug(`Cache HIT for sources`);
        return cached;
      }
    } catch (error) {
      this.logger.warn(`Cache get failed for sources: ${error.message}`);
    }

    const raw = await this.http.vciAiNewsGet<any[]>('/v3/get_source_info', {
      language,
    });
    const items = Array.isArray(raw) ? raw : [];
    const response = {
      message: MESSAGES.COMMON.SUCCESS,
      data: items.map((r: any) => ({
        name: language === 'vi' ? r.viName : r.enName,
        value: r.value,
      })),
    };

    try {
      await this.cacheService.set(cacheKey, response, CacheType.STATIC);
    } catch (error) {
      this.logger.warn(`Cache set failed for sources: ${error.message}`);
    }

    return response;
  }

  private generateCacheKey(prefix: string, params: Record<string, any>): string {
    const sorted = Object.keys(params)
      .filter((k) => params[k] !== undefined && params[k] !== null)
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join('&');
    return `${prefix}:${sorted}`;
  }
}