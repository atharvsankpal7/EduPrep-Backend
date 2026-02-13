## 2025-02-14 - Secrets Committed Despite .gitignore
**Vulnerability:** Found `.env` file containing database credentials and JWT secrets committed to the repository, despite `.env` being listed in `.gitignore`. Also found `rzp-key.csv` containing Razorpay keys.
**Learning:** The `.env` file was likely added with `git add -f` or added before being ignored. Simply adding a file to `.gitignore` does not remove it if it's already tracked.
**Prevention:** Always verify tracked files using `git ls-files` even if `.gitignore` seems correct. Use pre-commit hooks to scan for secrets.
