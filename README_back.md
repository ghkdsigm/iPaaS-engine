# Company Automation (Monorepo Scaffold)

This is a Windows-friendly scaffold (no symlinks) for:
- Orchestrator (NestJS) + Prisma + Postgres
- HR MCP Server (Express)
- Admin UI (Nuxt 3)
- Nginx reverse proxy
- docker-compose for local stack

## Quick start (Docker)
```bash
docker compose up --build
```

Open:
- UI: http://localhost:8080
- API: http://localhost:8080/api/health
- HR MCP: http://localhost:8080/mcp/hr/health

## Dev mode (without nginx)
- Orchestrator: http://localhost:3001/health
- HR MCP: http://localhost:4001/health
- Frontend: http://localhost:3000



# 도커

docker compose down
docker compose build --no-cache orchestrator
docker compose up -d
docker compose logs -f orchestrator

-------------------------------------------
docker compose down

# 프론트 이미지/캐시를 확실히 갱신하려면 build를 강제로
docker compose build --no-cache frontend

docker compose up -d
docker compose logs -f frontend
-------------------------------------------


#제대로 재시작(가장 확실한 방법) (DB까지 초기화 포함)

docker compose down -v

docker compose build --no-cache orchestrator hr-mcp finance-mcp dispatch-mcp ledger-mcp frontend nginx

docker compose up -d

docker compose logs -f orchestrator


-------------------------------------------

#DB는 유지하고 “코드만” 확실히 바꾸고 싶으면
docker compose down

docker compose build --no-cache orchestrator hr-mcp finance-mcp dispatch-mcp ledger-mcp

docker compose up -d

docker compose logs -f orchestrator


또는

docker compose down

docker compose build --no-cache

docker compose up -d --force-recreate

docker compose ps


-------------------------------------------


#db싹 사라지면

docker compose exec -T orchestrator sh -lc "npx prisma db push --schema=src/prisma/schema.prisma && npx prisma generate --schema=src/prisma/schema.prisma"
docker compose restart orchestrator




## 구조

IPAAS-ENGINE/
├─ apps/
│  ├─ orchestrator/                     # 중앙 오케스트레이터 (NestJS) - 자연어 명령을 받아 워크플로우 실행
│  │  ├─ src/
│  │  │  ├─ main.ts                      # 애플리케이션 진입점, NestJS 부트스트랩
│  │  │  ├─ app.module.ts                # 루트 모듈, 모든 모듈 통합
│  │  │  ├─ common/                      # 공통 유틸리티 및 인프라 코드
│  │  │  │  ├─ config/
│  │  │  │  │  ├─ env.validation.ts      # 환경변수 스키마 검증 (zod/joi)
│  │  │  │  │  └─ config.ts              # 설정 로더, 환경변수 관리
│  │  │  │  ├─ errors/
│  │  │  │  │  ├─ domain.error.ts        # 도메인 에러 클래스 정의
│  │  │  │  │  └─ http-exception.filter.ts # HTTP 예외 필터, 에러 응답 변환
│  │  │  │  ├─ guards/
│  │  │  │  │  ├─ auth.guard.ts          # 인증 가드, JWT 토큰 검증
│  │  │  │  │  └─ roles.guard.ts         # 역할 기반 접근 제어 가드
│  │  │  │  ├─ logging/
│  │  │  │  │  ├─ logger.module.ts
│  │  │  │  │  ├─ pino.logger.ts
│  │  │  │  │  └─ audit.service.ts       # 감사 로그 서비스 (중요 작업 기록)
│  │  │  │  └─ utils/
│  │  │  │     ├─ mask.ts                # PII(개인정보) 마스킹 유틸리티
│  │  │  │     └─ idempotency.ts         # 멱등성 키 생성 (중복 요청 방지)
│  │  │  ├─ modules/
│  │  │  │  ├─ auth/                     # 인증/인가 모듈
│  │  │  │  │  ├─ auth.module.ts
│  │  │  │  │  ├─ auth.service.ts        # 로그인, 토큰 발급, 사용자 정보 조회
│  │  │  │  │  ├─ auth.controller.ts     # /auth 엔드포인트
│  │  │  │  │  └─ dto/
│  │  │  │  │     ├─ login.dto.ts        # 로그인 요청 DTO
│  │  │  │  │     └─ me.dto.ts           # 현재 사용자 정보 DTO
│  │  │  │  ├─ tool-registry/           # 1) MCP tools 수집 + 표준화(메타/스키마)
│  │  │  │  │  ├─ tool-registry.module.ts
│  │  │  │  │  ├─ tool-registry.service.ts # MCP 서버에서 tool 목록 수집 및 등록
│  │  │  │  │  ├─ tool-registry.controller.ts # tool 조회 API
│  │  │  │  │  ├─ tool-metadata.ts      # risk/roles/piiFields 등 표준 메타 타입
│  │  │  │  │  ├─ schema/
│  │  │  │  │  │  ├─ tool.schema.ts     # tool args/result schema 타입 정의
│  │  │  │  │  │  └─ schema.validator.ts # JSON Schema 검증
│  │  │  │  │  └─ repositories/
│  │  │  │  │     ├─ tool.repo.ts       # DB 저장/조회 (Prisma)
│  │  │  │  │     └─ tool.mapper.ts     # 도메인 ↔ DB 엔티티 매핑
│  │  │  │  ├─ interpreter/             # 2) 자연어 → 구조화(CommandSpec)
│  │  │  │  │  ├─ interpreter.module.ts
│  │  │  │  │  ├─ interpreter.service.ts # 자연어 명령을 CommandSpec으로 변환
│  │  │  │  │  ├─ command-spec.ts       # 추출된 엔티티/필드 표준 타입
│  │  │  │  │  └─ pii.vault.ts          # 민감정보 분리 저장(토큰화)
│  │  │  │  ├─ planner/                 # 3) LLM이 "계획"만 생성
│  │  │  │  │  ├─ planner.module.ts
│  │  │  │  │  ├─ planner.service.ts    # CommandSpec을 실행 계획으로 변환
│  │  │  │  │  ├─ plan.schema.ts        # plan JSON 스키마(steps[])
│  │  │  │  │  └─ llm/
│  │  │  │  │     ├─ anthropic.service.ts # Anthropic Claude API 클라이언트
│  │  │  │  │     └─ prompts/
│  │  │  │  │        └─ plan.prompt.ts   # 계획 생성 프롬프트 템플릿
│  │  │  │  ├─ policy/                  # 4) 실행 전 정책/권한/승인 규칙
│  │  │  │  │  ├─ policy.module.ts
│  │  │  │  │  ├─ policy-engine.service.ts # 정책 엔진, 규칙 평가
│  │  │  │  │  ├─ policy.result.ts      # NeedsApproval / Allowed / Denied
│  │  │  │  │  └─ rules/
│  │  │  │  │     ├─ pii-approval.rule.ts # PII 사용 시 승인 필요 규칙
│  │  │  │  │     ├─ role-check.rule.ts  # 역할 기반 권한 검사
│  │  │  │  │     └─ external-send.rule.ts # 외부 전송 시 승인 필요
│  │  │  │  ├─ approvals/               # 5) 승인 큐 + 승인 플로우
│  │  │  │  │  ├─ approvals.module.ts
│  │  │  │  │  ├─ approvals.controller.ts # /approvals 엔드포인트
│  │  │  │  │  ├─ approvals.service.ts   # 승인 요청 생성, 승인/거부 처리
│  │  │  │  │  └─ dto/
│  │  │  │  │     └─ create-approval.dto.ts # 승인 요청 DTO
│  │  │  │  ├─ workflow-engine/         # 6) 실행 책임자(상태머신/재시도/롤백)
│  │  │  │  │  ├─ workflow-engine.module.ts
│  │  │  │  │  ├─ workflow-engine.service.ts # 워크플로우 실행 오케스트레이션
│  │  │  │  │  ├─ state/
│  │  │  │  │  │  ├─ step.state.ts      # PENDING/RUNNING/SUCCESS/FAILED/RETRYING
│  │  │  │  │  │  └─ run.state.ts       # 전체 실행 상태 관리
│  │  │  │  │  ├─ retry/
│  │  │  │  │  │  ├─ retry.policy.ts    # 재시도 정책 (최대 횟수, 조건)
│  │  │  │  │  │  └─ backoff.ts         # 지수 백오프 전략
│  │  │  │  │  └─ compensation/
│  │  │  │  │     ├─ compensation.map.ts # step별 되돌리기 매핑(있을 때)
│  │  │  │  │     └─ compensation.service.ts # 실패 시 롤백 실행
│  │  │  │  ├─ mcp-client/              # 7) MCP 서버 호출(표준 클라이언트)
│  │  │  │  │  ├─ mcp-client.module.ts
│  │  │  │  │  ├─ mcp-client.service.ts  # MCP 프로토콜 클라이언트
│  │  │  │  │  ├─ transport/
│  │  │  │  │  │  ├─ http.transport.ts   # HTTP 전송 계층
│  │  │  │  │  │  └─ ws.transport.ts     # WebSocket 전송 계층
│  │  │  │  │  └─ discovery/
│  │  │  │  │     ├─ server.discovery.ts # 서버 목록/헬스체크
│  │  │  │  │     └─ health.service.ts   # MCP 서버 상태 모니터링
│  │  │  │  ├─ runs/                    # 8) 실행 이력 조회/모니터링 API
│  │  │  │  │  ├─ runs.module.ts
│  │  │  │  │  ├─ runs.controller.ts    # /runs 엔드포인트
│  │  │  │  │  ├─ runs.service.ts        # 실행 이력 조회, 필터링
│  │  │  │  │  └─ health.controller.ts   # 헬스체크 엔드포인트
│  │  │  │  └─ command-api/             # 0) 진입점(자연어 명령 접수)
│  │  │  │     ├─ command.module.ts
│  │  │  │     ├─ command.controller.ts # /command 엔드포인트
│  │  │  │     ├─ command.service.ts     # interpret → plan → policy → (approval/exe)
│  │  │  │     └─ dto/
│  │  │  │        └─ create-command.dto.ts # 명령 요청 DTO
│  │  │  ├─ prisma/                      # Prisma ORM 설정
│  │  │  │  ├─ schema.prisma                # 데이터베이스 스키마 정의
│  │  │  │  ├─ prisma.module.ts          # Prisma 모듈 설정
│  │  │  │  └─ migrations/               # 마이그레이션 파일들
│  │  │  └─ jobs/                        # (선택) 크론/정리 작업
│  │  │     ├─ cleanup.job.ts            # 오래된 데이터 정리 작업
│  │  │     └─ scheduler.module.ts       # 스케줄러 모듈
│  │  ├─ test/                            # 테스트 파일들
│  │  │  ├─ idempotency.spec.ts          # 멱등성 테스트
│  │  │  └─ policy-engine.spec.ts        # 정책 엔진 테스트
│  │  ├─ package.json                     # 의존성 및 스크립트
│  │  ├─ Dockerfile                       # Docker 이미지 빌드 설정
│  │  ├─ jest.config.cjs                  # Jest 테스트 설정
│  │  ├─ nest-cli.json                    # NestJS CLI 설정
│  │  ├─ tsconfig.json                    # TypeScript 설정
│  │  └─ README.md                        # 오케스트레이터 문서
│  │
│  ├─ frontend/                          # 관리 UI (Nuxt3/Vue3) - 웹 대시보드
│  │  ├─ pages/                          # 페이지 라우팅 (Nuxt 자동 라우팅)
│  │  │  ├─ index.vue                    # 홈 페이지
│  │  │  ├─ servers/                      # MCP 서버/툴 관리 페이지
│  │  │  │  └─ index.vue
│  │  │  ├─ workflows/                    # 워크플로우 빌더 페이지
│  │  │  │  └─ index.vue
│  │  │  ├─ approvals/                    # 승인 큐 페이지
│  │  │  │  └─ index.vue
│  │  │  └─ runs/                         # 실행 모니터링 페이지
│  │  │     └─ index.vue
│  │  ├─ components/                      # 재사용 가능한 Vue 컴포넌트
│  │  ├─ layouts/                         # 레이아웃 컴포넌트
│  │  │  └─ default.vue                   # 기본 레이아웃
│  │  ├─ assets/                          # 정적 자산
│  │  │  └─ scss/                         # SCSS 스타일시트
│  │  │     ├─ main.scss                  # 메인 스타일
│  │  │     ├─ variables.scss              # CSS 변수
│  │  │     ├─ mixins.scss                 # SCSS 믹스인
│  │  │     └─ reset.scss                 # CSS 리셋
│  │  ├─ nuxt.config.ts                   # Nuxt 설정 파일
│  │  ├─ package.json                     # 의존성 및 스크립트
│  │  └─ Dockerfile                       # Docker 이미지 빌드 설정
│  │
│  └─ worker/                            # (선택) 무거운 작업 분리(같은 코드 공유 가능)
│     ├─ src/
│     │  ├─ worker.module.ts             # Worker 모듈
│     │  └─ processor/
│     │     ├─ llm.processor.ts          # 임베딩/LLM 장시간 작업 처리
│     │     └─ file.processor.ts         # 파일 파싱/인덱싱 처리
│     └─ package.json
│
├─ mcp-servers/                          # 부서별 독립 MCP 서버들(각자 배포)
│  ├─ hr-mcp-server/                      # HR 부서 MCP 서버
│  │  ├─ src/
│  │  │  ├─ tools/                        # MCP Tool 구현
│  │  │  │  ├─ generate-employee-id.tool.ts # 직원 ID 생성 도구
│  │  │  │  ├─ create-employee-account.tool.ts # 직원 계정 생성 도구
│  │  │  │  └─ compensation/              # 되돌리기 tool(가능하면)
│  │  │  │     └─ delete-employee.tool.ts # 직원 삭제 도구 (롤백용)
│  │  │  ├─ schema/                      # Tool 스키마 정의
│  │  │  │  ├─ tools.schema.ts           # args/result JSON schema
│  │  │  │  └─ metadata.ts               # risk/roles/piiFields 메타데이터
│  │  │  ├─ app.module.ts                 # Express 앱 모듈
│  │  │  ├─ main.ts                       # TypeScript 진입점
│  │  │  └─ main.js                       # JavaScript 진입점 (컴파일된)
│  │  ├─ package.json
│  │  └─ Dockerfile                       # Docker 이미지 빌드 설정
│  │
│  ├─ it-mcp-server/                      # IT 부서 MCP 서버 (구현 예정)
│  ├─ finance-mcp-server/                 # 재무 부서 MCP 서버 (구현 예정)
│  ├─ erp-mcp-server/                     # ERP MCP 서버 (구현 예정)
│  └─ sales-mcp-server/                   # 영업 부서 MCP 서버 (구현 예정)
│
├─ infra/                                 # 인프라 설정 및 스크립트
│  ├─ docker/                             # Docker 관련 설정
│  │  ├─ nginx/                           # Nginx 리버스 프록시 설정
│  │  │  ├─ nginx.conf                    # Nginx 메인 설정
│  │  │  └─ sites-enabled/
│  │  │     └─ company-automation.conf    # 라우팅 설정 (/ -> frontend, /api -> orchestrator)
│  │  └─ postgres/                        # PostgreSQL 초기화
│  │     └─ init.sql                      # DB 초기화 스크립트
│  ├─ scripts/                            # 배포 및 유지보수 스크립트
│  │  ├─ deploy.sh                        # 배포 스크립트
│  │  └─ backup-db.sh                     # 데이터베이스 백업 스크립트
│  └─ observability/                      # 모니터링 및 관찰성
│     ├─ prometheus.yml                   # Prometheus 메트릭 수집 설정
│     └─ grafana/                         # Grafana 대시보드 설정
│
├─ docker-compose.yml                     # 전체 스택 정의(오케스트레이터/DB/프록시/서버들)
├─ PATCH_NOTES.md                         # 패치 노트
├─ PATCH3_NOTES.md                        # 패치 3 노트
├─ README_back.md                         # 백업 README (이 파일)
└─ README.md                              # 메인 README
