
## 2024-03-01 - [Authentication Bypass on Topic Routes]
**Vulnerability:** The endpoints in `src/router/topic.routes.ts` (`/cet`, `/all`, `/subject/:subjectName`) were publicly accessible. The `authMiddleware` was imported but never applied to the router.
**Learning:** Always verify that imported middleware is actually utilized. A common pattern (`router.use(middleware)`) was missed for an entire group of routes, leading to an authorization bypass where anonymous users could query the application's internal topic taxonomy.
**Prevention:** Add linter rules for unused imports and ensure API tests specifically verify authentication requirements (e.g., expecting 401 Unauthorized for requests without sessions) for all non-public endpoints.
