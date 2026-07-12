# Ubiquitous Language

> Single source of truth for domain terminology. Update when entities, relationships,
> or naming conventions change. AI tools should read this before inspecting source files.
>
> **Last updated**: 2026-07-12
> **Canonical types**: `packages/models/src/`
> **Persistence layer**: `apps/api/src/database/schema/` (Drizzle table definitions mirroring `@repo/models` shapes)

---

## How to maintain this document

1. **Add terms** when a new entity, state, or process enters the codebase.
2. **Add aliases to avoid** when ambiguity appears in PRs, chats, or AI-generated code.
3. **Update relationships** when entity connections change (new FK, removed link, etc.).
4. **Flag ambiguities** when a term means different things in different contexts.
5. **Bump "Last updated"** on every edit so AI tools know how fresh the context is.

---

## Core entities

| Term | Definition | Canonical type | Aliases to avoid |
|------|-----------|----------------|-----------------|
| **User** | Account holder shared by the NestJS API and React client; validated via a shared Zod schema. Persisted in Postgres via Drizzle. | `User` (Zod `userSchema`) in `packages/models/src/schemas/user.schema.ts`, re-exported as `@repo/models`; table `users` in `apps/api/src/database/schema/users.schema.ts` (columns: `id` uuid, `email` text unique, `display_name` text) | — |

---

## Relationships

_None yet._

---

## Domain events

| Term | Definition | Payload | Transport |
|------|-----------|---------|-----------|
| **user.created** | Emitted by `CreateUserUseCase` (`apps/api/src/modules/users/application/use-cases/create-user.use-case.ts`) after a **User** is persisted. Consumed by `UserCreatedListener` (`apps/api/src/modules/users/application/listeners/user-created.listener.ts`). | `{ user: User }` — see `USER_CREATED_EVENT` in `apps/api/src/modules/users/domain/events/user-created.event.ts` | In-process, via NestJS `EventEmitter2` (`@nestjs/event-emitter`) |

---

## Flagged ambiguities

_None yet._

---

## Changelog

| Date | Change | Reason |
|------|--------|--------|
| [YYYY-MM-DD] | Initial scaffold | Project created |
| 2026-07-11 | Added **User** entity (`@repo/models`) | Shared domain schema introduced by epic #1 / issue #2 |
| 2026-07-11 | Added Drizzle `users` table persisting **User** in `apps/api` | NestJS API scaffold introduced by epic #1 / issue #4 |
| 2026-07-11 | Removed `apps/client`; `apps/web` (Next.js) now consumes the API via TanStack Query + axios | Client superseded by web data layer (epic #15) |
| 2026-07-11 | Added `user.created` domain event (emitted by `CreateUserUseCase`) | Logging/Events made mandatory in apps/api |
| 2026-07-12 | apps/api tsconfig → shared nestjs.json (NodeNext, CJS); relative imports now extensionless | tsconfig consolidation |
| 2026-07-12 | apps/api feature modules relocated to `src/modules/` (`users`, `health`) | Modules-folder convention adopted |
