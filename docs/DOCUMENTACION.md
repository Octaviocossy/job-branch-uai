# Documentación del proyecto — JobBranch

> Documento académico (español) que describe el proyecto **JobBranch** y el diseño e
> implementación de los dos patrones de diseño obligatorios: **Composite** y **Factory**.
> Para la documentación operativa (setup, comandos, arquitectura de carpetas) en inglés, ver
> [`README.md`](../README.md) y [`RUNBOOK.md`](./RUNBOOK.md).

## Contenido

1. [Descripción general del proyecto](#1-descripción-general-del-proyecto)
2. [Arquitectura técnica](#2-arquitectura-técnica)
3. [Patrón Composite](#3-patrón-composite)
4. [Patrón Factory](#4-patrón-factory)
5. [Cómo se integran ambos patrones (flujo de extremo a extremo)](#5-cómo-se-integran-ambos-patrones-flujo-de-extremo-a-extremo)
6. [Pruebas unitarias de los patrones](#6-pruebas-unitarias-de-los-patrones)
7. [Referencias](#7-referencias)

---

## 1. Descripción general del proyecto

**JobBranch** es una plataforma que convierte la búsqueda laboral en un proceso gestionado
como un pipeline de software. Centraliza la trazabilidad de las postulaciones mediante una
arquitectura de **"ramas"**: cada proceso de selección es una rama (`RamaAplicacion`)
vinculada a una versión específica de CV, una empresa y una vacante.

**Propuesta de valor:**

- Saber exactamente qué versión de CV se envió a cada empresa.
- Visualizar cada proceso como una rama que avanza por hitos definidos (`Enviado` →
  `Entrevista Técnica` → `RRHH` → `Oferta` | `Rechazado`).
- Aprender de los rechazos mediante feedback post-mortem estructurado.
- Combatir el "ghosting" de reclutadores con alertas de seguimiento automatizadas.
- Mejorar con el tiempo mediante datos: análisis de brechas de habilidades y ROI por
  versión de CV.

El proyecto nace como entregable académico (Parcial N2, Ingeniería de Software, UAI): abarca
requisitos funcionales RF01–RF16, reglas de negocio BR-1 a BR-11, casos de uso CU1–CU16 y las
máquinas de estado del dominio. El glosario de dominio canónico del proyecto vive en
[`.agents/ubiquitous-language.md`](../.agents/ubiquitous-language.md).

### Módulos funcionales

| Módulo | Responsabilidad | Requisitos |
|---|---|---|
| Repositorio de perfiles | Versionado de CV/carta de presentación, "Perfil de Salida" | RF01, RF16 |
| Gestión de ramas | Ciclo de vida de una postulación, clonado, archivado, hitos | RF02, RF03, RF07, RF08, RF09 |
| Feedback | Post-mortem cualitativo por entrevista | RF04 |
| Analítica | ROI por versión de CV, heatmap de tecnologías, funnel de conversión | RF06, RF10, RF11 |
| Seguimiento (anti-ghosting) | Recordatorios por inactividad, contacto del reclutador | RF05, RF12, RF13 |
| Autenticación | Registro/login nativo, JWT, rol elegido al registrarse | RF14 |
| **Seguridad** | **Matriz de permisos por rol** — objeto de esta documentación | **RF15** |

---

## 2. Arquitectura técnica

JobBranch es un **monorepo Turborepo** (`pnpm` workspaces) con tres paquetes principales:

```
apps/
  api/            NestJS — arquitectura hexagonal basada en casos de uso
  web/             Next.js 16 (App Router, React 19) — consume la API vía TanStack Query
packages/
  models/          Esquemas Zod compartidos (@repo/models) — el contrato de dominio
```

- **`@repo/models`** es la única fuente de verdad del dominio: cada entidad (`User`,
  `Application`, `CvVersion`, …) se define una vez como esquema Zod y se reutiliza tanto en
  `apps/api` (validación de request/response, tipos de las tablas Drizzle) como en
  `apps/web` (tipos de las vistas).
- **`apps/api`** sigue una arquitectura por **casos de uso** (hexagonal): cada módulo de
  NestJS separa `domain/` (entidades y reglas puras), `application/` (casos de uso y, en
  este módulo, la factory), `infrastructure/` (adaptadores a Drizzle/Postgres) y
  `presentation/` (controladores HTTP).
- **`apps/web`** consume la API mediante una capa `hook → service → utilidad api → axios`,
  nunca accede a la base de datos ni implementa rutas de API propias.

El módulo de **seguridad** (`apps/api/src/modules/security/`) es el que implementa los dos
patrones de diseño obligatorios del proyecto y aplica el requisito **RF15** ("matriz de
permisos jerárquica") junto con el caso de uso **CU15** ("el sistema construye el árbol
Composite raíz al iniciar la sesión").

---

## 3. Patrón Composite

### 3.1 Intención

El patrón **Composite** permite tratar objetos individuales (hojas) y composiciones de
objetos (grupos) de manera **uniforme**, a través de una interfaz común. En JobBranch se usa
para modelar la **matriz de permisos** como un árbol jerárquico: un permiso puede ser una
**acción concreta** (hoja) o un **grupo de permisos** que a su vez contiene otras acciones o
subgrupos (compuesto). Ambos se evalúan de la misma forma: "¿este componente concede la
acción `X`?".

Esto mapea directamente al modelo de dominio del proyecto: `ComponentePermiso` → `GrupoPermisos`
(compuesto) / `Accion` (hoja), recorrido por el método `evaluar()`.

### 3.2 Diagrama de clases

```
              ComponentePermiso (abstracta)
              ├─ id: string
              ├─ nombre: string
              ├─ evaluar(codigoAccion): boolean      [abstracto]
              ├─ obtenerHijos(): ComponentePermiso[]  [abstracto]
              └─ agregarHijo(hijo): void               [lanza error por defecto]
                        △
            ┌───────────┴────────────┐
            │                        │
      GrupoPermisos              Accion
    (compuesto / Composite)     (hoja / Leaf)
    - hijos: ComponentePermiso[]  - codigoAccion: string
    + evaluar(codigo) →           + evaluar(codigo) →
      OR de evaluar() en             codigo === this.codigoAccion
      cada hijo (recursivo)        + obtenerHijos() → []
    + obtenerHijos() → hijos       + agregarHijo() → hereda el
    + agregarHijo(h) → push          throw de la clase base
```

### 3.3 Implementación

**Componente base — `apps/api/src/modules/security/domain/componente-permiso.ts`**

```ts
export abstract class ComponentePermiso {
  constructor(
    public readonly id: string,
    public readonly nombre: string,
  ) {}

  abstract evaluar(codigoAccion: string): boolean;
  abstract obtenerHijos(): ComponentePermiso[];

  agregarHijo(_hijo: ComponentePermiso): void {
    throw new Error(`${this.nombre} no admite hijos`);
  }
}
```

La clase abstracta define el contrato común. `agregarHijo` tiene una implementación por
defecto que **lanza error** — así una hoja (`Accion`) no necesita sobrescribirla
explícitamente para rechazar hijos; solo el compuesto (`GrupoPermisos`) la redefine.

**Hoja (Leaf) — `apps/api/src/modules/security/domain/accion.ts`**

```ts
export class Accion extends ComponentePermiso {
  constructor(
    id: string,
    nombre: string,
    public readonly codigoAccion: string,
  ) {
    super(id, nombre);
  }

  evaluar(codigoAccion: string): boolean {
    return codigoAccion === this.codigoAccion;
  }

  obtenerHijos(): ComponentePermiso[] {
    return [];
  }
}
```

Una `Accion` representa un permiso atómico (p. ej. `branch.create`, `cv.upload`,
`security.viewMatrix`). `evaluar()` simplemente compara el código solicitado contra el
propio; no tiene hijos.

**Compuesto (Composite) — `apps/api/src/modules/security/domain/grupo-permisos.ts`**

```ts
export class GrupoPermisos extends ComponentePermiso {
  private readonly hijos: ComponentePermiso[] = [];

  evaluar(codigoAccion: string): boolean {
    return this.hijos.some((hijo) => hijo.evaluar(codigoAccion));
  }

  obtenerHijos(): ComponentePermiso[] {
    return this.hijos;
  }

  agregarHijo(hijo: ComponentePermiso): void {
    this.hijos.push(hijo);
  }
}
```

Este es el corazón del patrón: `evaluar()` delega recursivamente en cada hijo mediante
`Array.some`, sin importar si ese hijo es a su vez otro `GrupoPermisos` (subgrupo) o una
`Accion` (hoja). Esta es la propiedad clave de Composite: **el nodo raíz no necesita saber
la profundidad ni la forma del árbol** para responder "¿tengo el permiso `X`?" — cada nivel
delega en el siguiente hasta llegar a una hoja.

**Cliente del árbol — `apps/api/src/modules/security/domain/contexto-seguridad.ts`**

```ts
export class ContextoSeguridad {
  private root: ComponentePermiso;

  constructor(root: ComponentePermiso) {
    this.root = root;
  }

  cargarMatriz(root: ComponentePermiso): void {
    this.root = root;
  }

  tienePermiso(codigoAccion: string): boolean {
    return this.root.evaluar(codigoAccion);
  }

  listarAcciones(): string[] {
    return this.flatten(this.root);
  }

  private flatten(componente: ComponentePermiso): string[] {
    const hijos = componente.obtenerHijos();
    if (hijos.length === 0) {
      return componente instanceof Accion ? [componente.codigoAccion] : [];
    }
    return hijos.flatMap((hijo) => this.flatten(hijo));
  }
}
```

`ContextoSeguridad` es el objeto que un caso de uso o guard consulta: envuelve la raíz del
árbol (`ComponentePermiso`) y expone dos operaciones:

- `tienePermiso(codigo)` — delega en `root.evaluar(codigo)`, disparando la recursión del
  Composite.
- `listarAcciones()` — aplana el árbol completo a una lista de códigos de acción (usado por
  el endpoint `GET /security/matrix` para devolver todos los permisos del rol actual).

### 3.4 Árbol de ejemplo (rol `postulante`)

```
GrupoPermisos "postulante-root"
├── GrupoPermisos "Cuenta"
│   ├── Accion "auth.me"
│   └── Accion "security.viewMatrix"
├── GrupoPermisos "Gestión de Ramas"
│   ├── Accion "branch.create"
│   ├── Accion "branch.clone"
│   └── Accion "branch.archive"
├── GrupoPermisos "Gestión de CV"
│   ├── Accion "cv.create"
│   ├── Accion "cv.upload"
│   └── Accion "cv.setOutput"
└── GrupoPermisos "Seguimiento"
    └── Accion "followup.resolve"
```

`contexto.tienePermiso("cv.upload")` recorre: raíz → evalúa cada grupo hijo → el grupo
"Gestión de CV" evalúa sus hojas → `Accion("cv.upload").evaluar("cv.upload")` → `true`. La
recursión corta apenas encuentra la primera hoja que coincide (`Array.some`).

---

## 4. Patrón Factory

### 4.1 Intención

El patrón **Factory** (más precisamente, una **Fábrica Abstracta** con una función
selectora) encapsula la lógica de **construcción** de un árbol Composite completo, de forma
que el código cliente nunca instancia manualmente `GrupoPermisos`/`Accion` — simplemente
pide "la matriz de permisos para este rol" y recibe un árbol ya armado.

Esto corresponde al requisito CU15 del proyecto: *"el sistema construye el árbol Composite
raíz al iniciar la sesión"* — `MatrizPermisosFactory` es exactamente ese constructor.

### 4.2 Implementación

**Interfaz de la fábrica — `apps/api/src/modules/security/application/factories/matriz-permisos.factory.ts`**

```ts
export interface MatrizPermisosFactory {
  crear(): ComponentePermiso;
}
```

Un contrato mínimo: cualquier fábrica de matrices debe poder `crear()` una raíz
`ComponentePermiso` (el árbol Composite descrito en la sección anterior).

**Fábricas concretas — una por rol:**

```ts
export class PostulanteMatrizFactory implements MatrizPermisosFactory {
  crear(): ComponentePermiso {
    const root = new GrupoPermisos("postulante-root", "Permisos Postulante");

    const cuentaGroup = new GrupoPermisos("postulante-cuenta", "Cuenta");
    cuentaGroup.agregarHijo(new Accion("auth.me", "Ver perfil propio", "auth.me"));
    cuentaGroup.agregarHijo(new Accion("security.viewMatrix", "Ver matriz de permisos", "security.viewMatrix"));

    const branchGroup = new GrupoPermisos("postulante-branch", "Gestión de Ramas");
    branchGroup.agregarHijo(new Accion("branch.create", "Crear rama", "branch.create"));
    branchGroup.agregarHijo(new Accion("branch.clone", "Clonar rama", "branch.clone"));
    branchGroup.agregarHijo(new Accion("branch.archive", "Archivar rama", "branch.archive"));

    // ... grupos "Gestión de CV" y "Seguimiento" (ver código fuente completo)

    root.agregarHijo(cuentaGroup);
    root.agregarHijo(branchGroup);
    // ...
    return root;
  }
}

export class RecruiterMatrizFactory implements MatrizPermisosFactory {
  crear(): ComponentePermiso {
    const root = new GrupoPermisos("recruiter-root", "Permisos Recruiter");
    // grupos "Cuenta", "Gestión de Tablero", "Gestión de Candidatos"
    // con acciones distintas a las del postulante (board.view, candidate.addFeedback, …)
    return root;
  }
}
```

Cada fábrica concreta es responsable de un rol y sabe exactamente qué subárbol de permisos
le corresponde — `PostulanteMatrizFactory` arma acciones sobre ramas/CV/seguimiento propio;
`RecruiterMatrizFactory` arma acciones sobre el tablero y los candidatos.

**Selector de fábrica (Abstract Factory):**

```ts
export function resolverFactory(role: UserRole): MatrizPermisosFactory {
  const factories: Record<UserRole, () => MatrizPermisosFactory> = {
    postulante: () => new PostulanteMatrizFactory(),
    recruiter: () => new RecruiterMatrizFactory(),
  };

  return factories[role]();
}
```

`resolverFactory` es el punto único donde el rol del usuario (`UserRole`, un valor de
`@repo/models`) se traduce a la fábrica concreta correspondiente. Si en el futuro se agrega
un rol nuevo (p. ej. `administrador`), solo hace falta:

1. Crear `AdministradorMatrizFactory implements MatrizPermisosFactory`.
2. Agregar una entrada al `Record` de `resolverFactory`.

Ningún consumidor de la fábrica (caso de uso, guard, controlador) necesita cambiar — este es
el beneficio central del patrón Factory: **desacopla la creación del árbol de permisos de
su consumo**.

### 4.3 Caso de uso que orquesta la fábrica

```ts
// apps/api/src/modules/security/application/use-cases/resolver-permisos.use-case.ts
@Injectable()
export class ResolverPermisosUseCase {
  constructor(private readonly logger: AppLogger) {
    this.logger.setContext(ResolverPermisosUseCase.name);
  }

  execute(role: UserRole): ContextoSeguridad {
    this.logger.debug(`Resolving permission matrix for role=${role}`);

    const factory = resolverFactory(role);
    const root = factory.crear();

    return new ContextoSeguridad(root);
  }
}
```

`ResolverPermisosUseCase` es el punto de entrada de la aplicación: dado un rol, pide a
`resolverFactory` la fábrica adecuada, la invoca (`factory.crear()`) para obtener el árbol
Composite, y lo envuelve en un `ContextoSeguridad` listo para consultar. Este es el
**"construir el árbol Composite raíz al iniciar la sesión"** de CU15.

---

## 5. Cómo se integran ambos patrones (flujo de extremo a extremo)

```
1. Cliente HTTP llama, p. ej., GET /security/matrix con un Bearer JWT
                          │
2. JwtAuthGuard verifica el JWT y adjunta el usuario (incl. `role`) al request
                          │
3. PermissionsGuard (apps/api/src/common/guards/permissions.guard.ts)
   lee la metadata @RequiereAccion('security.viewMatrix') del handler
   y llama a ResolverPermisosUseCase.execute(role)
                          │
4. ResolverPermisosUseCase → resolverFactory(role)      ◄── Factory
                           → factory.crear()             ◄── construye el árbol Composite
                           → new ContextoSeguridad(root)
                          │
5. PermissionsGuard llama contexto.tienePermiso('security.viewMatrix')
   → recorre el árbol Composite (GrupoPermisos → ... → Accion)  ◄── Composite
   → true/false
                          │
6. Si es false → ForbiddenException (403). Si es true → el controlador ejecuta
   y (en este endpoint) también usa contexto.listarAcciones() para la respuesta.
```

**Decorador de anotación** — `apps/api/src/common/decorators/requiere-accion.decorator.ts`:

```ts
export const REQUIERE_ACCION_KEY = "requiereAccion";
export const RequiereAccion = (codigoAccion: string) => SetMetadata(REQUIERE_ACCION_KEY, codigoAccion);
```

**Guard de aplicación** — `apps/api/src/common/guards/permissions.guard.ts` (resumen):

```ts
@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly cache = new Map<UserRole, ContextoSeguridad>();

  constructor(
    private readonly reflector: Reflector,
    private readonly resolverPermisosUseCase: ResolverPermisosUseCase,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const codigoAccion = this.reflector.getAllAndOverride<string | undefined>(
      REQUIERE_ACCION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!codigoAccion) return true; // endpoint sin @RequiereAccion → no se evalúa

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const contexto = this.resolverContexto(request.user.role as UserRole);

    if (!contexto.tienePermiso(codigoAccion)) {
      throw new ForbiddenException(`Missing permission: ${codigoAccion}`);
    }
    return true;
  }

  private resolverContexto(role: UserRole): ContextoSeguridad {
    const cached = this.cache.get(role);
    if (cached) return cached;

    const contexto = this.resolverPermisosUseCase.execute(role);
    this.cache.set(role, contexto);
    return contexto;
  }
}
```

Nótese la pequeña optimización: como la fábrica produce **el mismo árbol determinístico
para un rol dado**, el guard cachea el `ContextoSeguridad` por rol en memoria — no reconstruye
el árbol Composite en cada request.

**Endpoints que usan ambos patrones:**

- `GET /security/matrix` (`SecurityController`) — devuelve `{ role, acciones: string[] }`
  usando `contexto.listarAcciones()`.
- `GET /auth/me` — extendido para incluir los permisos resueltos del usuario autenticado,
  como demostración concreta de la aplicación (`@RequiereAccion` + `PermissionsGuard`).

```ts
// apps/api/src/modules/security/presentation/security.controller.ts
@Controller("security")
export class SecurityController {
  constructor(private readonly resolverPermisosUseCase: ResolverPermisosUseCase) {}

  @Get("matrix")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiereAccion("security.viewMatrix")
  matrix(@CurrentUser() user: JwtPayload): PermissionMatrix {
    const role = user.role as UserRole;
    const contexto = this.resolverPermisosUseCase.execute(role);
    return { role, acciones: contexto.listarAcciones() };
  }
}
```

---

## 6. Pruebas unitarias de los patrones

Ambos patrones están cubiertos por specs Vitest en
`apps/api/src/modules/security/domain/contexto-seguridad.spec.ts` y
`apps/api/src/modules/security/application/factories/matriz-permisos.factory.spec.ts`:

- **Composite** — se construye un árbol anidado a mano (`GrupoPermisos` con subgrupos y
  hojas `Accion`) y se verifica que:
  - `tienePermiso` concede una acción sin importar en qué profundidad del árbol está.
  - `tienePermiso` deniega una acción ausente.
  - `listarAcciones` aplana correctamente todas las hojas.
  - `cargarMatriz` reemplaza la raíz en caliente (el mismo `ContextoSeguridad` puede
    apuntar a un árbol distinto).
  - Un `GrupoPermisos` vacío evalúa `false` para cualquier código.
  - `Accion.agregarHijo` lanza — una hoja no admite hijos (invariante del patrón).
- **Factory** — se verifica que `resolverFactory('postulante')` y
  `resolverFactory('recruiter')` producen árboles **distintos** y **no vacíos**, cada uno
  con las acciones esperadas para su rol (regla de negocio BR-4: cada rol solo puede
  ejecutar las acciones de su propia matriz).

Comando para correrlas: `pnpm --filter api test -- security`.

---

## 7. Referencias

- [`.agents/ubiquitous-language.md`](../.agents/ubiquitous-language.md) — glosario de
  dominio canónico del proyecto (en inglés, con términos SPEC en español).
- Código fuente del módulo: `apps/api/src/modules/security/` y
  `apps/api/src/common/{guards,decorators}/`.
- Gang of Four, *Design Patterns: Elements of Reusable Object-Oriented Software* — Composite
  (p. 163) y Factory Method / Abstract Factory (p. 87, 107), los patrones clásicos en los
  que se basa esta implementación.
