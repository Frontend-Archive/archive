# archive

스터디 회차별 기록 저장소. 각 회차는 `archives/` 아래 markdown 파일 하나로 관리하며,
구조화된 데이터는 YAML frontmatter에, 회차 요약은 본문에 둔다.

## 파일 구성

```
archives/
├── 202603.md              # 회차 기록. 파일명은 date 의 YYYYMM
├── 202604.md
├── ...
└── template/
    └── teamplate.md       # 새 회차 작성용 빈 템플릿
```

파일명 `YYYYMM` 은 frontmatter `date` 의 연·월과 일치한다.

## 타입

```ts
/** archives/YYYYMM.md 의 frontmatter */
interface Archive {
  id: number;
  date: string; // 'YYYY-MM-DD'
  title: string; // '스터디 {id}회차'
  type: MeetingType;
  articles: Article[];
}

type MeetingType = 'on-line' | 'off-line';

interface Article {
  author: string;
  title: string; // 미작성 시 ''
  url: string; // 미작성 시 ''
  tags: string[]; // 미작성 시 []
}
```

### Archive

| 필드       | 타입          | 설명                                                               |
| ---------- | ------------- | ------------------------------------------------------------------ |
| `id`       | `number`      | 회차 번호. 1부터 순차 증가하며 중복되지 않는다. 유일한 비따옴표 값 |
| `date`     | `string`      | 스터디 진행일. `'YYYY-MM-DD'`                                      |
| `title`    | `string`      | `'스터디 {id}회차'`. 회차 번호는 `id` 와 같다                      |
| `type`     | `MeetingType` | 진행 방식. `'on-line'` 또는 `'off-line'`                           |
| `articles` | `Article[]`   | 발표 아티클 목록. 현재 모든 회차가 멤버 수만큼 4개                 |

### Article

| 필드     | 타입       | 설명                                          |
| -------- | ---------- | --------------------------------------------- |
| `author` | `string`   | 작성자 이름                                   |
| `title`  | `string`   | 아티클 제목                                   |
| `url`    | `string`   | 아티클 링크                                   |
| `tags`   | `string[]` | 주제 태그. 자유 문자열이며 고정 목록이 아니다 |

`articles` 의 순서는 모든 회차에서 동일하다: 권시현 → 민준경 → 염승준 → 최승원.

## 본문

frontmatter 아래 본문은 한 줄 요약이다.

```
스터디 {id}회차 ({YYYY.MM.DD})
```

날짜 구분자가 `date` 필드(`-`)와 달리 `.` 인 점에 주의한다.

## 예시

```md
---
id: 6
date: '2026-08-22'
title: '스터디 6회차'
type: 'off-line'
articles:
  - author: '권시현'
    title: '[디자인 패턴] 팩토리 패턴과 프로토타입 패턴을 JS로 이해해보자! (feat. 메모리 할당량)'
    url: 'https://kwonsean.tistory.com/37'
    tags: ['디자인패턴', '팩토리 패턴', '프로토타입 패턴']

  - author: '민준경'
    title: ''
    url: ''
    tags: []
---

스터디 6회차 (2026.08.22)
```

## 작성 규칙

- **미작성 항목**은 `title`, `url`, `tags` 를 **함께** 비운다. 셋 중 일부만 채우지 않는다.
  회차를 먼저 열어두고 발표자가 순차적으로 채우는 방식이다.
- **따옴표**는 `id` 를 제외한 모든 문자열 값에 작은따옴표를 쓴다. `tags` 의 각 원소도 마찬가지.
- **항목 사이 빈 줄**은 가독성을 위한 것으로 YAML 파싱에 영향이 없다.
  단 연속 2줄 이상은 저장 시 1줄로 축약된다.

## 포매팅

저장 시 Prettier가 자동 적용된다. 설정은 [.prettierrc](.prettierrc), 에디터 설정은
[.vscode/settings.json](.vscode/settings.json) 에 있다.

```bash
npm run format        # 전체 포맷
npm run format:check  # 검사만
```

frontmatter 들여쓰기가 깨지면 Prettier는 에러 없이 해당 블록을 **건너뛴다**. 이를 막기 위해
[tools/prettier-plugin-frontmatter-align.mjs](tools/prettier-plugin-frontmatter-align.mjs) 가
파싱 직전에 들여쓰기를 교정한다. 시퀀스 항목 밖으로 튀어나온 키와 탭 들여쓰기가 자동으로 정렬된다.
