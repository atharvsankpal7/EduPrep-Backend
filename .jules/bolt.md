## 2024-05-24 - Parallelizing Sequential DB Calls
**Learning:** Found a nested loop executing sequential `await` calls in `getCETQuestions`, leading to N+1 performance issues.
**Action:** Used `Promise.all` to fetch data for all topics in parallel, significantly reducing total execution time. Also enriched the return data to avoid redundant DB calls in the controller.
