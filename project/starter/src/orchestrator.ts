import { query } from '@anthropic-ai/claude-agent-sdk';
import { ReviewReport, ReviewReportSchema, ReviewReportJSONSchema } from './types/index.js';
import { mcpServersConfig } from './config/mcp.config.js';
import { codeQualityAnalyzer, testCoverageAnalyzer, refactoringSuggester } from './agents/index.js';
import { buildOrchestratorPrompt } from './prompts/index.js';
import { logger } from './utils/logger.js';
import { RateLimiter } from './utils/rate-limiter.js';
import { ReviewError, ErrorCodes, withRetry, withTimeout, formatError } from './utils/error-handler.js';

/**
 * Orchestrator configuration options
 */
export interface OrchestratorOptions {
  /** Model to use (defaults to ANTHROPIC_MODEL) */
  model?: string;
  /** Maximum agent turns for the whole review */
  maxTurns?: number;
  /** Timeout for a single review attempt in milliseconds */
  timeoutMs?: number;
  /** Number of attempts before giving up */
  maxRetries?: number;
  /** Shared rate limiter */
  rateLimiter?: RateLimiter;
}

/**
 * Main Code Review Orchestrator
 * Coordinates subagents to analyze pull requests and generate comprehensive reports
 */
export class CodeReviewOrchestrator {
  private readonly model: string;
  private readonly maxTurns: number;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly rateLimiter: RateLimiter;

  constructor(options: OrchestratorOptions = {}) {
    const model = options.model ?? process.env.ANTHROPIC_MODEL;
    if (!model) {
      throw new ReviewError('ANTHROPIC_MODEL environment variable is required', ErrorCodes.INVALID_CONFIG);
    }
    this.model = model;
    this.maxTurns = options.maxTurns ?? 100;
    this.timeoutMs = options.timeoutMs ?? 20 * 60 * 1000;
    this.maxRetries = options.maxRetries ?? 2;
    this.rateLimiter = options.rateLimiter ?? new RateLimiter();
  }

  /**
   * Review a pull request using parallel subagent analysis
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param prNumber - Pull request number
   * @returns Complete review report
   */
  async reviewPullRequest(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<ReviewReport> {
    const startedAt = Date.now();

    await this.rateLimiter.acquire(50000);
    try {
      const report = await withRetry(
        () => withTimeout(
          () => this.runReview(owner, repo, prNumber),
          this.timeoutMs,
          `Review of ${owner}/${repo}#${prNumber} timed out`
        ),
        this.maxRetries,
        2000
      );
      report.metadata.duration = Date.now() - startedAt;
      return report;
    } finally {
      this.rateLimiter.release();
    }
  }

  private async runReview(owner: string, repo: string, prNumber: number): Promise<ReviewReport> {
    const result = query({
      prompt: buildOrchestratorPrompt(owner, repo, prNumber),
      options: {
        model: this.model,
        cwd: process.env.PROJECT_ROOT || process.cwd(),
        settingSources: ['project'],
        mcpServers: mcpServersConfig,
        agents: {
          'code-quality-analyzer': codeQualityAnalyzer,
          'test-coverage-analyzer': testCoverageAnalyzer,
          'refactoring-suggester': refactoringSuggester
        },
        allowedTools: [
          'Task',
          'Read',
          'Grep',
          'Glob',
          'Skill',
          'mcp__github',
          'mcp__eslint'
        ],
        maxTurns: this.maxTurns,
        permissionMode: 'dontAsk',
        outputFormat: { type: 'json_schema', schema: ReviewReportJSONSchema }
      }
    });

    for await (const message of result) {
      if (message.type === 'assistant') {
        for (const block of message.message.content) {
          if (block.type === 'tool_use' && block.name === 'Task') {
            const input = block.input as { subagent_type?: string };
            logger.info(`Spawning subagent: ${input.subagent_type ?? 'unknown'}`);
          }
        }
      } else if (message.type === 'result') {
        if (message.subtype !== 'success') {
          throw new ReviewError(`Agent run ended with: ${message.subtype}`, ErrorCodes.AGENT_FAILED);
        }
        const parsed = ReviewReportSchema.safeParse(message.structured_output);
        if (!parsed.success) {
          throw new ReviewError(
            `Structured output failed validation: ${formatError(parsed.error)}`,
            ErrorCodes.VALIDATION_FAILED,
            { issues: parsed.error.issues }
          );
        }
        return parsed.data;
      }
    }
    throw new ReviewError('Agent finished without a result', ErrorCodes.STRUCTURED_OUTPUT_FAILED);
  }
}
