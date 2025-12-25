# ipaas_patch4

Fix: TypeScript build failure in `apps/orchestrator/src/common/logging/audit.service.ts`

- Prisma `AuditEvent.meta` is `Json?` and Prisma types do not accept raw `null` for `meta` in create().
- This patch avoids passing `meta: null` and instead omits `meta` when there is no meta to write.
- Also aligns AuditEvent write with schema fields: `message` + `meta` (no actorId/payload columns).

Apply:
- Overwrite the file at the same path, then rebuild:
  docker compose build --no-cache orchestrator
