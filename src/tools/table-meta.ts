/**
 * KOSIS 통계표설명 조회 도구
 */
import { z } from "zod";
import { KosisApiClient, truncateResponse } from "../lib/api-client.js";

export const tableMetaSchema = z.object({
  orgId: z.string().describe("기관코드 (예: 101)"),
  tblId: z.string().describe("통계표ID (예: DT_1B04005N)"),
  type: z.string().optional().describe(
    "조회유형: TBL=통계표명칭, ORG=기관명칭, PRD=수록정보, " +
    "ITM=분류항목, CMMT=주석, UNIT=단위, SRC=출처, UPD=자료갱신일 — 기본: TBL"
  ),
});

export async function getTableMeta(
  client: KosisApiClient,
  params: z.infer<typeof tableMetaSchema>
): Promise<string> {
  try {
    const data = await client.getTableMeta({
      orgId: params.orgId,
      tblId: params.tblId,
      type: params.type,
    });

    if (data && typeof data === "object") {
      if ("err" in data) {
        const err = data as { err: string; errMsg: string };
        return `조회 실패 [${err.err}]: ${err.errMsg}`;
      }
      return truncateResponse(
        `## 통계표설명 [${params.tblId}]\n\n` + JSON.stringify(data, null, 2)
      );
    }

    return "통계표설명 조회 결과가 없습니다.";
  } catch (error) {
    return `통계표설명 조회 실패: ${error instanceof Error ? error.message : String(error)}`;
  }
}
