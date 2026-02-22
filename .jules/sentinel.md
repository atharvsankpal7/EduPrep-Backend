# Sentinel's Journal

## 2024-10-25 - User Enumeration in Passport Strategy
**Vulnerability:** The local passport strategy returned specific error messages ("User not found" vs "Wrong password") and performed password comparison only if the user existed.
**Learning:** This allowed attackers to enumerate valid email addresses and use timing attacks to guess user existence.
**Prevention:** Always return a generic error message ("Invalid email or password") and ensure constant-time operations by performing a dummy hash comparison when the user is not found.

## 2024-10-26 - DoS via Excel Optimization Failure and DB Limits
**Vulnerability:** The Excel processor attempted to optimize topic lookups by pre-fetching all topics. However, missing data in a single row caused the pre-fetch loop to crash (or throw), disabling the optimization for the entire file and falling back to N+1 queries (DoS via performance degradation). Additionally, passing all unique topics to a single SQL query risked hitting DB driver parameter limits (DoS via DB crash).
**Learning:** Optimizations that rely on unvalidated user input are fragile. A single bad input can disable the optimization, causing massive performance degradation. Also, ORM methods like `inArray` often don't handle batching automatically.
**Prevention:** Validate input strictly before using it in optimization logic. Always batch large database lookups (e.g., chunks of 1000) to respect driver limits.
