import { db } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";
import { validateSafeMcpUrl, SSRF_GENERIC_ERROR } from "@/lib/ssrf";

export async function isMcpFeatureEnabled(): Promise<boolean> {
  const setting = await db.systemSetting.findUnique({
    where: { key: "allowUserMcpServers" },
  });
  if (!setting) return true; // Default enabled
  return setting.value === "true" || setting.value === "1";
}

export interface McpToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
  serverName: string;
  serverId: string;
}

export interface McpExecutionResult {
  toolName: string;
  serverName: string;
  result: any;
  error?: string;
}

export interface DecryptedMcpServer {
  id: string;
  name: string;
  url: string;
  authToken: string | null;
}

/**
 * Returns active MCP servers configured by a specific student.
 * Returns empty if platform-wide MCP toggle is disabled.
 */
export async function getUserActiveMcpServers(userId: string): Promise<DecryptedMcpServer[]> {
  const enabled = await isMcpFeatureEnabled();
  if (!enabled) return [];

  const records = await db.userMCPServer.findMany({
    where: {
      userId,
      active: true,
    },
    select: {
      id: true,
      name: true,
      url: true,
      authToken: true,
    },
  });

  return records.map((r) => ({
    id: r.id,
    name: r.name,
    url: r.url,
    authToken: r.authToken ? decryptSecret(r.authToken) : null,
  }));
}

/**
 * Discovers available tools from a student's active MCP server with a strict 4-second timeout.
 */
export async function fetchMcpServerTools(server: DecryptedMcpServer): Promise<McpToolDefinition[]> {
  try {
    // Request-time SSRF re-validation (guards against DNS rebinding & stale records)
    const ssrfCheck = await validateSafeMcpUrl(server.url);
    if (!ssrfCheck.safe) {
      console.warn(`[MCP SSRF] Blocked request to unallowed address for server ${server.name}`);
      return [];
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (server.authToken) {
      headers["Authorization"] = `Bearer ${server.authToken}`;
    }

    const payload = {
      jsonrpc: "2.0",
      id: "tools-list-req",
      method: "tools/list",
      params: {},
    };

    const res = await fetch(server.url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(4000), // 4-second strict timeout
    });

    if (!res.ok) {
      console.warn(`[MCP] Server ${server.name} returned HTTP ${res.status}`);
      return [];
    }

    const data = await res.json();
    const tools = data?.result?.tools || data?.tools || [];

    return tools.map((t: any) => ({
      name: t.name || "unnamed_tool",
      description: t.description || `Tool from ${server.name}`,
      parameters: t.inputSchema || t.parameters || { type: "object", properties: {} },
      serverName: server.name,
      serverId: server.id,
    }));
  } catch (err: any) {
    console.warn(`[MCP] Failed to query tools from ${server.name}:`, err?.message);
    return [];
  }
}

/**
 * Calls an MCP tool on the server with a strict 6-second timeout.
 * Server-side execution only — credentials never touch the browser.
 */
export async function executeMcpToolCall(
  server: DecryptedMcpServer,
  toolName: string,
  args: Record<string, any>
): Promise<McpExecutionResult> {
  try {
    // Request-time SSRF re-validation (guards against DNS rebinding & stale records)
    const ssrfCheck = await validateSafeMcpUrl(server.url);
    if (!ssrfCheck.safe) {
      console.warn(`[MCP SSRF] Blocked tool execution to unallowed address for server ${server.name}`);
      return {
        toolName,
        serverName: server.name,
        result: null,
        error: SSRF_GENERIC_ERROR,
      };
    }
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (server.authToken) {
      headers["Authorization"] = `Bearer ${server.authToken}`;
    }

    const payload = {
      jsonrpc: "2.0",
      id: `call-${Date.now()}`,
      method: "tools/call",
      params: {
        name: toolName,
        arguments: args,
      },
    };

    const res = await fetch(server.url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(6000), // 6-second timeout
    });

    if (!res.ok) {
      return {
        toolName,
        serverName: server.name,
        result: null,
        error: `Server returned HTTP ${res.status}: ${res.statusText}`,
      };
    }

    const data = await res.json();
    return {
      toolName,
      serverName: server.name,
      result: data?.result ?? data,
    };
  } catch (err: any) {
    return {
      toolName,
      serverName: server.name,
      result: null,
      error: err?.message || "MCP tool call timed out or failed.",
    };
  }
}
