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


# 도커실행방법

🚀 기본 실행 루틴
docker compose up -d --build
docker compose ps


코드 변경 후 반영까지 포함 (이미지 재빌드)

모든 서비스가 정상적으로 떠 있는지 확인

📜 로그 확인 (필수 / 자주 사용)
docker compose logs -f orchestrator
docker compose logs -f frontend
docker compose logs -f hr-mcp-server
docker compose logs -f postgres

⚠️ 중요

서비스명은 docker compose ps에 표시되는 SERVICE 컬럼 기준

컨테이너 이름(container_name)이 아님
→ 예: company-postgres ❌ / postgres ✅

잘못 쓰면 no such service 에러 발생

⚡ 재빌드 없이 그냥 켜기 (빠름)

코드 변경이 없고 단순 재실행만 할 경우:

docker compose up -d

🧨 완전 초기화 (볼륨까지 전부 삭제)

⚠️ DB 데이터까지 전부 삭제됨
정말 초기화가 필요할 때만 사용

docker compose down -v

🎯 특정 서비스만 재시작 / 재빌드

예: orchestrator만 코드 변경했을 경우

docker compose up -d --build orchestrator

✅ 결론

평소 개발 루틴

docker compose up -d --build
docker compose ps


문제 생기면

docker compose logs -f <서비스명>


## 구조

iPaaS-engine/
├─ apps/
│  ├─ orchestrator/                     # 중앙 오케스트레이터 (NestJS)
│  │  ├─ src/
│  │  │  ├─ main.ts
│  │  │  ├─ app.module.ts
│  │  │  ├─ common/
│  │  │  │  ├─ config/
│  │  │  │  │  ├─ env.validation.ts     # env 스키마 검증(zod/joi)
│  │  │  │  │  └─ config.ts             # 설정 로더
│  │  │  │  ├─ errors/
│  │  │  │  │  ├─ domain.error.ts
│  │  │  │  │  └─ http-exception.filter.ts
│  │  │  │  ├─ guards/
│  │  │  │  │  ├─ auth.guard.ts
│  │  │  │  │  └─ roles.guard.ts
│  │  │  │  ├─ logging/
│  │  │  │  │  ├─ logger.module.ts
│  │  │  │  │  ├─ pino.logger.ts
│  │  │  │  │  └─ audit.service.ts      # 감사 로깅
│  │  │  │  └─ utils/
│  │  │  │     ├─ mask.ts               # PII 마스킹
│  │  │  │     └─ idempotency.ts        # idempotency key 생성
│  │  │  ├─ modules/
│  │  │  │  ├─ auth/
│  │  │  │  │  ├─ auth.module.ts
│  │  │  │  │  ├─ auth.service.ts
│  │  │  │  │  ├─ auth.controller.ts
│  │  │  │  │  └─ dto/
│  │  │  │  │     ├─ login.dto.ts
│  │  │  │  │     └─ me.dto.ts
│  │  │  │  ├─ tool-registry/           # 1) MCP tools 수집 + 표준화(메타/스키마)
│  │  │  │  │  ├─ tool-registry.module.ts
│  │  │  │  │  ├─ tool-registry.service.ts
│  │  │  │  │  ├─ tool-registry.controller.ts
│  │  │  │  │  ├─ tool-metadata.ts      # risk/roles/piiFields 등 표준 메타 타입
│  │  │  │  │  ├─ schema/
│  │  │  │  │  │  ├─ tool.schema.ts     # tool args/result schema 타입
│  │  │  │  │  │  └─ schema.validator.ts
│  │  │  │  │  └─ repositories/
│  │  │  │  │     ├─ tool.repo.ts       # DB 저장/조회
│  │  │  │  │     └─ tool.mapper.ts
│  │  │  │  ├─ interpreter/             # 2) 자연어 → 구조화(CommandSpec)
│  │  │  │  │  ├─ interpreter.module.ts
│  │  │  │  │  ├─ interpreter.service.ts
│  │  │  │  │  ├─ command-spec.ts       # 추출된 엔티티/필드 표준
│  │  │  │  │  └─ pii.vault.ts          # 민감정보 분리 저장(토큰화)
│  │  │  │  ├─ planner/                 # 3) LLM이 "계획"만 생성
│  │  │  │  │  ├─ planner.module.ts
│  │  │  │  │  ├─ planner.service.ts
│  │  │  │  │  ├─ plan.schema.ts        # plan JSON 스키마(steps[])
│  │  │  │  │  └─ llm/
│  │  │  │  │     ├─ anthropic.service.ts
│  │  │  │  │     └─ prompts/
│  │  │  │  │        └─ plan.prompt.ts
│  │  │  │  ├─ policy/                  # 4) 실행 전 정책/권한/승인 규칙
│  │  │  │  │  ├─ policy.module.ts
│  │  │  │  │  ├─ policy-engine.service.ts
│  │  │  │  │  ├─ rules/
│  │  │  │  │  │  ├─ pii-approval.rule.ts
│  │  │  │  │  │  ├─ role-check.rule.ts
│  │  │  │  │  │  └─ external-send.rule.ts
│  │  │  │  │  └─ policy.result.ts      # NeedsApproval / Allowed / Denied
│  │  │  │  ├─ approvals/               # 5) 승인 큐 + 승인 플로우
│  │  │  │  │  ├─ approvals.module.ts
│  │  │  │  │  ├─ approvals.controller.ts
│  │  │  │  │  ├─ approvals.service.ts
│  │  │  │  │  └─ dto/
│  │  │  │  │     ├─ create-approval.dto.ts
│  │  │  │  │     └─ resolve-approval.dto.ts
│  │  │  │  ├─ workflow-engine/         # 6) 실행 책임자(상태머신/재시도/롤백)
│  │  │  │  │  ├─ workflow-engine.module.ts
│  │  │  │  │  ├─ workflow-engine.service.ts
│  │  │  │  │  ├─ state/
│  │  │  │  │  │  ├─ step.state.ts      # PENDING/RUNNING/SUCCESS/FAILED/RETRYING
│  │  │  │  │  │  └─ run.state.ts
│  │  │  │  │  ├─ retry/
│  │  │  │  │  │  ├─ retry.policy.ts
│  │  │  │  │  │  └─ backoff.ts
│  │  │  │  │  └─ compensation/
│  │  │  │  │     ├─ compensation.map.ts # step별 되돌리기 매핑(있을 때)
│  │  │  │  │     └─ compensation.service.ts
│  │  │  │  ├─ mcp-client/              # 7) MCP 서버 호출(표준 클라이언트)
│  │  │  │  │  ├─ mcp-client.module.ts
│  │  │  │  │  ├─ mcp-client.service.ts
│  │  │  │  │  ├─ transport/
│  │  │  │  │  │  ├─ http.transport.ts
│  │  │  │  │  │  └─ ws.transport.ts
│  │  │  │  │  └─ discovery/
│  │  │  │  │     ├─ server.discovery.ts # 서버 목록/헬스체크
│  │  │  │  │     └─ health.service.ts
│  │  │  │  ├─ runs/                    # 8) 실행 이력 조회/모니터링 API
│  │  │  │  │  ├─ runs.module.ts
│  │  │  │  │  ├─ runs.controller.ts
│  │  │  │  │  ├─ runs.service.ts
│  │  │  │  │  └─ health.controller.ts  # 헬스체크 엔드포인트
│  │  │  │  ├─ command-api/             # 0) 진입점(자연어 명령 접수)
│  │  │  │  │  ├─ command.module.ts
│  │  │  │  │  ├─ command.controller.ts
│  │  │  │  │  ├─ command.service.ts     # interpret → plan → policy → (approval/exe)
│  │  │  │  │  └─ dto/
│  │  │  │  │     └─ create-command.dto.ts
│  │  │  │  └─ jobs/                    # (선택) 크론/정리 작업
│  │  │  │     ├─ cleanup.job.ts
│  │  │  │     └─ scheduler.module.ts
│  │  │  └─ prisma/
│  │  │     ├─ schema.prisma
│  │  │     ├─ prisma.module.ts
│  │  │     └─ migrations/
│  │  ├─ test/
│  │  │  ├─ idempotency.spec.ts
│  │  │  └─ policy-engine.spec.ts
│  │  ├─ package.json
│  │  ├─ Dockerfile
│  │  ├─ README.md
│  │  ├─ jest.config.cjs
│  │  ├─ nest-cli.json
│  │  └─ tsconfig.json
│  │
│  ├─ frontend/                          # 관리 UI (Nuxt3/Vue3)
│  │  ├─ pages/
│  │  │  ├─ index.vue
│  │  │  ├─ servers/                     # MCP 서버/툴 관리
│  │  │  │  └─ index.vue
│  │  │  ├─ workflows/                   # 워크플로우 빌더
│  │  │  │  └─ index.vue
│  │  │  ├─ approvals/                   # 승인 큐
│  │  │  │  └─ index.vue
│  │  │  └─ runs/                        # 실행 모니터링
│  │  │     └─ index.vue
│  │  ├─ components/
│  │  ├─ package.json
│  │  ├─ nuxt.config.ts
│  │  └─ Dockerfile
│  │
│  └─ worker/                            # (선택) 무거운 작업 분리(같은 코드 공유 가능)
│     ├─ src/
│     │  ├─ worker.module.ts
│     │  └─ processor/
│     │     ├─ llm.processor.ts          # 임베딩/LLM 장시간 작업
│     │     └─ file.processor.ts         # 파일 파싱/인덱싱
│     └─ package.json
│
├─ mcp-servers/                          # 부서별 독립 MCP 서버들(각자 배포)
│  ├─ hr-mcp-server/
│  │  ├─ src/
│  │  │  ├─ tools/
│  │  │  │  ├─ generate-employee-id.tool.ts
│  │  │  │  ├─ create-employee-account.tool.ts
│  │  │  │  └─ compensation/            # 되돌리기 tool(가능하면)
│  │  │  │     └─ delete-employee.tool.ts
│  │  │  ├─ schema/
│  │  │  │  ├─ tools.schema.ts          # args/result JSON schema
│  │  │  │  └─ metadata.ts              # risk/roles/piiFields
│  │  │  ├─ app.module.ts
│  │  │  ├─ main.ts
│  │  │  └─ main.js
│  │  ├─ package.json
│  │  └─ Dockerfile
│  │
│  ├─ it-mcp-server/
│  ├─ finance-mcp-server/
│  ├─ erp-mcp-server/
│  └─ sales-mcp-server/
│
├─ infra/
│  ├─ docker/
│  │  ├─ nginx/
│  │  │  ├─ nginx.conf
│  │  │  └─ sites-enabled/
│  │  │     └─ company-automation.conf   # / -> frontend, /api -> orchestrator
│  │  └─ postgres/
│  │     └─ init.sql
│  ├─ scripts/
│  │  ├─ deploy.sh
│  │  └─ backup-db.sh
│  └─ observability/
│     ├─ prometheus.yml                  # (선택)
│     └─ grafana/
│
├─ docker-compose.yml                    # 전체 스택(오케스트레이터/DB/프록시/서버들)
├─ .env.example
└─ README.md
