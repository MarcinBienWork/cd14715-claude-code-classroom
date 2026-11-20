import type { AgentDefinition } from '@anthropic-ai/claude-agent-sdk';
import { TEST_COVERAGE_ANALYZER_PROMPT } from '../prompts/test-coverage-analyzer.prompt.js';

export const testCoverageAnalyzer: AgentDefinition = {
  description:
    'Evaluates test coverage of changed files by comparing them with existing tests, and suggests specific missing test cases with assertions.',
  prompt: TEST_COVERAGE_ANALYZER_PROMPT,
  tools: ['Read', 'Grep', 'Glob', 'Skill', 'mcp__github__get_file_contents'],
  model: 'inherit'
};
