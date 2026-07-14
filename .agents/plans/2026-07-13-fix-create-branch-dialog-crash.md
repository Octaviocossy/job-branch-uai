# Plan: Fix "Nueva Rama" dialog crash (`setValueAs .split is not a function`)

> Status: **completed**
> Created: 2026-07-13
> Updated: 2026-07-13
> Issue: N/A (bug fix)

## Goal

Stop the app from crashing when the user clicks **"Nueva Rama"** on the Ramas screen.
The crash is a `TypeError: (value ?? "").split is not a function` thrown while the
`CreateBranchDialog` form mounts. Fix the root cause so the dialog opens cleanly and the
tech-stack field still parses a comma-separated string into a `string[]` on submit.

## Context

### Current behavior (the bug)

Clicking "Nueva Rama" (`apps/web/features/branches/branches-view.tsx:66-73`) sets
`createOpen = true`, which mounts `CreateBranchDialog`
(`apps/web/features/branches/create-branch-dialog.tsx`). The dialog's form renders a
**text** `<Input>` for the tech stack registered with a `setValueAs` transform that
assumes a **string** value:

```tsx
// create-branch-dialog.tsx:127-138
{...register("techStack", {
  setValueAs: (value: string) =>
    (value ?? "")
      .split(",")
      .map((tech) => tech.trim())
      .filter(Boolean),
})}
```

But the same `useForm` call seeds that field with an **array** default:

```tsx
// create-branch-dialog.tsx:30-33
defaultValues: { status: "Enviado", cvVersion: "", techStack: [], archived: false },
```

When react-hook-form attaches the input's `ref`, it runs `updateValidAndValue` →
`getFieldValueAs` → `setValueAs(currentValue)`. The current value is the default `[]`
(an array). `[] ?? ""` evaluates to `[]` (the `??` operator only substitutes `null` /
`undefined`, not an empty array), and arrays have no `.split` method → the exact stack
trace reported:

```
Uncaught TypeError: (value ?? "").split is not a function
    at setValueAs (create-branch-dialog.tsx)
    at getFieldValueAs (react-hook-form)
    at setFieldValue → updateValidAndValue → ref (react-hook-form)
    at commitAttachRef (react-dom)  ← fires on mount, i.e. when the dialog opens
```

### Why the sibling dialog does NOT crash

`apps/web/features/profiles/create-cv-version-dialog.tsx` uses the **same**
`setValueAs`-splits-a-string pattern for its `tags` field (lines 73-81) but passes **no
`defaultValues` at all** to `useForm`. So on mount `setValueAs` receives `undefined`,
`(undefined ?? "")` becomes `""`, and `"".split(",")` works. The bug is specific to the
branch dialog seeding the array field with `[]`.

### Root cause (one sentence)

A text `<Input>` whose `setValueAs` transform expects a **string** is seeded with an
**array** default (`techStack: []`), so on mount the array flows into `.split()` and
throws.

### Constraints the implementer must know

- `techStack` is typed `string[]` in the domain schema
  (`packages/models/src/schemas/application.schema.ts:19` — `techStack: z.array(z.string())`),
  and `createApplicationSchema` keeps it required (an **empty array is valid**;
  `.min(1)` is not applied). So on submit the transform must still yield a `string[]`.
- `useForm<CreateApplicationInput>`'s `defaultValues` is typed `DefaultValues<T>` (a deep
  partial), so **omitting `techStack` from `defaultValues` is type-safe** — no `@ts-expect-error`
  or cast is needed.
- Do not touch `@repo/models` — the schema is correct; the bug is purely in the web form's
  default value. (This also keeps the change inside `apps/web`, avoiding a cross-package
  rebuild.)
- `apps/web` architecture rule: forms use React Hook Form + zod; see
  `apps/web/.agents/rules/nextjs-api-workflow.md`. Tests follow the 2-tier split in
  `apps/web/.agents/rules/testing-strategy.md` (component tier mocks the `services/` seam).

## Affected Files

| Action | File Path | Purpose |
|--------|-----------|---------|
| MODIFY | `apps/web/features/branches/create-branch-dialog.tsx` | Remove the `techStack: []` array default (root-cause fix) and harden `setValueAs` to tolerate a non-string value (defense-in-depth). |
| MODIFY (test) | `apps/web/features/branches/branches-view.test.tsx` | Add a regression test that opens the dialog via "Nueva Rama" and asserts it renders without crashing. (Alternatively CREATE `create-branch-dialog.test.tsx` — see Step 3 for the trade-off.) |

No other files change. No schema, service, hook, or API change is required.

## Step-by-Step Implementation

### Step 1 — Remove the array default for `techStack` (primary, root-cause fix)

- **File:** `apps/web/features/branches/create-branch-dialog.tsx`
- **Action:** MODIFY (line 32)
- **Details:** Drop `techStack: []` from the `defaultValues` object so the text input
  starts empty (the field's value is `undefined` until the user types), mirroring the
  working `create-cv-version-dialog.tsx`. Keep the other three defaults — they back
  `<Controller>`-driven Selects (`status`, `cvVersion`) and the hidden `archived` flag,
  none of which use a string-splitting `setValueAs`.

  Change:

  ```tsx
  defaultValues: { status: "Enviado", cvVersion: "", techStack: [], archived: false },
  ```

  to:

  ```tsx
  defaultValues: { status: "Enviado", cvVersion: "", archived: false },
  ```

- **Why:** This is the exact mismatch that throws — a text input whose transform expects a
  string must not be seeded with an array. Removing the default matches the proven sibling
  pattern and lets `setValueAs` receive `undefined`/`""` on mount.

### Step 2 — Harden `setValueAs` against a non-string value (defense-in-depth)

- **File:** `apps/web/features/branches/create-branch-dialog.tsx`
- **Action:** MODIFY (lines 131-137, the `register("techStack", { setValueAs })` block)
- **Details:** Make the transform tolerate an already-array value so a future re-introduction
  of an array default, or a `reset(values)` call that passes an array (e.g. if this dialog is
  ever reused for editing), cannot resurrect the crash. Guard with `Array.isArray` and coerce
  non-strings safely:

  ```tsx
  {...register("techStack", {
    setValueAs: (value: unknown): string[] => {
      if (Array.isArray(value)) return value as string[];
      return String(value ?? "")
        .split(",")
        .map((tech) => tech.trim())
        .filter(Boolean);
    },
  })}
  ```

  Note the parameter type widens from `string` to `unknown` and the function gets an explicit
  `string[]` return type. `String(value ?? "")` also protects against a numeric/boolean value
  reaching `.split`.

- **Why:** Step 1 removes today's trigger; Step 2 makes the field robust to the whole class of
  "non-string value reaches `.split`" bugs the stack trace represents, at near-zero cost.
- **Note:** Step 2 is recommended but optional — Step 1 alone fixes the reported crash. If the
  team prefers a minimal diff, ship Step 1 only and skip Step 2. Do **not** ship Step 2 without
  Step 1: hardening the transform while leaving the `[]` default would silently swallow the bug
  and let an empty array pass through as `[]` on mount, which is not the intended semantic.

### Step 3 — Add a regression test that opens the dialog

- **File:** `apps/web/features/branches/branches-view.test.tsx` (extend) — recommended
- **Action:** MODIFY — add one `it(...)` case inside the existing `describe("BranchesView", ...)`.
- **Details:**
  - The existing file already `vi.mock("@/services/applications.service", ...)`. The dialog
    additionally calls `useCvVersions()` → `cv_versions_service.list`, so **add a mock for the
    cv-versions service** at the top of the file (module mocks are hoisted, so place it next to
    the existing `vi.mock`):

    ```tsx
    vi.mock("@/services/cv-versions.service", () => ({
      cv_versions_service: { list: vi.fn(), create: vi.fn(), uploadFile: vi.fn(), setOutput: vi.fn(), archive: vi.fn() },
    }));
    ```

    (Only `list` is exercised here; include the other method names to keep the mock shape
    close to the real service, but at minimum `list` must exist. Verify the real export shape
    in `apps/web/services/cv-versions.service.ts` and match it — an over-broad mock is fine, a
    missing `list` is not.)
  - Import the mocked service alongside the existing import:
    `import { cv_versions_service } from "@/services/cv-versions.service";`
  - New test body:

    ```tsx
    it("opens the Nueva Rama dialog without crashing", async () => {
      vi.mocked(applications_service.list).mockResolvedValue({
        type: EResult.SUCCESS,
        value: [MELI],
        status: 200,
      });
      vi.mocked(cv_versions_service.list).mockResolvedValue({
        type: EResult.SUCCESS,
        value: [],
        status: 200,
      });

      const user = userEvent.setup();
      renderWithClient(<BranchesView />);

      await screen.findByText("Mercado Libre");
      await user.click(screen.getByRole("button", { name: /Nueva Rama/i }));

      // If the techStack default regresses to an array, RHF throws on mount and
      // this assertion never resolves — the dialog title proves it mounted cleanly.
      expect(await screen.findByText("Registra un nuevo proceso de postulación.")).toBeInTheDocument();
      expect(screen.getByLabelText("Stack (separado por coma)")).toBeInTheDocument();
    }, 15000);
    ```

  - Reset the new mock in `beforeEach` (optional but consistent with the file's style):
    `vi.mocked(cv_versions_service.list).mockReset();`
- **Why:** The crash happens on dialog **mount**, so simply asserting the dialog's content
  renders after the click is a sufficient and stable regression guard. Asserting on the
  `DialogDescription` text ("Registra un nuevo proceso de postulación.") and the tech-stack
  field's label confirms the form body — the part that threw — mounted.
- **Alternative considered:** CREATE a focused `apps/web/features/branches/create-branch-dialog.test.tsx`
  that renders `<CreateBranchDialog open onOpenChange={() => {}} />` directly. This is a tighter
  unit-of-behavior and avoids driving `BranchesView`, but it still needs both service mocks and
  duplicates provider wiring. Prefer extending `branches-view.test.tsx` (Step 3 primary) unless
  the team wants the dialog covered in isolation.

### Step 4 — Verify

Run the checks in the order below (from the repo root) and confirm each passes — see
Validation Criteria for the commands and the manual smoke test.

## Architecture Decisions

- **Fix in `apps/web`, not `@repo/models`.** The schema (`techStack: z.array(z.string())`)
  is correct — an empty array is a valid tech stack. The defect is entirely a
  form-default/`setValueAs` mismatch in the view layer, so the change is scoped to one web
  component and needs no shared-package rebuild.
- **Remove the default rather than "fix" it to `""`.** Setting `techStack: ""` would be a
  type mismatch against `string[]` and would only work by accident. Omitting the field from
  `defaultValues` is the type-clean, intention-revealing option and matches the working
  `create-cv-version-dialog.tsx` precedent.
- **Keep `setValueAs` doing the string→array transform.** The comma-separated text input is a
  deliberate UX; the transform stays. We only fix what value reaches it (Step 1) and make it
  defensive (Step 2), rather than replacing the input with a tag/array control (out of scope
  for a bug fix).
- **Regression test at the component tier.** Per `apps/web/.agents/rules/testing-strategy.md`,
  a rendered-interaction test with the `services/` seam mocked is the correct tier for "the
  dialog mounts without throwing." No schema re-testing (that lives in `@repo/models`).

## Validation Criteria

- [x] `apps/web/features/branches/create-branch-dialog.tsx` no longer contains `techStack: []`
      in `defaultValues`.
- [x] Manual smoke test: `pnpm dev`, open the Ramas screen, click **"Nueva Rama"**
      → the dialog opens with **no** console error and no crash overlay.
- [x] Manual smoke test (submit path): typed `react, typescript, node` into the "Stack (separado
      por coma)" field, filled the other required fields (Empresa, Rol, Versión de CV, Fecha de
      postulación), submitted → the branch was created with `techStack` tags
      `react`/`typescript`/`node` rendered correctly.
- [x] `pnpm --filter web test` passes (71/71), including the new regression test.
- [x] `pnpm --filter web check-types` passes (confirms omitting `techStack` from `defaultValues`
      is type-valid and the widened `setValueAs` signature type-checks).
- [x] `pnpm --filter web lint` passes (Biome).

## Open Questions

None. The root cause, fix, and test are fully determined. Step 2 (defensive `setValueAs`) is
the only optional element — include it unless a minimal diff is explicitly preferred.
