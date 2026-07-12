import { ConsoleLogger, Injectable, Scope } from "@nestjs/common";

/**
 * Application logger. Transient-scoped so every injecting class receives its
 * own instance and can set its own context via `setContext(...)` without
 * clobbering another class's context. Extends Nest's `ConsoleLogger`, so it
 * exposes `log` / `error` / `warn` / `debug` / `verbose`.
 */
@Injectable({ scope: Scope.TRANSIENT })
export class AppLogger extends ConsoleLogger {}
