# Sentinel's Journal

## 2024-10-25 - User Enumeration in Passport Strategy
**Vulnerability:** The local passport strategy returned specific error messages ("User not found" vs "Wrong password") and performed password comparison only if the user existed.
**Learning:** This allowed attackers to enumerate valid email addresses and use timing attacks to guess user existence.
**Prevention:** Always return a generic error message ("Invalid email or password") and ensure constant-time operations by performing a dummy hash comparison when the user is not found.

## 2024-10-25 - IDOR in Test Results
**Vulnerability:** The `getTestResult` endpoint allowed any authenticated user to view the test results of any other user by knowing the result ID (UUID).
**Learning:** The controller fetched the resource by ID but failed to compare the resource's owner (`studentId`) with the requesting user (`req.loggedInUser.id`).
**Prevention:** Always verify ownership of a resource immediately after fetching it, unless the user has admin privileges. Add explicit authorization checks (e.g. `resource.ownerId === userId`) before returning sensitive data.
