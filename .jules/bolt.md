## 2024-11-20 - [O(N^2) Array.find to O(N) Map lookup]
**Learning:** Found a nested loop O(N^2) performance anti-pattern where a controller iterates over test questions and uses `Array.prototype.find` on selected answers to match them. Since N and M are generally equal, this results in O(N^2) time complexity.
**Action:** Convert the answers array to a `Map` before iterating, allowing O(1) lookups and bringing overall time complexity down to O(N). Always favor Map lookups over `Array.find` within loops when dealing with correlating items by ID.
