/**
 * KOSIS 지역코드 자동 매핑 도구
 *
 * 테이블마다 지역코드 체계가 다른 문제를 해결.
 * - 행안부 표준코드 (28260)
 * - KOSIS SGG 순번코드 (23080)
 * - 압축코드 (2308)
 *
 * "인천 서구" 같은 자연어 입력 → 해당 테이블의 정확한 코드 반환
 */
import { z } from "zod";
import { KosisApiClient, truncateResponse } from "../lib/api-client.js";

export const findRegionCodeSchema = z.object({
  tblId: z.string().describe("통계표ID (예: DT_1YL20631)"),
  orgId: z.string().optional().describe("기관코드 (기본: 101)"),
  region: z.string().describe("지역명 (예: 인천 서구, 서울 강남구, 남동구)"),
});

interface MetaItem {
  ITM_ID: string;
  ITM_NM: string;
  ITM_NM_ENG?: string;
  OBJ_ID: string;
  OBJ_NM: string;
  UP_ITM_ID?: string;
}

export async function findRegionCode(
  client: KosisApiClient,
  params: z.infer<typeof findRegionCodeSchema>
): Promise<string> {
  try {
    const orgId = params.orgId || "101";
    const data = await client.getTableMeta({
      orgId,
      tblId: params.tblId,
      type: "ITM",
    });

    if (!data || typeof data !== "object") {
      return "통계표 메타 조회 실패";
    }

    // 에러 응답 확인
    if ("err" in data) {
      const err = data as { err: string; errMsg: string };
      return `조회 실패 [${err.err}]: ${err.errMsg}`;
    }

    const items = (Array.isArray(data) ? data : []) as MetaItem[];

    // 지역 관련 분류만 필터 (항목 ITEM 제외)
    const regionItems = items.filter(
      (item) => item.OBJ_ID !== "ITEM" && item.OBJ_NM !== "항목"
    );

    if (regionItems.length === 0) {
      return "이 통계표에는 지역 분류가 없습니다.";
    }

    // 검색어 파싱: "인천 서구" → ["인천", "서구"], "남동구" → ["남동구"]
    const keywords = params.region
      .replace(/특별시|광역시|특별자치시|특별자치도/g, "")
      .trim()
      .split(/[\s,]+/)
      .filter((k) => k.length > 0);

    // 0단계: ITM_NM에 전체 검색어가 포함된 경우 (예: "인천 서구" → ITM_NM="인천 서구")
    const fullQuery = params.region.replace(/특별시|광역시|특별자치시|특별자치도/g, "").trim();
    let matches = regionItems.filter((item) => {
      const name = item.ITM_NM.replace(/\s+/g, " ").trim();
      return name === fullQuery || name.includes(fullQuery);
    });

    // 1단계: 0단계 실패시 키워드 분리 매칭
    if (matches.length === 0) {
      matches = findMatches(regionItems, keywords);
    }

    // 2단계: 매칭이 여러 개면 상위 지역으로 필터
    if (matches.length > 1 && keywords.length >= 2) {
      const filtered = filterByParent(matches, regionItems, keywords[0]);
      if (filtered.length > 0) {
        matches = filtered;
      }
    }

    if (matches.length === 0) {
      // 유사 매칭
      const similar = regionItems
        .filter((item) =>
          keywords.some(
            (k) => item.ITM_NM.includes(k) || (item.ITM_NM_ENG || "").toLowerCase().includes(k.toLowerCase())
          )
        )
        .slice(0, 10);

      if (similar.length > 0) {
        const lines = [`"${params.region}" 정확한 매칭 없음. 유사 결과:`];
        for (const item of similar) {
          const parent = item.UP_ITM_ID
            ? regionItems.find((r) => r.ITM_ID === item.UP_ITM_ID)?.ITM_NM || ""
            : "";
          lines.push(
            `- **${parent ? parent + " " : ""}${item.ITM_NM}** → objL1: \`${item.ITM_ID}\``
          );
        }
        return lines.join("\n");
      }

      return `"${params.region}" 매칭 결과 없음. 이 테이블의 지역 분류: ${regionItems
        .filter((r) => !r.UP_ITM_ID)
        .map((r) => r.ITM_NM)
        .slice(0, 20)
        .join(", ")}`;
    }

    // 결과 출력
    const lines = [`## "${params.region}" 지역코드 [${params.tblId}]`];
    for (const match of matches) {
      const parent = match.UP_ITM_ID
        ? regionItems.find((r) => r.ITM_ID === match.UP_ITM_ID)?.ITM_NM || ""
        : "";
      lines.push("");
      lines.push(`- **지역**: ${parent ? parent + " " : ""}${match.ITM_NM}`);
      lines.push(`- **코드(objL1)**: \`${match.ITM_ID}\``);
      lines.push(`- **OBJ_ID**: ${match.OBJ_ID}`);
      if (match.UP_ITM_ID) {
        lines.push(`- **상위코드**: \`${match.UP_ITM_ID}\``);
      }
    }

    lines.push("");
    lines.push("**사용법:**");
    lines.push(
      `\`kosis_get_data({ orgId: "${orgId}", tblId: "${params.tblId}", objL1: "${matches[0].ITM_ID}" })\``
    );

    return lines.join("\n");
  } catch (error) {
    return `지역코드 조회 실패: ${error instanceof Error ? error.message : String(error)}`;
  }
}

function findMatches(items: MetaItem[], keywords: string[]): MetaItem[] {
  // 마지막 키워드가 구/군/시 이름
  const targetName = keywords[keywords.length - 1];

  return items.filter((item) => {
    const name = item.ITM_NM;
    // 정확히 일치하거나, "구"/"군"/"시" 붙여서 일치
    return (
      name === targetName ||
      name === targetName + "구" ||
      name === targetName + "군" ||
      name === targetName + "시" ||
      (targetName.endsWith("구") && name === targetName) ||
      (targetName.endsWith("군") && name === targetName) ||
      (targetName.endsWith("시") && name === targetName)
    );
  });
}

function filterByParent(
  matches: MetaItem[],
  allItems: MetaItem[],
  parentKeyword: string
): MetaItem[] {
  return matches.filter((match) => {
    if (!match.UP_ITM_ID) return false;
    const parent = allItems.find((item) => item.ITM_ID === match.UP_ITM_ID);
    if (!parent) return false;
    return parent.ITM_NM.includes(parentKeyword);
  });
}
