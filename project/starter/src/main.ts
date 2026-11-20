import * as dotenv from 'dotenv';
import { mkdir, writeFile } from 'node:fs/promises';
import { CodeReviewOrchestrator } from './orchestrator.js';
import { ReportGenerator } from './utils/report-generator.js';
import { formatError } from './utils/error-handler.js';

// Load environment variables
dotenv.config();

function fail(...lines: string[]): never {
  for (const line of lines) console.error(line);
  process.exit(1);
}

/**
 * Main entry point for the Claude Multi-Agent Code Review System
 * Usage: npm run dev -- <owner> <repo> <pr-number>
 */
async function main(): Promise<void> {
  const [owner, repo, prStr] = process.argv.slice(2);

  if (!owner || !repo || !prStr) {
    fail('Usage: npm run dev -- <owner> <repo> <pr-number>', 'Example: npm run dev -- octocat Hello-World 1');
  }
  if (!/^\d+$/.test(prStr) || parseInt(prStr, 10) <= 0) {
    fail(`Invalid PR number "${prStr}": it must be a positive integer.`);
  }
  const prNumber = parseInt(prStr, 10);

  const hasAnthropicAPI = !!process.env.ANTHROPIC_API_KEY;
  const hasAWSKeys = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
  if (!hasAnthropicAPI && !hasAWSKeys) {
    fail(
      'Authentication required. Set one of:',
      '  - ANTHROPIC_API_KEY, or',
      '  - AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY + AWS_REGION (Bedrock)'
    );
  }
  if (hasAnthropicAPI) {
    console.log('🔐 Using Anthropic API authentication');
  } else {
    if (!process.env.AWS_REGION) fail('AWS_REGION must be set when using AWS Bedrock.');
    console.log('🔐 Using AWS Bedrock authentication');
  }

  if (!process.env.ANTHROPIC_MODEL) {
    fail(
      'ANTHROPIC_MODEL environment variable is required.',
      '  Anthropic API: ANTHROPIC_MODEL=claude-sonnet-4-5-20250929',
      '  AWS Bedrock:   ANTHROPIC_MODEL=us.anthropic.claude-sonnet-4-5-20250929-v1:0'
    );
  }

  try {
    console.log(`🔍 Reviewing ${owner}/${repo}#${prNumber}...`);
    const orchestrator = new CodeReviewOrchestrator();
    const report = await orchestrator.reviewPullRequest(owner, repo, prNumber);

    const generator = new ReportGenerator();
    const dir = 'reports';
    const base = `${dir}/${owner}_${repo}_${prNumber}`;
    await mkdir(dir, { recursive: true });
    await writeFile(`${base}.json`, generator.generateJSONReport(report));
    await writeFile(`${base}.md`, generator.generateMarkdownReport(report));
    await writeFile(`${base}.html`, generator.generateHTMLReport(report));

    console.log(`✅ Overall score: ${report.summary.overallScore}/100 (${report.summary.totalFiles} files)`);
    console.log(`📄 Reports saved: ${base}.json, ${base}.md, ${base}.html`);
  } catch (error) {
    console.error(`❌ Review failed: ${formatError(error)}`);
    process.exit(1);
  }
}

main();
