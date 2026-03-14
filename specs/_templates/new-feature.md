# Feature: [Name]

## Module Placement

Which module(s) does this feature belong in?

| Module | What changes |
|--------|-------------|
| `???`  | ...         |

Refer to `CLAUDE.md` for the module map and dependency DAG.

## Public API Changes

- [ ] New exports added to: ...
- [ ] Existing exports modified: ...
- [ ] No public API changes

## Dependency Check

Does this feature introduce new inter-module dependencies?

- [ ] No new cross-module imports
- [ ] New dependency: `X` → `Y` (must flow downward in the DAG)

If a new cross-module dependency is needed, verify it conforms to the allowed
dependencies in `scripts/check-imports.mjs`.

## Implementation Plan

- [ ] Step 1: ...
- [ ] Step 2: ...
- [ ] Step 3: ...
- [ ] Add/update tests
- [ ] Run verification suite:
  ```bash
  npx tsc --noEmit
  npm test
  node scripts/check-imports.mjs
  npx madge --circular --extensions ts,tsx src/
  ```

## Notes

<!-- Design decisions, trade-offs, alternatives considered -->
