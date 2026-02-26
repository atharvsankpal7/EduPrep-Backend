# Sentinel's Journal

## 2024-10-25 - User Enumeration in Passport Strategy
**Vulnerability:** The local passport strategy returned specific error messages ("User not found" vs "Wrong password") and performed password comparison only if the user existed.
**Learning:** This allowed attackers to enumerate valid email addresses and use timing attacks to guess user existence.
**Prevention:** Always return a generic error message ("Invalid email or password") and ensure constant-time operations by performing a dummy hash comparison when the user is not found.

## 2024-10-27 - IDOR in Test Results Retrieval
**Vulnerability:** The `getTestResult` controller allowed any authenticated user to fetch any test result by ID, without verifying if the result belonged to the requesting user.
**Learning:** Relying solely on authentication (checking if a user is logged in) is insufficient for resource access. Authorization checks must be performed for every resource access to ensure ownership or privilege.
**Prevention:** Explicitly verify that the resource's owner ID matches the authenticated user's ID (`testResult.studentId === req.loggedInUser.id`) or check for administrative privileges before returning data.
