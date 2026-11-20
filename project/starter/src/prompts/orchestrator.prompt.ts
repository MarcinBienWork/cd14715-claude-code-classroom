/**
 * Build the orchestrator prompt for a pull request review
 */
export function buildOrchestratorPrompt(owner: string, repo: string, prNumber: number): string {
  return `Review pull request #${prNumber} in the GitHub repository ${owner}/${repo}.

## Step 1: Fetch PR data
Use the GitHub MCP tools (mcp__github__pull_request_read, and mcp__github__get_file_contents if needed) to fetch the PR metadata, the list of changed files and their contents/patches. Only review source files (skip lockfiles, images, generated files).

## Step 2: Run the three subagents
For EVERY changed source file, invoke ALL THREE subagents using the Task tool. Launch them in parallel (multiple Task calls in the same turn) since the analyses are independent. Include the file path and its content/patch in each task description:
- Use the code-quality-analyzer agent to analyze each file for security, performance and best practices.
- Use the test-coverage-analyzer agent to evaluate test coverage and suggest specific tests for each file.
- Use the refactoring-suggester agent to find refactoring opportunities with before/after examples for each file.

## Step 3: Handle failures
If a subagent fails or returns unusable output for a file, retry once. If it still fails, fill that part with an empty result (empty arrays, score 0 or coverageEstimate 0) and state the failure in its summary. Never skip the report.

## Step 4: Aggregate into the ReviewReport
Produce the final structured output matching the ReviewReport schema:
- pullRequest: { owner: "${owner}", repo: "${repo}", number: ${prNumber} }
- fileReviews: one entry per file with codeQuality, testCoverage and refactorings from the subagents (file fields must be the file path)
- summary: totalFiles; overallScore (0-100, average of codeQuality.overallScore weighted down for critical issues); criticalIssues (count of issues with severity "critical"); highPriorityTests (count of untestedPaths with priority "critical" or "high"); refactoringOpportunities (total suggestions)
- recommendations: prioritized, de-duplicated actions with priority, category, description and affected files
- metadata: analyzedAt (ISO timestamp), duration (0; it will be overwritten), agentVersions { "code-quality-analyzer": "1.0.0", "test-coverage-analyzer": "1.0.0", "refactoring-suggester": "1.0.0" }

Do not invent findings: base everything on the subagent results.`;
}
