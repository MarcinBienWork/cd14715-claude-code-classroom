import { describe, it, expect, vi, beforeEach } from 'vitest';

const queryMock = vi.fn();
vi.mock('@anthropic-ai/claude-agent-sdk', () => ({ query: (args: unknown) => queryMock(args) }));

import { CodeReviewOrchestrator } from '../src/orchestrator.js';
import { RateLimiter } from '../src/utils/rate-limiter.js';

const validReport = {
  pullRequest: { owner: 'o', repo: 'r', number: 1 },
  fileReviews: [],
  summary: { totalFiles: 0, overallScore: 100, criticalIssues: 0, highPriorityTests: 0, refactoringOpportunities: 0 },
  recommendations: [],
  metadata: { analyzedAt: 'now', duration: 0, agentVersions: {} }
};

async function* stream(output: unknown, subtype = 'success') {
  yield { type: 'result', subtype, structured_output: output };
}

describe('CodeReviewOrchestrator', () => {
  beforeEach(() => {
    process.env.ANTHROPIC_MODEL = 'test-model';
    queryMock.mockReset();
  });

  it('initializes with defaults and requires a model', () => {
    expect(() => new CodeReviewOrchestrator()).not.toThrow();
    delete process.env.ANTHROPIC_MODEL;
    expect(() => new CodeReviewOrchestrator()).toThrow();
  });

  it('configures the query with Task tool, all agents and MCP servers', async () => {
    queryMock.mockReturnValue(stream(validReport));
    const o = new CodeReviewOrchestrator({ rateLimiter: new RateLimiter(), maxRetries: 1 });
    const report = await o.reviewPullRequest('o', 'r', 1);
    expect(report.pullRequest.number).toBe(1);
    const { options } = queryMock.mock.calls[0]![0];
    expect(options.allowedTools).toContain('Task');
    expect(Object.keys(options.agents)).toHaveLength(3);
    expect(Object.keys(options.mcpServers)).toEqual(['github', 'eslint']);
    expect(options.model).toBe('test-model');
  });

  it('rejects output that fails Zod validation', async () => {
    queryMock.mockReturnValue(stream({ nope: true }));
    const o = new CodeReviewOrchestrator({ maxRetries: 1 });
    await expect(o.reviewPullRequest('o', 'r', 1)).rejects.toThrow();
  });

  it('fails when the agent run errors', async () => {
    queryMock.mockReturnValue(stream(undefined, 'error_max_turns'));
    const o = new CodeReviewOrchestrator({ maxRetries: 1 });
    await expect(o.reviewPullRequest('o', 'r', 1)).rejects.toThrow();
  });

  describe('Integration', () => {
    it.skip('should review a real small PR (octocat/Hello-World#1)', async () => {
      // Requires real API keys; run manually: npm run dev -- octocat Hello-World 1
    });
  });
});
