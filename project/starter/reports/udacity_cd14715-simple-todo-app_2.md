# 🔍 Code Review Report

## Summary

| Metric | Value |
|--------|-------|
| **Overall Score** | 15/100 |
| **Files Reviewed** | 1 |
| **Critical Issues** | 3 |
| **High Priority Tests** | 10 |
| **Refactoring Opportunities** | 5 |

## 🎯 Top Recommendations

1. 🚨 **Security - SQL Injection**: IMMEDIATE ACTION REQUIRED: Replace all SQL string concatenation and interpolation with parameterized queries in the three new functions (searchTodos, searchTodosByStatus, getTodosByUser). These functions are highly exploitable and allow attackers to bypass authentication, access unauthorized data, modify/delete data, or execute arbitrary database commands.
   - Files: src/todo.ts

2. 🚨 **Type Safety**: Change searchTodosByStatus parameter type from 'string' to 'boolean' to prevent type confusion and simplify the SQL injection vulnerability. The current string type makes it easier for attackers to inject malicious SQL.
   - Files: src/todo.ts

3. 🚨 **Test Coverage**: Create comprehensive test suite (tests/todo.test.ts) with priority focus on testing the three vulnerable functions to demonstrate SQL injection flaws and verify fixes. Zero test coverage exists for the entire file.
   - Files: src/todo.ts

4. ⚠️ **Authorization**: Add authorization checks to getTodosByUser function to verify that the requesting user has permission to access the requested userId's todos. Current implementation could allow horizontal privilege escalation.
   - Files: src/todo.ts

5. ⚠️ **Input Validation**: Add input validation for all user-provided parameters (keyword, userId, id) in the new search functions. Validate presence, type, length limits, and format to prevent invalid data from reaching database layer and potential DoS attacks.
   - Files: src/todo.ts

## 📁 File Details

### 📄 `src/todo.ts`

**Quality Score:** 15/100 | **Coverage:** ~0%

#### Issues (11)
  - Line 121: `critical` SQL Injection vulnerability: User input 'keyword' is directly interpolated into SQL query using template literals without any sanitization or parameterization. An attacker could inject malicious SQL like `' OR '1'='1' --` to access unauthorized data or `'; DROP TABLE todos; --` to destroy data.
  - Line 131: `critical` SQL Injection vulnerability: User input 'completed' is directly concatenated into SQL query without validation or parameterization. An attacker could inject `1 OR 1=1` to bypass the WHERE clause or use more sophisticated attacks to extract sensitive data.
  - Line 142: `critical` SQL Injection vulnerability: User input 'userId' is directly interpolated into SQL query using template literals. An attacker could inject `' OR '1'='1` to access all todos across all users, completely bypassing authorization, or use UNION attacks to extract data from other tables.

  *...and 8 more*

#### Test Gaps (10)
  - `searchTodos(keyword: string): Promise<Todo[]> [lines 119-124]` (critical priority)
  - `searchTodos(keyword: string): Promise<Todo[]> [lines 119-124]` (critical priority)

  *...and 8 more*

#### Refactoring Opportunities (5)
  - **pattern-improvement**: Apply parameterized queries pattern consistently to prevent SQL injection and improve consistency with existing secure functions
  - **extract-function**: Extract validation rules into smaller, composable validator functions

  *...and 3 more*

---

*Generated at 2026-11-20T00:00:00.000Z • Duration: 298764ms*
