# KOSIS MCP Server

KOSIS(국가통계포털) OpenAPI를 [Model Context Protocol](https://modelcontextprotocol.io) 도구로 제공하는 MCP 서버입니다.

인구, 경제, 고용, 물가, 산업 등 **국가통계 전 분야**를 AI 에이전트에서 직접 조회할 수 있습니다.

## 제공 도구 (7개)

| 도구 | 설명 | 주요 용도 |
|------|------|----------|
| `kosis_search` | 통합검색 — 키워드로 통계표 검색 | orgId, tblId를 찾는 첫 단계 |
| `kosis_get_data` | 통계자료 조회 — 실제 데이터 조회 | 핵심 도구. 수치 데이터 확보 |
| `kosis_region_code` | 지역코드 자동 매핑 — 자연어로 코드 검색 | **kosis_get_data 전에 필수** |
| `kosis_list` | 통계목록 — 주제별/기관별 목록 탐색 | 어떤 통계가 있는지 탐색 |
| `kosis_meta` | 통계설명자료 — 작성목적, 법적근거 등 | 통계 메타 정보 확인 |
| `kosis_table_info` | 통계표설명 — 분류항목, 단위, 출처 등 | 데이터 구조 파악 |
| `kosis_indicator` | 통계주요지표 — 핵심 경제·사회 지표 | 주요 국가지표 조회 |

## 설치

```bash
git clone https://github.com/simonsez9510/kosis-mcp.git
cd kosis-mcp
npm install
npm run build
```

## API 키 발급

1. [KOSIS 공유서비스](https://kosis.kr/openapi/) 접속
2. 회원가입 후 로그인
3. **활용신청** → Open API 서비스 신청 (자동승인)
4. **마이페이지**에서 인증키 확인

## Claude Code 설정

`.claude/.mcp.json`에 추가:

```json
{
  "mcpServers": {
    "kosis": {
      "command": "node",
      "args": ["/path/to/kosis-mcp/build/index.js"],
      "env": {
        "KOSIS_API_KEY": "발급받은_인증키"
      }
    }
  }
}
```

## 사용 가이드

### 기본 워크플로우

KOSIS 데이터를 조회하려면 보통 **2단계**로 진행합니다:

```
1단계: kosis_search로 통계표 검색 → orgId, tblId 확인
2단계: kosis_region_code로 지역코드 확인 → objL1 코드 확보
3단계: kosis_get_data로 실제 데이터 조회
```

> **중요:** KOSIS는 테이블마다 지역코드 체계가 다릅니다 (행안부 코드, SGG 순번, 압축코드 등). `kosis_region_code`를 사용하면 "인천 서구" 같은 자연어로 정확한 코드를 자동으로 찾아줍니다.

### 1. 통합검색 (kosis_search)

키워드로 통계표를 찾습니다. `orgId`와 `tblId`를 확인하는 첫 단계입니다.

```
kosis_search({ keyword: "실업률" })
```

**파라미터:**
- `keyword` (필수): 검색 키워드
- `orgId`: 기관코드로 필터링 (예: `101` = 통계청)
- `sort`: `RANK`(정확도) 또는 `DATE`(최신순)
- `count`: 결과 건수 (기본 10)

**응답 예시:**
```
통계표명: 행정구역(시도)/성별 실업률
기관코드: 101
통계표ID: DT_1DA7104S
```

### 2. 지역코드 매핑 (kosis_region_code)

특정 지역의 통계를 조회하려면 먼저 해당 테이블의 지역코드를 확인해야 합니다.

```
kosis_region_code({ tblId: "DT_1YL20631", region: "인천 서구" })
```

**응답 예시:**
```
지역: 인천광역시 서구
코드(objL1): 23080
사용법: kosis_get_data({ orgId: "101", tblId: "DT_1YL20631", objL1: "23080" })
```

**파라미터:**
- `tblId` (필수): 통계표ID
- `region` (필수): 지역명 (예: `인천 서구`, `서울 강남구`, `남동구`)
- `orgId`: 기관코드 (기본 101)

> **왜 필요한가?** 같은 인천 서구라도 테이블마다 코드가 다릅니다:
> - 주민등록인구: `28260` (행안부 코드)
> - 고령인구비율: `23080` (SGG 순번코드)
> - 실업률(시군구): `2308` (압축코드)

### 3. 통계자료 조회 (kosis_get_data)

검색으로 찾은 `orgId`, `tblId`로 실제 수치 데이터를 조회합니다.

```
kosis_get_data({
  orgId: "101",
  tblId: "DT_1DA7104S",
  objL1: "00",        // 전국
  objL2: "0",         // 계
  prdSe: "M",         // 월간
  newEstPrdCnt: 3     // 최근 3개월
})
```

**파라미터:**
- `orgId` (필수): 기관코드
- `tblId` (필수): 통계표ID
- `objL1`~`objL4`: 분류 값 (`ALL` = 전체, `00` = 전국 등)
- `itmId`: 항목ID (`ALL` = 전체)
- `prdSe`: 수록주기 (`Y`=연, `H`=반기, `Q`=분기, `M`=월)
- `startPrdDe` / `endPrdDe`: 기간 범위 (예: `2020` ~ `2024`)
- `newEstPrdCnt`: 최신 N기간 (startPrdDe 미입력시 사용)

**응답 예시:**
```
항목: 실업률 | 시점: 202602 | 단위: % | 값: 3.4
```

> **팁:** objL 파라미터에서 에러가 나면 `ALL`을 순차적으로 넣어 보세요. 통계표마다 분류 구조가 다릅니다. `kosis_table_info`로 분류항목을 먼저 확인하면 정확합니다.

### 3. 통계목록 탐색 (kosis_list)

주제별/기관별로 어떤 통계표가 있는지 트리 구조로 탐색합니다.

```
# 최상위 주제 목록
kosis_list({})

# "인구" 하위 목록
kosis_list({ parentListId: "A" })
```

**서비스뷰 코드:**
| 코드 | 설명 |
|------|------|
| `MT_ZTITLE` | 국내통계 (주제별) — 기본값 |
| `MT_OTITLE` | 국내통계 (기관별) |
| `MT_GTITLE01` | e-지방지표 |
| `MT_GTITLE02` | e-나라지표 |
| `MT_RTITLE` | 북한통계 |
| `MT_ATITLE01` | 국제통계 |

**주제별 최상위 목록 ID:**
| ID | 주제 | ID | 주제 |
|----|------|----|------|
| A | 인구 | J1 | 경제일반·경기 |
| B | 사회일반 | K1 | 농림 |
| C | 범죄·안전 | L | 광업·제조업 |
| D | 노동 | M1 | 건설 |
| E | 소득·소비·자산 | M2 | 교통·물류 |
| F | 보건 | O | 도소매·서비스 |
| G | 복지 | P1 | 임금 |
| H1 | 교육·훈련 | P2 | 물가 |
| I1 | 주거 | Q | 국민계정 |
| I2 | 국토이용 | R | 정부·재정 |
| S1 | 금융 | T | 환경 |
| S2 | 무역·국제수지 | V | 지역통계 |

### 4. 통계설명자료 (kosis_meta)

통계의 작성목적, 법적근거, 주기 등 메타 정보를 조회합니다.

```
kosis_meta({ orgId: "101", tblId: "DT_1DA7104S" })
```

**metaItm 옵션:** `All`, `statsNm`, `statsKind`, `statsContinue`, `basisLaw`, `writingPurps`, `statsPeriod`, `statisFrm`

### 5. 통계표설명 (kosis_table_info)

통계표의 분류항목, 단위, 출처 등 구조를 확인합니다. `kosis_get_data`에 넣을 objL, itmId 값을 알아낼 때 유용합니다.

```
# 분류항목 확인
kosis_table_info({ orgId: "101", tblId: "DT_1DA7104S", type: "ITM" })

# 단위 확인
kosis_table_info({ orgId: "101", tblId: "DT_1DA7104S", type: "UNIT" })
```

**type 옵션:**
| 코드 | 설명 |
|------|------|
| `TBL` | 통계표 명칭 (기본값) |
| `ORG` | 기관 명칭 |
| `PRD` | 수록정보 |
| `ITM` | 분류항목 |
| `CMMT` | 주석 |
| `UNIT` | 단위 |
| `SRC` | 출처 |
| `UPD` | 자료갱신일 |

### 6. 통계주요지표 (kosis_indicator)

핵심 경제·사회 지표의 개념, 선정방법, 출처 등을 조회합니다.

```
kosis_indicator({ jipyoId: "DT_1B04005N" })
```

## 실전 예시

### 예시 1: 전국 실업률 최근 3개월

```
1. kosis_search({ keyword: "실업률" })
   → orgId: 101, tblId: DT_1DA7104S

2. kosis_get_data({
     orgId: "101", tblId: "DT_1DA7104S",
     objL1: "00", objL2: "0",
     prdSe: "M", newEstPrdCnt: 3
   })
   → 2025.12: 4.1% | 2026.01: 4.1% | 2026.02: 3.4%
```

### 예시 2: 인천 서구 고령인구비율 (지역코드 매핑 활용)

```
1. kosis_search({ keyword: "고령인구비율" })
   → orgId: 101, tblId: DT_1YL20631

2. kosis_region_code({ tblId: "DT_1YL20631", region: "인천 서구" })
   → objL1: 23080

3. kosis_get_data({
     orgId: "101", tblId: "DT_1YL20631",
     objL1: "23080", itmId: "T10",
     prdSe: "Y", newEstPrdCnt: 5
   })
   → 2021: 11.4% | 2023: 12.4% | 2025: 14.3%
```

### 예시 3: 주민등록 인구수 연도별

```
1. kosis_search({ keyword: "주민등록인구" })
   → orgId: 101, tblId: DT_1B04005N

2. kosis_get_data({
     orgId: "101", tblId: "DT_1B04005N",
     objL1: "00", objL2: "0", itmId: "T2",
     prdSe: "Y", newEstPrdCnt: 3
   })
   → 2023: 51,325,329명 | 2024: 51,217,221명 | 2025: 51,117,378명
```

### 예시 3: 인구 관련 통계표 탐색

```
1. kosis_list({})
   → A=인구, D=노동, P2=물가 ...

2. kosis_list({ parentListId: "A" })
   → A_4=인구총조사, A_7=주민등록인구현황, A_3=인구동향조사 ...

3. kosis_list({ parentListId: "A_7" })
   → 세부 통계표 목록
```

## 주요 기관코드

| 코드 | 기관명 |
|------|--------|
| 101 | 국가데이터처 (구 통계청) |
| 110 | 행정안전부 |
| 115 | 고용노동부 |
| 117 | 국토교통부 |
| 118 | 환경부 |
| 145 | 교육부 |
| 301 | 한국은행 |
| 311 | 금융감독원 |
| 354 | 한국보건사회연구원 |

## 에러 코드

| 코드 | 의미 | 해결 |
|------|------|------|
| 10 | 인증키 오류 | KOSIS_API_KEY 확인 |
| 20 | 필수 파라미터 누락 | objL 값을 ALL로 추가 |
| 21 | 잘못된 파라미터 | kosis_table_info로 유효값 확인 |
| 31 | 40,000셀 초과 | 분류/기간 범위를 좁혀서 재조회 |

## 테스트

```bash
npm test
```

26개 항목을 자동 점검합니다 (서버 초기화, 도구 등록, 검색, 지역코드 매핑 3종, 데이터 조회, 목록, 통계표설명).

### 테스트 하네스 재사용

`test/harness.ts`는 **어떤 MCP 서버에서든 재사용**할 수 있는 범용 테스트 프레임워크입니다.

다른 MCP 프로젝트에 적용하려면:

1. `test/harness.ts`를 복사
2. `test/run.ts`에 해당 MCP 전용 테스트 시나리오 작성
3. `npm test`로 실행

```typescript
import { McpTestHarness } from "./harness.js";

const harness = new McpTestHarness("build/index.js", {
  MY_API_KEY: "..."
});

await harness.start();

// 도구 목록 검증
const tools = await harness.listTools();

// 도구 호출 테스트
const result = await harness.callTool("my_tool", { param: "value" });
console.log(result.text, result.isError);

await harness.stop();
```

실제로 [local-finance-mcp](https://github.com/simonsez9510/local-finance-mcp)에서 동일한 harness.ts를 복사해 32개 테스트를 구성했습니다.

## 라이선스

MIT
