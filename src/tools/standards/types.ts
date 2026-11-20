export type ReactTarget = 'web' | 'native' | 'mixed' | 'unknown';

export interface DetectedTechnology {
  id: string;
  reactTarget?: ReactTarget;
  platformEvidence?: { web: string[]; native: string[] };
  evidence: string[];
  confidence: 'high' | 'medium' | 'low';
  category?: 'language' | 'framework' | 'styling' | 'test-runner' | 'testing-utility';
  applicablePatterns?: string[];
}
