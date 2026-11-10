# Patrones de diseño en JobBranch

Catálogo de los patrones de diseño que usa el código de JobBranch: **qué** patrón es, **dónde** está
y **cómo** está implementado, con el fragmento de código real detrás de cada punto.

- **Fuente:** commit `e5a0c23` de `main`. Cada fragmento está copiado de ese commit, con su ruta y
  su rango de líneas encima, así que cualquier referencia se puede comprobar en el editor.
- **Alcance:** los tres paquetes que tienen código propio — `apps/api` (NestJS), `apps/web`
  (Next.js) y `packages/models` (esquemas Zod compartidos).
- **Nombres:** el ámbito de seguridad e identidad usa literalmente los nombres en español de la
  especificación académica (`ComponentePermiso`, `Sesion`, `ListaUsuarios`, …, ADR-0023); el resto
  del dominio usa identificadores en inglés. Los comentarios del código están en inglés y se citan
  tal cual.
- **Documentos relacionados:** los dos patrones obligatorios (Composite y Factory) se explican en
  profundidad, con diagramas y pruebas, en [`DOCUMENTACION.md`](./DOCUMENTACION.md) §3–§6. El
  detalle del módulo de seguridad está en
  [`security-module-implementation.es.md`](./security-module-implementation.es.md). Este documento
  es el mapa de **todos** los patrones del proyecto; para esos dos solo resume y remite.

## Contenido

1. [Mapa general](#1-mapa-general)
2. [Patrones GoF](#2-patrones-gof)
3. [Patrones de arquitectura y de aplicación (`apps/api`)](#3-patrones-de-arquitectura-y-de-aplicación-appsapi)
4. [Patrones del frontend (`apps/web`)](#4-patrones-del-frontend-appsweb)
5. [Patrones del contrato compartido (`packages/models`)](#5-patrones-del-contrato-compartido-packagesmodels)
6. [Observaciones](#6-observaciones)

---

## 1. Mapa general

| Patrón | Tipo | Dónde | Para qué |
|--------|------|-------|----------|
| **Composite** *(obligatorio)* | GoF estructural | `modules/security/domain/` — `ComponentePermiso`, `GrupoPermisos`, `Accion` | Árbol de permisos: un grupo concede lo que conceda alguno de sus hijos |
| **Abstract Factory** *(obligatorio)* | GoF creacional | `modules/security/application/factories/matriz-permisos.factory.ts` | Una fábrica por rol que define, siembra y entrega las raíces de permisos por defecto |
| **Template Method** | GoF comportamiento | `MatrizPermisosFactoryBase` | El algoritmo común de las fábricas es fijo; cada rol solo define sus raíces |
| **Observer** (publicación/suscripción) | GoF comportamiento | `domain/events/` + `application/listeners/`, `EventEmitter2` | Efectos secundarios desacoplados del caso de uso que los provoca |
| **Adapter** | GoF estructural | Repositorios Drizzle, `PasswordService`, `ZodValidationPipe`, `api.utility.ts` | Adaptar una librería externa a la interfaz que espera el dominio o el framework |
| **Strategy** | GoF comportamiento | `Usuario.autenticar(password, hasher)`, `new ZodValidationPipe(schema)` | El algoritmo (hash, esquema de validación) se inyecta en lugar de fijarse |
| **Chain of Responsibility** | GoF comportamiento | `@UseGuards(JwtAuthGuard, PermissionsGuard)`, interceptores de axios | Cada eslabón decide si la petición sigue o se corta |
| **Singleton** (vía DI) | GoF creacional | Proveedores de Nest, `ContextosSesionStore`, `DRIZZLE`, `query-client-ref.ts` | Una única instancia compartida, gestionada por el contenedor |
| **Facade** | GoF estructural | `apps/web/utilities/api.utility.ts`, `services/*.service.ts` | Una interfaz simple y uniforme sobre axios y sobre cada recurso de la API |
| **Arquitectura hexagonal** (puertos y adaptadores) | Arquitectura | `modules/*/{presentation,application,domain,infrastructure}` | El dominio no conoce ni HTTP ni la base de datos |
| **Caso de uso** (comando) | Aplicación | `application/use-cases/*.use-case.ts` | Una clase por acción de negocio, con un único `execute()` |
| **Repository** | Aplicación (Fowler) | `domain/*.repository.ts` + `infrastructure/drizzle-*.repository.ts` | La persistencia detrás de una interfaz del dominio |
| **Inyección de dependencias** | Arquitectura | Tokens `Symbol`, `useClass`, `useFactory` en cada `*.module.ts` | Los casos de uso dependen de abstracciones; el módulo decide la implementación |
| **Data Mapper** | Aplicación (Fowler) | `toDomain` / `toRow` en los repositorios | Traducir filas de la base a objetos del dominio y viceversa |
| **Unidad de trabajo** (transacción) | Aplicación (Fowler) | `db.transaction(...)` en los repositorios | Escrituras de varias filas que se confirman o revierten juntas |
| **Errores de dominio traducidos en el borde** | Aplicación | `domain/errors/` + controladores (`aHttp`) | El dominio lanza errores propios; solo el controlador sabe de códigos HTTP |
| **Anotaciones declarativas + guard** | Framework | `@RequiereAccion`, `PermissionsGuard` | Cada endpoint declara la `Accion` que exige; un guard la verifica |
| **Objeto de contexto** | Aplicación | `ContextoSeguridad`, `ContextosSesionStore` | Los permisos se resuelven una vez por `Sesion` y viajan con la petición |
| **Modelo de lectura separado** | Aplicación (CQRS ligero) | `modules/analytics/` | Las métricas se calculan con un repositorio propio de solo lectura y funciones puras |
| **Test de arquitectura** | Calidad | `common/guards/endpoint-permissions.audit.spec.ts` | El build falla si un endpoint no declara su `Accion` |
| **Capas hook → service → api** | Frontend | `apps/web/hooks`, `services`, `utilities` | Separar estado de servidor, acceso a la API y transporte HTTP |
| **Result (Either)** | Frontend | `apps/web/models/result.model.ts` | Los errores HTTP se devuelven como valor, nunca se lanzan |
| **Contenedor / presentación** | Frontend | `features/*/…-view.tsx` | Un componente carga y resuelve estados; otro solo pinta |
| **Componentes guard** (envoltorios) | Frontend | `AuthGuard`, `RoutePermissionGuard` | Envolver una rama del árbol de React con una condición de acceso |
| **Configuración dirigida por tablas** | Frontend / backend | `permissions.config.ts`, `catalogo-matriz.ts` | Reglas como datos declarativos en vez de condicionales repartidos |
| **Invalidación centralizada de caché** | Frontend | `query/branch-dependent-keys.ts` | Una mutación invalida todas las consultas que dependen de ella |
| **Esquema compartido** (Shared Kernel) | Contrato | `packages/models` | Una única definición Zod para API, base de datos y web |
| **Unión discriminada** | Contrato | `persona.schema.ts` | Los subtipos de `Persona` se distinguen por `tipo` con tipado exhaustivo |

---

## 2. Patrones GoF

### 2.1 Composite (estructural) — obligatorio

**Qué es.** Compone objetos en estructuras de árbol y permite tratar igual a una hoja y a un grupo
de hojas.

**Dónde.** `apps/api/src/modules/security/domain/`:

| Rol del patrón | Clase |
|----------------|-------|
| Componente | `ComponentePermiso` (abstracta) |
| Compuesto | `GrupoPermisos` |
| Hoja | `Accion` |
| Cliente | `ContextoSeguridad`, `ResolverPermisosUseCase` |

**Cómo.** El componente declara la operación común (`evaluar`) y también las operaciones de gestión
de hijos (`agregar`, `remover`), que por defecto fallan. Es la variante **transparente** del
Composite: el cliente nunca necesita preguntar si tiene una hoja o un grupo.

`apps/api/src/modules/security/domain/componente-permiso.ts:2-19`

```ts
export abstract class ComponentePermiso {
  constructor(
    public readonly id: string,
    public readonly nombre: string,
  ) {}

  abstract evaluar(codigoAccion: string): boolean;

  abstract obtenerHijos(): ComponentePermiso[];

  agregar(_hijo: ComponentePermiso): void {
    throw new Error(`${this.nombre} no admite hijos`);
  }

  remover(_hijo: ComponentePermiso): void {
    throw new Error(`${this.nombre} no admite hijos`);
  }
}
```

El grupo evalúa recorriendo a sus hijos (un OR recursivo); la hoja compara su código:

`apps/api/src/modules/security/domain/grupo-permisos.ts:15-17`

```ts
  evaluar(codigoAccion: string): boolean {
    return this.hijos.some((hijo) => hijo.evaluar(codigoAccion));
  }
```

`apps/api/src/modules/security/domain/accion.ts:14-16`

```ts
  evaluar(codigoAccion: string): boolean {
    return codigoAccion === this.codigoAccion;
  }
```

El cliente principal solo conoce el componente raíz:

`apps/api/src/modules/security/domain/contexto-seguridad.ts:15-17`

```ts
  tienePermiso(codigoAccion: string): boolean {
    return this.root.evaluar(codigoAccion);
  }
```

Una `Persona` puede tener varias raíces (invariante 12), pero `ContextoSeguridad` recibe un único
componente. La solución usa el propio patrón: las raíces se agrupan en un `GrupoPermisos`
transitorio, que nunca se persiste.

`apps/api/src/modules/security/application/use-cases/resolver-permisos.use-case.ts:35-42`

```ts
    const raices = await this.componenteRepository.findArbolByPersona(persona.id);
    const arbol = new GrupoPermisos(`persona:${persona.id}`, "Raíces de la Persona");

    for (const raiz of raices) {
      arbol.agregar(raiz);
    }

    return arbol;
```

> Persistencia del árbol (tabla `componentes` con `padre_id`), el árbol de ejemplo del
> `postulante` y la administración de la matriz: `DOCUMENTACION.md` §3.

### 2.2 Abstract Factory (creacional) — obligatorio

**Qué es.** Una interfaz para crear familias de objetos relacionados sin nombrar sus clases
concretas.

**Dónde.** `apps/api/src/modules/security/application/factories/matriz-permisos.factory.ts`.
Hay una fábrica concreta por rol: `PostulanteMatrizFactory`, `RecruiterMatrizFactory` y
`AdministradorMatrizFactory`. El producto de cada una es el conjunto de árboles de permisos por
defecto de ese rol.

**Cómo.** La interfaz abstracta:

`matriz-permisos.factory.ts:15-25`

```ts
export interface MatrizPermisosFactory {
  readonly tipo: PersonaTipo;
  /** The role's default roots: ids of shared default groups. */
  raicesPorDefecto(): readonly string[];
  /** In-memory build of the role's default trees (documents and tests the role's grants; never persisted from here). */
  crear(): ComponentePermiso[];
  /** Seeds this role's shared default groups (and their subgroups) when missing. */
  sembrar(): Promise<void>;
  /** Hands an existing Persona this role's default roots; ignores the ones it already holds. */
  otorgarRaices(personaId: string): Promise<void>;
}
```

Las tres fábricas se registran en un mapa indexado por rol, de modo que el cliente elige la fábrica
con `factories[rol]` en lugar de un `switch`:

`matriz-permisos.factory.ts:92-98`

```ts
export function crearFactories(repository: ComponentePermisoRepository): MatrizPermisosFactories {
  return {
    postulante: new PostulanteMatrizFactory(repository),
    recruiter: new RecruiterMatrizFactory(repository),
    administrador: new AdministradorMatrizFactory(repository),
  };
}
```

El contenedor de Nest construye ese mapa con `useFactory` y lo publica bajo un token
(`security.module.ts:42`); el registro lo usa para dar a la nueva `Persona` las raíces de su rol:

`apps/api/src/modules/auth/application/use-cases/register.use-case.ts:49`

```ts
    const raices = this.factories[input.role].raicesPorDefecto();
```

Las mismas fábricas se usan fuera de Nest: el script de semilla las construye a mano
(`database/seed.ts:430`), por eso son clases planas y no `@Injectable` (comentario en la línea 29).

> Los otros clientes (`SincronizarMatrizUseCase`, la semilla) y el flujo de extremo a extremo:
> `DOCUMENTACION.md` §4–§5.

### 2.3 Template Method (comportamiento)

**Qué es.** Una clase base fija el esqueleto de un algoritmo y deja que las subclases redefinan
solo algunos pasos.

**Dónde.** `MatrizPermisosFactoryBase`, la clase abstracta de la que heredan las tres fábricas de
§2.2.

**Cómo.** `crear()`, `sembrar()` y `otorgarRaices()` están implementados una sola vez en la base y
todos llaman al paso abstracto `raicesPorDefecto()`, que es lo único que cambia de un rol a otro:

`matriz-permisos.factory.ts:30-49`

```ts
abstract class MatrizPermisosFactoryBase implements MatrizPermisosFactory {
  abstract readonly tipo: PersonaTipo;

  constructor(private readonly repository: ComponentePermisoRepository) {}

  abstract raicesPorDefecto(): readonly string[];

  crear(): ComponentePermiso[] {
    return this.raicesPorDefecto().map((id) => this.construirGrupo(grupoPorId(id)));
  }

  async sembrar(): Promise<void> {
    const grupos = this.raicesPorDefecto().flatMap((id) => conDescendientes(grupoPorId(id)));

    await this.repository.asegurarGrupos(grupos);
  }

  async otorgarRaices(personaId: string): Promise<void> {
    await this.repository.asignarRaices(personaId, this.raicesPorDefecto());
  }
```

Cada subclase concreta solo completa ese hueco:

`matriz-permisos.factory.ts:84-90`

```ts
export class AdministradorMatrizFactory extends MatrizPermisosFactoryBase {
  readonly tipo = "administrador";

  raicesPorDefecto(): readonly string[] {
    return [GRUPOS.CUENTA.id, GRUPOS.ADMIN_PERMISOS.id, GRUPOS.ADMIN_USUARIOS.id];
  }
}
```

Agregar un rol nuevo exige escribir una clase de cinco líneas; el algoritmo de siembra y asignación
no se toca.

### 2.4 Observer / publicación-suscripción (comportamiento)

**Qué es.** Un sujeto notifica a sus observadores cuando ocurre algo, sin conocerlos.

**Dónde.** Los eventos de dominio en proceso, sobre `EventEmitter2` (`@nestjs/event-emitter`,
habilitado en `app.module.ts:20`):

| Evento | Lo emite | Lo escucha |
|--------|----------|------------|
| `user.created` | `RegisterUseCase` | `UserCreatedListener` |
| `hito.created` | `AddHitoUseCase` | `HitoCreatedListener` |
| `branch.archived` | `ArchiveBranchUseCase` | `BranchArchivedListener` |

**Cómo.** El nombre y la carga útil del evento viven en `domain/events/`, sin ninguna dependencia
del framework:

`apps/api/src/modules/users/domain/events/user-created.event.ts:4-9`

```ts
export const USER_CREATED_EVENT = "user.created";

/** Payload published with {@link USER_CREATED_EVENT}. */
export interface UserCreatedEvent {
  user: Usuario;
}
```

El caso de uso publica **después** de persistir, nunca antes:

`apps/api/src/modules/branches/application/use-cases/archive-branch.use-case.ts:20-25`

```ts
    const branch = await this.branchRepository.archive(id, userId);

    if (branch) {
      // Emit AFTER persistence succeeds — never before (see §7).
      this.eventEmitter.emit(BRANCH_ARCHIVED_EVENT, { branch });
      this.logger.log(`Branch archived id=${branch.id}`);
```

El observador se suscribe por anotación y se registra como proveedor del módulo
(`branches.module.ts:25-26`):

`apps/api/src/modules/branches/application/listeners/branch-archived.listener.ts:12-16`

```ts
  @OnEvent(BRANCH_ARCHIVED_EVENT)
  handleBranchArchived(event: BranchArchivedEvent): void {
    // Hook for the analytics module to invalidate cached ROI stats — no-op/log for now.
    this.logger.log(`Handling branch.archived id=${event.branch.id}`);
  }
```

Hoy los tres observadores solo registran en el log: son el punto de enganche para efectos futuros
(correo de bienvenida, recordatorios, invalidar la caché de analítica) sin tocar los casos de uso.
La regla que lo hace obligatorio está en `apps/api/.agents/rules/use-case-based-architecture.md` §7.

### 2.5 Adapter (estructural)

**Qué es.** Convierte la interfaz de una clase en otra que el cliente espera.

**Dónde y cómo.** Aparece en cada frontera con una librería externa:

| Adaptador | Adapta | A la interfaz |
|-----------|--------|---------------|
| `DrizzleListaUsuarios`, `DrizzleBranchRepository`, … | Drizzle ORM / Postgres | El puerto del dominio (`ListaUsuarios`, `BranchRepository`, …) |
| `PasswordService` | `bcrypt` | `PasswordHasher` (puerto del dominio) |
| `ZodValidationPipe` | Un esquema Zod | `PipeTransform` de Nest |
| `api` (`apps/web/utilities/api.utility.ts`) | Las excepciones de axios | Un valor `TResult<T>` (§4.2) |

El ejemplo más pequeño: el dominio declara qué necesita para comparar contraseñas…

`apps/api/src/modules/users/domain/password-hasher.ts:2-5`

```ts
export interface PasswordHasher {
  hash(password: string): Promise<string>;
  compare(password: string, hash: string): Promise<boolean>;
}
```

…y la capa de aplicación adapta `bcrypt` a esa interfaz:

`apps/api/src/modules/auth/application/password.service.ts:7-16`

```ts
@Injectable()
export class PasswordService implements PasswordHasher {
  hash(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
```

`ZodValidationPipe` adapta la API de Zod (`safeParse`) al contrato de pipes de Nest y traduce el
fallo a un `400`:

`apps/api/src/common/pipes/zod-validation.pipe.ts:4-16`

```ts
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodType) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      throw new BadRequestException(result.error.issues);
    }

    return result.data;
  }
}
```

Los repositorios Drizzle son el caso general de este patrón y se ven en §3.1 y §3.3.

### 2.6 Strategy (comportamiento)

**Qué es.** Encapsula un algoritmo intercambiable y lo entrega al objeto que lo usa.

**Dónde y cómo.** Dos usos concretos:

1. **El algoritmo de hash, como argumento.** `Usuario.autenticar` no sabe cómo se comparan
   contraseñas: recibe la estrategia en la llamada. El dominio queda libre de `bcrypt` y un test
   puede pasar un `PasswordHasher` falso.

   `apps/api/src/modules/users/domain/usuario.ts:20-26`

   ```ts
     async autenticar(password: string, hasher: PasswordHasher): Promise<boolean> {
       if (!this.passwordHash) {
         return false;
       }

       return hasher.compare(password, this.passwordHash);
     }
   ```

2. **La regla de validación, en el constructor.** Un único `ZodValidationPipe` sirve a todos los
   endpoints; lo que cambia es el esquema que recibe:

   `apps/api/src/modules/auth/presentation/auth.controller.ts:26` y `:32`

   ```ts
     register(@Body(new ZodValidationPipe(registerSchema)) body: RegisterInput): Promise<AuthResponse> {
   // …
     login(@Body(new ZodValidationPipe(loginSchema)) body: LoginInput): Promise<AuthResponse> {
   ```

### 2.7 Chain of Responsibility (comportamiento)

**Qué es.** La petición recorre una cadena de manejadores; cada uno decide si la procesa, la deja
pasar o la corta.

**Dónde.**

- **Backend:** la cadena de guards de Nest. Un controlador protegido declara
  `@UseGuards(JwtAuthGuard, PermissionsGuard)`, y Nest los ejecuta en ese orden.
- **Frontend:** los interceptores de petición y de respuesta de axios (§4.3).

**Cómo.** En el backend, cada eslabón tiene una única responsabilidad y puede cortar la cadena con
una excepción:

`apps/api/src/modules/branches/presentation/branches.controller.ts:27-28`

```ts
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("branches")
```

1. `JwtAuthGuard` (`shared/auth/jwt-auth.guard.ts:21-48`) — corta con `401` si falta el token, si
   es inválido o si no nombra una `Sesion` vigente. Si pasa, deja en la petición `user`,
   `sesionId` y `contextoSeguridad` para el siguiente eslabón.
2. `PermissionsGuard` (`common/guards/permissions.guard.ts:11-30`) — corta con `403` si el
   `ContextoSeguridad` no concede la `Accion` que exige el endpoint.
3. `ZodValidationPipe` — corta con `400` si el cuerpo no cumple el esquema.
4. El controlador, que delega en un único caso de uso.

El orden importa: `PermissionsGuard` lee lo que dejó `JwtAuthGuard`, y si se ejecutara sin él,
deniega en lugar de permitir (`permissions.guard.ts:20-23`).

### 2.8 Singleton (creacional), gestionado por el contenedor

**Qué es.** Garantiza una única instancia de una clase y un punto de acceso global a ella.

**Dónde y cómo.** El proyecto no escribe singletons a mano: el contenedor de inyección de Nest crea
cada proveedor **una sola vez** por defecto y la reparte a todos los que la piden. Esto se usa a
propósito donde la instancia guarda estado compartido:

- `ContextosSesionStore` (`modules/auth/application/contextos-sesion.store.ts`) guarda en un `Map`
  el `ContextoSeguridad` de cada `Sesion` viva. `IniciarSesionUseCase` escribe y
  `ValidarSesionUseCase` lee **la misma** instancia; con dos instancias, una sesión recién iniciada
  no tendría contexto en la siguiente petición.
- `DRIZZLE` (`database/database.module.ts:14-26`) — el pool de conexiones a Postgres se crea una vez
  con `useFactory` y se comparte entre todos los repositorios.

El contraejemplo explícito es el logger, que se declara **transitorio** para que cada clase tenga
su propia instancia y su propio contexto:

`apps/api/src/shared/logger/app.logger.ts:9-10`

```ts
@Injectable({ scope: Scope.TRANSIENT })
export class AppLogger extends ConsoleLogger {}
```

En la web, `apps/web/query/query-client-ref.ts` guarda en una variable de módulo la única instancia
de `QueryClient` (creada una vez en `app/providers.tsx:10-14`) para que el interceptor de axios
pueda vaciar la sesión cacheada ante un `401`, fuera del árbol de React.

### 2.9 Facade (estructural)

**Qué es.** Una interfaz simple que oculta la complejidad de un subsistema.

**Dónde.** `apps/web/utilities/api.utility.ts` (sobre axios) y los servicios por recurso de
`apps/web/services/` (sobre la API REST).

**Cómo.** `api` expone cinco métodos con la misma firma que nunca lanzan excepciones: siempre
devuelven un `TResult<T>`. La elección del método de axios, la forma de pasar cuerpo y parámetros y
la conversión del error quedan escondidas en `apiRequest`:

`apps/web/utilities/api.utility.ts:32-39`

```ts
export const api = {
  get: async <R>(url: string, params?: object, signal?: AbortSignal): Promise<TResult<R>> => {
    return apiRequest<R>("get", url, undefined, params, signal);
  },

  post: async <T, R>(url: string, data: T, params?: object, signal?: AbortSignal): Promise<TResult<R>> => {
    return apiRequest<R>("post", url, data, params, signal);
  },
```

Encima, cada servicio es una fachada de un recurso: el resto de la web nunca escribe una URL.

`apps/web/services/applications.service.ts:4-7`

```ts
export const applications_service = {
  list: (signal?: AbortSignal): Promise<TResult<Application[]>> => api.get<Application[]>("/branches", undefined, signal),

  getById: (id: string, signal?: AbortSignal): Promise<TResult<Application>> => api.get<Application>(`/branches/${id}`, undefined, signal),
```

---

## 3. Patrones de arquitectura y de aplicación (`apps/api`)

### 3.1 Arquitectura hexagonal (puertos y adaptadores)

**Qué es.** El núcleo de negocio define **puertos** (interfaces) y el mundo exterior se conecta a
través de **adaptadores**; las dependencias apuntan siempre hacia el núcleo.

**Dónde.** Cada módulo de `apps/api/src/modules/` se divide en cuatro carpetas:

```
presentation/        Controlador HTTP: valida, llama a UN caso de uso, mapea errores a HTTP
      │
      ▼
application/         Casos de uso (y listeners, fábricas): la lógica y la orquestación
      │
      ▼
domain/              Entidades, reglas puras, eventos, errores y los PUERTOS (interfaces)
      ▲
      ┆ implementa
infrastructure/      Adaptadores Drizzle que implementan los puertos
```

**Cómo.** Un caso de uso nunca importa de `infrastructure/` ni de `presentation/`: pide el puerto
por su token y el módulo decide qué adaptador se conecta (§3.4). Un módulo omite las capas que no
necesita: `health/` es solo controlador y módulo. La regla completa está en
`apps/api/.agents/rules/use-case-based-architecture.md`.

### 3.2 Caso de uso (una clase por acción)

**Qué es.** Cada acción de negocio es un objeto con una única operación `execute()`, en la línea
del patrón Command: la acción tiene nombre propio, se prueba sola y se reutiliza desde varios
puntos de entrada.

**Dónde.** `application/use-cases/*.use-case.ts` en todos los módulos (`AddHitoUseCase`,
`RegisterUseCase`, `CrearGrupoUseCase`, …).

**Cómo.** `AddHitoUseCase` muestra la forma completa: depende de un puerto, aplica la regla de
negocio (invariante 9), persiste y luego publica el evento:

`apps/api/src/modules/branches/application/use-cases/add-hito.use-case.ts:20-49`

```ts
  async execute(branchId: string, userId: string, input: CreateHitoInput): Promise<Application | null> {
    const branch = await this.branchRepository.findById(branchId, userId);

    if (!branch) {
      return null;
    }

    this.assertValidTransition(branch.status, input.status);

    const daysInStage = input.daysInStage ?? this.daysSinceLastHito(branch, input.date);
    const result = await this.branchRepository.addHito(branchId, userId, { ...input, daysInStage });

    if (result) {
      // Emit AFTER persistence succeeds — never before (see §7).
      this.eventEmitter.emit(HITO_CREATED_EVENT, { branchId, hito: result.hito });
      this.logger.log(`Hito added branchId=${branchId} status=${input.status}`);
    }

    return result ? result.application : null;
  }

  private assertValidTransition(currentStatus: ApplicationStatus, nextStatus: ApplicationStatus): void {
    if (TERMINAL_STATUSES.includes(currentStatus)) {
      throw new InvalidStatusTransitionError(currentStatus, nextStatus);
    }

    if (nextStatus === "Archivado") {
      throw new InvalidStatusTransitionError(currentStatus, nextStatus);
    }
  }
```

Los casos de uso también se componen entre sí: `RegisterUseCase` delega en `CreatePersonaUseCase`
y en `IniciarSesionUseCase` (`register.use-case.ts:19-21`).

### 3.3 Repository

**Qué es.** Una abstracción con forma de colección sobre la persistencia: el dominio pide y guarda
objetos sin saber de SQL.

**Dónde.** Un puerto por agregado en `domain/` (`BranchRepository`, `CvVersionRepository`,
`SesionRepository`, `ComponentePermisoRepository`, `PersonaRepository`, `FollowupRepository`,
`AnalyticsReadRepository`) y su implementación `Drizzle*` en `infrastructure/`.

**Cómo.** El puerto exporta la interfaz **y** el token de inyección. En el ámbito de identidad el
puerto conserva el nombre de la especificación, `ListaUsuarios`, porque allí es un «Catálogo»: toda
consulta sobre usuarios pasa por él, nunca por un `Usuario` suelto.

`apps/api/src/modules/users/domain/lista-usuarios.repository.ts:3-19`

```ts
export const LISTA_USUARIOS = Symbol("LISTA_USUARIOS");

export interface NuevoUsuario {
  email: string;
  nombreCompleto: string;
  passwordHash: string | null;
}

/** SPEC 19.13 «Catálogo» of Usuarios: a query about users goes to the catalog, never to a single Usuario. */
export interface ListaUsuarios {
  agregarUsuario(nuevo: NuevoUsuario): Promise<Usuario>;
  buscarPorEmail(email: string): Promise<Usuario | null>;
  buscarPorId(id: string): Promise<Usuario | null>;
  listar(): Promise<Usuario[]>;
  /** Persists the mutable state of a Usuario (`nombreCompleto`, `intentosFallidos`). */
  guardar(usuario: Usuario): Promise<void>;
}
```

### 3.4 Inyección de dependencias / inversión de control

**Qué es.** Un objeto no crea a sus colaboradores: los recibe. El contenedor decide qué
implementación concreta se entrega.

**Dónde.** En cada `*.module.ts`. Se usan tres formas de proveedor:

| Forma | Ejemplo | Uso |
|-------|---------|-----|
| Clase directa | `providers: [GetUserUseCase, …]` | Casos de uso, guards, listeners |
| `useClass` con token | `{ provide: LISTA_USUARIOS, useClass: DrizzleListaUsuarios }` (`users.module.ts:11`) | Conectar un puerto con su adaptador |
| `useFactory` con token | `{ provide: MATRIZ_PERMISOS_FACTORIES, inject: [COMPONENTE_PERMISO_REPOSITORY], useFactory: crearFactories }` (`security.module.ts:42`) | Construir objetos que no son `@Injectable` (las fábricas, el pool `DRIZZLE`) |

**Cómo.** Los tokens son `Symbol` (no cadenas) para que no puedan colisionar. El caso de uso pide
el puerto por su token y nunca nombra la clase Drizzle:

`apps/api/src/modules/auth/application/use-cases/register.use-case.ts:14-22`

```ts
  constructor(
    @Inject(LISTA_USUARIOS) private readonly listaUsuarios: ListaUsuarios,
    private readonly passwordService: PasswordService,
    private readonly logger: AppLogger,
    private readonly eventEmitter: EventEmitter2,
    private readonly createPersonaUseCase: CreatePersonaUseCase,
    @Inject(MATRIZ_PERMISOS_FACTORIES) private readonly factories: MatrizPermisosFactories,
    private readonly iniciarSesionUseCase: IniciarSesionUseCase,
  ) {
```

Esto es lo que permite los tests unitarios sin base de datos: el test construye el caso de uso con
dobles (`apps/api/test/setup/doubles.ts`) en lugar de los repositorios reales. Los módulos
`@Global()` (`LoggerModule`, `DatabaseModule`, `SecurityModule`) exponen sus proveedores a toda la
aplicación sin que cada módulo los importe.

### 3.5 Data Mapper

**Qué es.** Una capa que traslada datos entre los objetos del dominio y la base de datos,
manteniéndolos independientes entre sí.

**Dónde.** Las funciones `toDomain` / `toRow` de los repositorios de `infrastructure/`.

**Cómo.** La fila de Drizzle no sale del repositorio; lo que sale es la entidad de dominio. Así
`passwordHash` queda encapsulado como campo privado de `Usuario` y nunca llega a un tipo de
`@repo/models` (invariante 3):

`apps/api/src/modules/users/infrastructure/drizzle-lista-usuarios.repository.ts:10-14`

```ts
type UsuarioRow = typeof usuarios.$inferSelect;

function toDomain(row: UsuarioRow, tipo: PersonaTipo | null): Usuario {
  return new Usuario(row.id, row.email, row.nombreCompleto, row.passwordHash, row.authProvider, row.intentosFallidos, tipo ?? null);
}
```

El repositorio de `Persona` mapea en las dos direcciones una tabla única con discriminante
(`personas.tipo`) a la unión discriminada de §5.2: `toRow` (`drizzle-persona.repository.ts:27-46`)
rellena solo las columnas del subtipo, y `toDomain` (`:62-79`) reconstruye el subtipo correcto con
un `switch` exhaustivo sobre `tipo`.

### 3.6 Unidad de trabajo (transacciones)

**Qué es.** Agrupar varias escrituras para que se confirmen o se reviertan juntas.

**Dónde.** `db.transaction(...)` en los repositorios cuya operación toca varias filas:
`DrizzlePersonaRepository.create`, `DrizzleBranchRepository.create` / `clone` / …,
`DrizzleComponentePermisoRepository.reemplazarHijos` / `eliminarGrupo` y la carga de la semilla.

**Cómo.** Una `Persona` nunca puede existir sin raíces de permisos (invariante 12). La inserción de
la `Persona` y la de sus raíces se escriben como una función que recibe el cliente…

`apps/api/src/modules/persona/infrastructure/drizzle-persona.repository.ts:15-25`

```ts
export async function insertarPersonaConRaices(db: Pick<Database, "insert">, input: CreatePersonaInput, raices: readonly string[]): Promise<PersonaRow> {
  const [row] = await db.insert(personas).values(toRow(input)).returning();

  if (!row) {
    throw new Error("Failed to create persona");
  }

  await db.insert(personaComponentes).values(raices.map((componenteId) => ({ personaId: row.id, componenteId })));

  return row;
}
```

…y el repositorio la ejecuta dentro de una transacción. Si falla la asignación de raíces, no queda
ninguna `Persona` huérfana:

`drizzle-persona.repository.ts:52-54`

```ts
  async create(input: CreatePersonaInput, raices: readonly string[]): Promise<Persona> {
    return this.db.transaction(async (tx) => this.toDomain(await insertarPersonaConRaices(tx, input, raices)));
  }
```

Como la función recibe el cliente por parámetro, la semilla la reutiliza dentro de su propia
transacción. El repositorio de ramas generaliza la idea con un tipo que aceptan tanto `this.db`
como el `tx` de una transacción (`drizzle-branch.repository.ts:13-14`), para que sus helpers
(`loadById`, `findOrCreateEmpresa`, …) funcionen igual dentro y fuera de ella.

### 3.7 Errores de dominio traducidos en el borde

**Qué es.** El dominio y los casos de uso lanzan errores con significado de negocio; solo la capa
de presentación los convierte en respuestas HTTP.

**Dónde.** `domain/errors/` de `branches`, `persona` y `security`; la traducción en los
controladores.

**Cómo.** El error no sabe nada de HTTP:

`apps/api/src/modules/branches/domain/errors/invalid-status-transition.error.ts:4-9`

```ts
export class InvalidStatusTransitionError extends Error {
  constructor(from: ApplicationStatus, to: ApplicationStatus) {
    super(`Cannot move branch from "${from}" to "${to}"`);
    this.name = "InvalidStatusTransitionError";
  }
}
```

Cuando un controlador tiene muchos errores que traducir, la traducción se centraliza en una sola
función, que cada handler invoca desde su `catch`:

`apps/api/src/modules/security/presentation/administracion-matriz.controller.ts:36-50`

```ts
function aHttp(error: unknown): never {
  if (error instanceof ComponenteNoEncontradoError || error instanceof PersonaNoEncontradaError || error instanceof RaizNoAsignadaError) {
    throw new NotFoundException(error.message);
  }

  if (error instanceof NoEsGrupoError || error instanceof CicloEnMatrizError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof UltimaRaizError || error instanceof GrupoEnUsoComoRaizError) {
    throw new ConflictException(error.message);
  }

  throw error;
}
```

El tipo de retorno `never` deja claro que la función siempre lanza: o el error traducido, o el
original si no lo reconoce.

### 3.8 Anotaciones declarativas + guard

**Qué es.** El endpoint **declara** qué necesita mediante metadatos y un componente genérico lo
hace cumplir. No es el patrón Decorator de GoF (no envuelve objetos): los decoradores de
TypeScript se usan aquí como **anotaciones**.

**Dónde.** `common/decorators/requiere-accion.decorator.ts`, `common/guards/permissions.guard.ts` y
cada controlador protegido.

**Cómo.** El decorador solo adjunta un metadato al método:

`apps/api/src/common/decorators/requiere-accion.decorator.ts:3-5`

```ts
export const REQUIERE_ACCION_KEY = "requiereAccion";

export const RequiereAccion = (codigoAccion: string) => SetMetadata(REQUIERE_ACCION_KEY, codigoAccion);
```

El endpoint declara su `Accion` en una línea:

`apps/api/src/modules/branches/presentation/branches.controller.ts:40-44`

```ts
  @Get()
  @RequiereAccion("branch.list")
  findAll(@CurrentUser() user: JwtPayload, @Query("archived") archived?: string) {
    return this.listBranchesUseCase.execute(user.sub, parseArchived(archived));
  }
```

Y el guard lee ese metadato por reflexión y lo compara con el árbol de permisos:

`apps/api/src/common/guards/permissions.guard.ts:11-29`

```ts
  canActivate(context: ExecutionContext): boolean {
    const codigoAccion = this.reflector.getAllAndOverride<string | undefined>(REQUIERE_ACCION_KEY, [context.getHandler(), context.getClass()]);

    if (!codigoAccion) {
      return true;
    }

    const { contextoSeguridad } = context.switchToHttp().getRequest<AuthorizedRequest>();

    // Only reachable when PermissionsGuard runs without JwtAuthGuard before it, a programming error: deny.
    if (!contextoSeguridad) {
      throw new ForbiddenException("ContextoSeguridad missing — PermissionsGuard must run after JwtAuthGuard");
    }

    if (!contextoSeguridad.tienePermiso(codigoAccion)) {
      throw new ForbiddenException(`Missing permission: ${codigoAccion}`);
    }

    return true;
```

Los decoradores de parámetro `@CurrentUser()` (`shared/auth/current-user.decorator.ts`) y
`@ContextoActual()` (`common/decorators/contexto-actual.decorator.ts`) siguen la misma idea: el
handler declara qué dato quiere y no sabe de dónde sale.

### 3.9 Objeto de contexto

**Qué es.** Un objeto que reúne el estado de una interacción (aquí, la sesión del usuario) y lo
lleva a quien lo necesite, en lugar de recalcularlo en cada punto.

**Dónde.** `ContextoSeguridad` (`modules/security/domain/contexto-seguridad.ts`), creado por la
`Sesion` y guardado en `ContextosSesionStore`.

**Cómo.** Los permisos se resuelven **una sola vez**, al iniciar la `Sesion` (invariante 13). La
propia `Sesion` inicializa su contexto y se niega a hacerlo dos veces:

`apps/api/src/modules/auth/domain/sesion.ts:42-50`

```ts
  inicializarContextoSeguridad(raiz: ComponentePermiso): ContextoSeguridad {
    if (this.contexto) {
      throw new Error(`ContextoSeguridad already initialized sesionId=${this.id}`);
    }

    this.contexto = new ContextoSeguridad(raiz);

    return this.contexto;
  }
```

`IniciarSesionUseCase` lo guarda en el almacén en memoria, indexado por `sesionId`:

`apps/api/src/modules/auth/application/use-cases/iniciar-sesion.use-case.ts:34-39`

```ts
    const raiz = await this.resolverPermisosUseCase.execute(usuarioId);
    const fechaExpiracion = new Date(exp * 1000);
    const sesion = await this.sesiones.crear({ usuarioId, tokenJWT: hashToken(token), fechaEmision: new Date(), fechaExpiracion });
    const contexto = sesion.inicializarContextoSeguridad(raiz);

    this.contextos.guardar(sesion.id, contexto, fechaExpiracion);
```

En cada petición, `JwtAuthGuard` lo recupera y lo cuelga de la petición
(`jwt-auth.guard.ts:43-45`), donde lo leen `PermissionsGuard` y `@ContextoActual()`. Un cambio de
permisos aplica desde el siguiente login, no a mitad de una sesión.

### 3.10 Modelo de lectura separado (CQRS ligero)

**Qué es.** Separar el modelo con el que se **consulta** del modelo con el que se **escribe**.

**Dónde.** `apps/api/src/modules/analytics/`. El módulo no reutiliza el repositorio de ramas:
tiene su propio puerto de solo lectura, con filas aplanadas pensadas para calcular métricas.

**Cómo.** El puerto devuelve un modelo de lectura propio:

`apps/api/src/modules/analytics/domain/analytics-read.repository.ts:3-17`

```ts
export const ANALYTICS_READ_REPOSITORY = Symbol("ANALYTICS_READ_REPOSITORY");

export interface AnalyticsApplicationRow {
  id: string;
  cvVersionId: string;
  status: ApplicationStatus;
  techStack: string[];
  source: string | null;
  hitoStatuses: ApplicationStatus[];
}

export interface AnalyticsReadRepository {
  findApplicationsByUser(userId: string): Promise<AnalyticsApplicationRow[]>;
  findCvVersionIdsByUser(userId: string): Promise<string[]>;
}
```

Las métricas son **funciones puras** de plegado sobre esas filas, sin I/O, por lo que se prueban con
datos en memoria:

`apps/api/src/modules/analytics/application/analytics.folds.ts:23-31`

```ts
export function foldConversion(rows: AnalyticsApplicationRow[]): Conversion[] {
  const total = rows.length;

  return FUNNEL_STAGES.map((stage) => {
    const count = rows.filter((row) => reachedStages(row).has(stage)).length;

    return { stage, count, conversionRate: total === 0 ? 0 : count / total };
  });
}
```

Cada caso de uso de analítica queda en dos pasos — leer y plegar:

`apps/api/src/modules/analytics/application/use-cases/get-tech-heatmap.use-case.ts:16-21`

```ts
  async execute(userId: string): Promise<TechHeatmap[]> {
    this.logger.debug(`Computing tech heatmap for user=${userId}`);
    const rows = await this.analyticsReadRepository.findApplicationsByUser(userId);

    return foldTechHeatmap(rows);
  }
```

El módulo de seguimiento usa la misma separación entre cálculo puro y E/S:
`modules/followup/domain/followup.utils.ts` (`calculateDaysSince`, `calculateUrgency`).

### 3.11 Test de arquitectura

**Qué es.** Un test que no verifica un comportamiento sino una **regla de la arquitectura**, y
rompe el build cuando el código la viola.

**Dónde.** `apps/api/src/common/guards/endpoint-permissions.audit.spec.ts`.

**Cómo.** El test recorre todos los `*.controller.ts` de `src/modules` y, por reflexión sobre los
metadatos de Nest, comprueba que cada endpoint no público tenga `JwtAuthGuard` y luego
`PermissionsGuard`, y un `@RequiereAccion` con un código que exista en el catálogo; además, que
ningún código se repita entre dos endpoints y que cada `Accion` del catálogo la sirva exactamente un
endpoint (invariante 10). Las únicas excepciones están escritas en el propio test:

`endpoint-permissions.audit.spec.ts:11` y `:24-30`

```ts
const PUBLICOS = new Set(["AuthController.register", "AuthController.login", "HealthController.check"]);
// …
function archivosDeControladores(): string[] {
  return readdirSync(MODULES_DIR, { recursive: true, encoding: "utf8" })
    .filter((archivo) => archivo.endsWith(".controller.ts"))
    .map((archivo) => join(MODULES_DIR, archivo))
    .sort();
}
```

Como descubre los controladores por el sistema de archivos, un controlador nuevo queda auditado sin
tocar el test.

---

## 4. Patrones del frontend (`apps/web`)

### 4.1 Capas hook → service → utilidad api

**Qué es.** Cada capa tiene una sola responsabilidad y solo conoce a la de abajo.

```
Vista (features/*)  ─►  Hook (hooks/use-*.ts)  ─►  Service (services/*.service.ts)  ─►  api.utility  ─►  axios
   pinta                 estado de servidor          URL y tipos del recurso             TResult          HTTP
                         (TanStack Query)
```

**Dónde y cómo.** El hook solo conecta TanStack Query con el servicio; la clave de caché y la
cancelación (`signal`) se resuelven aquí:

`apps/web/hooks/use-applications.ts:4-8`

```ts
export const useApplications = () =>
  useQuery({
    queryKey: ["applications"],
    queryFn: ({ signal }) => applications_service.list(signal),
  });
```

El servicio es la fachada del recurso (§2.9) y la utilidad `api` es la fachada sobre axios. La web
nunca accede a la base de datos ni define rutas de API propias
(`apps/web/.agents/rules/nextjs-api-workflow.md`).

### 4.2 Result (Either) en lugar de excepciones

**Qué es.** Una operación que puede fallar devuelve un valor que es **o** un éxito **o** un error,
y el tipo obliga a quien la llama a mirar cuál es.

**Dónde.** `apps/web/models/result.model.ts`, producido por `api.utility.ts`.

**Cómo.** Una unión discriminada por `type`:

`apps/web/models/result.model.ts:3-20`

```ts
export enum EResult {
  ERROR = "error",
  SUCCESS = "success",
}

export interface Err {
  type: EResult.ERROR;
  value: ApiError;
  status: number | undefined;
}

export interface Success<T> {
  type: EResult.SUCCESS;
  value: T;
  status: number | undefined;
}

export type TResult<T> = Success<T> | Err;
```

`apiRequest` captura cualquier excepción de axios y la devuelve como `Err` envolviendo un
`ApiError` (`api.utility.ts:20-29`). `ApiError` (`models/api-error.model.ts`) clasifica el fallo
(red, timeout, validación, cliente, servidor, cancelado) y ofrece `getUserMessage()`, así que la
vista no interpreta códigos HTTP:

`apps/web/features/branches/branches-view.tsx:26-32`

```tsx
  const result = applicationsQuery.data;

  if (result.type === EResult.ERROR) {
    return <div className="p-6 text-sm text-destructive">{result.value.getUserMessage()}</div>;
  }

  return <BranchesList applications={result.value} />;
```

Después del `if`, TypeScript sabe que `result.value` es `Application[]`: el estrechamiento de tipos
hace imposible usar el dato sin haber tratado el error.

### 4.3 Interceptores (axios)

**Qué es.** Lógica transversal que se ejecuta en cada petición o respuesta sin que el código que
llama lo sepa: es la cadena de responsabilidad de §2.7 aplicada al cliente HTTP.

**Dónde.** `apps/web/config/axios.config.ts`.

**Cómo.** El interceptor de petición añade a todas las llamadas un identificador de petición y el
token:

`apps/web/config/axios.config.ts:28-38`

```ts
axios.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    config.headers.set("X-Request-ID", requestId);

    const token = getAuthToken();

    if (token) {
      config.headers.set("Authorization", `Bearer ${token}`);
    }
```

El interceptor de respuesta centraliza dos políticas: ante un `401` cierra la sesión local y
redirige a `/signin` (`:113-122`), y ante un error transitorio reintenta hasta tres veces con
**espera exponencial**:

`axios.config.ts:70-72`

```ts
const getRetryDelay = (retryCount: number): number => {
  return RETRY_CONFIG.retryDelay * 2 ** retryCount;
};
```

### 4.4 Contenedor / presentación

**Qué es.** Separar el componente que **obtiene** datos y resuelve los estados de carga y error del
componente que solo **muestra** datos ya listos.

**Dónde.** Las vistas de `apps/web/features/`. Las páginas de `app/` son mínimas y delegan en ellas
(`app/(dashboard)/branches/page.tsx` solo devuelve `<BranchesView />`).

**Cómo.** `BranchesView` es el contenedor: consulta, maneja la carga y el error, y entrega a
`BranchesList` un `Application[]` ya resuelto:

`apps/web/features/branches/branches-view.tsx:19-33`

```tsx
export function BranchesView() {
  const applicationsQuery = useApplications();

  if (applicationsQuery.isPending || !applicationsQuery.data) {
    return <div className="p-6 text-sm text-muted-foreground">Cargando ramas…</div>;
  }

  const result = applicationsQuery.data;

  if (result.type === EResult.ERROR) {
    return <div className="p-6 text-sm text-destructive">{result.value.getUserMessage()}</div>;
  }

  return <BranchesList applications={result.value} />;
}
```

### 4.5 Componentes guard (envoltorios)

**Qué es.** Un componente que envuelve una parte del árbol de React y decide si la renderiza, la
oculta o redirige.

**Dónde.** `components/auth-guard.tsx`, `components/guest-guard.tsx` y
`components/route-permission-guard.tsx`, anidados en el layout del panel.

**Cómo.** El layout compone dos guards: el exterior exige un token y el interior exige el permiso de
la ruta actual:

`apps/web/app/(dashboard)/layout.tsx:5-16`

```tsx
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <RoutePermissionGuard>{children}</RoutePermissionGuard>
        </main>
      </div>
    </AuthGuard>
  );
}
```

`RoutePermissionGuard` (`route-permission-guard.tsx:13-30`) busca el código que exige la ruta y, si
la `Persona` no lo tiene, redirige a la primera ruta permitida. Es comodidad de interfaz, no
seguridad: el servidor vuelve a verificar cada petición (§3.8).

### 4.6 Configuración dirigida por tablas

**Qué es.** Expresar reglas como **datos** en una tabla declarativa, en lugar de condicionales
repartidos por el código.

**Dónde.** En la web, `apps/web/config/permissions.config.ts`; en la API, el catálogo semilla de
la matriz, `apps/api/src/modules/security/domain/catalogo-matriz.ts`.

**Cómo.** Qué permiso exige cada pantalla y cada botón vive en un solo lugar:

`apps/web/config/permissions.config.ts:5-25`

```ts
export const ROUTE_PERMISSIONS = [
  { route: "/", codigoAccion: "branch.list" },
  { route: "/branches", codigoAccion: "branch.list" },
  { route: "/branches/[id]", codigoAccion: "branch.view" },
  { route: "/analytics", codigoAccion: "analytics.overview" },
  { route: "/followup", codigoAccion: "followup.list" },
  { route: "/profiles", codigoAccion: "cv.list" },
  { route: "/admin/permisos", codigoAccion: "security.listGroups" },
] as const;

/** Buttons and the codigoAccion each one needs. */
export const ACTION_PERMISSIONS = {
  createBranch: ["branch.create", "cv.list"], // the dialog loads the CV versions it applies with
  cloneBranch: ["branch.clone"],
  archiveBranch: ["branch.archive"],
  addHito: ["branch.addHito"],
  createCvVersion: ["cv.create"],
  uploadCv: ["cv.upload"],
  setOutputProfile: ["cv.setOutput"],
  resolveFollowup: ["followup.resolve"],
} as const satisfies Record<string, readonly string[]>;
```

El hook `usePermissions` consulta esa tabla, y las vistas solo preguntan por el nombre de la acción
(`{canDo("createBranch") && (…)}` en `branches-view.tsx:68`):

`apps/web/hooks/use-permissions.ts:5-12`

```ts
export const usePermissions = () => {
  const { session, isPending } = useSession();
  const permisos = useMemo(() => new Set(session?.permisos ?? []), [session]);
  const can = useCallback((...codigos: readonly string[]) => codigos.every((codigo) => permisos.has(codigo)), [permisos]);
  const canDo = useCallback((action: ActionKey) => can(...ACTION_PERMISSIONS[action]), [can]);

  return { permisos, can, canDo, isPending, isLoaded: session !== undefined };
};
```

Gracias a `as const`, `ActionKey` es la unión exacta de las claves: escribir `canDo("crearRama")`
es un error de compilación. En la API, `catalogo-matriz.ts` cumple el mismo papel para los módulos,
formularios, acciones y grupos por defecto, y `SincronizarMatrizUseCase` lo aplica de forma
idempotente en cada arranque.

### 4.7 Invalidación centralizada de caché

**Qué es.** Una única lista de las consultas que dependen de un dato, que toda mutación de ese dato
invalida.

**Dónde.** `apps/web/query/branch-dependent-keys.ts`.

**Cómo.** Crear, clonar, archivar o agregar un hito a una rama cambia también los perfiles, la
analítica y el seguimiento. En lugar de que cada mutación recuerde esa lista, la lista vive en un
solo lugar:

`apps/web/query/branch-dependent-keys.ts:16-27`

```ts
export const BRANCH_DEPENDENT_QUERY_KEYS = [
  ["applications"],
  ["cv-versions"],
  ["analytics", "overview"],
  ["followup"],
] as const;

export const invalidateBranchDependentQueries = (queryClient: QueryClient): void => {
  for (const queryKey of BRANCH_DEPENDENT_QUERY_KEYS) {
    queryClient.invalidateQueries({ queryKey: [...queryKey] });
  }
};
```

`apps/web/hooks/use-create-application.ts:9-14`

```ts
  return useMutation({
    mutationFn: (input: CreateApplicationInput) => applications_service.create(input),
    onSuccess: () => {
      invalidateBranchDependentQueries(queryClient);
    },
  });
```

---

## 5. Patrones del contrato compartido (`packages/models`)

### 5.1 Esquema compartido (Shared Kernel)

**Qué es.** Una pieza del modelo que varios componentes comparten y que solo se cambia de común
acuerdo.

**Dónde.** `packages/models/src/schemas/*.schema.ts`, publicado como `@repo/models`.

**Cómo.** Cada entidad se define **una vez** como esquema Zod, y de ese esquema se infiere el tipo
TypeScript. El mismo esquema sirve para:

- validar los cuerpos de las peticiones en la API (`new ZodValidationPipe(registerSchema)`, §2.6);
- tipar las respuestas de los casos de uso y los repositorios;
- tipar las vistas de la web, que lo reexporta sin redeclarar nada (invariante 11):

`apps/web/models/index.ts:1-3`

```ts
export * from "@repo/models";
export * from "./api-error.model";
export * from "./result.model";
```

Si un campo cambia en el esquema, el compilador señala cada lugar de la API y de la web que se
rompe.

### 5.2 Unión discriminada

**Qué es.** Un tipo que es una de varias variantes, distinguidas por un campo literal común, de
modo que el compilador puede comprobar que se trataron todas.

**Dónde.** `packages/models/src/schemas/persona.schema.ts` (y `TResult` en la web, §4.2).

**Cómo.** Los tres subtipos de `Persona` comparten una base y se distinguen por `tipo`:

`packages/models/src/schemas/persona.schema.ts:33`

```ts
export const personaSchema = z.discriminatedUnion("tipo", [personaRecruiterSchema, postulanteSchema, administradorSchema]);
```

Es la contraparte tipada de la tabla única `personas` con discriminante: el `switch (row.tipo)` de
`DrizzlePersonaRepository.toDomain` (§3.5) es exhaustivo, y agregar un cuarto subtipo haría fallar
la compilación en cada `switch` que no lo contemple. La `Persona` **compone** al `Usuario` a través
de `usuarioId` (asociación, no herencia).

---

## 6. Observaciones

Dos piezas del código están definidas pero no participan en el flujo actual. Se mencionan para que
no se tomen como ejemplos vivos de los patrones descritos:

- **`apps/api/src/modules/security/application/contextos-seguridad.service.ts`.** Un almacén de
  `ContextoSeguridad` indexado por token. Se registra y exporta en `security.module.ts:39,44`,
  pero ninguna clase lo inyecta: la versión vigente del objeto de contexto (§3.9) es
  `ContextosSesionStore`, indexado por `sesionId`. Solo lo usa su propio test.
- **Las clases `Recruiter`, `Postulante` y `Administrador` de
  `apps/api/src/modules/persona/domain/persona.ts`.** Modelan la jerarquía de `Persona` con
  herencia, pero ningún archivo las importa: el repositorio devuelve el tipo `Persona` de
  `@repo/models`, que es la unión discriminada de §5.2.
