# Sentinel's Journal

## 2024-10-25 - User Enumeration in Passport Strategy
**Vulnerability:** The local passport strategy returned specific error messages ("User not found" vs "Wrong password") and performed password comparison only if the user existed.
**Learning:** This allowed attackers to enumerate valid email addresses and use timing attacks to guess user existence.
**Prevention:** Always return a generic error message ("Invalid email or password") and ensure constant-time operations by performing a dummy hash comparison when the user is not found.

## 2024-10-25 - Insecure Direct Object Reference (IDOR) in Test Results
**Vulnerability:** The `getTestResult` endpoint allowed any authenticated user to access any test result by simply guessing or enumerating the `id` (UUID), as it lacked a check to ensure the requesting user owned the result.
**Learning:** Relying solely on the unpredictability of UUIDs is "security through obscurity" and is insufficient. Users' data must always be explicitly scoped to their own ID unless they are an admin.
**Prevention:** Always implement an ownership check (e.g., `resource.userId === currentUser.id`) immediately after fetching a resource.
