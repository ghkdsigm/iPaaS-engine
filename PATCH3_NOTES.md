Patch 3 - Build fixes for orchestrator

Fixes:
- TypeScript build errors:
  - AuditService now writes actorId/payload into AuditEvent.meta JSON (schema has message/meta, not actorId/payload).
  - Replace default imports for Node 'crypto' with namespace import (CommonJS interop).
  - Replace default import for jsonwebtoken with namespace import.
  - Fix broken string literals in anthropic.service.ts where join() newline got split.

Files included:
- apps/orchestrator/src/common/logging/audit.service.ts
- apps/orchestrator/src/common/utils/crypto.ts
- apps/orchestrator/src/common/utils/idempotency.ts
- apps/orchestrator/src/modules/auth/auth.service.ts
- apps/orchestrator/src/modules/command-api/command.service.ts
- apps/orchestrator/src/modules/interpreter/pii.vault.ts
- apps/orchestrator/src/modules/planner/llm/anthropic.service.ts
