#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface Course {
  name: string; required: string; instructor: string; year: number;
  credits: string; course_type: string; quarter: string;
  description: string; objectives: string; schedule: string[];
  evaluation: string; keywords: string[];
}

function loadSyllabus(): Course[] {
  const paths = [
    join(__dirname, "..", "data", "syllabus.json"),
    join(process.cwd(), "data", "syllabus.json"),
  ];
  for (const p of paths) {
    if (existsSync(p)) return JSON.parse(readFileSync(p, "utf-8"));
  }
  console.error("WARNING: data/syllabus.json が見つかりません");
  return [];
}

const COURSES = loadSyllabus();

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, "")
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xfee0));
}

function matches(course: Course, query: string): boolean {
  const q = normalize(query);
  return normalize([course.name, course.instructor, course.course_type,
    course.description, course.objectives, ...course.keywords].join(" ")).includes(q);
}

function summary(c: Course): string {
  return [
    `📚 **${c.name}**`,
    `   担当: ${c.instructor} ／ ${c.course_type}`,
    `   ${c.required}・${c.credits}単位・${c.quarter}`,
    c.description ? `   ${c.description.slice(0, 80)}…` : "",
  ].filter(Boolean).join("\n");
}

function detail(c: Course): string {
  const lines = [
    `# ${c.name}`,
    `| 項目 | 内容 |`,
    `|------|------|`,
    `| 担当教員 | ${c.instructor} |`,
    `| コース | ${c.course_type} |`,
    `| 必修/選択 | ${c.required} |`,
    `| 単位 | ${c.credits}単位 |`,
    `| 開講時期 | ${c.quarter} |`,
    "",
  ];
  if (c.description) lines.push("## 概要", c.description, "");
  if (c.objectives) lines.push("## 目的・到達目標", c.objectives, "");
  if (c.schedule.length > 0) {
    lines.push("## 授業スケジュール");
    c.schedule.forEach(s => lines.push(`- ${s}`));
    lines.push("");
  }
  if (c.evaluation) lines.push("## 成績評価", c.evaluation, "");
  if (c.keywords.length > 0) lines.push("## キーワード", c.keywords.join("、"), "");
  return lines.join("\n");
}

const server = new Server({ name: "aiit-syllabus-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "search_courses",
      description: "AIITのシラバスをキーワードで検索します（科目名・教員名・概要・キーワード）",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "検索キーワード（例: 機械学習、板倉、IoT）" },
          limit: { type: "number", description: "最大件数（デフォルト10）", default: 10 }
        },
        required: ["query"]
      }
    },
    {
      name: "get_course_detail",
      description: "科目名を指定して詳細情報を取得します",
      inputSchema: {
        type: "object",
        properties: { name: { type: "string", description: "科目名（部分一致可）" } },
        required: ["name"]
      }
    },
    {
      name: "list_courses",
      description: "開講科目の一覧を取得します",
      inputSchema: {
        type: "object",
        properties: {
          course_type: { type: "string", description: "コース名でフィルタ（例: 情報アーキテクチャ、事業設計工学、創造技術）" },
          required: { type: "string", enum: ["必修", "選択", "all"], default: "all" },
          quarter: { type: "string", description: "開講クォータでフィルタ（例: 1Q、2Q、3Q、4Q、夏季集中）" }
        }
      }
    },
    {
      name: "get_courses_by_instructor",
      description: "担当教員名で科目を検索します",
      inputSchema: {
        type: "object",
        properties: { instructor: { type: "string", description: "教員名（部分一致可）" } },
        required: ["instructor"]
      }
    },
    {
      name: "get_schedule",
      description: "指定科目の授業スケジュール（全15回）を取得します",
      inputSchema: {
        type: "object",
        properties: { name: { type: "string", description: "科目名（部分一致可）" } },
        required: ["name"]
      }
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  let result = "";

  try {
    if (name === "search_courses") {
      const { query, limit = 10 } = args as { query: string; limit?: number };
      const found = COURSES.filter(c => matches(c, query)).slice(0, limit);
      if (found.length === 0) result = `「${query}」に一致する科目は見つかりませんでした。`;
      else result = `🔍 「${query}」の検索結果: ${found.length}件\n${"─".repeat(40)}\n` +
        found.map(summary).join(`\n${"─".repeat(40)}\n`);

    } else if (name === "get_course_detail") {
      const { name: n } = args as { name: string };
      const nn = normalize(n);
      const c = COURSES.find(c => normalize(c.name) === nn)
        ?? COURSES.find(c => normalize(c.name).includes(nn))
        ?? COURSES.find(c => nn.includes(normalize(c.name)));
      if (!c) result = `「${n}」という科目は見つかりませんでした。`;
      else result = detail(c);

    } else if (name === "list_courses") {
      const { course_type, required = "all", quarter } = args as { course_type?: string; required?: string; quarter?: string };
      let filtered = COURSES;
      if (course_type) filtered = filtered.filter(c => normalize(c.course_type).includes(normalize(course_type)));
      if (required !== "all") filtered = filtered.filter(c => c.required === required);
      if (quarter) filtered = filtered.filter(c => c.quarter.includes(quarter));
      if (filtered.length === 0) { result = "条件に一致する科目がありません。"; }
      else {
        const groups: Record<string, Course[]> = {};
        for (const c of filtered) {
          const k = c.course_type || "その他";
          if (!groups[k]) groups[k] = [];
          groups[k].push(c);
        }
        const lines = [`📋 開講科目一覧（${filtered.length}科目）\n`];
        for (const [g, cs] of Object.entries(groups)) {
          lines.push(`## ${g}`);
          cs.forEach(c => lines.push(`  - **${c.name}** [${c.required}・${c.credits}単位・${c.quarter}] / ${c.instructor}`));
          lines.push("");
        }
        result = lines.join("\n");
      }

    } else if (name === "get_courses_by_instructor") {
      const { instructor } = args as { instructor: string };
      const found = COURSES.filter(c => normalize(c.instructor).includes(normalize(instructor)));
      if (found.length === 0) result = `「${instructor}」が担当する科目は見つかりませんでした。`;
      else {
        result = `👨‍🏫 ${instructor} 担当科目（${found.length}科目）\n\n` +
          found.map(c => `- **${c.name}** [${c.required}・${c.credits}単位・${c.quarter}]\n  ${c.description.slice(0, 60)}…`).join("\n");
      }

    } else if (name === "get_schedule") {
      const { name: n } = args as { name: string };
      const nn = normalize(n);
      const c = COURSES.find(c => normalize(c.name) === nn)
        ?? COURSES.find(c => normalize(c.name).includes(nn));
      if (!c) result = `「${n}」という科目は見つかりませんでした。`;
      else if (!c.schedule.length) result = `「${c.name}」のスケジュール情報がありません。`;
      else result = `📅 **${c.name}** 授業スケジュール（担当: ${c.instructor}）\n\n` +
        c.schedule.join("\n");

    } else {
      throw new Error(`未知のツール: ${name}`);
    }
  } catch (e) {
    result = `エラー: ${e instanceof Error ? e.message : String(e)}`;
  }

  return { content: [{ type: "text", text: result }] };
});

async function main() {
  console.error(`🎓 AIIT シラバス MCPサーバー起動中... (${COURSES.length}科目)`);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("✅ 起動完了");
}

main().catch(e => { console.error(e); process.exit(1); });
