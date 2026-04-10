/**
 * KOSIS 통계목록 조회 도구
 */
import { z } from "zod";
import { KosisApiClient, formatRows, truncateResponse } from "../lib/api-client.js";

export const statisticsListSchema = z.object({
  vwCd: z.string().optional().describe(
    "서비스뷰 코드: MT_ZTITLE=국내통계(주제별), MT_OTITLE=국내통계(기관별), " +
    "MT_GTITLE01=e-지방지표, MT_GTITLE02=e-나라지표, MT_ETITLE=영문KOSIS, " +
    "MT_RTITLE=북한통계, MT_BUKHAN=북한통계(주제별), " +
    "MT_CHOSUN_TITLE=일제시대, MT_HANKUK_TITLE=해방전후, " +
    "MT_STOP_TITLE=중단통계, MT_ATITLE01=국제통계 — 기본: MT_ZTITLE"
  ),
  parentListId: z.string().optional().describe("시작 목록 ID — 생략시 최상위"),
});

export async function getStatisticsList(
  client: KosisApiClient,
  params: z.infer<typeof statisticsListSchema>
): Promise<string> {
  try {
    const data = await client.getStatisticsList({
      vwCd: params.vwCd || "MT_ZTITLE",
      parentListId: params.parentListId,
    });

    if (Array.isArray(data) && data.length > 0) {
      const rows = data.map((item: Record<string, unknown>) => ({
        목록ID: item.LIST_ID,
        목록명: item.LIST_NM,
        기관코드: item.ORG_ID,
        통계표ID: item.TBL_ID,
        통계표명: item.TBL_NM,
        뷰코드: item.VW_CD,
      }));
      const cleaned = rows.map((r) => {
        const obj: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(r)) {
          if (v !== null && v !== undefined && v !== "") obj[k] = v;
        }
        return obj;
      });
      return truncateResponse(formatRows(cleaned, "통계목록"));
    }

    if (data && typeof data === "object" && "err" in data) {
      const err = data as { err: string; errMsg: string };
      return `목록 조회 실패 [${err.err}]: ${err.errMsg}`;
    }

    return "통계목록 조회 결과가 없습니다.";
  } catch (error) {
    return `통계목록 조회 실패: ${error instanceof Error ? error.message : String(error)}`;
  }
}
