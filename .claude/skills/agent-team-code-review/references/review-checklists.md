# Review Domain Checklists

Use these checklists to guide each reviewer teammate's focus area. Each reviewer should report findings with severity ratings: **Critical**, **High**, **Medium**, **Low**.

## Security Reviewer

- Input validation and sanitization (SQL injection, XSS, command injection)
- Authentication and authorization flaws (broken access control, missing auth checks)
- Sensitive data exposure (secrets in code, PII logging, insecure storage)
- Dependency vulnerabilities (known CVEs, outdated packages)
- CSRF, SSRF, and request forgery vectors
- Insecure deserialization or eval usage
- Hardcoded credentials, API keys, or tokens
- Missing rate limiting or abuse prevention
- Improper error handling that leaks internal details

## Performance Reviewer

- N+1 queries and unnecessary database calls
- Missing or incorrect indexes implied by query patterns
- Unbounded loops, recursion without limits, or O(n^2+) algorithms on user data
- Memory leaks (unclosed streams, event listeners, retained references)
- Missing pagination on list endpoints or large data fetches
- Blocking I/O on hot paths or event loops
- Redundant computation that should be cached or memoized
- Bundle size impact (large imports, tree-shaking issues)
- Missing connection pooling or resource reuse

## Correctness & Logic Reviewer

- Off-by-one errors, boundary conditions, edge cases
- Race conditions and concurrency issues
- Null/undefined handling and defensive coding
- Error propagation (swallowed errors, missing try/catch, unhandled promise rejections)
- Type safety violations (any casts, incorrect generics, missing discriminants)
- Business logic correctness against requirements
- State management consistency (stale state, mutation of shared state)
- API contract adherence (request/response shapes, status codes)
- Data integrity (missing transactions, partial updates)

## Maintainability & Code Quality Reviewer

- Naming clarity (variables, functions, types reflect intent)
- Function size and single-responsibility adherence
- Dead code, unused imports, commented-out blocks
- Duplicated logic that should be extracted
- Consistent patterns with the rest of the codebase
- Appropriate abstraction level (not over-engineered, not under-abstracted)
- Missing or misleading comments on non-obvious logic
- Test coverage for new/changed code paths
- Breaking changes to public APIs or shared interfaces
