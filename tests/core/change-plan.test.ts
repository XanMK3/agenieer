import { describe, it, expect } from 'vitest';
import { preflightPlan, ChangePlan } from '@/core/change-plan.js';

describe('core/change-plan', () => {
  it('passes on valid plan with existing or created targets', () => {
    const plan: ChangePlan = {
      changes: [
        {
          path: 'docs/standards/typescript.md',
          action: 'create',
          reason: 'TypeScript detected',
          content: '# TypeScript Standards',
        },
        {
          path: 'docs/standards/README.md',
          action: 'create',
          reason: 'Standards index',
          content: 'Read [TypeScript](typescript.md) for conventions.',
        },
      ],
      routingChanges: [{ tech: 'typescript', action: 'activate' }],
    };

    const errors = preflightPlan(plan, '/fake/root');
    expect(errors).toEqual([]);
  });

  it('detects path traversal in planned change', () => {
    const plan: ChangePlan = {
      changes: [
        {
          path: '../outside.md',
          action: 'create',
          reason: 'malicious',
          content: 'bad',
        },
      ],
      routingChanges: [],
    };

    const errors = preflightPlan(plan, '/fake/root');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('Path traversal detected');
  });

  it('detects missing content for create action', () => {
    const plan: ChangePlan = {
      changes: [
        {
          path: 'docs/standards/typescript.md',
          action: 'create',
          reason: 'missing content',
        },
      ],
      routingChanges: [],
    };

    const errors = preflightPlan(plan, '/fake/root');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('requires content');
  });

  it('detects references in README to files that are not planned or existing', () => {
    const plan: ChangePlan = {
      changes: [
        {
          path: 'docs/standards/README.md',
          action: 'create',
          reason: 'Standards index',
          content: 'Read [Nonexistent](ghost.md) for conventions.',
        },
      ],
      routingChanges: [],
    };

    const errors = preflightPlan(plan, '/fake/root');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('does not exist and is not planned to be created');
  });
});
