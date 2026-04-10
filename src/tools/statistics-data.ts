/**
 * KOSIS 통계자료 조회 도구
 */
import { z } from "zod";
import { KosisApiClient, formatRows, truncateResponse } from "../lib/api-client.js";

export const statisticsDataSchema = z.object({
  orgId: z.string().describe("기관코드 (예: 101=통계청, 110=행안부)"),
  tblId: z.string().describe("통계표ID (예: DT_1B04005N) — 통합검색으로 확인"),
  objL1: z.string().optional().describe("분류1 값 (ALL=전체) — 생략시 ALL"),
  objL2: z.string().optional().describe("분류2 값"),
  objL3: z.string().optional().describe("분류3 값"),
  objL4: z.string().optional().describe("분류4 값"),
  itmId: z.string().optional().describe("항목ID (ALL=전체)"),
  prdSe: z.string().optional().describe("수록주기: Y=연, H=반기, Q=분기, M=월"),
  startPrdDe: z.string().optional().describe("시작 시점 (예: 2020)"),
  endPrdDe: z.string().optional().describe("종료 시점 (예: 2024)"),
  newEstPrdCnt: z.number().optional().describe("최신 기간 수 (기본 5) — 시작/종료 미입력시 사용"),
});

export async function getStatisticsData(
  client: KosisApiClient,
  params: z.infer<typeof statisticsDataSchema>
): Promise<string> {
  try {
    const data = await client.getStatisticsData({
      orgId: params.orgId,
      tblId: params.tblId,
      objL1: params.objL1 || "ALL",
      objL2: params.objL2,
      objL3: params.objL3,
      objL4: params.objL4,
      itmId: params.itmId || "ALL",
      prdSe: params.prdSe || "Y",
      startPrdDe: params.startPrdDe,
      endPrdDe: params.endPrdDe,
      newEstPrdCnt: params.newEstPrdCnt,
    });

    if (Array.isArray(data) && data.length > 0) {
      const rows = data.map((item: Record<string, unknown>) => ({
        분류1: item.C1_NM,
        분류2: item.C2_NM,
        분류3: item.C3_NM,
        항목: item.ITM_NM,
        시점: item.PRD_DE,
        단위: item.UNIT_NM,
        값: item.DT,
      }));
      // 불필요한 빈 값 제거
      const cleaned = rows.map((r) => {
        const obj: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(r)) {
          if (v !== null && v !== undefined && v !== "" && v !== "-") obj[k] = v;
        }
        return obj;
      });
      return truncateResponse(formatRows(cleaned, `통계자료 [${params.tblId}]`));
    }

    if (data && typeof data === "object" && "err" in data) {
      const err = data as { err: string; errMsg: string };
      return `조회 실패 [${err.err}]: ${err.errMsg}`;
    }

    return `통계자료 [${params.tblId}] 조회 결과가 없습니다.`;
  } catch (error) {
    return `통계자료 조회 실패: ${error instanceof Error ? error.message : String(error)}`;
  }
}
