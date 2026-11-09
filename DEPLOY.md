# 배포: Render Free + Supabase Free

Render는 `web/`의 Next 앱을 실행합니다. 루트 `npm run build`가 `web` 의존성(개발 의존성 포함)을 설치하고 빌드합니다. 루트 `npm start`가 `web`을 시작합니다. 서버는 `HOST`와 `PORT`에 바인딩합니다. 값이 없으면 `127.0.0.1:3000`입니다. Render는 `HOST=0.0.0.0`을 설정하고 `PORT`를 직접 주입합니다.

## 1. Supabase

1. https://supabase.com/dashboard 에서 **Free** 조직에 `orbit-ops` 프로젝트를 만듭니다. 프로젝트 DB 비밀번호는 안전하게 보관합니다.
2. 프로젝트 **SQL Editor**에서 저장소의 `supabase/upgrade.sql` 전체를 실행합니다. `schema.sql`, `settings.sql`, `deletion.sql`, `kpi.sql`, `edit.sql`을 이 순서로 합친 누적본(`node scripts/build-upgrade.js`로 생성)이고, 테이블과 DB 함수 다섯 개를 만듭니다. 새 프로젝트도 기존 프로젝트도 같은 파일 하나를 쓰며, 재실행해도 기존 업무·이력은 지우지 않습니다. 개별 파일을 직접 실행하려면 위 순서를 지킵니다.
3. 같은 SQL Editor에서 `web/db/app-role.sql`을 실행합니다. 2단계의 함수가 있어야 합니다. 파일 안의 비밀번호 자리 표시자를 긴 임의 값으로 바꾼 뒤 실행합니다. 이 역할(`orbit_app`)은 DB 함수 다섯 개의 실행 권한만 가집니다.
4. Connect 화면에서 **연결 풀러** 주소를 확인합니다. 직접 연결 주소는 IPv6 전용이라 Render에서 닿지 않을 수 있습니다. 풀러의 사용자 이름은 `orbit_app.<프로젝트 ref>` 형식입니다. 이 사용자와 3단계 비밀번호로 `DATABASE_URL`을 만듭니다.
5. 데이터베이스 CA 인증서를 PEM으로 받아 둡니다(`DATABASE_CA`에 넣습니다).

앱은 테이블이 아니라 DB 함수만 부르므로 Supabase의 서비스 키(`sb_secret_`)나 프로젝트 URL이 필요하지 않습니다.

## 2. Render Web Service

GitHub 저장소 `owen-133/kpi`, 브랜치 `main`을 선택합니다. Blueprint를 쓰면 `render.yaml`이 적용됩니다. Blueprint를 쓰지 않는 수동 생성에서는 yaml 값이 자동 적용되지 않으므로 아래 표를 직접 입력하고 **Instance Type: Free**를 선택합니다.

| 항목 | 값 |
|---|---|
| Language | Node |
| Root Directory | 비워두기 |
| Instance Type | **Free** |
| Build Command | `npm run build` |
| Start Command | `npm start` |
| Health Check Path | `/health` |

### 환경변수

| Key | 내용 |
|---|---|
| NODE_VERSION | 24 |
| NODE_ENV | production |
| HOST | 0.0.0.0 |
| DATABASE_URL | `orbit_app` 역할의 Postgres 접속 URL. 비밀 값 |
| DATABASE_CA | 데이터베이스 CA 인증서의 PEM 전문. 비밀 값은 아니지만 Render에서만 관리 |
| ADMIN_PASSWORD | 관리자 비밀번호 |
| VIEWER_PASSWORD | 조회용 비밀번호. 관리자와 달라야 함 |

`STORAGE_BACKEND`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`는 앱이 읽지 않습니다. Render 서비스나 `render.yaml`에 남아 있어도 동작에는 영향이 없고 지워도 됩니다.

### 값이 없을 때

운영(`NODE_ENV=production`)에서 `DATABASE_URL`이 없으면 서버가 시작을 거부하고 `운영 배포에는 DATABASE_URL이 필요합니다.`를 출력합니다. 비밀번호가 없거나 두 비밀번호가 같을 때도 거부합니다. 접속 URL이 TLS 검증을 끄면(`sslmode=disable` 등) 접속을 거부합니다. 파일 저장소나 임시 저장으로 대체하지 않습니다.

## 3. 배포 후 확인

1. `/health`가 200을 줍니다.
2. 발급받은 HTTPS 주소에서 `admin`으로 로그인해 업무 등록 → 상태 변경 → 메모 → 완료를 실행합니다.
3. `viewer`는 조회만 되고 변경이 거부되는지 확인합니다.
4. 담당자 배정 → 파일 첨부 → 월간 지표 대조 → 보고서 검토·발행 → 월간 보고서 PDF 내려받기 → 개선 기록 흐름을 확인합니다.
5. 관리자만 상세 화면의 업무 삭제와 상단 휴지통을 쓸 수 있는지, 휴지통의 업무가 통계·CSV와 viewer에서 빠지고 복원하면 이전 상태가 유지되는지 확인합니다. 영구 삭제는 제목 확인을 거치며 앱에서 복구할 수 없습니다.
6. 설정(⚙)에서 문구를 저장하면 다른 브라우저에서 새로고침 후 반영되는지 확인합니다.
7. Render를 재시작해도 업무와 이력이 남는지 확인합니다.
8. 유휴 후 재접속 지연, 무료 DB 일시 중지 상태가 있으면 공급자 대시보드에서 확인합니다. 제한 회피용 자동 호출은 사용하지 않습니다.

## 4. 되돌리기

저장소에는 이전 서버가 더 이상 없습니다. 문제가 있으면 Render 대시보드에서 이전 배포를 다시 배포합니다. 코드 되돌리기가 필요하면 문제가 된 커밋을 `git revert <커밋>` 하고 `main`에 배포합니다. 이 방법은 Render가 이전 배포를 보관하는 동안에만 쓸 수 있고, DB 변경(SQL 실행)은 되돌리지 않습니다.

## 범위와 보존

- 이력은 앱에서 수정·삭제할 수 없지만 DB 관리자까지 막는 외부 공증은 아닙니다. 개인 로그인, 백업/복구, 보존 정책은 운영 강화 과제로 남아 있습니다.
- 첨부파일은 DB에 base64로 저장되므로 파일 크기보다 실제 저장량이 큽니다. 파일당 1MB, 업무당 10개로 제한하지만 무료 DB 전체 사용량도 확인하세요. 공개 Storage 버킷은 만들지 않습니다.
- 무료는 영구적인 무제한 제공을 뜻하지 않습니다. 공급자 정책 변경, 사용량 한도, 비활성 중지, 첫 접속 지연이 있을 수 있습니다. 업무에 중요한 자료의 유일한 사본으로 쓰기 전에 백업 절차를 마련합니다. 요금·약관은 공급자 사이트에서 확인합니다: https://render.com/docs/free , https://supabase.com/pricing , https://supabase.com/terms
- 로컬 PostgreSQL 호환 엔진(PGlite) 검증과 실제 Supabase/Render 배포 검증은 다릅니다. 실제 서비스에서 위 확인을 마치기 전에는 배포 완료로 보지 않습니다.
- 외부 AI 유료 API는 쓰지 않습니다. 유료 디스크·새 API 키·추가 계정은 필요하지 않습니다.
