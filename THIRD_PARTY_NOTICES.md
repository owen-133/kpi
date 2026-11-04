# Claude Board 기반 컴포넌트

이 포털의 웹 업무 보드는 Claude Board Windows 프런트엔드의 실제 Svelte 소스를 재사용·수정합니다.

- 원본 프로젝트: https://github.com/suhojang/claude-board
- 사용자 지정 기반 저장소: https://github.com/ko-itbuddy/claude-board
- 기반 커밋: `b81c3c149692f855c5e2fcce44a120e2367ce4a3`
- 라이선스: Apache License 2.0. 원문은 `third_party/claude-board/LICENSE`에 보존합니다.
- 저작자 표기: Claude Board 프로젝트의 원저작자 및 기여자. 원본 파일에 별도 저작권 표기가 없는 경우 임의의 표기를 만들지 않았습니다.

## 가져온 소스와 변경

| 원본 경로 (`windows/app/src/lib/board/`) | 현재 경로 | 변경 |
|---|---|---|
| `Icon.svelte` | `frontend/src/board/Icon.svelte` | 원본 유지 |
| `StateIcon.svelte` | `frontend/src/board/StateIcon.svelte` | 원본 상태 애니메이션 유지, 모션 감소 접근성 추가 |
| `GroupCard.svelte` | `frontend/src/board/GroupCard.svelte` | 카드 레이아웃·상태 강조·접기 구조와 CSS를 재사용. 세션을 총무 업무로 교체. Tauri 명령·삭제·터미널·서브에이전트 의존성 제거. 웹 키보드 조작과 완료 업무 펼치기 적용 |
| `format.ts` | `frontend/src/board/format.js` | 상태 색·우선순위·대표 상태·경과 시간 로직을 JS로 이식. 총무 상태 매핑, 완료 초록 표시, 일 단위 경과 시간 및 분류/검색 추가 |

`frontend/src/Board.svelte`, `TaskRow.svelte`, 브라우저 진입점은 이 포털을 위해 새로 작성했습니다. 앱 전체가 Claude Board를 그대로 복제한 것은 아니며 PC용 백엔드는 포함하지 않습니다. Supabase 저장소와 웹 로그인은 기존 포털 구현을 사용합니다.

`liftrune` 저장소는 개인정보처리방침용 사이트이므로 이 구현에 소스를 사용하지 않았습니다.

Svelte 런타임(MIT)도 웹 번들에 포함됩니다. 라이선스 파일을 `third_party/svelte/LICENSE.md`에 보존하며 배포용 notices 파일에도 포함합니다.

웹 번들 및 고지 파일은 `public/board/`, `public/THIRD_PARTY_NOTICES.txt`, `public/CLAUDE_BOARD_LICENSE.txt`로 배포합니다. 원본 소스·고지와 라이선스를 제거하지 마세요.

## PDF 생성

PDF 출력은 pdf-lib와 @pdf-lib/fontkit 및 관련 의존성을 사용합니다. 각 의존성의 라이선스를 함께 보존합니다. 폰트는 Google Fonts의 Nanum Gothic Regular (SIL Open Font License 1.1)이며 원본은 https://github.com/google/fonts/tree/main/ofl/nanumgothic 에서 가져왔습니다. 글꼴 라이선스는 `third_party/nanum-gothic/OFL.txt`, 글꼴은 `public/fonts/NanumGothic-Regular.ttf`에 보존합니다. fontkit 패키지의 원본 라이선스 선언은 `third_party/pdf-lib-fontkit/UPSTREAM_README.md`에 보존합니다. 기타 라이선스는 `third_party/`와 공개 notices 파일에 포함합니다. 한글 표시의 호환성을 위해 PDF 파일에 글꼴을 포함합니다.
