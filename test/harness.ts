/**
 * MCP 테스트 하네스
 *
 * MCP 서버를 자동으로 시작하고, JSON-RPC로 통신하여
 * 도구 목록 검증 + 도구 호출 테스트를 수행합니다.
 * 다른 MCP 프로젝트에서도 재사용 가능.
 */
import { spawn, ChildProcess } from "child_process";

interface McpToolResult {
  text: string;
  isError: boolean;
}

interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export class McpTestHarness {
  private process: ChildProcess | null = null;
  private buffer = "";
  private responseQueue: Array<{
    id: number;
    resolve: (data: unknown) => void;
    reject: (err: Error) => void;
  }> = [];
  private nextId = 1;

  constructor(
    private serverPath: string,
    private env: Record<string, string> = {}
  ) {}

  /** 서버 시작 + MCP 초기화 */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("서버 시작 타임아웃 (10초)")),
        10000
      );

      this.process = spawn("node", [this.serverPath], {
        env: { ...process.env, ...this.env },
        stdio: ["pipe", "pipe", "pipe"],
      });

      this.process.stdout!.on("data", (chunk: Buffer) => {
        this.buffer += chunk.toString();
        this.processBuffer();
      });

      this.process.stderr!.on("data", (chunk: Buffer) => {
        // stderr는 서버 로그 → 시작 확인용
        const msg = chunk.toString();
        if (msg.includes("시작")) {
          // 서버 시작 로그 감지
        }
      });

      this.process.on("error", (err) => {
        clearTimeout(timeout);
        reject(new Error(`서버 실행 실패: ${err.message}`));
      });

      // initialize + initialized 전송
      this.sendRaw({
        jsonrpc: "2.0",
        id: this.nextId++,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "mcp-test-harness", version: "1.0.0" },
        },
      });

      // initialize 응답 대기
      this.waitForResponse(1)
        .then(() => {
          this.sendRaw({
            jsonrpc: "2.0",
            method: "notifications/initialized",
          });
          clearTimeout(timeout);
          resolve();
        })
        .catch((err) => {
          clearTimeout(timeout);
          reject(err);
        });
    });
  }

  /** 도구 목록 조회 */
  async listTools(): Promise<McpTool[]> {
    const id = this.nextId++;
    this.sendRaw({
      jsonrpc: "2.0",
      id,
      method: "tools/list",
      params: {},
    });

    const response = (await this.waitForResponse(id)) as {
      result: { tools: McpTool[] };
    };
    return response.result.tools;
  }

  /** 도구 호출 */
  async callTool(
    name: string,
    args: Record<string, unknown> = {}
  ): Promise<McpToolResult> {
    const id = this.nextId++;
    this.sendRaw({
      jsonrpc: "2.0",
      id,
      method: "tools/call",
      params: { name, arguments: args },
    });

    const response = (await this.waitForResponse(id)) as {
      result: {
        content: Array<{ type: string; text: string }>;
        isError?: boolean;
      };
    };

    return {
      text: response.result.content?.[0]?.text || "",
      isError: response.result.isError || false,
    };
  }

  /** 서버 종료 */
  async stop(): Promise<void> {
    if (this.process) {
      this.process.stdin!.end();
      this.process.kill();
      this.process = null;
    }
  }

  private sendRaw(data: Record<string, unknown>): void {
    if (!this.process?.stdin) throw new Error("서버가 시작되지 않았습니다");
    this.process.stdin.write(JSON.stringify(data) + "\n");
  }

  private waitForResponse(id: number): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error(`응답 타임아웃 (id: ${id}, 30초)`)),
        30000
      );

      this.responseQueue.push({
        id,
        resolve: (data) => {
          clearTimeout(timeout);
          resolve(data);
        },
        reject: (err) => {
          clearTimeout(timeout);
          reject(err);
        },
      });

      // 이미 버퍼에 응답이 있을 수 있음
      this.processBuffer();
    });
  }

  private processBuffer(): void {
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      try {
        const data = JSON.parse(trimmed) as { id?: number };
        if (data.id !== undefined) {
          const idx = this.responseQueue.findIndex((q) => q.id === data.id);
          if (idx !== -1) {
            const [entry] = this.responseQueue.splice(idx, 1);
            entry.resolve(data);
          }
        }
      } catch {
        // JSON 파싱 실패 → 무시
      }
    }
  }
}
