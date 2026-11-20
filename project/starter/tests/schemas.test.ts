import { describe, it, expect } from 'vitest';
import {
  CodeQualityResultSchema,
  TestCoverageResultSchema,
  RefactoringSuggestionSchema,
  ReviewReportSchema,
  ReviewReportJSONSchema,
  CodeQualityResultJSONSchema
} from '../src/types/index.js';

const codeQuality = {
  file: 'a.ts',
  issues: [{ line: 3, severity: 'high', category: 'security', description: 'd', suggestion: 's' }],
  overallScore: 80,
  summary: 'ok'
};
const testCoverage = {
  file: 'a.ts',
  hasTests: false,
  testFiles: [],
  untestedPaths: [{ type: 'function', location: 'f', priority: 'high', reasoning: 'r', suggestedTest: 't' }],
  coverageEstimate: 0,
  summary: 'none'
};
const refactoring = {
  file: 'a.ts',
  suggestions: [{ type: 'simplify', location: 'f', impact: 'low', description: 'd', before: 'b', after: 'a', benefits: 'x' }],
  summary: 'ok'
};
const report = {
  pullRequest: { owner: 'o', repo: 'r', number: 1 },
  fileReviews: [{ file: 'a.ts', codeQuality, testCoverage, refactorings: refactoring }],
  summary: { totalFiles: 1, overallScore: 80, criticalIssues: 0, highPriorityTests: 1, refactoringOpportunities: 1 },
  recommendations: [{ priority: 'high', category: 'security', description: 'd', files: ['a.ts'] }],
  metadata: { analyzedAt: new Date().toISOString(), duration: 1, agentVersions: { a: '1' } }
};

describe('schemas: valid data', () => {
  it('accepts valid results', () => {
    expect(() => CodeQualityResultSchema.parse(codeQuality)).not.toThrow();
    expect(() => TestCoverageResultSchema.parse(testCoverage)).not.toThrow();
    expect(() => RefactoringSuggestionSchema.parse(refactoring)).not.toThrow();
    expect(() => ReviewReportSchema.parse(report)).not.toThrow();
  });
});

describe('schemas: invalid data', () => {
  it('rejects bad severity', () => {
    const bad = { ...codeQuality, issues: [{ ...codeQuality.issues[0], severity: 'urgent' }] };
    expect(() => CodeQualityResultSchema.parse(bad)).toThrow();
  });
  it('rejects missing fields and wrong types', () => {
    expect(() => TestCoverageResultSchema.parse({ file: 'a' })).toThrow();
    expect(() => RefactoringSuggestionSchema.parse({ ...refactoring, suggestions: 'x' })).toThrow();
    expect(() => ReviewReportSchema.parse({ ...report, pullRequest: { owner: 'o' } })).toThrow();
  });
});

describe('schemas: edge cases', () => {
  it('accepts empty arrays and boundary scores', () => {
    expect(() => CodeQualityResultSchema.parse({ ...codeQuality, issues: [], overallScore: 0 })).not.toThrow();
    expect(() => CodeQualityResultSchema.parse({ ...codeQuality, overallScore: 100 })).not.toThrow();
    expect(() => ReviewReportSchema.parse({ ...report, fileReviews: [], recommendations: [] })).not.toThrow();
  });
  it('rejects out-of-range scores', () => {
    expect(() => CodeQualityResultSchema.parse({ ...codeQuality, overallScore: 101 })).toThrow();
    expect(() => TestCoverageResultSchema.parse({ ...testCoverage, coverageEstimate: -1 })).toThrow();
  });
});

describe('JSON schema export', () => {
  it('produces an object schema with required properties', () => {
    const s = ReviewReportJSONSchema as { type: string; required: string[] };
    expect(s.type).toBe('object');
    expect(s.required).toEqual(expect.arrayContaining(['pullRequest', 'fileReviews', 'summary', 'recommendations', 'metadata']));
    const c = CodeQualityResultJSONSchema as { required: string[] };
    expect(c.required).toContain('overallScore');
  });
});
