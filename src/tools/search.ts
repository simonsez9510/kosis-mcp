/**
 * KOSIS 통합검색 도구
 */
import { z } from "zod";
import { KosisApiClient, formatRows, truncateResponse } from "../lib/api-client.js";

export const searchSchema = z.object({
  keyword: z.string().describe("검색 키워드 (예: 인구, 실업률, GDP)"),
  orgId: z.string().optional().describe("기관코드 (예: 101=통계청) — 생략시 전체"),
  sort: z.enum(["RANK", "DATE"]).optional().describe("정렬: RANK=정확도, DATE=최신순"),
  count: z.number().optional().describe("결과 건수 (기본 10)"),
});

export async function searchStatistics(
  client: KosisApiClient,
  params: z.infer<typeof searchSchema>
): Promise<string> {
  try {
    const data = await client.searchStatistics({
      searchNm: params.keyword,
      orgId: params.orgId,
      sort: params.sort,
      resultCount: params.count,
    });

    if (Array.isArray(data) && data.length > 0) {
      const rows = data.map((item: Record<string, unknown>) => ({
        통계표명: item.TBL_NM,
        기관명: item.ORG_NM,
        기관코드: item.ORG_ID,
        통계표ID: item.TBL_ID,
        수록주기: item.PRD_SE,
        최근수록시점: item.PRD_DE,
      }));
      return truncateResponse(formatRows(rows as Record<string, unknown>[], `"${params.keyword}" 검색 결과`));
    }

    if (data && typeof data === "object" && "err" in data) {
      const err = data as { err: string; errMsg: string };
      return `검색 실패 [${err.err}]: ${err.errMsg}`;
    }

    return `"${params.keyword}" 검색 결과가 없습니다.`;
  } catch (error) {
    return `통합검색 실패: ${error instanceof Error ? error.message : String(error)}`;
  }
}
