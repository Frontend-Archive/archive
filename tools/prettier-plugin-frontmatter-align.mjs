/**
 * Markdown frontmatter 들여쓰기 교정 플러그인.
 *
 * Prettier 는 frontmatter 가 YAML 로 파싱되지 않으면 에러 없이 그 블록을 통째로
 * 건너뛰고 본문만 포맷한다. 그래서 `title` 이 시퀀스 항목 밖으로 튀어나온 상태로
 * 저장해도 아무 일도 일어나지 않는다.
 *
 * 이 플러그인은 파싱 직전(preprocess)에 frontmatter 의 들여쓰기만 교정해서
 * 유효한 YAML 로 만들어 준다. 그 뒤는 prettier 의 기본 동작에 맡긴다.
 */
import * as markdown from 'prettier/plugins/markdown.mjs';

const TAB_WIDTH = 2;
const FRONTMATTER = /^(---\r?\n)([\s\S]*?)(\r?\n---)(\r?\n|$)/;

/** `- ` 뒤 첫 글자의 컬럼. `-   author:` 처럼 공백이 여러 개여도 정확히 잡는다. */
const SEQ_ITEM = /^(\s*)(-\s+)(?=\S)/;
/** 매핑 키 한 줄. 시퀀스 대시와 주석은 제외한다. */
const MAP_KEY = /^(\s*)(?:"[^"]*"|'[^']*'|[^\s#][^:]*?)\s*:(?:\s|$)/;
/** 블록 스칼라 헤더(`key: |`, `key: >-` 등). 뒤따르는 들여쓴 본문은 건드리면 안 된다. */
const BLOCK_SCALAR = /:\s*[|>][+-]?\d*\s*$/;

function alignFrontmatter(body) {
  const lines = body.split('\n');
  // 열려 있는 시퀀스 항목들. { dashIndent, contentCol }
  const stack = [];
  let blockScalarIndent = null;
  let changed = false;

  const out = lines.map((rawLine) => {
    // YAML 은 들여쓰기에 탭을 허용하지 않는다. 선행 탭만 스페이스로 편다.
    let line = rawLine.replace(/^\t+/, (tabs) => ' '.repeat(tabs.length * TAB_WIDTH));
    if (line !== rawLine) changed = true;

    if (line.trim() === '') return line;

    const indent = line.length - line.trimStart().length;

    // 블록 스칼라 본문은 원문 그대로 보존한다.
    if (blockScalarIndent !== null) {
      if (indent > blockScalarIndent) return line;
      blockScalarIndent = null;
    }

    if (line.trimStart().startsWith('#')) return line;

    // 현재 들여쓰기보다 깊은 시퀀스 컨텍스트는 닫는다.
    while (stack.length > 0 && indent < stack[stack.length - 1].dashIndent) {
      stack.pop();
    }

    const seq = SEQ_ITEM.exec(line);
    if (seq) {
      const dashIndent = seq[1].length;
      while (stack.length > 0 && stack[stack.length - 1].dashIndent > dashIndent) {
        stack.pop();
      }
      if (stack.length === 0 || stack[stack.length - 1].dashIndent < dashIndent) {
        stack.push({ dashIndent, contentCol: seq[0].length });
      } else {
        stack[stack.length - 1].contentCol = seq[0].length;
      }
      if (BLOCK_SCALAR.test(line)) blockScalarIndent = seq[0].length;
      return line;
    }

    const top = stack[stack.length - 1];
    // 대시 컬럼과 항목 내용 컬럼 사이에 놓인 키는 YAML 상 항상 유효하지 않다.
    // (`All mapping items must start at the same column`) 이 구간만 교정한다.
    if (top && MAP_KEY.test(line) && indent >= top.dashIndent && indent < top.contentCol) {
      line = ' '.repeat(top.contentCol) + line.trimStart();
      changed = true;
    }

    if (BLOCK_SCALAR.test(line)) {
      blockScalarIndent = line.length - line.trimStart().length;
    }
    return line;
  });

  return changed ? out.join('\n') : null;
}

function preprocess(text, options) {
  const base = markdown.parsers.markdown.preprocess;
  const piped = base ? base(text, options) : text;

  const match = FRONTMATTER.exec(piped);
  if (!match) return piped;

  const aligned = alignFrontmatter(match[2]);
  if (aligned === null) return piped;

  return match[1] + aligned + match[3] + match[4] + piped.slice(match[0].length);
}

export const parsers = {
  markdown: { ...markdown.parsers.markdown, preprocess },
  mdx: { ...markdown.parsers.mdx, preprocess },
};
