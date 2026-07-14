# Plan: Fix CV file upload — FormData sent as JSON, file dropped

> Status: **completed**
> Created: 2026-07-13
> Updated: 2026-07-13
> Issue: — (none; bug fix from a runtime error report)

## Goal

Make `POST /cv-versions/:id/file` actually deliver the uploaded PDF/DOCX to the
NestJS API so the CV file is stored, instead of failing with
`400 "A CV file is required"`. The fix is a single, centralized change to how the
`apps/web` axios instance handles `FormData` request bodies.

## Context

**Symptom (from the browser console):**

```
[API Error] POST /cv-versions/ff03cf42-…/file - Final failure after 0 retries {
  data: { error: 'Bad Request', message: 'A CV file is required', statusCode: 400 },
  status: 400
}
```

**Current flow (verified by reading the code):**

1. UI: `apps/web/features/profiles/profiles-view.tsx` → `handleFileChange` reads a
   real `File` from `event.target.files[0]` and calls
   `uploadCv.mutate({ id, file })` (`hooks/use-upload-cv.ts`).
2. Service: `apps/web/services/cv-versions.service.ts` `uploadFile(id, file)` builds
   `const formData = new FormData(); formData.append("file", file);` and calls
   `api.post(\`/cv-versions/${id}/file\`, formData)`.
3. `api.post` (`utilities/api.utility.ts`) → `axios.post(url, data, …)` on the shared
   instance in `config/axios.config.ts`.
4. Server: `apps/api/.../cv-versions.controller.ts` `@Post(":id/file")` with
   `@UseInterceptors(FileInterceptor("file"))` + `@UploadedFile() file`, passed to
   `UploadCvFileUseCase.execute(...)`, which throws
   `BadRequestException("A CV file is required")` when `file` is `undefined`
   (`application/use-cases/upload-cv-file.use-case.ts:24-27`).

**Root cause.** The shared axios instance is created with a default JSON content type:

```ts
// apps/web/config/axios.config.ts:18-26
const axios = _axios.create({
  baseURL: apiUrl,
  withCredentials: true,
  timeout: 30000,
  headers: { "Content-Type": "application/json", Accept: "application/json" },
});
```

In **axios 1.x** (installed: `1.18.1`), the default `transformRequest` does:

```js
const hasJSONContentType = contentType.indexOf("application/json") > -1;
if (isFormData) {
  return hasJSONContentType ? JSON.stringify(formDataToJSON(data)) : data;
}
```

Because the instance forces `Content-Type: application/json` on **every** request,
`hasJSONContentType` is `true`, so axios **serializes the `FormData` to JSON** instead
of sending a `multipart/form-data` body. The `File` does not survive JSON serialization,
so the request arrives with no multipart payload. `FileInterceptor("file")` (multer)
finds no file part → `@UploadedFile()` is `undefined` → the use case throws the 400.

This also explains why JSON endpoints (create CV version, set-output, archive) work
while only the file upload fails: only the multipart request is corrupted by the forced
JSON content type.

**Constraints / architecture:**
- `apps/web/.agents/rules/nextjs-api-workflow.md` mandates that cross-cutting request
  concerns (auth, tracing, retries, and — by extension — body/content-type handling)
  are **centralized in the single axios instance**, not reimplemented per service/hook.
  So the fix belongs in the axios request interceptor, not in the service.
- No server-side change is needed: the controller/interceptor/use-case are correct;
  they never receive a real multipart body today.
- The `.pdf`/`.docx` `File` objects carry the correct MIME type
  (`application/pdf` / `application/vnd.openxmlformats-officedocument.wordprocessingml.document`),
  which the browser preserves in the multipart part, satisfying the server's
  `ALLOWED_MIME_TYPES` check once the body is actually sent as multipart.

## Affected Files

| Action | File Path | Purpose |
|--------|-----------|---------|
| MODIFY | `apps/web/config/axios.config.ts` | In the request interceptor, strip the default `Content-Type` header when the body is `FormData`, so the browser sets `multipart/form-data` with a boundary. |
| MODIFY | `apps/web/config/axios.config.test.ts` | Add a unit test proving a `FormData` POST is not sent with an `application/json` content type and passes the `FormData` body through untouched. |

No other files change. In particular, `services/cv-versions.service.ts`,
`hooks/use-upload-cv.ts`, `features/profiles/profiles-view.tsx`, and the entire
`apps/api` side are already correct and stay as-is.

## Step-by-Step Implementation

### Step 1 — Strip `Content-Type` for `FormData` bodies in the request interceptor

- **File:** `apps/web/config/axios.config.ts`
- **Action:** MODIFY
- **Details:**
  - Locate the existing request interceptor success handler (starts at line 28:
    `axios.interceptors.request.use((config: InternalAxiosRequestConfig) => { … }`).
  - After the `Authorization` block (the `if (token) { config.headers.set("Authorization", …) }`
    at lines 34-38) and **before** the `if (isDev)` logging block, insert:

    ```ts
    // FormData must be sent as multipart/form-data with a browser-generated boundary.
    // The instance default `Content-Type: application/json` would otherwise make axios
    // 1.x serialize the FormData to JSON (dropping the file). Remove it so the browser
    // sets the correct multipart Content-Type + boundary.
    if (typeof FormData !== "undefined" && config.data instanceof FormData) {
      config.headers.delete("Content-Type");
    }
    ```
  - Do **not** manually set `Content-Type: multipart/form-data` — setting it without a
    boundary breaks the upload. Deleting it lets the browser/axios set the header with
    the boundary automatically.
  - `config.headers` is an `AxiosHeaders` instance here (the file already uses
    `config.headers.set(...)` / `config.headers.get(...)`), so `.delete("Content-Type")`
    is the correct API.
  - The `typeof FormData !== "undefined"` guard keeps this safe if the module is ever
    evaluated in a non-DOM context (SSR); in that path `config.data` is never a browser
    `FormData` anyway.
- **Why:** Removing the forced JSON content type is the minimal change that makes axios
  1.x send the multipart body instead of JSON-serializing it, fixing the dropped file at
  the one centralized seam all requests pass through.

### Step 2 — Add a unit test for the FormData content-type behavior

- **File:** `apps/web/config/axios.config.test.ts`
- **Action:** MODIFY
- **Details:**
  - This file already tests the request interceptor with a mock adapter
    (`setAdapter` swaps `axios.defaults.adapter`, and `buildResponse` returns a fake
    200). Reuse that exact pattern — do not add a new config or mock axios itself
    (per `apps/web/.agents/rules/testing-strategy.md` §5).
  - Inside the existing `describe("request interceptor", …)` block, add:

    ```ts
    it("removes the JSON Content-Type for FormData so the browser sets the multipart boundary", async () => {
      let seenConfig: InternalAxiosRequestConfig | undefined;

      setAdapter(async (config) => {
        seenConfig = config;

        return buildResponse(config, 200);
      });

      const form = new FormData();
      form.append("file", new Blob(["cv-bytes"], { type: "application/pdf" }), "cv.pdf");

      await axios.post("/cv-versions/abc/file", form);

      // Content-Type must NOT be application/json (which would trigger JSON serialization).
      expect(seenConfig?.headers.get("Content-Type")).toBeUndefined();
      // The FormData body passes through untouched (not stringified to JSON).
      expect(seenConfig?.data).toBeInstanceOf(FormData);
    });

    it("keeps application/json Content-Type for plain object bodies", async () => {
      let seenConfig: InternalAxiosRequestConfig | undefined;

      setAdapter(async (config) => {
        seenConfig = config;

        return buildResponse(config, 200);
      });

      await axios.post("/cv-versions", { name: "Backend", focus: "backend" });

      expect(seenConfig?.headers.get("Content-Type")).toContain("application/json");
    });
    ```
  - `FormData`, `Blob`, and `axios` are all available in the jsdom test environment used
    by `@repo/vitest-config/react`; no extra imports beyond what the test file already
    imports (`InternalAxiosRequestConfig` is already imported at line 1).
  - Note on the second assertion: axios only applies the default `application/json`
    content type when a body is present, so asserting it on an object POST is stable; do
    not assert content type on a GET.
- **Why:** Locks in the fix and guards against a future refactor of the interceptor
  silently reintroducing the JSON-serialization bug for uploads. Unit tier is correct
  here (pure interceptor logic via a mock adapter), matching the existing tests in this
  file.

## Architecture Decisions

- **Fix at the axios instance, not the service.** `nextjs-api-workflow.md` requires
  cross-cutting request handling to live in the single axios instance. Content-type
  negotiation for multipart bodies is cross-cutting: any future upload endpoint
  (e.g. avatar, attachment) benefits automatically, and services stay "thin: url +
  method → api.* call". This is preferred over the alternatives below.
- **Alternatives considered and rejected:**
  - *Per-call header override in `cv-versions.service.ts`* (e.g. pass
    `{ headers: { "Content-Type": undefined } }`): would require threading a `headers`
    argument through `api.utility.ts`'s `apiRequest`, which does not currently accept
    one — more invasive, and it duplicates content-type logic per upload site.
  - *Drop the instance-level `Content-Type: application/json` default entirely*: axios
    would still infer JSON for object bodies, but this is a broader behavioral change to
    every request and risks subtle regressions; the targeted interceptor guard is safer.
  - *Manually set `Content-Type: multipart/form-data`*: wrong — without the boundary
    parameter the server cannot parse the parts. Deleting the header is the correct move.
- **Delete vs. set-undefined.** `config.headers.delete("Content-Type")` is used because
  `config.headers` is an `AxiosHeaders` instance in the interceptor; `.delete()` is its
  first-class removal API and matches the file's existing `.set()`/`.get()` usage.

## Validation Criteria

- [ ] `apps/web/config/axios.config.ts` deletes `Content-Type` when `config.data` is a
      `FormData` instance, positioned after the auth header and before dev logging.
- [ ] New unit tests pass: `pnpm --filter web test` (specifically
      `config/axios.config.test.ts`).
- [ ] Type check passes: `pnpm --filter web check-types`.
- [ ] Lint passes: `pnpm --filter web lint`.
- [ ] **Manual smoke test** (requires `apps/api` running on `:3001` with its Postgres up,
      and `apps/web` on `:3000`):
  1. Sign in as a Postulante and open `/profiles`.
  2. On a CV version card, click "Subir PDF" and choose a `.pdf` (or `.docx`) file ≤ 10 MB.
  3. Expected: the request `POST /cv-versions/:id/file` returns `200`, the card's error
     text does not appear, the `cv-versions` query refetches, and (if it was a `borrador`)
     the version's `estado` advances to `disponible` (BR-9, per the use case).
  4. In the browser Network tab, confirm the request's `Content-Type` is
     `multipart/form-data; boundary=…` (not `application/json`) and the payload is the
     file, not `{}`.
  5. Negative check still works: uploading a `.txt` (wrong MIME) or a >10 MB file returns
     `400` with the corresponding server message ("must be a PDF or DOCX document" /
     "must be 10 MB or smaller"), proving the body now reaches the server.

## Open Questions

None. The root cause is confirmed against the installed axios version (`1.18.1`) and the
fix is self-contained to `apps/web`'s axios layer; no server or schema changes are required.

## Implementation Note (deviation from Step 1 as drafted)

`config.headers.delete("Content-Type")` alone was **not** sufficient and was caught by the
unit test added in Step 2. Reading `apps/web/node_modules/axios/lib/core/dispatchRequest.js:42-44`
showed that for `post`/`put`/`patch`, axios unconditionally re-adds
`Content-Type: application/x-www-form-urlencoded` whenever the header is absent at that
point — deleting it just meant the wrong default came back a few lines later, still with
no multipart boundary. The XHR adapter (`lib/adapters/xhr.js`) has no FormData-specific
guard against this the way the fetch adapter does.

The actual fix is `config.headers.set("Content-Type", false)` — axios's documented
"never set this header" sentinel. `AxiosHeaders#toJSON()` filters out `value === false`
before the header reaches `XMLHttpRequest.setRequestHeader`, and the same `false` value
also blocks `dispatchRequest`'s conditional re-injection (its `setContentType(value, false)`
call only overwrites when the header key is absent or `undefined`, not when it's `false`).
Implemented and verified in `apps/web/config/axios.config.ts` and
`apps/web/config/axios.config.test.ts`; all 9 tests in that file (73 in the full `apps/web`
suite) pass, plus `check-types` and `lint`.
