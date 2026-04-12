# AIIT シラバス MCP サーバー

> ⚠️ **非公式プロジェクト** このツールは東京都立産業技術大学院大学（AIIT）の公式サービスではありません。有志が公開PDFをもとに作成した非公式ツールです。最新・正確な情報は必ず[公式シラバス](https://aiit.ac.jp/about/education/syllabus.html)をご確認ください。

Claude や他のAIクライアントから AIIT のシラバスを自然言語で検索できる [MCP](https://modelcontextprotocol.io/) サーバーです。

## できること

- 「機械学習に関する科目は？」
- 「板倉先生の担当科目を教えて」
- 「1Qに開講される必修科目は？」
- 「データベース特論の授業スケジュールを見せて」

## セットアップ

### 1. リポジトリをクローン
\`\`\`bash
git clone https://github.com/YOUR_NAME/aiit-syllabus-mcp.git
cd aiit-syllabus-mcp
\`\`\`

### 2. シラバスPDFを取得して抽出
[AIITシラバスページ](https://aiit.ac.jp/about/education/syllabus.html)からPDFをダウンロード後：
\`\`\`bash
python3 -m venv venv
source venv/bin/activate
pip install pdfplumber
python3 scripts/extract_syllabus.py --pdf r8_syllabus.pdf --year 2026
\`\`\`

### 3. ビルド
\`\`\`bash
npm install
npm run build
\`\`\`

### 4. Claude Desktop に設定
`~/Library/Application Support/Claude/claude_desktop_config.json` に追記：
\`\`\`json
{
  "mcpServers": {
    "aiit-syllabus": {
      "command": "node",
      "args": ["/absolute/path/to/aiit-syllabus-mcp/dist/index.js"]
    }
  }
}
\`\`\`
Claude Desktop を再起動して完了です。

## 利用可能なツール

| ツール | 説明 |
|--------|------|
| `search_courses` | キーワードで全科目を横断検索 |
| `get_course_detail` | 科目名を指定して詳細を取得 |
| `list_courses` | コース・必修区分・クォータで絞り込み |
| `get_courses_by_instructor` | 担当教員名で検索 |
| `get_schedule` | 授業スケジュール（全15回）を取得 |

## データについて

- 出典：東京都立産業技術大学院大学 令和8（2026）年度シラバス（公開PDF）
- PDFの著作権はAIITに帰属します
- 本リポジトリにはPDFファイルおよびシラバスの全文は含めていません

## License

MIT
