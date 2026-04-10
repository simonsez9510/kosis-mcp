/**
 * KOSIS 국가통계포털 API 클라이언트
 *
 * 7개 서비스:
 * 1. 통계목록 (statisticsList)
 * 2. 통계자료 (statisticsData)
 * 3. 통계설명자료 (statisticsMeta)
 * 4. 통계표설명 (statisticsData?method=getMeta)
 * 5. 통합검색 (searchStatistics)
 * 6. 통계주요지표 (pkNumberService)
 * 7. 대용량통계자료 (statisticsLargeData)
 */

const BASE_URL = "https://kosis.kr/openapi";
const MAX_RETRIES = 3;
const TIMEOUT_MS = 30000;
const MAX_RESPONSE_LENGTH = 50000;

export class KosisApiClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /** 통계목록 조회 */
  async getStatisticsList(params: {
    vwCd: string;
    parentListId?: string;
  }): Promise<unknown> {
    const url = new URL(`${BASE_URL}/statisticsList.do`);
    url.searchParams.set("method", "getList");
    url.searchParams.set("apiKey", this.apiKey);
    url.searchParams.set("vwCd", params.vwCd);
    url.searchParams.set("format", "json");
    url.searchParams.set("jsonVD", "Y");
    if (params.parentListId) {
      url.searchParams.set("parentListId", params.parentListId);
    }
    return this.fetchWithRetry(url.toString());
  }

  /** 통계자료 조회 */
  async getStatisticsData(params: {
    orgId: string;
    tblId: string;
    objL1?: string;
    objL2?: string;
    objL3?: string;
    objL4?: string;
    itmId?: string;
    prdSe?: string;
    startPrdDe?: string;
    endPrdDe?: string;
    newEstPrdCnt?: number;
    prdInterval?: number;
  }): Promise<unknown> {
    const url = new URL(`${BASE_URL}/Param/statisticsParameterData.do`);
    url.searchParams.set("method", "getList");
    url.searchParams.set("apiKey", this.apiKey);
    url.searchParams.set("orgId", params.orgId);
    url.searchParams.set("tblId", params.tblId);
    url.searchParams.set("format", "json");
    url.searchParams.set("jsonVD", "Y");

    if (params.objL1) url.searchParams.set("objL1", params.objL1);
    if (params.objL2) url.searchParams.set("objL2", params.objL2);
    if (params.objL3) url.searchParams.set("objL3", params.objL3);
    if (params.objL4) url.searchParams.set("objL4", params.objL4);
    if (params.itmId) url.searchParams.set("itmId", params.itmId);
    if (params.prdSe) url.searchParams.set("prdSe", params.prdSe);

    if (params.startPrdDe && params.endPrdDe) {
      url.searchParams.set("startPrdDe", params.startPrdDe);
      url.searchParams.set("endPrdDe", params.endPrdDe);
    } else {
      url.searchParams.set("newEstPrdCnt", String(params.newEstPrdCnt || 5));
    }
    if (params.prdInterval) {
      url.searchParams.set("prdInterval", String(params.prdInterval));
    }

    return this.fetchWithRetry(url.toString());
  }

  /** 통합검색 */
  async searchStatistics(params: {
    searchNm: string;
    orgId?: string;
    sort?: "RANK" | "DATE";
    startCount?: number;
    resultCount?: number;
  }): Promise<unknown> {
    const url = new URL(`${BASE_URL}/statisticsSearch.do`);
    url.searchParams.set("method", "getList");
    url.searchParams.set("apiKey", this.apiKey);
    url.searchParams.set("searchNm", params.searchNm);
    url.searchParams.set("format", "json");
    url.searchParams.set("jsonVD", "Y");

    if (params.orgId) url.searchParams.set("orgId", params.orgId);
    url.searchParams.set("sort", params.sort || "RANK");
    url.searchParams.set("startCount", String(params.startCount || 1));
    url.searchParams.set("resultCount", String(params.resultCount || 10));

    return this.fetchWithRetry(url.toString());
  }

  /** 통계설명자료 조회 */
  async getStatisticsMeta(params: {
    orgId?: string;
    tblId?: string;
    statId?: string;
    metaItm?: string;
  }): Promise<unknown> {
    const url = new URL(`${BASE_URL}/statisticsMeta.do`);
    url.searchParams.set("method", "getList");
    url.searchParams.set("apiKey", this.apiKey);
    url.searchParams.set("format", "json");
    url.searchParams.set("jsonVD", "Y");

    if (params.orgId) url.searchParams.set("orgId", params.orgId);
    if (params.tblId) url.searchParams.set("tblId", params.tblId);
    if (params.statId) url.searchParams.set("statId", params.statId);
    url.searchParams.set("metaItm", params.metaItm || "All");

    return this.fetchWithRetry(url.toString());
  }

  /** 통계표설명 조회 */
  async getTableMeta(params: {
    orgId: string;
    tblId: string;
    type?: string;
  }): Promise<unknown> {
    const url = new URL(`${BASE_URL}/statisticsData.do`);
    url.searchParams.set("method", "getMeta");
    url.searchParams.set("apiKey", this.apiKey);
    url.searchParams.set("orgId", params.orgId);
    url.searchParams.set("tblId", params.tblId);
    url.searchParams.set("type", params.type || "TBL");
    url.searchParams.set("format", "json");
    url.searchParams.set("jsonVD", "Y");

    return this.fetchWithRetry(url.toString());
  }

  /** 통계주요지표 조회 */
  async getKeyIndicator(params: {
    jipyoId: string;
    pageNo?: number;
    numOfRows?: number;
  }): Promise<unknown> {
    const url = new URL(`${BASE_URL}/pkNumberService.do`);
    url.searchParams.set("method", "getList");
    url.searchParams.set("apiKey", this.apiKey);
    url.searchParams.set("jipyoId", params.jipyoId);
    url.searchParams.set("format", "json");
    url.searchParams.set("jsonVD", "Y");
    url.searchParams.set("pageNo", String(params.pageNo || 1));
    url.searchParams.set("numOfRows", String(params.numOfRows || 10));

    return this.fetchWithRetry(url.toString());
  }

  /** 대용량 통계자료 조회 */
  async getLargeData(params: {
    orgId: string;
    tblId: string;
    prdSe?: string;
    startPrdDe?: string;
    endPrdDe?: string;
    newEstPrdCnt?: number;
  }): Promise<unknown> {
    const url = new URL(`${BASE_URL}/statisticsLargeData.do`);
    url.searchParams.set("method", "getList");
    url.searchParams.set("apiKey", this.apiKey);
    url.searchParams.set("orgId", params.orgId);
    url.searchParams.set("tblId", params.tblId);
    url.searchParams.set("format", "json");
    url.searchParams.set("jsonVD", "Y");

    if (params.prdSe) url.searchParams.set("prdSe", params.prdSe);
    if (params.startPrdDe && params.endPrdDe) {
      url.searchParams.set("startPrdDe", params.startPrdDe);
      url.searchParams.set("endPrdDe", params.endPrdDe);
    } else {
      url.searchParams.set("newEstPrdCnt", String(params.newEstPrdCnt || 3));
    }

    return this.fetchWithRetry(url.toString());
  }

  private async fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<unknown> {
    let lastError: Error | null = null;

    for (let i = 0; i < retries; i++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

        const response = await fetch(url, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const text = await response.text();

        if (text.trim().startsWith("<!") || text.trim().startsWith("<html")) {
          throw new Error("API가 HTML 에러 페이지를 반환했습니다.");
        }

        try {
          return JSON.parse(text);
        } catch {
          return { raw: text };
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (i < retries - 1) {
          await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
        }
      }
    }

    throw lastError || new Error("API 호출 실패");
  }
}

export function truncateResponse(text: string): string {
  if (text.length <= MAX_RESPONSE_LENGTH) return text;
  return text.slice(0, MAX_RESPONSE_LENGTH) + "\n\n... (결과가 50KB를 초과하여 잘렸습니다)";
}

export function formatRows(rows: Record<string, unknown>[], title: string): string {
  if (!rows || rows.length === 0) {
    return `[${title}] 조회 결과가 없습니다.`;
  }

  const lines: string[] = [`## ${title} (${rows.length}건)`];
  for (const row of rows) {
    lines.push("---");
    for (const [key, value] of Object.entries(row)) {
      if (value !== null && value !== undefined && value !== "") {
        lines.push(`- **${key}**: ${value}`);
      }
    }
  }
  return lines.join("\n");
}
