import test from "node:test";
import assert from "node:assert/strict";
import { mcpToolCatalog, recordMcpCallStart, recordMcpCallEnd, getMcpCallLog, clearMcpCallLog } from "./mcp-tools.ts";

test("exposes the four MCP tools with read-only hints", () => {
  assert.equal(mcpToolCatalog.length, 4);
  assert.equal(mcpToolCatalog.find((tool) => tool.name === "get_itsa10but_sg_signals")?.readOnlyHint, true);
  assert.equal(mcpToolCatalog.find((tool) => tool.name === "analyse_itsa10but_profile")?.readOnlyHint, false);
  assert.equal(mcpToolCatalog.find((tool) => tool.name === "search_itsa10but_jobs")?.readOnlyHint, true);
});

test("records a call and reports it newest first", () => {
  clearMcpCallLog();
  const firstId = recordMcpCallStart("search_itsa10but_jobs", { query: "data analyst" });
  recordMcpCallEnd(firstId, true, "3 roles found");
  const secondId = recordMcpCallStart("read_itsa10but_analysis", {});
  recordMcpCallEnd(secondId, true, "returned current skill map");

  const log = getMcpCallLog();
  assert.equal(log.length, 2);
  assert.equal(log[0].tool, "read_itsa10but_analysis");
  assert.equal(log[1].tool, "search_itsa10but_jobs");
  assert.equal(log[1].ok, true);
});

test("caps the call log at 20 entries", () => {
  clearMcpCallLog();
  for (let i = 0; i < 25; i++) recordMcpCallStart("read_itsa10but_analysis", {});
  assert.equal(getMcpCallLog().length, 20);
});
