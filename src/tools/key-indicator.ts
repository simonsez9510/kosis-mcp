/**
 * KOSIS 통계주요지표 조회 도구
 */
import { z } from "zod";
import { KosisApiClient, formatRows, truncateResponse } from "../lib/api-client.js";

export const keyIndicatorSchema = z.object({
  jipyoId: z.string().describe(
    "지표ID (예: DT_1B04005N). KOSIS 주요지표 페이지에서 확인"
  ),
  pageNo: z.number().optional().describe("페이지 번호 (기본 1)"),
  numOfRows: z.number().optional().describe("페이지당 건수 (기본 10)"),
});

export async function getKeyIndicator(
  client: KosisApiClient,
  params: z.infer<typeof keyIndicatorSchema>
): Promise<string> {
  try {
    const data = await client.getKeyIndicator({
      jipyoId: params.jipyoId,
      pageNo: params.pageNo,
      numOfRows: params.numOfRows,
    });

    if (Array.isArray(data) && data.length > 0) {
      const rows = data.map((item: Record<string, unknown>) => ({
        지표ID: item.statJipyoId,
        지표명: item.statJipyoNm,
        설명제목: item.jipyoExplan,
        개념: item.jipyoExplan1,
        선정방법: item.jipyoExplan2,
        출처: item.jipyoExplan3,
      }));
      const cleaned = rows.map((r) => {
        const obj: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(r)) {
          if (v !== null && v !== undefined && v !== "") obj[k] = v;
        }
        return obj;
      });
      return truncateResponse(formatRows(cleaned, "통계주요지표"));
    }

    if (data && typeof data === "object" && "err" in data) {
      const err = data as { err: string; errMsg: string };
      return `조회 실패 [${err.err}]: ${err.errMsg}`;
    }

    return "통계주요지표 조회 결과가 없습니다.";
  } catch (error) {
    return `통계주요지표 조회 실패: ${error instanceof Error ? error.message : String(error)}`;
  }
}
