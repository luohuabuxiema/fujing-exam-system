# -*- coding: utf-8 -*-
import json
import re

with open('附件2.梧州市公安局公开招聘警务辅助人员笔试考试复习范围.md', 'r', encoding='utf-8') as f:
    text = f.read()

raw_lines = [line.strip() for line in text.split('\n') if line.strip()]

# Pre-process & merge title lines and subtitle lines
lines = []
i = 0
while i < len(raw_lines):
    curr = raw_lines[i]
    clean_curr = curr.replace('**', '').strip()
    
    # Merge main 2-line title block
    if clean_curr == '梧州市公安局公开招聘警务辅助人员' and i + 1 < len(raw_lines):
        next_clean = raw_lines[i+1].replace('**', '').strip()
        if next_clean == '笔试考试复习范围':
            lines.append('<h2 class="doc-sec-title doc-main-sec-title">梧州市公安局公开招聘警务辅助人员<br>笔试考试复习范围</h2>')
            i += 2
            continue
            
    # Merge split subtitle lines into a single line
    if curr.startswith('（2022年') and i + 1 < len(raw_lines) and raw_lines[i+1].endswith('通过）'):
        lines.append(f'<p class="doc-subtitle">{curr} {raw_lines[i+1]}</p>')
        i += 2
        continue
        
    lines.append(curr)
    i += 1

# Pass 1: Identify TOC ranges and Body chapter titles
html_blocks = []
in_toc = False
toc_items = []
chap_index = 0

for line in lines:
    if line.startswith('<p class="doc-subtitle">') or line.startswith('<h2 class="doc-sec-title'):
        html_blocks.append(line)
        continue

    clean_line = re.sub(r'[\*\s]', '', line)
    display_text = line.replace('**', '').strip()
    
    # Check if TOC header starts
    if clean_line in ['目录', '目\u3000\u3000录', '目\u3000录']:
        if in_toc and toc_items:
            # Emit TOC block
            lis = []
            for item in toc_items:
                chap_index += 1
                lis.append(f'<li class="doc-toc-item" data-target="chap-{chap_index}"><i class="fa-solid fa-chevron-right toc-icon"></i> {item}</li>')
            html_blocks.append('<div class="doc-toc-container"><div class="doc-toc-title"><i class="fa-solid fa-list-ul"></i> 目录（点击章节快速跳转）</div><ul class="doc-toc-list">' + ''.join(lis) + '</ul></div>')
            toc_items = []
            
        in_toc = True
        continue
    
    if in_toc:
        if re.match(r'^第[一二三四五六七八九十]+章', clean_line):
            # Check if body starts (e.g. repeated 第一章)
            if len(toc_items) >= 4 and ('第一章' in clean_line or '总则' in clean_line):
                # Emit TOC block
                lis = []
                for item in toc_items:
                    chap_index += 1
                    lis.append(f'<li class="doc-toc-item" data-target="chap-{chap_index}"><i class="fa-solid fa-chevron-right toc-icon"></i> {item}</li>')
                html_blocks.append('<div class="doc-toc-container"><div class="doc-toc-title"><i class="fa-solid fa-list-ul"></i> 目录（点击章节快速跳转）</div><ul class="doc-toc-list">' + ''.join(lis) + '</ul></div>')
                toc_items = []
                in_toc = False
                
                # First body chapter header
                html_blocks.append(f'__BODY_CHAP_PLACEHOLDER__{display_text}')
                continue
            else:
                toc_items.append(display_text)
                continue
        elif clean_line.startswith('第一条') or clean_line.startswith('第一章'):
            # Emit TOC block
            lis = []
            for item in toc_items:
                chap_index += 1
                lis.append(f'<li class="doc-toc-item" data-target="chap-{chap_index}"><i class="fa-solid fa-chevron-right toc-icon"></i> {item}</li>')
            html_blocks.append('<div class="doc-toc-container"><div class="doc-toc-title"><i class="fa-solid fa-list-ul"></i> 目录（点击章节快速跳转）</div><ul class="doc-toc-list">' + ''.join(lis) + '</ul></div>')
            toc_items = []
            in_toc = False
            
            if clean_line.startswith('第一章'):
                html_blocks.append(f'__BODY_CHAP_PLACEHOLDER__{display_text}')
            else:
                html_blocks.append(f'<p class="doc-p">{display_text}</p>')
            continue
        else:
            toc_items.append(display_text)
            continue
            
    # Body elements
    if re.match(r'^(第[一二三四五六七八九十]+章)', clean_line):
        html_blocks.append(f'__BODY_CHAP_PLACEHOLDER__{display_text}')
    elif (line.startswith('一、') or line.startswith('二、') or line.startswith('三、') or 
          line.startswith('四、') or line.startswith('五、') or 
          '警务辅助人员条例' in line or '中华人民共和国监察法' in line or '附件2' in line) and len(line) < 50:
        html_blocks.append(f'<h2 class="doc-sec-title">{display_text}</h2>')
    else:
        html_blocks.append(f'<p class="doc-p">{display_text}</p>')

if in_toc and toc_items:
    lis = []
    for item in toc_items:
        chap_index += 1
        lis.append(f'<li class="doc-toc-item" data-target="chap-{chap_index}"><i class="fa-solid fa-chevron-right toc-icon"></i> {item}</li>')
    html_blocks.append('<div class="doc-toc-container"><div class="doc-toc-title"><i class="fa-solid fa-list-ul"></i> 目录（点击章节快速跳转）</div><ul class="doc-toc-list">' + ''.join(lis) + '</ul></div>')

# Replace placeholders with id="chap-X"
final_blocks = []
body_chap_count = 0

for block in html_blocks:
    if block.startswith('__BODY_CHAP_PLACEHOLDER__'):
        body_chap_count += 1
        txt = block.replace('__BODY_CHAP_PLACEHOLDER__', '')
        final_blocks.append(f'<div id="chap-{body_chap_count}" class="doc-chapter-title">{txt}</div>')
    else:
        final_blocks.append(block)

doc_data = {
    'title': '附件2 梧州市公安局公开招聘警务辅助人员笔试考试复习范围',
    'html': '\n'.join(final_blocks),
    'raw_md': text
}

with open('doc_content.json', 'w', encoding='utf-8') as f:
    json.dump(doc_data, f, ensure_ascii=False, indent=2)

print(f'Successfully built doc_content.json with {chap_index} TOC items and {body_chap_count} body chapter anchors!')
