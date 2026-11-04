# 무료 배포: Render Free + Supabase Free

Claude Board 기반 카드 화면 추가 후에도 이 배포 설정은 같습니다. DB 스키마·키·비밀번호를 다시 만들 필요가 없습니다. `public/board/`에 빌드한 Svelte 화면을 소스와 함께 배포합니다. UI 수정 후에는 로컬에서 `npm run build`를 실행해 생성물을 포함해야 합니다. 기존 Render 서비스는 `main` 새 커밋으로 배포하면 됩니다.

## 관리자 설정 기능 추가 시 1회 DB 초기화

기존 Supabase 프로젝트의 SQL Editor에서 `supabase/settings.sql` 전체를 실행하세요. 기존 업무·이력은 삭제하지 않습니다. 새 프로젝트라면 먼저 `supabase/schema.sql`, 다음 `supabase/settings.sql` 순서입니다. 설정 SQL은 재실행해도 기존 설정을 초기화하지 않습니다.

관리자 `admin`으로 포털에 로그인하면 오른쪽 상단 ⚙ 설정에서 문구·메뉴·업무 분류·접수 경로·우선순위·로고·색상·배너를 저장할 수 있습니다. 최초 SQL 실행 전에는 기본 화면은 유지되지만 설정 저장은 비활성화되고 초기화 안내가 표시됩니다. DB 연결 오류를 기본값으로 덮어쓰지 않습니다.

설정은 모든 사용자에게 공유되며 다른 사용자 화면에는 새로고침 후 반영됩니다. 최근 설정 이력 30건을 화면에 표시하고 전체 이력은 DB에 보존합니다. 현재 관리자 공용 계정은 `admin`으로 기록되므로 개별 사람까지 식별하지 않습니다. 상태 단계는 업무 이력과의 호환성을 위해 고정이며, 계정 비밀번호·DB 키는 계속 Render에서만 관리합니다. 새 설정은 기존 업무의 분류나 내용을 소급 수정하지 않습니다.

유료 디스크는 사용하지 않습니다. `render.yaml`에도 `plan: free`를 지정했습니다. 기존 Render 수동 생성 화면에서는 반드시 **Instance Type: Free**를 선택하세요. Blueprint를 사용하지 않는 경우 yaml 값은 자동으로 적용되지 않습니다.

무료는 영구적인 무제한 제공을 뜻하지 않습니다. 공급자 정책 변경, 사용량 한도, 비활성 중지, 첫 접속 지연이 있을 수 있습니다. 유료 플랜으로 전환하지 말고 Free로 생성 가능한지 가입 화면에서 확인하세요. 최신 공식 요금·상업 이용 약관은 이 작업 환경의 네트워크 차단 때문에 재확인하지 못했습니다. 참고: https://render.com/docs/free , https://supabase.com/pricing , https://supabase.com/terms . 무료 운영에 별도 AI 유료 API는 필요하지 않습니다.

## 1. Supabase

1. https://supabase.com/dashboard 에서 GitHub로 가입합니다.
2. **Free** 조직에 `orbit-ops` 프로젝트를 만듭니다. 프로젝트 DB 비밀번호는 안전하게 보관합니다.
3. 프로젝트 **SQL Editor**에서 저장소의 `supabase/schema.sql` 전체를 실행합니다. 이 스크립트는 테이블과 서버 전용 RPC를 만듭니다. 재실행해도 기존 업무는 지우지 않습니다.
4. 프로젝트 설정/Connect에서 **Project URL**을 확인합니다 (`https://프로젝트ID.supabase.co`).
5. 프로젝트 설정의 API Keys에서 **New secret key**를 확인합니다. `anon`/publishable 키나 DB 비밀번호가 아닙니다. `New secret key`로 만든 `sb_secret_` 키를 사용합니다. 이름은 `orbit-render`로 지정하면 됩니다. 키는 Render 환경변수에만 입력하고 채팅, GitHub, 브라우저 JS에 넣지 않습니다.

## 2. Render Web Service

GitHub 저장소 `owen-133/kpi`, 브랜치 `main`을 선택합니다.

| 항목 | 값 |
|---|---|
| Language | Node |
| Root Directory | 비워두기 |
| Instance Type | **Free** |
| Build Command | `node --check server.js && node --check public/app.js` |
| Start Command | `npm start` |
| Health Check Path | `/health` |

환경변수는 다음과 같습니다. `SUPABASE_SECRET_KEY`와 비밀번호는 비밀 값으로 관리합니다.

| Key | Value |
|---|---|
| NODE_VERSION | 24 |
| NODE_ENV | production |
| HOST | 0.0.0.0 |
| STORAGE_BACKEND | supabase |
| SUPABASE_URL | Supabase Project URL |
| SUPABASE_SECRET_KEY | Supabase Secret key (`sb_secret_`로 시작) |
| ADMIN_PASSWORD | 본인이 정한 관리자 비밀번호 |
| VIEWER_PASSWORD | 관리자와 다른 조회용 비밀번호 |

`DATA_DIR`나 유료 디스크는 필요하지 않습니다. 값을 설정한 후 Deploy합니다. 필요한 값이 없으면 서버는 시작을 거부합니다. Supabase 오류가 나도 임시 파일이나 브라우저로 저장을 우회하지 않습니다.

## 3. 실제 배포 후 확인

- 발급받은 HTTPS 주소에서 `admin`으로 로그인해 업무 등록 → 상태 변경 → 메모 → 완료를 실행합니다.
- 팀장용 `viewer` 계정은 조회만 되고 변경할 수 없는지 확인합니다.
- Render를 재시작해도 업무와 이력이 남는지 확인합니다.
- 유휴 후 재접속 지연, 무료 DB 일시 중지 상태가 있다면 공급자 대시보드에서 확인합니다. 제한 회피용 자동 호출은 사용하지 않습니다.

## 범위와 보존

로컬 SQLite에 이미 들어간 데이터는 자동 이전하지 않습니다. 현재 클라우드 DB는 새로 시작하므로 기존 데이터가 있다면 별도 이전 작업을 해야 합니다. 이력은 앱에서 수정·삭제할 수 없지만 DB 관리자까지 막는 외부 공증은 아닙니다. 개인 로그인, 백업/복구, 보존 정책은 운영 강화 과제로 남아 있습니다. 무료 한도와 중단 가능성이 있는 서비스이므로 업무에 중요한 자료의 유일한 사본으로 사용하기 전 백업 절차가 필요합니다.

로컬 PostgreSQL 호환 엔진 검증과 실제 Supabase/Render 배포 검증은 다릅니다. 사용자 계정에 프로젝트를 만들고 연결하기 전에는 배포 완료로 볼 수 없습니다.

## 삭제 기능 추가 시 1회 초기화

Supabase SQL Editor에서 `supabase/deletion.sql` 전체를 실행합니다. 기존 업무를 삭제하지 않고 휴지통 열·삭제 감사 테이블과 서버 RPC를 추가/갱신합니다. 새 DB는 schema.sql, settings.sql, deletion.sql 순서로 실행하세요. 아직 초기화하지 않은 경우 기존 업무 조회는 유지되지만 삭제·휴지통 요청은 초기화 안내 오류로 차단됩니다.

배포 후 관리자만 상세 화면의 업무 삭제와 상단 휴지통을 사용할 수 있는지 확인합니다. 휴지통에 넣은 업무가 통계·CSV와 viewer에서 제외되고, 복원하면 기존 상태가 유지되는지 테스트하세요. 영구 삭제는 제목 확인을 거친 경우에만 수행하며 앱에서 복구할 수 없습니다. API 키·접속 비밀번호·유료 플랜 설정 변경은 없습니다.
