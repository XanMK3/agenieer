export interface DetectedTechnology {
  id: string;
  evidence: string[];
  confidence: 'high' | 'medium' | 'low';
  category?: 'language' | 'framework' | 'styling' | 'test-runner' | 'testing-utility';
  applicablePatterns?: string[];
}
