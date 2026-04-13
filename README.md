# AIIT シラバス MCP サーバー

> ⚠️ **非公式プロジェクト** 東京都立産業技術大学院大学（AIIT）の公式サービスではありません。最新情報は必ず[公式シラバス](https://aiit.ac.jp/about/education/syllabus.html)をご確認ください。

Claude Desktop から AIIT のシラバスを自然言語で検索できる MCP サーバーです。

## こんな質問ができます

- 「機械学習に関する科目は？」
- 「板倉先生の担当科目を教えて」
- 「3Qに取れる必修科目は？」
- 「データベース特論の授業スケジュールを見せて」
- 「AIエンジニアを目指すにはどの科目を取ればいい？」

## セットアップ（3ステップ）

### 1. クローン＆ビルド
```bash
git clone https://github.com/KojiOkazaki/aiit-syllabus-okazaki-mcp.git
cd aiit-syllabus-okazaki-mcp
npm install
npm run build
```

### 2. Claude Desktop に設定

`~/Library/Application Support/Claude/claude_desktop_config.json` に追記：

```json
{
  "mcpServers": {
    "aiit-syllabus": {
      "command": "node",
      "args": ["/absolute/path/to/aiit-syllabus-okazaki-mcp/dist/index.js"]
    }
  }
}
```

### 3. Claude Desktop を再起動

以上です！Claude に話しかけるだけで使えます。

## 収録データ

令和8（2026）年度 AIIT シラバス・**89科目**収録済み。
PDFのダウンロードや抽出作業は不要です。

## シラバスデータを更新したい場合

新年度のPDFが公開されたら：

```bash
python3 -m venv venv
source venv/bin/activate
pip install pdfplumber
python3 scripts/extract_syllabus.py --pdf 新しいシラバス.pdf --year 2027
npm run build
```

## データについて

- 出典：東京都立産業技術大学院大学 令和8（2026）年度シラバス（公開PDF）
- PDFの著作権はAIITに帰属します
- 本リポジトリにはPDFは含めていません

## License

MIT
