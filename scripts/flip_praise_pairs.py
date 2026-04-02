from pathlib import Path
import re

path = Path('lib/topics/praise-topics.ts')
text = path.read_text(encoding='utf-8')
start = text.index('export const praisePointsPairs')
arr_match = re.search(r'=\s*\[', text[start:])
if not arr_match:
    raise SystemExit('array start not found')
arr_start = start + arr_match.start() + arr_match.group().rfind('[')
arr_end = text.rfind('];')
outer = text[arr_start:arr_end+1]
result = text[:arr_start]

pairs = []
idx = 1
n = len(outer)
while idx < n:
    if outer[idx].isspace():
        pairs.append(outer[idx])
        idx += 1
        continue
    if outer.startswith('//', idx):
        end = outer.index('\n', idx)
        pairs.append(outer[idx:end+1])
        idx = end + 1
        continue
    if outer[idx] == '[':
        depth = 1
        start_idx = idx
        idx += 1
        while idx < n and depth > 0:
            ch = outer[idx]
            if ch == '[':
                depth += 1
            elif ch == ']':
                depth -= 1
            elif ch == "'" or ch == '"':
                quote = ch
                idx += 1
                while idx < n:
                    if outer[idx] == '\\':
                        idx += 2
                        continue
                    if outer[idx] == quote:
                        break
                    idx += 1
            idx += 1
        pair_text = outer[start_idx:idx]
        pairs.append(pair_text)
        continue
    pairs.append(outer[idx])
    idx += 1

out = ''

def insert_or_replace(obj, tp):
    if 'timePercentage' in obj:
        return re.sub(r'timePercentage\s*:\s*[^,}\n]+', f'timePercentage: {tp}', obj)
    idx2 = obj.rfind('}')
    before = obj[:idx2]
    after = obj[idx2:]
    m = re.search(r'\n(\s*)\}$', obj)
    indent = m.group(1) if m else '  '
    insertion = f'\n{indent}timePercentage: {tp}'
    return before + insertion + after

for item in pairs:
    if item.startswith('['):
        pair = item
        i = 1
        while i < len(pair) and pair[i].isspace():
            i += 1
        if i >= len(pair) or pair[i] != '{':
            out += item
            continue
        depth = 0
        start1 = i
        j = i
        while j < len(pair):
            ch = pair[j]
            if ch == '{':
                depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0:
                    end1 = j + 1
                    break
            elif ch == "'" or ch == '"':
                quote = ch
                j += 1
                while j < len(pair):
                    if pair[j] == '\\':
                        j += 2
                        continue
                    if pair[j] == quote:
                        break
                    j += 1
            j += 1
        obj1 = pair[start1:end1]
        k = end1
        while k < len(pair) and pair[k].isspace():
            k += 1
        if k < len(pair) and pair[k] == ',':
            k += 1
        while k < len(pair) and pair[k].isspace():
            k += 1
        if k >= len(pair) or pair[k] != '{':
            out += item
            continue
        start2 = k
        depth = 0
        j = k
        while j < len(pair):
            ch = pair[j]
            if ch == '{':
                depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0:
                    end2 = j + 1
                    break
            elif ch == "'" or ch == '"':
                quote = ch
                j += 1
                while j < len(pair):
                    if pair[j] == '\\':
                        j += 2
                        continue
                    if pair[j] == quote:
                        break
                    j += 1
            j += 1
        obj2 = pair[start2:end2]
        rest = pair[end2:]
        obj1_new = insert_or_replace(obj2, 30)
        obj2_new = insert_or_replace(obj1, 170)
        prefix = pair[:start1]
        between = pair[end1:start2]
        newpair = prefix + obj1_new + ',' + between + obj2_new + rest
        out += newpair
    else:
        out += item

newtext = result + out + text[arr_end+1:]
path.write_text(newtext, encoding='utf-8')
print('done')
