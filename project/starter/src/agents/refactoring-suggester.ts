import type { AgentDefinition } from '@anthropic-ai/claude-agent-sdk';
import { REFACTORING_SUGGESTER_PROMPT } from '../prompts/refactoring-suggester.prompt.js';

export const refactoringSuggester: AgentDefinition = {
  description:
    'Identifies refactoring opportunities: design patterns, modern language features, extract-function candidates and dead code, with before/after examples.',
  prompt: REFACTORING_SUGGESTER_PROMPT,
  tools: ['Read', 'Grep', 'Glob', 'Skill'],
  model: 'inherit'
};
