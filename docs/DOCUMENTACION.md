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
| Autenticación | Registro/login nativo, JWT respaldado por una `Sesion` persistida, logout; el rol (`postulante` o `recruiter`) se elige al registrarse | RF14 |
| **Seguridad** | **Matriz de permisos jerárquica, persistida y compartida, con una `Accion` por endpoint protegido; la administra el `Administrador`** — objeto de esta documentación | **RF15**, CU15 |

**Nota — identidad y actores (`Usuario`, `Persona`).** La cuenta es el `Usuario` (tabla
`usuarios`: `id`, `email`, `nombreCompleto`, `authProvider`, `intentosFallidos`; el hash de la
contraseña vive solo en `apps/api` y ningún tipo de `@repo/models` lo expone). El `Usuario` **no
guarda un rol**: su `obtenerRol()` devuelve el `tipo` de su `Persona`. Cada `Usuario` **compone**
(`usuario_id`, FK única) una `Persona`, especializada por un discriminante `tipo` en tres
subtipos — `Recruiter` (`perNombre`, `perApellido`, `fechaContratacion`), `Postulante`
(`habilidadesMaster`) y `Administrador` — modelada como una unión discriminada Zod
(`personaSchema` en `packages/models/src/schemas/persona.schema.ts`) y persistida en `personas`
(single-table-with-discriminator). El rol se elige al registrarse y no cambia nunca; el
`Administrador` es el único subtipo que **no** se puede elegir al registrarse (`registerRoleSchema`
admite solo `postulante` y `recruiter`): lo crea únicamente el seed, a partir de variables de
entorno y sin contraseña por defecto. El catálogo de usuarios es `ListaUsuarios` (puerto
`modules/users/domain/lista-usuarios.repository.ts`, «Catálogo» de la Fig. 19.13): toda consulta
sobre usuarios (`buscarPorEmail`, `agregarUsuario`, `listar`) va al catálogo, nunca a un
`Usuario` individual. La `Persona` se crea junto con el `Usuario` al momento del registro
(módulo `apps/api/src/modules/persona/`: `domain/persona.ts` con las clases
`Persona`/`Recruiter`/`Postulante`/`Administrador`, `CreatePersonaUseCase`,
`DrizzlePersonaRepository`) y nace siempre con las raíces de permisos de su rol (§4). Nótese que
el subtipo recruiter se exporta como `personaRecruiterSchema`/`PersonaRecruiter` (no
`recruiterSchema`/`Recruiter`) para no colisionar con el `Recruiter` de `application.schema.ts`
(el view-model de contacto embebido en `Application`, un objeto distinto). Ver el glosario de
dominio (`.agents/ubiquitous-language.md`) para el detalle completo.

**Nota — sesión y permisos.** Toda petición autenticada exige una `Sesion` viva (tabla
`sesiones`, persistida), y **todo endpoint salvo el registro, el login y el health** declara su
propia `Accion` con `@RequiereAccion('<codigo>')`: hay 29 `Accion`es, una por endpoint
protegido. La tabla endpoint → `codigoAccion` está en [`apps/api/README.md`](../apps/api/README.md).

Cada `CvVersion` (`Repositorio de perfiles`) puede además llevar un `snapshotVacanteId`
opcional (`cv_versions.snapshot_vacante_id`, FK nullable → `vacantes`) que referencia la
`Vacante` a la que esa versión fue adjuntada al postular (`VersionPerfil → Vacante`) — coexiste
con la referencia `Application.vacanteId` de la rama; ninguna de las dos quedó deprecada.

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

- **`@repo/models`** es la única fuente de verdad del dominio: cada entidad (`Usuario`,
  `Persona`, `Application`, `CvVersion`, …) se define una vez como esquema Zod y se reutiliza
  tanto en `apps/api` (validación de request/response, tipos de las tablas Drizzle) como en
  `apps/web` (tipos de las vistas).
- **`apps/api`** sigue una arquitectura por **casos de uso** (hexagonal): cada módulo de
  NestJS separa `domain/` (entidades y reglas puras), `application/` (casos de uso y, en el
  módulo de seguridad, las fábricas), `infrastructure/` (adaptadores a Drizzle/Postgres) y
  `presentation/` (controladores HTTP). Los módulos `persona`, `users`, `auth` y `security`
  siguen esta misma forma para la identidad y los permisos (cada uno con las capas que necesita).
- **`apps/web`** consume la API mediante una capa `hook → service → utilidad api → axios`,
  nunca accede a la base de datos ni implementa rutas de API propias. Filtra su menú, sus
  botones de acción y sus rutas según los `permisos` que devuelve `GET /auth/me`, mediante un
  mapa estático ruta/acción → `codigoAccion` (`apps/web/config/permissions.config.ts`) y el hook
  `usePermissions`. Es una comodidad de interfaz, no seguridad: el servidor verifica igualmente
  cada petición.

La seguridad se reparte en cuatro módulos de `apps/api/src/modules/` más dos carpetas
transversales:

| Ubicación | Responsabilidad |
|---|---|
| `modules/security/` | El Composite (`ComponentePermiso`, `GrupoPermisos`, `Accion`), las fábricas por rol, el catálogo semilla (`catalogo-matriz.ts`), la sincronización de la matriz y la administración de la matriz (CU-15) |
| `modules/auth/` | Registro, login y logout; la entidad `Sesion` y el almacén en memoria de los `ContextoSeguridad` de las sesiones vivas |
| `modules/users/` | El `Usuario`, el catálogo `ListaUsuarios` y la lectura de usuarios (solo para el `Administrador`) |
| `modules/persona/` | Los tres subtipos de `Persona` y su creación junto con sus raíces |
| `shared/auth/` | `JwtService`, `JwtAuthGuard` (valida el JWT **y** la `Sesion`) y `hashToken` |
| `common/` | `PermissionsGuard`, los decoradores `@RequiereAccion` y `@ContextoActual`, y la auditoría de endpoints |

**Tablas de seguridad** (Drizzle, `apps/api/src/database/schema/`; migraciones `0003`–`0005`):

| Tabla | Contenido |
|---|---|
| `usuarios` | `id`, `email`, `nombre_completo`, `password_hash`, `auth_provider`, `intentos_fallidos` — sin columna de rol |
| `personas` | `usuario_id` (única), `tipo` (`recruiter` \| `postulante` \| `administrador`) y los campos propios de cada subtipo |
| `sesiones` | `usuario_id`, `token_jwt` (el SHA-256 del JWT, no el token), `fecha_emision`, `fecha_expiracion` |
| `componentes` | Un nodo del Composite por fila: `tipo` (`grupo` \| `accion`), `nombre`, `descripcion`, `codigo_accion`, `formulario_id`, `padre_id` |
| `formularios`, `modulos` | El catálogo de agrupación de las `Accion`es, **fuera** del árbol |
| `persona_componentes` | Las raíces que cada `Persona` posee (`persona_id`, `componente_id`) |

El módulo de **seguridad** (`apps/api/src/modules/security/`) es el que implementa los dos
patrones de diseño obligatorios del proyecto y aplica el requisito **RF15** ("matriz de
permisos jerárquica") junto con el caso de uso **CU15**: la `Sesion` inicializa su
`ContextoSeguridad` al iniciarse (el árbol Composite de su `Persona`) y el `Administrador`
gestiona la matriz.

---

## 3. Patrón Composite

### 3.1 Intención

El patrón **Composite** permite tratar objetos individuales (hojas) y composiciones de
objetos (grupos) de manera **uniforme**, a través de una interfaz común. En JobBranch se usa
para modelar la **matriz de permisos** como un árbol jerárquico: un permiso puede ser una
**acción concreta** (hoja) o un **grupo de permisos** que a su vez contiene otras acciones o
subgrupos (compuesto). Ambos se evalúan de la misma forma: "¿este componente concede la
acción `X`?".

Esto mapea directamente al diagrama de clases de la especificación (Fig. 19.13):
`ComponentePermiso` → `GrupoPermisos` (compuesto) / `Accion` (hoja), recorrido por el método
`evaluar()`. Tres decisiones de diseño distinguen esta implementación:

- **El árbol está persistido y sus nodos son compartidos.** Un nodo tiene a lo sumo un padre
  (`contiene`), pero cualquier cantidad de `Persona`s puede poseerlo como raíz: el grupo
  "Cuenta", por ejemplo, es raíz de los tres roles. Así no existe una copia de cada grupo por
  `Persona`.
- **Cada `Persona` posee una o más raíces** (`Persona *—1..* ComponentePermiso`), nunca cero.
- **`Modulo` y `Formulario` no son nodos del árbol.** Son clases asociadas que agrupan las
  `Accion`es: una `Accion` se ejecuta en un `Formulario`, y un `Formulario` pertenece a un
  `Modulo` (`Accion *—1 Formulario *—1 Modulo`). No se evalúan ni conceden nada: sirven para
  agrupar la matriz en `GET /security/matrix` y en la pantalla del `Administrador`. El árbol
  está formado únicamente por `GrupoPermisos` (nodos interiores) y `Accion` (hojas).

### 3.2 Diagrama de clases

```
              ComponentePermiso (abstracta)
              ├─ id: string
              ├─ nombre: string
              ├─ evaluar(codigoAccion): boolean       [abstracto]
              ├─ obtenerHijos(): ComponentePermiso[]  [abstracto]
              ├─ agregar(hijo): void                  [lanza error por defecto]
              └─ remover(hijo): void                  [lanza error por defecto]
                        △
            ┌───────────┴────────────┐
            │                        │
      GrupoPermisos              Accion
    (compuesto / Composite)     (hoja / Leaf)
    - descripcion: string|null  - codigoAccion: string
    - hijos: ComponentePermiso[]- formularioId: string
    + evaluar(codigo) →         + evaluar(codigo) →
      OR de evaluar() en           codigo === this.codigoAccion
      cada hijo (recursivo)     + obtenerHijos() → []
    + obtenerHijos() → hijos    + agregar()/remover() → heredan el
    + agregar(h) → push           throw de la clase base
    + remover(h) → quita el
      hijo con el mismo id
```

Fuera del árbol, asociados a las `Accion`es:

```
   Accion ── se ejecuta en ──▶ Formulario ── pertenece a ──▶ Modulo
        *                  1                *                1
```

Relaciones con el resto del modelo:

```
   GrupoPermisos 0..1 ── contiene ──▶ 0..* ComponentePermiso   (un padre como máximo)
   Persona       *    ── raíces    ──▶ 1..* ComponentePermiso   (tabla persona_componentes)
```

Como `GrupoPermisos.evaluar` delega en cada hijo sin saber si es otro grupo o una hoja, el
árbol completo es recorrible con **un solo método polimórfico** (`evaluar`), sin que ningún
nodo necesite saber en qué nivel de anidamiento está — la esencia del patrón Composite.

### 3.3 Persistencia

Cada nodo del Composite es una fila de `componentes`; `padre_id` (auto-referencia) es la
asociación `contiene`, y una restricción `CHECK` garantiza que un `grupo` no lleve
`codigo_accion` ni `formulario_id` y que una `accion` lleve ambos. Las raíces de cada
`Persona` están en `persona_componentes` (clave primaria compuesta), que es la asociación
`Persona *—1..* ComponentePermiso`. `modulos` y `formularios` guardan el catálogo de
agrupación con **identificadores fijos** (los de `catalogo-matriz.ts`), que son la forma en que
la sincronización reconoce una fila que ya escribió.

`ComponentePermisoRepository.findArbolByPersona(personaId)` (el `findArbolByPersona` de la
Fig. 19.14) carga las raíces de la `Persona` junto con todo su subárbol: lee la matriz entera
(unas pocas decenas de filas) de una vez, en lugar de recorrer el árbol nivel por nivel, enlaza
cada nodo con su padre mediante `agregar` y devuelve las raíces que la `Persona` posee,
ordenadas por nombre.

La especificación dibuja `Persona.resolverPermisos()` devolviendo **un** `ComponentePermiso`,
pero una `Persona` posee varias raíces. `ResolverPermisosUseCase` lo resuelve devolviendo un
`GrupoPermisos` **transitorio** (nunca persistido) que envuelve las raíces; así
`resolverPermisos()` y `cargarMatriz(componente)` conservan su firma literal. Un `Usuario` sin
`Persona` produce un grupo vacío, que lo deniega todo.

### 3.4 Implementación

> Los fragmentos de código de esta documentación omiten los comentarios de documentación del
> código fuente; el resto es literal.

**Componente base — `apps/api/src/modules/security/domain/componente-permiso.ts`**

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

La clase abstracta define el contrato común. `agregar` y `remover` tienen una implementación
por defecto que **lanza error** — así una hoja (`Accion`) no necesita sobrescribirlas
explícitamente para rechazar hijos; solo el compuesto (`GrupoPermisos`) las redefine.

**Hoja (Leaf) — `apps/api/src/modules/security/domain/accion.ts`**

```ts
export class Accion extends ComponentePermiso {
  constructor(
    id: string,
    nombre: string,
    public readonly codigoAccion: string,
    public readonly formularioId: string,
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

Una `Accion` representa un permiso atómico, identificado por su `codigoAccion` (p. ej.
`branch.create`, `cv.upload`, `security.viewMatrix`) y ejecutado en un `Formulario`.
`evaluar()` simplemente compara el código solicitado contra el propio; no tiene hijos.

**Compuesto (Composite) — `apps/api/src/modules/security/domain/grupo-permisos.ts`**

```ts
export class GrupoPermisos extends ComponentePermiso {
  private readonly hijos: ComponentePermiso[] = [];

  constructor(
    id: string,
    nombre: string,
    public readonly descripcion: string | null = null,
  ) {
    super(id, nombre);
  }

  evaluar(codigoAccion: string): boolean {
    return this.hijos.some((hijo) => hijo.evaluar(codigoAccion));
  }

  obtenerHijos(): ComponentePermiso[] {
    return this.hijos;
  }

  agregar(hijo: ComponentePermiso): void {
    this.hijos.push(hijo);
  }

  remover(hijo: ComponentePermiso): void {
    const index = this.hijos.findIndex((actual) => actual.id === hijo.id);

    if (index >= 0) {
      this.hijos.splice(index, 1);
    }
  }
}
```

Este es el corazón del patrón: `evaluar()` delega recursivamente en cada hijo mediante
`Array.some`, sin importar si ese hijo es a su vez otro `GrupoPermisos` (subgrupo) o una
`Accion` (hoja). Esta es la propiedad clave de Composite: **el nodo raíz no necesita saber
la profundidad ni la forma del árbol** para responder "¿tengo el permiso `X`?" — cada nivel
delega en el siguiente hasta llegar a una hoja.

**Clases asociadas, fuera del árbol — `.../domain/modulo.ts` y `.../domain/formulario.ts`**

```ts
// apps/api/src/modules/security/domain/modulo.ts
export class Modulo {
  constructor(
    public readonly id: string,
    public readonly nombre: string,
  ) {}
}
```

```ts
// apps/api/src/modules/security/domain/formulario.ts
export class Formulario {
  constructor(
    public readonly id: string,
    public readonly nombre: string,
    public readonly moduloId: string,
  ) {}
}
```

`Modulo` y `Formulario` **no extienden** `ComponentePermiso`: no tienen `evaluar` ni hijos. Un
`Formulario` conoce a su `Modulo` (`moduloId`) y cada `Accion` conoce su `Formulario`
(`formularioId`); la agrupación se usa solo para presentar la matriz.

**Cliente del árbol — `apps/api/src/modules/security/domain/contexto-seguridad.ts`**

```ts
export class ContextoSeguridad {
  private root: ComponentePermiso;

  constructor(root: ComponentePermiso) {
    this.root = root;
  }

  cargarMatriz(componente: ComponentePermiso): void {
    this.root = componente;
  }

  tienePermiso(codigoAccion: string): boolean {
    return this.root.evaluar(codigoAccion);
  }

  listarAcciones(): string[] {
    return [...new Set(this.flatten(this.root))];
  }

  private flatten(componente: ComponentePermiso): string[] {
    if (componente instanceof Accion) {
      return [componente.codigoAccion];
    }

    return componente.obtenerHijos().flatMap((hijo) => this.flatten(hijo));
  }
}
```

`ContextoSeguridad` es el objeto que un guard o un caso de uso consulta: envuelve la raíz del
árbol (`ComponentePermiso`) y expone dos operaciones:

- `tienePermiso(codigo)` — delega en `root.evaluar(codigo)`, disparando la recursión del
  Composite.
- `listarAcciones()` — aplana el árbol completo a una lista de códigos de acción, **sin
  repetidos** (un mismo grupo puede alcanzarse desde varias raíces). `GET /auth/me` lo usa para
  devolver los `permisos` de la sesión.

**Resolución de las raíces — `.../application/use-cases/resolver-permisos.use-case.ts`**

```ts
async execute(usuarioId: string): Promise<ComponentePermiso> {
  this.logger.debug(`Resolving permission tree for usuarioId=${usuarioId}`);

  const persona = await this.personaRepository.findByUsuarioId(usuarioId);

  if (!persona) {
    this.logger.warn(`Usuario without Persona, every permission denied usuarioId=${usuarioId}`);

    return new GrupoPermisos(`usuario:${usuarioId}`, "Sin Persona");
  }

  const raices = await this.componenteRepository.findArbolByPersona(persona.id);
  const arbol = new GrupoPermisos(`persona:${persona.id}`, "Raíces de la Persona");

  for (const raiz of raices) {
    arbol.agregar(raiz);
  }

  return arbol;
}
```

Este es el grupo transitorio de §3.3: la `Sesion` lo recibe y lo entrega a su
`ContextoSeguridad` (§5).

### 3.5 Árbol de ejemplo (raíces por defecto del `postulante`)

El siguiente árbol es el que construye `PostulanteMatrizFactory.crear()` (§4) a partir de
`catalogo-matriz.ts`; el árbol cargado de la base de datos tiene el mismo contenido, con las
raíces ordenadas por nombre. El grupo "Pipeline" no tiene `Accion`es propias: las cuelga de
sus cinco subgrupos.

```
GrupoPermisos "Raíces de la Persona"        ← transitorio: lo que devuelve resolverPermisos()
├── GrupoPermisos "Cuenta"
│   ├── Accion "auth.me"
│   ├── Accion "auth.logout"
│   └── Accion "security.viewMatrix"
├── GrupoPermisos "Perfiles CV"
│   ├── Accion "cv.list"
│   ├── Accion "cv.create"
│   ├── Accion "cv.upload"
│   ├── Accion "cv.setOutput"
│   ├── Accion "cv.setSnapshotVacante"
│   └── Accion "cv.archive"
├── GrupoPermisos "Analítica"
│   └── Accion "analytics.overview"
├── GrupoPermisos "Pipeline"
│   ├── GrupoPermisos "Tablero"
│   │   ├── Accion "branch.list"
│   │   └── Accion "branch.view"
│   ├── GrupoPermisos "Crear rama"
│   │   └── Accion "branch.create"
│   ├── GrupoPermisos "Clonar rama"
│   │   └── Accion "branch.clone"
│   ├── GrupoPermisos "Hitos y feedback"
│   │   ├── Accion "branch.addHito"
│   │   └── Accion "branch.addFeedback"
│   └── GrupoPermisos "Archivar rama"
│       └── Accion "branch.archive"
└── GrupoPermisos "Seguimiento"
    ├── Accion "followup.list"
    └── Accion "followup.resolve"
```

`contexto.tienePermiso("cv.upload")` recorre: el grupo transitorio → evalúa cada raíz → el
grupo "Perfiles CV" evalúa sus hojas → `Accion("cv.upload").evaluar("cv.upload")` → `true`. La
recursión corta apenas encuentra la primera hoja que coincide (`Array.some`). Para
`tienePermiso("security.createGroup")` ninguna hoja coincide y el resultado es `false`: ese
código solo lo tiene el `Administrador`.

**El resultado no depende de la forma del árbol.** Tanto `tienePermiso` como `listarAcciones`
son agnósticos a la profundidad por construcción: `GrupoPermisos.evaluar` es un OR recursivo
sobre `obtenerHijos()` sin importar cuántos niveles de compuesto haya antes de llegar a una
hoja. Es exactamente la garantía que ofrece Composite: el cliente (`ContextoSeguridad`) nunca
necesitó conocer la forma del árbol, y por eso el `Administrador` puede reorganizar los grupos
sin tocar el código.

### 3.6 Administración de la matriz (CU-15)

El `Administrador` modifica la matriz en la pantalla de administración de `apps/web`, que
consume los endpoints `/security/*` (`security.viewCatalog`, `security.listGroups`,
`security.createGroup`, `security.updateGroup`, `security.deleteGroup`,
`security.listPersonas`, `security.assignRoot`, `security.removeRoot`). Puede:

- crear, editar y eliminar `GrupoPermisos`, armados a partir de `Accion`es y grupos existentes;
- asignar o quitar raíces a una `Persona`, **nunca la última** (`UltimaRaizError`).

Las `Accion`es, los `Formulario`s y los `Modulo`s son datos semilla: cada `Accion` está atada a
un endpoint en el código, de modo que una creada en ejecución no protegería nada. Las reglas de
integridad las aplican los casos de uso: como un nodo tiene un solo padre, ubicarlo en un grupo
lo saca del anterior; un grupo no puede quedar dentro de sí mismo ni de un descendiente
(`CicloEnMatrizError`); eliminar un grupo reubica a sus hijos bajo el padre del grupo, y se
rechaza mientras alguna `Persona` lo posea como raíz (`GrupoEnUsoComoRaizError`). **Un cambio
rige desde el siguiente login** de cada `Persona` — no toca ninguna `Sesion` ya iniciada (§5).

---

## 4. Patrón Factory

### 4.1 Intención

El patrón **Factory** (más precisamente, una **Fábrica Abstracta** con una fábrica concreta por
rol) encapsula la definición del árbol Composite **por defecto** de cada rol, de forma que el
código cliente nunca instancia manualmente `GrupoPermisos`/`Accion` ni decide qué raíces recibe
una `Persona`: simplemente pide "las raíces del rol `X`".

Con la matriz persistida (§3.3), la fábrica ya no construye en cada sesión el árbol que se
evalúa — ese árbol se **carga de la base de datos**. Su trabajo es otro, y real:

1. **Definir** las raíces por defecto del rol (`raicesPorDefecto`).
2. **Sembrar** los grupos compartidos de esas raíces cuando faltan (`sembrar`).
3. **Entregar** esas raíces a una `Persona` (`otorgarRaices`, y el alta de una `Persona` nueva
   con sus raíces).

Esto respalda a CU15: la matriz que gestiona el `Administrador` parte de un estado coherente
por rol, y cada `Persona` nace con las raíces de su rol. La especificación no dibuja una
fábrica, por lo que no contradice ninguna de sus figuras.

### 4.2 Implementación

**Interfaz de la fábrica — `apps/api/src/modules/security/application/factories/matriz-permisos.factory.ts`**

```ts
export interface MatrizPermisosFactory {
  readonly tipo: PersonaTipo;
  raicesPorDefecto(): readonly string[];
  crear(): ComponentePermiso[];
  sembrar(): Promise<void>;
  otorgarRaices(personaId: string): Promise<void>;
}

export type MatrizPermisosFactories = Record<PersonaTipo, MatrizPermisosFactory>;
```

- `raicesPorDefecto()` — los identificadores de los grupos compartidos que son las raíces del
  rol (ver `catalogo-matriz.ts`).
- `crear()` — construye en memoria los árboles por defecto del rol. Documenta y prueba las
  concesiones de cada rol; **no se persiste desde aquí** y ningún árbol de una `Sesion` sale
  de él.
- `sembrar()` — inserta en la base de datos los grupos por defecto del rol (y sus subgrupos)
  que falten; nunca modifica un grupo existente, porque un `Administrador` pudo editarlo.
- `otorgarRaices(personaId)` — asigna a una `Persona` existente las raíces del rol, ignorando
  las que ya posee.

**Base común y fábricas concretas — una por rol.** Las tres comparten la mecánica; cada una
solo declara sus raíces:

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

  private construirGrupo(definicion: GrupoDefinicion): GrupoPermisos {
    const grupo = new GrupoPermisos(definicion.id, definicion.nombre, definicion.descripcion);

    for (const subgrupo of subgruposDe(definicion)) {
      grupo.agregar(this.construirGrupo(subgrupo));
    }

    for (const accion of accionesPorDefectoDe(definicion)) {
      grupo.agregar(new Accion(accion.codigoAccion, accion.nombre, accion.codigoAccion, accion.formularioId));
    }

    return grupo;
  }
}

export class PostulanteMatrizFactory extends MatrizPermisosFactoryBase {
  readonly tipo = "postulante";

  raicesPorDefecto(): readonly string[] {
    return [GRUPOS.CUENTA.id, GRUPOS.PERFILES.id, GRUPOS.ANALITICA.id, GRUPOS.PIPELINE.id, GRUPOS.SEGUIMIENTO.id];
  }
}

export class RecruiterMatrizFactory extends MatrizPermisosFactoryBase {
  readonly tipo = "recruiter";

  raicesPorDefecto(): readonly string[] {
    return [GRUPOS.CUENTA.id, GRUPOS.PIPELINE.id, GRUPOS.SEGUIMIENTO.id, GRUPOS.ANALITICA.id];
  }
}

export class AdministradorMatrizFactory extends MatrizPermisosFactoryBase {
  readonly tipo = "administrador";

  raicesPorDefecto(): readonly string[] {
    return [GRUPOS.CUENTA.id, GRUPOS.ADMIN_PERMISOS.id, GRUPOS.ADMIN_USUARIOS.id];
  }
}
```

| Rol | Raíces por defecto (grupos compartidos de `catalogo-matriz.ts`) |
|---|---|
| `postulante` | Cuenta, Perfiles CV, Analítica, Pipeline, Seguimiento |
| `recruiter` | Cuenta, Pipeline, Seguimiento, Analítica |
| `administrador` | Cuenta, Administración de permisos, Administración de usuarios |

Los grupos son **compartidos**: "Cuenta" es raíz de los tres roles, y "Pipeline", "Seguimiento"
y "Analítica" de dos. Los actores de la especificación mandan: el `Recruiter` recibe el
pipeline (CU-02, 06, 07, 08, 09) y el seguimiento (CU-13); el `Postulante`, los perfiles de CV
(CU-16); ambos, la analítica (CU-10, 11) y la cuenta. **Las concesiones de pipeline y
seguimiento del `Postulante` son provisorias**: conserva lo que hoy puede hacer hasta que el
lado Recruiter del pipeline se separe en su propio trabajo; esas dos raíces se quitarán
entonces de `PostulanteMatrizFactory`.

**Selector (Abstract Factory):**

```ts
export function crearFactories(repository: ComponentePermisoRepository): MatrizPermisosFactories {
  return {
    postulante: new PostulanteMatrizFactory(repository),
    recruiter: new RecruiterMatrizFactory(repository),
    administrador: new AdministradorMatrizFactory(repository),
  };
}
```

`MatrizPermisosFactories` (un `Record<PersonaTipo, MatrizPermisosFactory>`, inyectado con el
token `MATRIZ_PERMISOS_FACTORIES`) es el punto único donde el rol (`PersonaTipo`, un valor de
`@repo/models`) se traduce a la fábrica concreta: `factories[tipo]`. Si en el futuro se agrega
un rol nuevo, solo hace falta una nueva fábrica y una entrada en este `Record`. Ningún
consumidor (caso de uso, seed) necesita cambiar — el beneficio central del patrón: **desacopla
la definición de los permisos por rol de su consumo**. Las fábricas son clases comunes (no
`@Injectable`) para que el script del seed pueda construirlas también.

### 4.3 Quién usa las fábricas

**Catálogo semilla — `.../domain/catalogo-matriz.ts`.** Datos puros que definen los 6
`Modulo`s, los 11 `Formulario`s, los 12 grupos por defecto y las 29 `Accion`es. Cada `Accion`
nombra su `Formulario`, el grupo en que se siembra por primera vez (`grupoPorDefecto`) y los
casos de uso a los que se traza (`cu`). Los identificadores son permanentes: así la
sincronización reconoce lo que ya escribió.

```ts
export interface GrupoDefinicion {
  id: string;
  nombre: string;
  descripcion: string;
  padreId: string | null;
}

export interface AccionDefinicion {
  codigoAccion: string;
  nombre: string;
  formularioId: string;
  grupoPorDefecto: string;
  cu: readonly CasoDeUso[];
}
```

**Alta de una `Persona`.** `RegisterUseCase` toma `this.factories[input.role].raicesPorDefecto()`
y crea la `Persona` con `CreatePersonaUseCase.execute(input, raices)`, que la persiste junto con
sus raíces en una sola transacción: una `Persona` nunca existe sin raíces (con una lista vacía
lanza `PersonaWithoutRootsError`).

**Sincronización al arrancar la API.** `SecurityModule.onApplicationBootstrap` ejecuta
`SincronizarMatrizUseCase`, que deja la base de datos al día con el catálogo; es idempotente.
Sus pasos (`execute`, resumen):

```ts
await this.componenteRepository.sincronizarModulosYFormularios(MODULOS, FORMULARIOS);

for (const factory of Object.values(this.factories)) {
  await factory.sembrar();
}

await this.componenteRepository.sincronizarAcciones(ACCIONES);

const personasSinRaices = await this.componenteRepository.listarPersonasSinRaices();

for (const { personaId, tipo } of personasSinRaices) {
  await this.factories[tipo].otorgarRaices(personaId);
}
```

El último paso es una red de seguridad (filas escritas antes de existir la matriz, o a mano):
no es la vía normal por la que una `Persona` recibe sus raíces. La sincronización refresca el
`nombre` y el `Formulario` de las `Accion`es existentes, pero **nunca su grupo padre** — un
cambio del `Administrador` sobrevive a un reinicio.

**Seed.** `pnpm --filter api db:seed` ejecuta la misma sincronización y luego crea el
`Postulante` de demostración y, solo si están definidas `ADMIN_EMAIL` y `ADMIN_PASSWORD`, el
primer `Administrador` — cada uno con las raíces por defecto de su fábrica. No hay contraseña
por defecto para el `Administrador` (ver [`RUNBOOK.md`](./RUNBOOK.md)).

---

## 5. Cómo se integran ambos patrones (flujo de extremo a extremo)

```
1. Cliente HTTP: POST /auth/login { email, password }
                          │
2. LoginUseCase: ListaUsuarios.buscarPorEmail → usuario.autenticar(password)
   (si falla: usuario.incrementarIntentos() y 401 con un mensaje único)
   usuario.obtenerRol() → el `tipo` de su Persona
                          │
3. IniciarSesionUseCase (login y registro lo usan):
   · firma el JWT { sub: usuarioId, role }
   · ResolverPermisosUseCase → carga las raíces de la Persona       ◄── Composite
     (matriz persistida, §3.3) en un GrupoPermisos transitorio
   · crea la Sesion (persistida) con SHA-256(token) y la expiración del JWT
   · sesion.inicializarContextoSeguridad(raiz) → ContextoSeguridad
   · ContextosSesionStore.guardar(sesion.id, contexto)
   → devuelve el token
                          │
4. En cada petición posterior, p. ej. GET /security/matrix con Bearer <token>:
   JwtAuthGuard: verifica el JWT y llama a ValidarSesionUseCase,
   que busca la Sesion por SHA-256(token) en la base de datos, exige que esté
   vigente y recupera su ContextoSeguridad; adjunta user, sesionId y
   contextoSeguridad al request (si no, 401)
                          │
5. PermissionsGuard (apps/api/src/common/guards/permissions.guard.ts)
   lee la metadata @RequiereAccion('security.viewMatrix') del handler
   y llama a contextoSeguridad.tienePermiso('security.viewMatrix')
   → recorre el árbol Composite (GrupoPermisos → … → Accion)   ◄── Composite
   → true/false
                          │
6. Si es false → ForbiddenException (403). Si es true → el controlador ejecuta
   (sobre qué datos se actúa lo decide el caso de uso, no la matriz).
                          │
7. POST /auth/logout (@RequiereAccion('auth.logout')): CerrarSesionUseCase
   mueve la expiración de la Sesion a "ahora" — la fila no se borra — y descarta
   su ContextoSeguridad; el mismo token ya no autentica.
```

La **matriz decide qué acción**; el **caso de uso decide sobre qué datos**: la pertenencia (las
ramas y los CV propios de un `Postulante`) la aplica cada caso de uso, nunca el Composite. Y
los permisos se resuelven **una sola vez, cuando la `Sesion` empieza**: su `ContextoSeguridad`
vive tanto como ella, y un cambio de permisos rige desde el siguiente login. El `Factory`
participa en los pasos previos a este flujo: define y entrega las raíces con que la `Persona`
se creó (§4.3).

**La `Sesion` — `apps/api/src/modules/auth/domain/sesion.ts` (resumen):**

```ts
export class Sesion {
  private contexto: ContextoSeguridad | null = null;

  constructor(
    public readonly id: string,
    public readonly usuarioId: string,
    public readonly tokenJWT: string,
    public readonly fechaEmision: Date,
    private expiracion: Date,
  ) {}

  estaVigente(ahora: Date = new Date()): boolean {
    return this.expiracion.getTime() > ahora.getTime();
  }

  cerrar(ahora: Date = new Date()): void {
    if (this.estaVigente(ahora)) {
      this.expiracion = ahora;
    }
  }

  inicializarContextoSeguridad(raiz: ComponentePermiso): ContextoSeguridad {
    if (this.contexto) {
      throw new Error(`ContextoSeguridad already initialized sesionId=${this.id}`);
    }

    this.contexto = new ContextoSeguridad(raiz);

    return this.contexto;
  }
}
```

`tokenJWT` guarda el **SHA-256** del JWT (`hashToken`), nunca el token: una filtración de la
base de datos no expone ninguna sesión viva. Una `Sesion` termina por vencimiento, nunca por
borrado. Inicializar el contexto dos veces se rechaza para que los permisos no se vuelvan a
resolver a mitad de la sesión.

**Validación de la `Sesion` en cada petición — `.../use-cases/validar-sesion.use-case.ts` (resumen):**

```ts
async execute(token: string): Promise<SesionVigente | null> {
  const sesion = await this.sesiones.buscarPorToken(hashToken(token));

  if (!sesion?.estaVigente()) {
    return null;
  }

  const contexto = this.contextos.obtener(sesion.id);

  if (!contexto) {
    this.logger.warn(`Sesion has no ContextoSeguridad in this process, ending it id=${sesion.id}`);
    sesion.cerrar();
    await this.sesiones.guardar(sesion);

    return null;
  }

  return { sesionId: sesion.id, contexto };
}
```

Los `ContextoSeguridad` de las sesiones vivas se guardan **en memoria** (`ContextosSesionStore`)
y el diseño supone **una sola instancia de la API**. Si el proceso se reinicia pierde esos
contextos y no puede reconstruirlos sin volver a resolver los permisos en plena sesión; por eso
cada `Sesion` sin contexto se cierra y el usuario inicia sesión de nuevo.

**Decoradores y guards:**

```ts
// apps/api/src/common/decorators/requiere-accion.decorator.ts
export const REQUIERE_ACCION_KEY = "requiereAccion";

export const RequiereAccion = (codigoAccion: string) => SetMetadata(REQUIERE_ACCION_KEY, codigoAccion);
```

```ts
// apps/api/src/common/guards/permissions.guard.ts
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const codigoAccion = this.reflector.getAllAndOverride<string | undefined>(REQUIERE_ACCION_KEY, [context.getHandler(), context.getClass()]);

    if (!codigoAccion) {
      return true;
    }

    const { contextoSeguridad } = context.switchToHttp().getRequest<AuthorizedRequest>();

    if (!contextoSeguridad) {
      throw new ForbiddenException("ContextoSeguridad missing — PermissionsGuard must run after JwtAuthGuard");
    }

    if (!contextoSeguridad.tienePermiso(codigoAccion)) {
      throw new ForbiddenException(`Missing permission: ${codigoAccion}`);
    }

    return true;
  }
}
```

`PermissionsGuard` **no resuelve ni cachea permisos**: solo consulta el `ContextoSeguridad`
que `JwtAuthGuard` dejó en el request. Si se lo usa sin `JwtAuthGuard` antes, deniega. Un
handler sin `@RequiereAccion` no se evalúa, pero la auditoría de endpoints (§6) garantiza que
solo el registro, el login y el health queden sin código. Los controladores usan
`@UseGuards(JwtAuthGuard, PermissionsGuard)` y leen el contexto con `@ContextoActual()`.

**Endpoints que usan ambos patrones:**

- `GET /security/matrix` (`SecurityController`) — devuelve `PermissionMatrix`: `{ role, modulos }`,
  las `Accion`es permitidas del llamador agrupadas por `Modulo` y `Formulario`.
- `GET /auth/me` — devuelve `{ user, permisos }`, donde `permisos` es
  `contexto.listarAcciones()`. Es la fuente que usa `apps/web` para mostrar solo lo permitido
  (menú, botones y rutas); el servidor igualmente verifica cada petición.

```ts
// apps/api/src/modules/security/presentation/security.controller.ts
@Controller("security")
export class SecurityController {
  constructor(private readonly obtenerMatrizUseCase: ObtenerMatrizUseCase) {}

  @Get("matrix")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiereAccion("security.viewMatrix")
  matrix(@CurrentUser() user: JwtPayload, @ContextoActual() contexto: ContextoSeguridad): Promise<PermissionMatrix> {
    return this.obtenerMatrizUseCase.execute(user.role as PersonaTipo, contexto);
  }
}
```

---

## 6. Pruebas unitarias de los patrones

Los patrones y su integración están cubiertos por specs Vitest. Salvo donde se indica, son de
la capa unitaria (sin base de datos):

- **Composite** — `security/domain/contexto-seguridad.spec.ts`: se construye un árbol anidado a
  mano (`GrupoPermisos` con subgrupos y hojas `Accion`) y se verifica que `tienePermiso`
  concede una acción sin importar su profundidad y deniega una ausente; que `listarAcciones`
  aplana las hojas y no repite un código alcanzable desde dos raíces de un grupo transitorio;
  que `cargarMatriz` reemplaza la raíz; que un `GrupoPermisos` vacío evalúa `false`; que
  `remover` quita solo al hijo con el mismo `id`; y que `Accion.agregar`/`remover` lanzan —
  una hoja no admite hijos (invariante del patrón).
- **Catálogo semilla** — `security/domain/catalogo-matriz.spec.ts`: exactamente 29 `Accion`es,
  con códigos únicos, cada una con un `Formulario` y un grupo por defecto existentes y trazada
  a al menos un caso de uso; ninguno de los códigos retirados (`board.*`, `candidate.*`);
  identificadores UUID distintos; y los auxiliares de recorrido (`subgruposDe`,
  `conDescendientes`, `accionesPorDefectoDe`).
- **Factory** — `security/application/factories/matriz-permisos.factory.spec.ts`: cada fábrica
  concreta tiene las raíces y las concesiones esperadas para su rol (p. ej. el `Recruiter` no
  tiene ningún `cv.*`; el `Administrador` solo `auth.*`, `security.*` y `usuario.*`; ningún rol
  salvo el `Administrador` administra la matriz — regla de negocio BR-4); `crearFactories`
  entrega una fábrica por rol; todos los grupos y todas las `Accion`es son alcanzables desde
  alguna fábrica; `otorgarRaices` entrega las raíces del rol; y `sembrar` escribe solo grupos.
- **Sincronización** — `security/application/use-cases/sincronizar-matriz.use-case.spec.ts`:
  el orden de los pasos (módulos y formularios, grupos de cada rol, `Accion`es, y solo al final
  las `Persona`s sin raíces) y que no se entreguen raíces a nadie que ya las tenga.
- **Sesión** — `auth/domain/sesion.spec.ts` (`estaVigente`, `cerrar` sin extender nunca una
  sesión terminada, una sola inicialización del contexto),
  `auth/application/contextos-sesion.store.spec.ts` y
  `auth/application/use-cases/validar-sesion.use-case.spec.ts` (busca por el hash del token,
  rechaza la sesión vencida o cerrada por logout, y cierra una sesión viva cuyo contexto este
  proceso no tiene).
- **Guards** — `common/guards/permissions.guard.spec.ts` (concede, deniega con 403, y deniega
  sin contexto en vez de resolver permisos por su cuenta) y
  `shared/auth/jwt-auth.guard.spec.ts` (sin token, token inválido y token válido sin `Sesion`
  viva se rechazan; con `Sesion` viva adjunta las claims, el `sesionId` y el contexto).
- **Auditoría de endpoints** — `common/guards/endpoint-permissions.audit.spec.ts`: recorre por
  reflexión todos los controladores de `src/modules` y verifica que solo el registro, el login
  y el health no lleven código; que todo otro handler lleve `JwtAuthGuard` y luego
  `PermissionsGuard`; que cada código exista en el catálogo; y que ningún código se repita —
  29 códigos, 29 handlers. Un controlador agregado después queda auditado sin editar el spec.

Con la base de datos de pruebas levantada, se suman las capas de integración y e2e:
`security/infrastructure/drizzle-componente-permiso.repository.int.spec.ts` y las suites
`test/security-matrix.e2e-spec.ts`, `test/administracion-matriz.e2e-spec.ts`,
`test/permisos-por-rol.e2e-spec.ts` y `test/sesion.e2e-spec.ts` (login → me → logout → el mismo
token deja de funcionar, y un cambio de permisos rige desde el siguiente login).

Comandos para correrlas:

```sh
pnpm --filter api test -- security   # los patrones: Composite, Factory, sincronización
pnpm --filter api test               # toda la capa unitaria, incl. Sesion, guards y la auditoría
pnpm --filter api test:db            # integración + e2e (requiere la base de pruebas, ver RUNBOOK)
```

---

## 7. Referencias

- [`.agents/ubiquitous-language.md`](../.agents/ubiquitous-language.md) — glosario de
  dominio canónico del proyecto (en inglés, con términos SPEC en español) y, junto a él,
  [`.agents/ubiquitous-language-invariants.md`](../.agents/ubiquitous-language-invariants.md)
  con los invariantes del producto (el 10 y del 12 al 15 describen la seguridad).
- Código fuente del módulo: `apps/api/src/modules/security/`, `apps/api/src/modules/auth/`,
  `apps/api/src/shared/auth/` y `apps/api/src/common/{guards,decorators}/`.
- Gang of Four, *Design Patterns: Elements of Reusable Object-Oriented Software* — Composite
  (p. 163) y Factory Method / Abstract Factory (p. 87, 107), los patrones clásicos en los
  que se basa esta implementación.

### 7.1 Erratas del documento

El código de seguridad se alinea con la versión 8.0 de este documento (Evaluación Parcial 1,
2026-09-27). Como las figuras de la v8.0 se contradicen entre sí, rige la regla del
[ADR-0023](../.agents/adr/0023-code-follows-the-spec-class-diagram-first.md): **gobierna el
diagrama de clases 19.13**, la última refinación de la cadena ICONIX del documento; lo que
19.13 no dibuja se toma del modelo de datos 20.1, las secuencias 19.1–19.2 y la vista de
métodos 18.10; y una figura que contradice a la gobernante **se registra como errata y nunca se
implementa**. En seguridad e identidad el código además adopta literalmente los nombres de la
especificación (`ListaUsuarios`, `nombreCompleto`, `agregar`/`remover`).

La lista completa de erratas para la próxima versión del documento (Figs. 18.9, 19.13, 20.1,
18.10, 19.1, 19.2 y 17.5) está en la sección «Errata for the Document» de la
[especificación de diseño](../.agents/specs/2026-10-12-security-module-spec-alignment.md#errata-for-the-document);
no se copia aquí para que exista una sola lista.
