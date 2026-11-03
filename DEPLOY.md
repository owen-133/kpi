# 외부 접속용 배포

현재는 로컬 서버만 실행 중이며 외부 배포는 완료되지 않았습니다.

## Render에서 Node Web Service로 실행

저장소가 GitHub에 올라간 뒤 Render에서 해당 저장소를 연결합니다. 이 문서 작성 시점의 소스는 로컬 체크아웃에만 있으므로 연결 전에 커밋·푸시가 필요합니다.

- Runtime: Node
- Build command: `node --check server.js && node --check public/app.js`
- Start command: `npm start`
- Health check path: `/health`
- 환경변수: `HOST=0.0.0.0`, `DATA_DIR=/var/data/orbit`, `NODE_VERSION=24`
- 비밀번호 환경변수: `ADMIN_PASSWORD`, `VIEWER_PASSWORD`를 호스팅 설정에서 직접 입력합니다. 소스나 로그에 기록하지 않습니다.
- 영구 디스크를 `/var/data`에 연결합니다. Render의 영구 디스크는 유료 서비스가 필요할 수 있습니다. 요금을 확인한 뒤 선택하세요.

배포 후 호스팅이 발급한 HTTPS 주소에서 `admin`과 관리자 비밀번호로 로그인합니다. 팀장에게는 `viewer`와 별도 조회 비밀번호를 제공합니다.

## 배포 후 확인

1. `/health`가 정상 응답하는지 확인합니다.
2. 비로그인 접근이 차단되는지 확인합니다.
3. 관리자 계정으로 업무 등록 → 진행 → 메모 → 완료를 실행합니다.
4. 조회 계정에서 기록을 볼 수 있고 변경은 불가능한지 확인합니다.
5. 서버를 재시작하고 업무와 이력이 유지되는지 확인합니다.

디스크 없이 배포하면 재배포·재시작으로 기록이 사라질 수 있으므로 실제 업무용으로 사용하지 마세요. 서비스 배포 권한과 영구 저장소 확인 전에는 공개 주소가 생겼다고 볼 수 없습니다. Vercel 서버리스에 이 SQLite 구조를 그대로 배포하지 않습니다.
