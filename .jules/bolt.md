## 2025-05-24 - Batch Processing Fragility
**Learning:** Batch optimizations (like fetching topics for all rows at once) can be fragile if they rely on all inputs being valid. A single invalid input (e.g. missing field) can cause the entire batch step to fail or be skipped (via try-catch), forcing a fallback to N+1 individual queries.
**Action:** Always validate and filter inputs *before* attempting batch operations. Ensure invalid items are skipped or handled individually without compromising the batch efficiency for valid items.

## 2025-05-24 - Bun Test Mocking
**Learning:** When using `bun test` with `mock.module`, static imports are hoisted and resolved *before* mocks are applied. To test a module with mocked dependencies, you must use dynamic `import()` for the module under test *after* defining the mocks.
**Action:** Use `await import(...)` inside `beforeEach` or test cases when testing modules with `mock.module`.
# Bolt's Journal

## 2024-05-22 - Initial Setup
**Learning:** Establishing a baseline for performance tracking.
**Action:** Always check this file before starting.
