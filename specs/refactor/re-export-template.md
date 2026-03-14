# Compatibility Re-Export Pattern

When moving a file from its original location to a new location, the original
file must become a thin re-export shim so that existing consumers continue to
work without changes. This document defines the exact pattern to follow.

## Template

Given: moving `src/foo/bar.ts` exports to `src/baz/bar.ts`.

Replace `src/foo/bar.ts` with:

```typescript
/**
 * @deprecated Import from '../baz/bar.js' instead.
 * This re-export will be removed in a future release.
 */
export { namedExportA, namedExportB } from '../baz/bar.js';
export type { TypeExportC, TypeExportD } from '../baz/bar.js';
```

## Rules

1. **Use explicit named re-exports.** Never use `export *` — it hides what is
   being re-exported and makes it impossible to detect unused re-exports.

2. **Add `@deprecated` JSDoc** on the first re-export line (or as a file-level
   comment). The deprecation message must specify the new import path.

3. **Separate value and type re-exports.** Use `export type { ... }` for types
   and interfaces to preserve TypeScript's `isolatedModules` compatibility.

4. **Do not re-export default exports.** If the original file had a default
   export, convert consumers to named imports as part of the move.

5. **One shim per moved file.** Do not combine multiple moved files into a
   single shim.

## Runtime Deprecation Warning (Optional)

For dev-mode visibility, add a top-level warning that fires on first import:

```typescript
if (process.env.NODE_ENV !== 'production') {
  console.warn(
    '[occ] src/foo/bar.ts is deprecated. ' +
    "Update imports to use '../baz/bar.js' instead."
  );
}
```

This is optional and should only be used for high-traffic paths where you want
to ensure consumers notice the deprecation quickly.

## Lifecycle

1. **Phase N** — Move the implementation; create the re-export shim.
2. **Phase N+1** — Migrate all consumers to the new path.
3. **Phase N+2** — Delete the shim file.

Each step is a separate PR (< 300 lines).

## Example

Moving `getCell`, `renderCell`, `isNonEmptyCell` from `src/sheet/inspect.ts`
to `src/inspect/xlsx-cells.ts` (per architecture.md Decision D3):

**New file `src/inspect/xlsx-cells.ts`:** Contains the extracted functions.

**Updated `src/sheet/inspect.ts`:** Retains its own logic and adds at the
bottom:

```typescript
/**
 * @deprecated Import from '../inspect/xlsx-cells.js' instead.
 */
export { getCell, renderCell, isNonEmptyCell } from '../inspect/xlsx-cells.js';
```

**Consumer `src/table/inspect-xlsx.ts`:** Updated import path:

```typescript
// Before:
import { getCell, renderCell, isNonEmptyCell } from '../sheet/inspect.js';

// After:
import { getCell, renderCell, isNonEmptyCell } from '../inspect/xlsx-cells.js';
```
