## 2024-10-25 - Bun Test Mocking & Module Loading
**Learning:** `bun:test` mocks defined with `mock.module` may not apply to static imports if the test file imports the module under test before defining the mocks. This is due to module resolution timing.
**Action:** Use dynamic `await import(...)` to load the module under test *after* setting up all `mock.module` definitions to ensure mocks are correctly intercepted.
