# iPaaS Engine 프로젝트 이해하기 (프론트엔드 개발자용)

## 🎯 이 프로젝트가 뭘 하는 건가요?

간단히 말하면, **"자연어로 명령하면 여러 부서 시스템을 자동으로 연결해서 일을 처리해주는 시스템"**입니다.

예를 들어:
- 사용자가 "새 직원 김철수를 HR 시스템에 등록하고 IT 계정도 만들어줘"라고 말하면
- 시스템이 자동으로 HR 서버 → IT 서버 순서로 작업을 실행합니다

---

## 🏗️ 전체 구조 (인프라 관점)

```
사용자 (브라우저)
    ↓
Nginx (리버스 프록시) ← 포트 8080
    ├─ / → Frontend (Nuxt3) ← 포트 3000
    └─ /api → Orchestrator (NestJS) ← 포트 3001
                ↓
            PostgreSQL DB ← 포트 15432
                ↓
            [DB 테이블들 저장]
                ↓
            Orchestrator가 MCP 서버들 호출
                ├─ HR MCP Server ← 포트 4001
                ├─ IT MCP Server (예정)
                └─ Finance MCP Server (예정)
```

### Docker Compose로 한 번에 실행
모든 서비스가 Docker 컨테이너로 묶여있어서 `docker compose up` 한 번이면 전체 시스템이 실행됩니다.

---

## 💾 데이터베이스 구조 (PostgreSQL)

프론트엔드에서 API를 호출하면, 백엔드는 이 DB에 데이터를 저장하고 조회합니다.

### 주요 테이블들

#### 1. **ToolServer** (도구 서버 목록)
```
어떤 부서의 MCP 서버가 있는지 저장
- id: 서버 고유 ID
- name: 서버 이름 (예: "hr-mcp-server")
- baseUrl: 서버 주소 (예: "http://hr-mcp-server:4001")
```

#### 2. **Tool** (각 서버가 제공하는 도구 목록)
```
각 MCP 서버가 제공하는 기능들을 저장
- id: 도구 고유 ID
- serverId: 어느 서버의 도구인지 (ToolServer와 연결)
- name: 도구 이름 (예: "create-employee-account")
- description: 도구 설명
- riskLevel: 위험도 (LOW/MEDIUM/HIGH)
- requiredRoles: 필요한 권한 (예: ["HR_ADMIN"])
- piiFields: 개인정보 필드 목록 (예: ["email", "phone"])
- argsSchema: 도구가 받는 파라미터 스키마 (JSON)
```

**프론트엔드에서 보면:**
- `/api/tools` API를 호출하면 → 이 테이블에서 조회해서 보여줌
- "HR 서버에는 어떤 기능들이 있나요?" 같은 화면에 사용

#### 3. **Command** (사용자가 입력한 자연어 명령)
```
사용자가 입력한 원본 명령문 저장
- id: 명령 고유 ID
- raw: 원본 텍스트 (예: "김철수 직원 계정 만들어줘")
- idempotencyKey: 중복 요청 방지 키 (같은 요청 두 번 오면 무시)
```

#### 4. **Plan** (AI가 만든 실행 계획)
```
자연어 명령을 분석해서 만든 단계별 실행 계획
- id: 계획 고유 ID
- commandId: 어느 명령의 계획인지
- steps: 실행 단계들 (JSON 배열)
  예: [
    { tool: "generate-employee-id", args: {...} },
    { tool: "create-employee-account", args: {...} }
  ]
- needsApproval: 승인이 필요한지 (true/false)
```

**프론트엔드에서 보면:**
- 사용자가 명령을 입력하면 → Plan이 생성됨
- 승인이 필요하면 → `/approvals` 페이지에 표시

#### 5. **Approval** (승인 요청)
```
승인이 필요한 작업의 승인 상태
- id: 승인 요청 ID
- planId: 어느 계획의 승인인지
- status: 상태 (PENDING/APPROVED/REJECTED)
- reason: 승인/거부 사유
```

**프론트엔드에서 보면:**
- `/approvals` 페이지에서 이 테이블 조회
- 관리자가 승인/거부 버튼 클릭 → 이 테이블 업데이트

#### 6. **Run** (실제 실행 이력)
```
계획을 실제로 실행한 기록
- id: 실행 ID
- commandId: 어느 명령의 실행인지
- planId: 어느 계획으로 실행했는지
- status: 실행 상태 (PENDING/RUNNING/SUCCESS/FAILED)
- createdAt: 시작 시간
- finishedAt: 종료 시간
```

**프론트엔드에서 보면:**
- `/runs` 페이지에서 실행 이력 조회
- 각 실행의 상태를 실시간으로 보여줌

#### 7. **Step** (각 단계별 실행 결과)
```
Run 안의 각 단계별 상세 결과
- id: 단계 ID
- runId: 어느 실행의 단계인지
- index: 몇 번째 단계인지 (0, 1, 2...)
- tool: 사용한 도구 이름
- args: 전달한 파라미터 (JSON)
- status: 단계 상태 (PENDING/RUNNING/SUCCESS/FAILED)
- result: 실행 결과 (JSON, 성공 시)
- error: 에러 메시지 (실패 시)
```

**프론트엔드에서 보면:**
- `/runs/{id}` 상세 페이지에서 각 단계별 결과 표시
- 어떤 단계에서 실패했는지 확인 가능

#### 8. **PiiSecret** (개인정보 암호화 저장소)
```
민감한 개인정보를 암호화해서 별도 저장
- token: 암호화된 토큰 (이걸로 조회)
- cipherText: 암호화된 실제 데이터
- iv, tag: 암호화에 필요한 메타데이터
```

**왜 필요한가요?**
- 개인정보(이메일, 전화번호 등)를 평문으로 저장하면 위험
- 암호화해서 저장하고, 필요할 때만 복호화해서 사용

#### 9. **AuditEvent** (감사 로그)
```
중요한 작업들을 모두 기록 (누가, 언제, 무엇을 했는지)
- id: 로그 ID
- type: 이벤트 타입 (예: "COMMAND_CREATED", "APPROVAL_APPROVED")
- commandId, planId, runId: 관련된 ID들
- message: 로그 메시지
- meta: 추가 정보 (JSON)
```

**프론트엔드에서 보면:**
- 감사 로그 페이지에서 모든 작업 이력 확인
- 보안 감사용

---

## 🔄 데이터 흐름 (사용자가 명령을 입력했을 때)

### 1단계: 사용자가 명령 입력
```
프론트엔드 → POST /api/command
{
  "text": "김철수 직원 계정 만들어줘"
}
```

### 2단계: Orchestrator가 처리
```
1. Command 테이블에 저장
   - raw: "김철수 직원 계정 만들어줘"
   - idempotencyKey 생성

2. Interpreter가 자연어 분석
   - "김철수" → 이름 추출
   - "직원 계정" → create-employee-account 도구 필요

3. Planner가 실행 계획 생성 (LLM 사용)
   - Plan 테이블에 저장
   - steps: [
       { tool: "generate-employee-id" },
       { tool: "create-employee-account", args: { name: "김철수" } }
     ]

4. Policy Engine이 권한/정책 체크
   - 개인정보 사용? → needsApproval = true
   - Approval 테이블에 저장 (status: PENDING)

5. 승인 대기 또는 즉시 실행
   - 승인 필요 → Approval 테이블에 저장
   - 승인 불필요 → 바로 Run 생성
```

### 3단계: 실행 (Run 생성 후)
```
1. Run 테이블에 저장 (status: PENDING)

2. 각 Step 순차 실행:
   - Step 1: generate-employee-id 호출
     → HR MCP Server에 HTTP 요청
     → Step 테이블에 결과 저장
   
   - Step 2: create-employee-account 호출
     → HR MCP Server에 HTTP 요청
     → Step 테이블에 결과 저장

3. 모든 Step 완료 시
   - Run.status = SUCCESS
   - Run.finishedAt = 현재 시간
```

### 4단계: 프론트엔드에서 조회
```
GET /api/runs/{runId}
→ Run + Step들 조회해서 화면에 표시
```

---

## 🌐 인프라 구성 요소

### 1. **Nginx (리버스 프록시)**
```
역할: 요청을 적절한 서비스로 라우팅
- http://localhost:8080/ → Frontend로 전달
- http://localhost:8080/api/* → Orchestrator로 전달
- http://localhost:8080/mcp/* → MCP 서버로 전달

왜 필요한가요?
- 하나의 포트(8080)로 모든 서비스 접근 가능
- 프론트엔드는 /api로 호출하면 자동으로 Orchestrator로 전달됨
```

### 2. **PostgreSQL (데이터베이스)**
```
역할: 모든 데이터 저장
- Orchestrator만 접근 가능
- 포트: 15432 (외부 접근용), 5432 (내부 접근용)

연결 정보:
- DATABASE_URL 환경변수로 Orchestrator에 전달
- 예: postgresql://company:company_pw@postgres:5432/company_automation
```

### 3. **Orchestrator (NestJS 백엔드)**
```
역할: 모든 비즈니스 로직 처리
- 포트: 3001
- DB 접근: Prisma ORM 사용
- MCP 서버 호출: HTTP 클라이언트 사용

주요 모듈:
- command-api: 명령 접수 (/api/command)
- tool-registry: 도구 목록 관리 (/api/tools)
- interpreter: 자연어 분석
- planner: 실행 계획 생성 (LLM 사용)
- policy: 권한/정책 체크
- approvals: 승인 관리 (/api/approvals)
- workflow-engine: 실행 관리
- runs: 실행 이력 조회 (/api/runs)
```

### 4. **MCP 서버들 (부서별 독립 서버)**
```
역할: 각 부서의 실제 기능 제공
- HR MCP Server: 직원 관련 기능
- IT MCP Server: IT 계정 관련 기능 (예정)
- Finance MCP Server: 재무 관련 기능 (예정)

각 서버는:
- 독립적으로 배포 가능
- Orchestrator가 HTTP로 호출
- Tool 목록을 제공하는 API 있음
```

### 5. **Frontend (Nuxt3)**
```
역할: 사용자 인터페이스
- 포트: 3000
- API 호출: http://localhost:8080/api/* (Nginx 통해)

주요 페이지:
- /: 홈
- /servers: MCP 서버/도구 관리
- /workflows: 워크플로우 빌더
- /approvals: 승인 큐
- /runs: 실행 모니터링
```

---

## 🔐 보안 관련

### 1. **인증 (Auth)**
```
- JWT 토큰 사용
- /api/auth/login → 토큰 발급
- 이후 모든 API 요청에 토큰 포함 필요
- auth.guard.ts가 토큰 검증
```

### 2. **권한 (Roles)**
```
- 각 Tool에 requiredRoles 지정
- 사용자 역할과 비교해서 실행 가능 여부 판단
- roles.guard.ts가 권한 체크
```

### 3. **개인정보 보호 (PII)**
```
- 개인정보는 PiiSecret 테이블에 암호화 저장
- 로그에는 마스킹 처리 (mask.ts)
- 개인정보 사용 시 자동으로 승인 필요
```

---

## 📊 프론트엔드 개발자가 알아야 할 API 엔드포인트

### 인증
- `POST /api/auth/login` - 로그인
- `GET /api/auth/me` - 현재 사용자 정보

### 도구 관리
- `GET /api/tools` - 모든 도구 목록 조회
- `GET /api/tools/{id}` - 특정 도구 상세

### 명령 실행
- `POST /api/command` - 자연어 명령 실행
  ```json
  {
    "text": "김철수 직원 계정 만들어줘"
  }
  ```

### 승인
- `GET /api/approvals` - 승인 요청 목록
- `POST /api/approvals/{id}/approve` - 승인
- `POST /api/approvals/{id}/reject` - 거부

### 실행 이력
- `GET /api/runs` - 실행 이력 목록
- `GET /api/runs/{id}` - 특정 실행 상세 (Step 포함)

---

## 🛠️ 개발 환경 설정

### Docker로 실행
```bash
docker compose up --build
```

### 접속 주소
- Frontend: http://localhost:8080
- API: http://localhost:8080/api/health
- HR MCP: http://localhost:8080/mcp/hr/health

### 환경 변수
`.env` 파일에 설정:
```
POSTGRES_USER=company
POSTGRES_PASSWORD=company_pw
DATABASE_URL=postgresql://company:company_pw@postgres:5432/company_automation
ANTHROPIC_API_KEY=your_key_here  # LLM 사용 시 필요
JWT_SECRET=your_secret_here
```

---

## 💡 핵심 개념 정리

### MCP (Model Context Protocol)
- 각 부서 서버가 제공하는 기능들을 표준화된 방식으로 호출하는 프로토콜
- 프론트엔드 입장에서는 "Orchestrator가 알아서 처리"하면 됨

### Tool (도구)
- 각 MCP 서버가 제공하는 기능 하나하나
- 예: "create-employee-account", "generate-employee-id"

### Command (명령)
- 사용자가 입력한 자연어 텍스트
- 예: "김철수 직원 계정 만들어줘"

### Plan (계획)
- Command를 분석해서 만든 단계별 실행 계획
- LLM이 자동 생성

### Run (실행)
- Plan을 실제로 실행한 기록
- 여러 Step으로 구성

### Step (단계)
- Run 안의 각 단계
- 하나의 Tool 호출 = 하나의 Step

### Approval (승인)
- 위험한 작업은 승인 필요
- 관리자가 승인/거부 결정

---

## 🎓 프론트엔드 개발 시 주의사항

1. **API 호출은 항상 `/api`로 시작**
   - Nginx가 자동으로 Orchestrator로 전달
   - 예: `fetch('/api/runs')`

2. **인증 토큰은 헤더에 포함**
   - `Authorization: Bearer {token}`

3. **실시간 업데이트는 Polling 또는 WebSocket**
   - Run 상태가 변경되면 주기적으로 조회 필요

4. **에러 처리**
   - API 에러는 HTTP 상태 코드로 판단
   - Step 실패 시 `error` 필드에 메시지 있음

5. **개인정보 표시 시 마스킹**
   - 백엔드에서 마스킹된 데이터를 받을 수도 있지만
   - 프론트엔드에서도 한 번 더 마스킹 처리 권장

---

이제 프로젝트 구조를 이해하셨나요? 추가로 궁금한 부분이 있으면 물어보세요! 🚀

