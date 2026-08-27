# -*- coding: utf-8 -*-
import json, re

with open('extracted_scope.txt', 'r', encoding='utf-8') as f:
    text = f.read()

part150_str = text[6833:16519].strip()
guangxi_clean = text[277:6833].strip()
jiancha_clean = text[16519:].strip()

matches = list(re.finditer(r'(\\d+)[\.．]?', part150_str))
item_dict = {}
for i in range(len(matches)):
    num = int(matches[i].group(1))
    start_pos = matches[i].end()
    end_pos = matches[i+1].start() if i+1 < len(matches) else len(part150_str)
    content = part150_str[start_pos:end_pos].strip()
    if 1 <= num <= 150:
        item_dict[num] = content

questions = []
qid = 1

def add_q(cat, qtype, stem, options, ans, exp, src):
    global qid
    questions.append({
        'id': qid,
        'category': cat,
        'type': qtype,
        'question': stem,
        'options': options,
        'answer': ans if isinstance(ans, list) else [ans],
        'explanation': exp,
        'sourceArticle': src
    })
    qid += 1

print('Generator base initialized.')
