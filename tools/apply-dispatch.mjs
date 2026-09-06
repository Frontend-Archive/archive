/**
 * blog-sw 의 /submit 이 보낸 repository_dispatch 페이로드를 마크다운에 적용한다.
 *
 * 페이로드는 "무엇을 바꿀지"만 담고 있다. 이 레포의 포맷 규칙(작은따옴표, 항목
 * 사이 빈 줄, frontmatter 정렬)은 여기서 만들고 마지막에 prettier 가 다듬는다.
 *
 * 실행: PAYLOAD='<json>' node tools/apply-dispatch.mjs
 * 표준출력 마지막 줄에 커밋 메시지를 낸다.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ARCHIVES_DIR = 'archives';
const FILE_NAME = /^(\d{6})\.md$/;
const MEETING_TYPES = ['on-line', 'off-line'];

function fail(message) {
  console.error(`[apply-dispatch] ${message}`);
  process.exit(1);
}

/** YAML 작은따옴표 문자열. 따옴표는 두 번 적어 이스케이프한다. */
function quote(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function readPayload() {
  const raw = process.env.PAYLOAD;
  if (!raw) fail('PAYLOAD 환경변수가 없습니다.');

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    fail('PAYLOAD 를 JSON 으로 읽지 못했습니다.');
  }

  const { mode, date, type, articles } = payload;
  if (mode !== 'edit-archive' && mode !== 'new-archive') fail(`알 수 없는 mode: ${mode}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? '')) fail(`date 형식이 올바르지 않습니다: ${date}`);
  if (!MEETING_TYPES.includes(type)) fail(`type 이 올바르지 않습니다: ${type}`);
  if (!Array.isArray(articles) || articles.length === 0) fail('articles 가 비어 있습니다.');

  for (const article of articles) {
    if (typeof article?.author !== 'string' || article.author.trim() === '') {
      fail('author 가 없는 항목이 있습니다.');
    }
    if (!Array.isArray(article.tags)) fail(`${article.author} 의 tags 가 배열이 아닙니다.`);
  }

  return payload;
}

/** archives/*.md 를 훑어 id 와 파일 이름을 모은다. */
function readArchives() {
  return readdirSync(ARCHIVES_DIR)
    .filter((name) => FILE_NAME.test(name))
    .map((name) => {
      const text = readFileSync(join(ARCHIVES_DIR, name), 'utf8');
      const id = Number(/^id:\s*(\d+)\s*$/m.exec(text)?.[1]);
      return { name, id: Number.isInteger(id) ? id : null };
    });
}

/**
 * 회차 하나를 통째로 그린다.
 *
 * 빈 자리도 author 만 남기고 그대로 둔다. 지워 버리면 다음 회차에 누가 안 썼는지
 * 알 수 없고, 사이트의 자리 표시도 사라진다.
 */
function render({ id, date, type, articles }) {
  const items = articles.map((article) =>
    [
      `  - author: ${quote(article.author)}`,
      `    title: ${quote(article.title ?? '')}`,
      `    url: ${quote(article.url ?? '')}`,
      `    tags: [${article.tags.map(quote).join(', ')}]`,
    ].join('\n'),
  );

  return [
    '---',
    `id: ${id}`,
    `date: ${quote(date)}`,
    `title: ${quote(`스터디 ${id}회차`)}`,
    `type: ${quote(type)}`,
    'articles:',
    // 항목 사이는 빈 줄로 띄운다. 네 사람이 붙어 있으면 눈으로 못 가른다.
    items.join('\n\n'),
    '---',
    '',
    `스터디 ${id}회차 (${date.replaceAll('-', '.')})`,
    '',
  ].join('\n');
}

function main() {
  const payload = readPayload();
  const existing = readArchives();

  if (payload.mode === 'edit-archive') {
    const target = existing.find((file) => file.id === payload.archiveId);
    if (!target) fail(`${payload.archiveId}회차 파일을 찾지 못했습니다.`);

    // 진행일이 다른 달로 바뀌어도 파일 이름은 그대로 둔다. 이름이 바뀌면
    // blog-sw 가 반영 여부를 확인할 때 보던 파일이 사라진다.
    writeFileSync(join(ARCHIVES_DIR, target.name), render({ ...payload, id: payload.archiveId }));
    console.log(`docs: ${payload.archiveId}회차 수정 (${payload.requestedBy || 'unknown'})`);
    return;
  }

  const fileName = `${payload.date.slice(0, 7).replace('-', '')}.md`;
  if (existing.some((file) => file.name === fileName)) {
    fail(`${fileName} 이 이미 있습니다.`);
  }

  const id = existing.reduce((max, file) => Math.max(max, file.id ?? 0), 0) + 1;
  writeFileSync(join(ARCHIVES_DIR, fileName), render({ ...payload, id }));
  console.log(`docs: ${id}회차 생성 (${payload.requestedBy || 'unknown'})`);
}

main();
