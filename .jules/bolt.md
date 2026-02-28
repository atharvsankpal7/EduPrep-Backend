# Bolt's Journal

## 2024-11-20 - ORDER BY RANDOM() limit replacement
**Learning:** Replacing PostgreSQL's `ORDER BY RANDOM() LIMIT N` with an in-memory application-side shuffle is a severe anti-pattern for database-backed apps. It forces the database to send *all* matching rows over the network to the application memory, causing OOMs and network overhead, whereas PostgreSQL optimizes the random sort efficiently for Top-N constraints.
**Action:** Do not attempt to bypass `ORDER BY RANDOM()` by fetching all IDs into application memory for random subset selection. Focus on other areas like parallelization, caching, or N+1 queries.
