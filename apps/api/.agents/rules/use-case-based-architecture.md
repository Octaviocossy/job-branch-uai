# Rule: Use-Case-Based (Hexagonal) Architecture — `apps/api`

`apps/api` (NestJS 11) is organized around **use cases**, not resources or MVC layers. Each
business action is one class with a single `execute(...)` method; HTTP concerns, business
logic, and persistence are kept in separate folders so each can change independently.

This rule describes the **real, current layout** of `apps/api/src/`. Logging (§6) and
events (§7) are **mandatory** — every use case must inject the shared `AppLogger`, and any
action with observers must publish a typed domain event after persistence. The `users`
feature (with `RegisterUseCase` in `auth`, which emits its event) is the reference
implementation for both patterns; copy it rather than inventing a new shape.

---

## 1. Core flow

```
Controller (presentation/) → Use Case (application/use-cases/) → Repository port (domain/) ⇠ Repository impl (infrastructure/)
```

- **Controller** (`presentation/`) — HTTP boundary only. Parses/validates the request (via
  `ZodValidationPipe` + a `@repo/models` schema), calls exactly one use case per action, and
  translates the result into an HTTP response (including `NotFoundException` etc.). Contains
  **no** business logic and **no** direct repository/database access.
- **Use case** (`application/use-cases/`) — one class per business action, with a single
  `execute(...)` method. Depends only on **repository ports** (interfaces from `domain/`),
  injected via a DI token — never on a concrete infrastructure class. This is where business
  rules and orchestration live.
- **Repository port** (`domain/`) — a TypeScript interface plus an injection token constant.
  Defines *what* persistence operations the domain needs, with no knowledge of Drizzle,
  Postgres, or SQL.
- **Repository implementation** (`infrastructure/`) — implements the port using the real
  persistence technology (Drizzle). This is the only layer allowed to import the Drizzle
  client, schema tables, or SQL-specific types.

Data flows one way: `presentation → application → domain (port)`, with `infrastructure`
plugged into the port from the outside via Nest's DI container (`useClass` in the module).
A use case never imports from `infrastructure/` or `presentation/`.

---

## 2. Project structure

```
apps/api/src/
  modules/
    users/
      presentation/
        users.controller.ts            # HTTP only; GET handlers behind JwtAuthGuard + PermissionsGuard
      application/
        use-cases/
          get-user.use-case.ts          # one business action each
          list-users.use-case.ts
          get-user.use-case.spec.ts
        listeners/
          user-created.listener.ts      # @OnEvent consumer
      domain/
        usuario.ts                      # Usuario domain entity (autenticar, incrementarIntentos, obtenerRol)
        lista-usuarios.repository.ts    # ListaUsuarios interface + LISTA_USUARIOS DI token
        password-hasher.ts              # hashing port used by Usuario.autenticar()
        events/
          user-created.event.ts         # USER_CREATED_EVENT name + UserCreatedEvent payload
      infrastructure/
        drizzle-lista-usuarios.repository.ts   # Drizzle implementation of the port
      users.module.ts
    auth/
      application/
        use-cases/
          register.use-case.ts          # emits USER_CREATED_EVENT after the Usuario is persisted
          ...                           # login, iniciar-sesion, validar-sesion, cerrar-sesion
    health/
      health.controller.ts             # liveness endpoint; no use-case/domain/infra layers
      health.module.ts
  database/
    database.module.ts
    database.constants.ts
    schema/
      usuarios.schema.ts
      index.ts
  common/
    pipes/
      zod-validation.pipe.ts
    guards/
      permissions.guard.ts            # checks @RequiereAccion against the Sesion's ContextoSeguridad
    decorators/
      requiere-accion.decorator.ts    # @RequiereAccion('<codigo>') — one Accion per protected endpoint
  config/
    env.validation.ts
  shared/
    auth/
      jwt-auth.guard.ts               # bearer JWT + a live Sesion
    logger/
      app.logger.ts                   # AppLogger — transient ConsoleLogger subclass
      logger.module.ts                # LoggerModule — @Global(), provides/exports AppLogger
  app.module.ts
  main.ts
```

Each domain/feature lives under `src/modules/` (e.g. `modules/users/`) and is a self-contained
vertical slice with its own `presentation/`, `application/use-cases/`, `domain/`, and
`infrastructure/` subfolders, wired together by a per-feature `<feature>.module.ts`. A
lightweight module may omit layers it does not need — e.g. `modules/health/` is just a
controller + module with no `domain/` or `infrastructure/`.

**`shared/`:** cross-cutting services live in a top-level `shared/` folder (e.g.
`shared/logger/`) so use cases across features depend on the same provider without
duplicating it per feature. `shared/logger/` exists today and hosts the mandatory
`AppLogger` — see §6.

---

## 3. Naming conventions

- **Use cases:** `[verb]-[resource].use-case.ts` in `application/use-cases/`, exporting one
  `*UseCase` class with a single `execute(...)` method (e.g. `get-user.use-case.ts` →
  `GetUserUseCase`). One file, one class, one business action.
- **Controllers:** `[resource].controller.ts` in `presentation/` (e.g. `users.controller.ts` →
  `UsersController`).
- **Repository port:** `[resource].repository.ts` in `domain/`, exporting both the interface
  (e.g. `ListaUsuarios`) **and** an injection token constant (e.g.
  `export const LISTA_USUARIOS = Symbol("LISTA_USUARIOS")` in `lista-usuarios.repository.ts`).
  In the security and identity scope the port takes the academic spec's name (ADR-0023), so
  `ListaUsuarios` keeps it rather than a `[Resource]Repository` name — do not rename it to
  match the pattern.
- **Repository implementation:** `drizzle-[resource].repository.ts` in `infrastructure/`
  (e.g. `drizzle-lista-usuarios.repository.ts` → `DrizzleListaUsuarios implements ListaUsuarios`).
- **Imports:** intra-package relative imports are **extensionless**, e.g.
  `import { LISTA_USUARIOS, type ListaUsuarios } from "../../domain/lista-usuarios.repository";`. `apps/api`
  extends `@repo/typescript-config/nestjs.json` (`module`/`moduleResolution: NodeNext`) but
  emits **CommonJS** — `apps/api/package.json` has no `"type": "module"` — so NodeNext resolves
  relative imports without a file extension. Do **not** add `.js` extensions, and do **not** add
  `"type": "module"` to `package.json`: that switches files to ESM mode, under which NodeNext
  requires a `.js` extension on every relative import (`error TS2835`).
- **Domain event:** `[event-name].event.ts` in `domain/events/`, exporting a name constant
  (`UPPER_SNAKE`, value dot-cased, e.g. `USER_CREATED_EVENT = "user.created"`) **and** a
  payload interface (e.g. `UserCreatedEvent`).
- **Event listener:** `[event].listener.ts` in `application/listeners/`, one `@OnEvent`
  handler class (e.g. `UserCreatedListener`).
- **Logger:** `shared/logger/app.logger.ts` (`AppLogger`) + `shared/logger/logger.module.ts`
  (`LoggerModule`, `@Global()`).

---

## 4. Responsibilities

| Layer | Folder | Owns | Must not |
|---|---|---|---|
| Controller | `presentation/` | HTTP routing, request validation (`ZodValidationPipe`), response shaping, HTTP-specific errors (e.g. `NotFoundException`) | Contain business logic; call a repository directly; import from `infrastructure/` |
| Use case | `application/use-cases/` | One business action's orchestration/logic; depends on repository **ports** via DI token | Know about HTTP (`Request`/`Response`, decorators); import a concrete `infrastructure/` class; depend on another use case's internals |
| Domain port | `domain/` | The repository **interface** the use cases need, plus its DI token | Contain any implementation code or import Drizzle/SQL types |
| Infrastructure repo | `infrastructure/` | Concrete port implementation using Drizzle; all SQL/ORM-specific code | Be imported by `application/` or `presentation/` directly (only referenced via the port + DI token) |
| Shared services | `shared/` | Cross-cutting concerns reused by multiple features' use cases (logger, hashing, mailer) | Hold feature-specific business logic |

Use cases **must** inject `AppLogger` (§6) and, when the action has observers, **must** emit a
typed domain event after persistence instead of calling the side-effect inline (§7).

---

## 5. Validation & DTOs

This project validates requests with **shared Zod schemas from `@repo/models`**, not
class-validator DTOs:

- Request bodies are validated in the controller via `new ZodValidationPipe(<schema>)`, e.g.
  `@Body(new ZodValidationPipe(registerSchema)) body: RegisterInput` in
  `AuthController.register`.
- `ZodValidationPipe` (`common/pipes/zod-validation.pipe.ts`) implements Nest's
  `PipeTransform`, calls `schema.safeParse(value)`, and throws `BadRequestException` with the
  Zod issues on failure.
- Types used across the controller/use-case boundary (`RegisterInput`, `Usuario`, …) are
  imported from `@repo/models` — the same package that defines the Zod schemas — so the API
  and the persistence layer share one source of truth for shape. See
  `.agents/ubiquitous-language.md` for the canonical entity/type mapping.
- Do **not** introduce class-validator DTO classes; extend or add schemas in `@repo/models`
  instead and derive the TypeScript type from the schema.

---

## 6. Logging — mandatory

Every use case **must** inject `AppLogger` and use leveled calls instead of `console.*`.
`AppLogger` is a `shared/logger/app.logger.ts` service (`@Injectable({ scope: Scope.TRANSIENT })`
subclass of Nest's `ConsoleLogger`), provided/exported by the `@Global()` `LoggerModule`
(`shared/logger/logger.module.ts`) so any feature module can inject it without re-importing
the module.

- Inject via the constructor, e.g.
  `constructor(@Inject(LISTA_USUARIOS) private readonly listaUsuarios: ListaUsuarios, private readonly logger: AppLogger) {}`.
- Set the logging **context** to the use case's class name in the constructor body:
  `this.logger.setContext(GetUserUseCase.name)`.
- Use leveled calls (`logger.debug(...)`, `logger.log(...)`, `logger.warn(...)`,
  `logger.error(...)`) instead of `console.*` anywhere in `application/`, `domain/`, or
  `infrastructure/` — `console.*` is also flagged by Biome's `suspicious.noConsole` (warn).
- `AppLogger` is transient-scoped, not singleton — this is required so one use case's
  `setContext(...)` never clobbers another's. Do not change it to default/singleton scope.
- Reference implementation: `shared/logger/app.logger.ts`, `shared/logger/logger.module.ts`,
  and every use case in `modules/users/application/use-cases/` (see §9).

## 7. Events — mandatory

A business action that has observers **must** publish a typed domain event after persistence
instead of calling the side-effect inline.

- Distinguish **domain events** (in-process, same transaction/request, e.g. "user created" used
  to trigger a welcome email) from **integration events** (cross-service, published after
  commit, e.g. to a message broker or outbox table).
- For domain events, use Nest's `EventEmitter2` (`@nestjs/event-emitter`, wired via
  `EventEmitterModule.forRoot()` in `AppModule`): a use case emits an event *after* the
  repository call succeeds (e.g. `this.eventEmitter.emit(USER_CREATED_EVENT, { user })` inside
  `RegisterUseCase.execute`, after `await this.listaUsuarios.agregarUsuario(...)` resolves),
  never before persistence.
- The event **name constant** and **payload interface** live in `domain/events/` (transport-
  agnostic — no `@nestjs/event-emitter` import there); the **listener** (the reaction) lives in
  `application/listeners/` as an `@OnEvent(...)` handler, registered as a provider in the
  feature module so Nest discovers it.
- For integration events that must survive process crashes, prefer an outbox table written in
  the same transaction as the persistence write, drained by a separate publisher — do not
  publish directly to an external broker from inside a use case.
- Reference implementation: `modules/users/domain/events/user-created.event.ts`,
  `modules/users/application/listeners/user-created.listener.ts`, and the emit call in
  `modules/auth/application/use-cases/register.use-case.ts` (see §9).

---

## 8. When to use this pattern

Use a dedicated use case when the action has any of:

- Branching business rules (more than a straight passthrough to the repository).
- Invariants to enforce (uniqueness, cross-field validation, state transitions).
- Multiple entry points that need the same logic (e.g. both an HTTP endpoint and a scheduled
  job triggering "create user").

For thin CRUD with no real logic beyond "validate and persist," a use case is still the
convention in this codebase (see `GetUserUseCase` and `ListUsersUseCase` — each is a
one-line passthrough to the `ListaUsuarios` port) — keep using one use case per action
rather than collapsing multiple actions into a shared "service" class, so the per-action
boundary stays consistent as logic grows.

---

## 9. Reference implementation (real code)

- `presentation/users.controller.ts` — `UsersController` injects `GetUserUseCase` and
  `ListUsersUseCase`; its two `@Get` handlers sit behind
  `@UseGuards(JwtAuthGuard, PermissionsGuard)` and each declares its `@RequiereAccion(...)`
  (`usuario.list`, `usuario.view`); `findOne` throws `NotFoundException` when
  `GetUserUseCase.execute` resolves `null`. A request body is validated in
  `AuthController.register` with `new ZodValidationPipe(registerSchema)` against the
  `@repo/models` `RegisterInput` type.
- `modules/auth/application/use-cases/register.use-case.ts` — `RegisterUseCase` receives
  `@Inject(LISTA_USUARIOS) private readonly listaUsuarios: ListaUsuarios`, `AppLogger`, and
  `EventEmitter2` (among its other collaborators); calls `this.listaUsuarios.agregarUsuario(...)`,
  then emits `USER_CREATED_EVENT` with `{ user }` **after** the repository call resolves, with
  `debug`/`log` calls around it.
- `domain/lista-usuarios.repository.ts` — exports `LISTA_USUARIOS` (a `Symbol`) and the
  `ListaUsuarios` interface (`agregarUsuario`, `buscarPorEmail`, `buscarPorId`, `listar`,
  `guardar`).
- `infrastructure/drizzle-lista-usuarios.repository.ts` — `DrizzleListaUsuarios implements
  ListaUsuarios`, injecting the Drizzle client via `@Inject(DRIZZLE)` and using
  `drizzle-orm`'s `eq` plus the `usuarios` schema table.
- `users.module.ts` — wires the port to its implementation with
  `{ provide: LISTA_USUARIOS, useClass: DrizzleListaUsuarios }` and registers
  `UserCreatedListener` as a provider.
- `shared/logger/app.logger.ts` — `AppLogger`, a `Scope.TRANSIENT` subclass of Nest's
  `ConsoleLogger`.
- `shared/logger/logger.module.ts` — `LoggerModule`, `@Global()`, provides/exports `AppLogger`.
- `modules/users/domain/events/user-created.event.ts` — `USER_CREATED_EVENT` name constant +
  `UserCreatedEvent` payload interface (`{ user: Usuario }`).
- `modules/users/application/listeners/user-created.listener.ts` — `UserCreatedListener`, an
  `@OnEvent(USER_CREATED_EVENT)` handler that logs via `AppLogger`.
- `app.module.ts` — imports `EventEmitterModule.forRoot()` and `LoggerModule` alongside the
  existing feature modules.
