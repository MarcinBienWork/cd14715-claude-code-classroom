import type { AgentDefinition } from '@anthropic-ai/claude-agent-sdk';
import { CODE_QUALITY_ANALYZER_PROMPT } from '../prompts/code-quality-analyzer.prompt.js';

export const codeQualityAnalyzer: AgentDefinition = {
  description:
    'Analyzes source files for security vulnerabilities, performance issues and maintainability concerns. Use for every changed file in a pull request.',
  prompt: CODE_QUALITY_ANALYZER_PROMPT,
  tools: ['Read', 'Grep', 'Glob', 'Skill', 'mcp__eslint'],
  model: 'inherit'
};
