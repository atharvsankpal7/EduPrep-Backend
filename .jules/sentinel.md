# Sentinel's Journal

## 2024-10-25 - User Enumeration in Passport Strategy
**Vulnerability:** The local passport strategy returned specific error messages ("User not found" vs "Wrong password") and performed password comparison only if the user existed.
**Learning:** This allowed attackers to enumerate valid email addresses and use timing attacks to guess user existence.
**Prevention:** Always return a generic error message ("Invalid email or password") and ensure constant-time operations by performing a dummy hash comparison when the user is not found.
## CSRF Protection
- **Vulnerability**: Missing CSRF middleware allowed potential cross-site request forgery attacks on state-mutating endpoints.
- **Fix**: Installed and integrated the `csurf` package globally in `src/app.ts`. Configured it to use cookies (`{ cookie: true }`) as the app relies on JWT/cookies. Added a `GET /api/v1/csrf-token` endpoint for the frontend to fetch the token, explicitly added `X-CSRF-Token` to CORS `allowedHeaders`, and updated the global error handler to catch `EBADCSRFTOKEN` errors and return a clean 403 Forbidden response.
- **Testing**: Added integration tests in `src/tests/csrf.test.ts` using `supertest` to verify the token endpoint and the 403 response when the token is missing.
