/**
 * KOSIS 통계설명자료 조회 도구
 */
import { z } from "zod";
import { KosisApiClient, truncateResponse } from "../lib/api-client.js";

export const statisticsMetaSchema = z.object({
  orgId: z.string().optional().describe("기관코드"),
  tblId: z.string().optional().describe("통계표ID"),
  statId: z.string().optional().describe("통계ID — orgId+tblId 대신 사용 가능"),
  metaItm: z.string().optional().describe(
    "조회항목: All=전체, statsNm=통계명, statsKind=통계종류, " +
    "statsContinue=작성주기, basisLaw=법적근거, writingPurps=작성목적, " +
    "statsPeriod=작성기간, statisFrm=공표방법 — 기본: All"
  ),
});

export async function getStatisticsMeta(
  client: KosisApiClient,
  params: z.infer<typeof statisticsMetaSchema>
): Promise<string> {
  try {
    const data = await client.getStatisticsMeta({
      orgId: params.orgId,
      tblId: params.tblId,
      statId: params.statId,
      metaItm: params.metaItm,
    });

    if (data && typeof data === "object") {
      if ("err" in data) {
        const err = data as { err: string; errMsg: string };
        return `조회 실패 [${err.err}]: ${err.errMsg}`;
      }
      return truncateResponse(
        "## 통계설명자료\n\n" + JSON.stringify(data, null, 2)
      );
    }

    return "통계설명자료 조회 결과가 없습니다.";
  } catch (error) {
    return `통계설명자료 조회 실패: ${error instanceof Error ? error.message : String(error)}`;
  }
}
