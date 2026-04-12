import json, re, sys, argparse
from pathlib import Path
try:
    import pdfplumber
except ImportError:
    print("pip install pdfplumber"); sys.exit(1)

def clean(text):
    if not text: return ""
    text = text.replace('\u3000', ' ')
    text = re.sub(r'\[[\w\s\(\)（）ハ対録オ]+\]', '', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def detect_course_header(lines):
    info = {}
    for line in lines[:10]:
        m = re.match(r'コース名\s+(.+?)\s+必修・選択\s+(必修|選択|選択必修)\s+単位\s+(\d+)\s+学期\s+(.+)', line)
        if m:
            info['course_type'] = m.group(1).strip()
            info['required'] = m.group(2).strip()
            info['credits'] = m.group(3)
            info['quarter'] = m.group(4).strip()
        m2 = re.match(r'^科目名\s+(.+)', line)
        if m2:
            info['name'] = m2.group(1).strip()
        m3 = re.match(r'^科目群\s+.+?\s+教員名\s+(.+)', line)
        if m3:
            inst = m3.group(1).strip()
            inst = re.sub(r'\*[^/（]+', '', inst)
            inst = re.sub(r'（[^）]+）', '', inst)
            inst = re.split(r'[/／]', inst)[0].strip()
            info['instructor'] = inst
    if 'name' in info and 'course_type' in info:
        return info
    return None

STOP = re.compile(r'^(履修条件|授業実施形態|形態|教材|テキスト|参考文献|備考|注意|オフィスアワー|コース名|科目名|科目群|回数\s+内容|授業の計画|授業の進め方)')

def process_line(line, course):
    raw = line
    lc = clean(line)
    if not lc: return
    m = re.match(r'^第(\d+)回\s*(.*)', raw)
    if m:
        course['_col'] = 'schedule'
        body = clean(m.group(2))
        num = int(m.group(1))
        if not any(s.startswith(f'第{num}回') for s in course['schedule']):
            course['schedule'].append(f"第{num}回" + (f" {body}" if body else ""))
        return
    if STOP.match(lc):
        course['_col'] = None; return
    def sc(col, pat):
        course['_col'] = col
        b = re.sub(pat, '', lc).strip()
        if b:
            if col in ('description','objectives','evaluation'): course[col] += b + ' '
            elif col == 'keywords': course['keywords'].extend([k.strip() for k in re.split(r'[,、，・]', b) if k.strip()])
    if re.match(r'^概要', lc): sc('description', r'^概要\s*'); return
    if re.match(r'^(目的・狙い|目的|狙い)', lc): sc('objectives', r'^(目的・狙い|目的|狙い)\s*'); return
    if re.match(r'^(上位到達目標|最低到達目標|到達目標)', lc): sc('objectives', r'^(上位到達目標|最低到達目標|到達目標)\s*'); return
    if re.match(r'^(成績評価|評価方法|試験)', lc): sc('evaluation', r'^(成績評価|評価方法|試験)\s*'); return
    if re.match(r'^キーワード', lc): sc('keywords', r'^キーワード\s*'); return
    col = course.get('_col')
    if not col: return
    if col == 'description': course['description'] += lc + ' '
    elif col == 'objectives':
        if not re.match(r'^\d+-\d+-\d+', lc) and '修得できる知識' not in lc:
            course['objectives'] += lc + ' '
    elif col == 'evaluation': course['evaluation'] += lc + ' '
    elif col == 'keywords': course['keywords'].extend([k.strip() for k in re.split(r'[,、，・]', lc) if k.strip()])
    elif col == 'schedule':
        if course['schedule'] and not re.match(r'^第\d+回', lc):
            course['schedule'][-1] += ' ' + lc

def extract(pdf_path, year):
    courses = []
    print(f"読み込み中: {pdf_path}")
    with pdfplumber.open(pdf_path) as pdf:
        print(f"総ページ数: {len(pdf.pages)}")
        current = None
        for page in pdf.pages:
            text = page.extract_text()
            if not text: continue
            lines = [l.strip() for l in text.split('\n') if l.strip()]
            info = detect_course_header(lines)
            if info:
                if current: courses.append(current)
                current = {**info, 'year': year, 'description': '', 'objectives': '',
                           'schedule': [], 'evaluation': '', 'keywords': [], '_col': None}
            if current:
                for line in lines:
                    process_line(line, current)
        if current: courses.append(current)
    result = []
    for c in courses:
        c.pop('_col', None)
        for k in ('description','objectives','evaluation'):
            c[k] = clean(c.get(k,''))
        seen = set()
        c['schedule'] = [s for s in (clean(x) for x in c['schedule']) if s and len(s)>=3 and not (s in seen or seen.add(s))]
        result.append(c)
    return result

parser = argparse.ArgumentParser()
parser.add_argument('--pdf', required=True)
parser.add_argument('--year', type=int, default=2026)
parser.add_argument('--output', default='data/syllabus.json')
args = parser.parse_args()
Path(args.output).parent.mkdir(parents=True, exist_ok=True)
courses = extract(args.pdf, args.year)
with open(args.output, 'w', encoding='utf-8') as f:
    json.dump(courses, f, ensure_ascii=False, indent=2)
print(f"\n✅ 抽出完了: {len(courses)}科目を {args.output} に保存しました")
for i, c in enumerate(courses, 1):
    print(f"  {i:2}. {c['name']:<28} / {c.get('instructor','?'):<12} [{c['required']}・{c['credits']}単位・{c.get('quarter','')}]")
