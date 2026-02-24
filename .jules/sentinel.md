# Sentinel's Journal

## 2024-10-25 - User Enumeration in Passport Strategy
**Vulnerability:** The local passport strategy returned specific error messages ("User not found" vs "Wrong password") and performed password comparison only if the user existed.
**Learning:** This allowed attackers to enumerate valid email addresses and use timing attacks to guess user existence.
**Prevention:** Always return a generic error message ("Invalid email or password") and ensure constant-time operations by performing a dummy hash comparison when the user is not found.

## 2024-10-26 - IDOR in Test Result Retrieval
**Vulnerability:** The `getTestResult` controller allowed any authenticated user to access any test result by ID, as it lacked an ownership check.
**Learning:** Fetching a resource by ID without validating the owner against the session user leads to data exposure. Relying solely on authentication is insufficient for authorization.
**Prevention:** Implement mandatory ownership verification for all resource access. Prefer database queries that include the user ID in the `WHERE` clause (e.g., `WHERE id = ? AND user_id = ?`) over application-level checks when possible.
