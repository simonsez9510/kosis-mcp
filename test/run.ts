/**
 * KOSIS MCP 전수 테스트
 *
 * 사용법: npx tsx test/run.ts
 */
import { McpTestHarness } from "./harness.js";

// ── 설정 ──
const SERVER_PATH = "build/index.js";
const API_KEY = process.env.KOSIS_API_KEY || "";

if (!API_KEY) {
  console.error("KOSIS_API_KEY 환경변수를 설정해주세요.");
  process.exit(1);
}

// ── 테스트 결과 ──
let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  PASS  ${message}`);
    passed++;
  } else {
    console.log(`  FAIL  ${message}`);
    failed++;
  }
}

// ── 메인 ──
async function main(): Promise<void> {
  const harness = new McpTestHarness(SERVER_PATH, {
    KOSIS_API_KEY: API_KEY,
  });

  try {
    // ── 서버 시작 ──
    console.log("\n[1/7] 서버 시작");
    await harness.start();
    assert(true, "MCP 서버 초기화 성공");

    // ── 도구 목록 ──
    console.log("\n[2/7] 도구 목록 검증");
    const tools = await harness.listTools();
    assert(tools.length === 7, `도구 ${tools.length}개 등록 (기대: 7)`);

    const expectedTools = [
      "kosis_search",
      "kosis_get_data",
      "kosis_region_code",
      "kosis_list",
      "kosis_meta",
      "kosis_table_info",
      "kosis_indicator",
    ];
    for (const name of expectedTools) {
      assert(
        tools.some((t) => t.name === name),
        `도구 "${name}" 존재`
      );
    }

    // ── kosis_search ──
    console.log("\n[3/7] kosis_search 테스트");
    const search = await harness.callTool("kosis_search", {
      keyword: "실업률",
      count: 3,
    });
    assert(!search.isError, "검색 에러 없음");
    assert(search.text.includes("검색 결과"), "검색 결과 포함");
    assert(search.text.includes("통계표ID"), "통계표ID 포함");

    // ── kosis_region_code ──
    console.log("\n[4/7] kosis_region_code 테스트");

    // 테스트 4-1: SGG 코드 체계
    const region1 = await harness.callTool("kosis_region_code", {
      tblId: "DT_1YL20631",
      region: "인천 서구",
    });
    assert(!region1.isError, "지역코드(SGG) 에러 없음");
    assert(region1.text.includes("23080"), "인천 서구 → 23080 매핑");

    // 테스트 4-2: 행안부 코드 체계
    const region2 = await harness.callTool("kosis_region_code", {
      tblId: "DT_1YL20651E",
      region: "인천 서구",
    });
    assert(!region2.isError, "지역코드(행안부) 에러 없음");
    assert(region2.text.includes("28260"), "인천 서구 → 28260 매핑");

    // 테스트 4-3: 시도 생략
    const region3 = await harness.callTool("kosis_region_code", {
      tblId: "DT_1YL20631",
      region: "남동구",
    });
    assert(!region3.isError, "시도 생략 에러 없음");
    assert(region3.text.includes("23050"), "남동구 → 23050 매핑");

    // ── kosis_get_data ──
    console.log("\n[5/7] kosis_get_data 테스트");
    const data = await harness.callTool("kosis_get_data", {
      orgId: "101",
      tblId: "DT_1YL20631",
      objL1: "23080",
      itmId: "T10",
      prdSe: "Y",
      newEstPrdCnt: 3,
    });
    assert(!data.isError, "데이터 조회 에러 없음");
    assert(data.text.includes("서구"), "서구 데이터 포함");
    assert(data.text.includes("%"), "단위(%) 포함");

    // ── kosis_list ──
    console.log("\n[6/7] kosis_list 테스트");
    const list = await harness.callTool("kosis_list", {
      vwCd: "MT_ZTITLE",
    });
    assert(!list.isError, "목록 조회 에러 없음");
    assert(list.text.includes("인구"), "인구 카테고리 포함");
    assert(list.text.includes("노동"), "노동 카테고리 포함");

    // ── kosis_table_info ──
    console.log("\n[7/7] kosis_table_info 테스트");
    const tableInfo = await harness.callTool("kosis_table_info", {
      orgId: "101",
      tblId: "DT_1YL20631",
      type: "TBL",
    });
    assert(!tableInfo.isError, "통계표설명 에러 없음");
    assert(
      tableInfo.text.includes("DT_1YL20631"),
      "통계표ID 포함"
    );

    // ── 결과 요약 ──
    console.log("\n" + "=".repeat(50));
    console.log(`결과: ${passed} PASS / ${failed} FAIL (총 ${passed + failed}건)`);
    console.log("=".repeat(50));

    if (failed > 0) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error(
      "\n테스트 실행 실패:",
      err instanceof Error ? err.message : err
    );
    process.exitCode = 1;
  } finally {
    await harness.stop();
  }
}

main();
