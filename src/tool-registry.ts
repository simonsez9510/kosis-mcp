/**
 * KOSIS MCP 도구 등록
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { KosisApiClient } from "./lib/api-client.js";
import { searchSchema, searchStatistics } from "./tools/search.js";
import { statisticsDataSchema, getStatisticsData } from "./tools/statistics-data.js";
import { statisticsListSchema, getStatisticsList } from "./tools/statistics-list.js";
import { statisticsMetaSchema, getStatisticsMeta } from "./tools/statistics-meta.js";
import { tableMetaSchema, getTableMeta } from "./tools/table-meta.js";
import { keyIndicatorSchema, getKeyIndicator } from "./tools/key-indicator.js";

function zodToJsonSchema(schema: Record<string, unknown>): Record<string, unknown> {
  // zod 스키마에서 JSON Schema 변환 (간이)
  return schema as Record<string, unknown>;
}

const TOOLS = [
  {
    name: "kosis_search",
    description: "KOSIS 통합검색 — 키워드로 통계표 검색. orgId, tblId를 찾는 첫 단계",
    inputSchema: {
      type: "object" as const,
      properties: {
        keyword: { type: "string", description: "검색 키워드 (예: 인구, 실업률, GDP)" },
        orgId: { type: "string", description: "기관코드 (예: 101=통계청) — 생략시 전체" },
        sort: { type: "string", enum: ["RANK", "DATE"], description: "정렬: RANK=정확도, DATE=최신순" },
        count: { type: "number", description: "결과 건수 (기본 10)" },
      },
      required: ["keyword"],
    },
  },
  {
    name: "kosis_get_data",
    description: "KOSIS 통계자료 조회 — orgId, tblId로 실제 통계 데이터 조회",
    inputSchema: {
      type: "object" as const,
      properties: {
        orgId: { type: "string", description: "기관코드 (예: 101=통계청, 110=행안부)" },
        tblId: { type: "string", description: "통계표ID (예: DT_1B04005N) — 통합검색으로 확인" },
        objL1: { type: "string", description: "분류1 값 (ALL=전체) — 생략시 ALL" },
        objL2: { type: "string", description: "분류2 값" },
        objL3: { type: "string", description: "분류3 값" },
        objL4: { type: "string", description: "분류4 값" },
        itmId: { type: "string", description: "항목ID (ALL=전체)" },
        prdSe: { type: "string", description: "수록주기: Y=연, H=반기, Q=분기, M=월" },
        startPrdDe: { type: "string", description: "시작 시점 (예: 2020)" },
        endPrdDe: { type: "string", description: "종료 시점 (예: 2024)" },
        newEstPrdCnt: { type: "number", description: "최신 기간 수 (기본 5) — 시작/종료 미입력시" },
      },
      required: ["orgId", "tblId"],
    },
  },
  {
    name: "kosis_list",
    description: "KOSIS 통계목록 조회 — 주제별/기관별 통계표 목록 탐색",
    inputSchema: {
      type: "object" as const,
      properties: {
        vwCd: {
          type: "string",
          description:
            "서비스뷰: MT_ZTITLE=국내(주제별), MT_OTITLE=국내(기관별), MT_GTITLE01=e-지방지표, MT_GTITLE02=e-나라지표, MT_RTITLE=북한통계, MT_ATITLE01=국제통계",
        },
        parentListId: { type: "string", description: "시작 목록 ID — 생략시 최상위" },
      },
    },
  },
  {
    name: "kosis_meta",
    description: "KOSIS 통계설명자료 — 통계의 작성목적, 법적근거, 주기 등 메타 정보",
    inputSchema: {
      type: "object" as const,
      properties: {
        orgId: { type: "string", description: "기관코드" },
        tblId: { type: "string", description: "통계표ID" },
        statId: { type: "string", description: "통계ID — orgId+tblId 대신 사용 가능" },
        metaItm: {
          type: "string",
          description:
            "조회항목: All=전체, statsNm=통계명, statsKind=종류, writingPurps=작성목적, basisLaw=법적근거",
        },
      },
    },
  },
  {
    name: "kosis_table_info",
    description: "KOSIS 통계표설명 — 통계표의 명칭, 분류항목, 단위, 출처, 갱신일 등",
    inputSchema: {
      type: "object" as const,
      properties: {
        orgId: { type: "string", description: "기관코드 (예: 101)" },
        tblId: { type: "string", description: "통계표ID (예: DT_1B04005N)" },
        type: {
          type: "string",
          description:
            "조회유형: TBL=통계표명칭, ORG=기관명칭, PRD=수록정보, ITM=분류항목, CMMT=주석, UNIT=단위, SRC=출처, UPD=자료갱신일",
        },
      },
      required: ["orgId", "tblId"],
    },
  },
  {
    name: "kosis_indicator",
    description: "KOSIS 통계주요지표 — 핵심 경제·사회 지표 설명 및 데이터",
    inputSchema: {
      type: "object" as const,
      properties: {
        jipyoId: { type: "string", description: "지표ID" },
        pageNo: { type: "number", description: "페이지 번호 (기본 1)" },
        numOfRows: { type: "number", description: "페이지당 건수 (기본 10)" },
      },
      required: ["jipyoId"],
    },
  },
];

export function registerTools(server: Server, client: KosisApiClient): void {
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      let result: string;

      switch (name) {
        case "kosis_search":
          result = await searchStatistics(client, searchSchema.parse(args));
          break;
        case "kosis_get_data":
          result = await getStatisticsData(client, statisticsDataSchema.parse(args));
          break;
        case "kosis_list":
          result = await getStatisticsList(client, statisticsListSchema.parse(args));
          break;
        case "kosis_meta":
          result = await getStatisticsMeta(client, statisticsMetaSchema.parse(args));
          break;
        case "kosis_table_info":
          result = await getTableMeta(client, tableMetaSchema.parse(args));
          break;
        case "kosis_indicator":
          result = await getKeyIndicator(client, keyIndicatorSchema.parse(args));
          break;
        default:
          result = `알 수 없는 도구: ${name}`;
      }

      return { content: [{ type: "text", text: result }] };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { content: [{ type: "text", text: `오류: ${message}` }], isError: true };
    }
  });
}
