#!/usr/bin/env node
/**
 * KOSIS 국가통계포털 MCP Server
 *
 * KOSIS OpenAPI를 MCP 프로토콜로 제공합니다.
 * 6개 도구: 통합검색, 통계자료, 통계목록, 통계설명, 통계표설명, 주요지표
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { KosisApiClient } from "./lib/api-client.js";
import { registerTools } from "./tool-registry.js";

const VERSION = "1.0.0";

function createServer(): Server {
  const apiKey = process.env.KOSIS_API_KEY;
  if (!apiKey) {
    console.error("KOSIS_API_KEY 환경변수가 설정되지 않았습니다.");
    process.exit(1);
  }

  const client = new KosisApiClient(apiKey);
  const server = new Server(
    { name: "kosis-mcp", version: VERSION },
    { capabilities: { tools: {} } }
  );

  registerTools(server, client);
  return server;
}

async function main(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`KOSIS MCP Server v${VERSION} 시작 (STDIO 모드)`);
}

main().catch((error) => {
  console.error("서버 시작 실패:", error);
  process.exit(1);
});
