# Sentinel's Journal

## 2024-10-25 - User Enumeration in Passport Strategy
**Vulnerability:** The local passport strategy returned specific error messages ("User not found" vs "Wrong password") and performed password comparison only if the user existed.
**Learning:** This allowed attackers to enumerate valid email addresses and use timing attacks to guess user existence.
**Prevention:** Always return a generic error message ("Invalid email or password") and ensure constant-time operations by performing a dummy hash comparison when the user is not found.

## 2024-11-20 - IDOR in Test Result Controller
**Vulnerability:** The `getTestResult` endpoint allowed any authenticated user to fetch test results by ID without checking if the result belonged to the requesting user.
**Learning:** Controller logic blindly trusted the user-provided ID, assuming access was legitimate because the user was authenticated.
**Prevention:** Always verify ownership of resources (e.g., `result.studentId === req.user.id`) before returning them, unless the user has admin privileges.
