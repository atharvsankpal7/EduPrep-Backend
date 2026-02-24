## 2024-05-22 - N+1 Query Pattern in Topic Selection
**Learning:** The codebase heavily relies on iterating over structured data (e.g., subjects -> topics) and performing DB lookups inside loops (`findTopicByName`, `getRandomQuestionIdsFromTopics`). This leads to severe N+1 query performance issues, especially when coupled with sequential `await`.
**Action:** When working with nested data structures like `CETDistribution`, always flatten the structure first to collect IDs in batch (`findTopicsByNames`) and use `Promise.all` for parallel execution of unavoidable per-item queries.
