export interface RuleResult {
  rule: string;
  name: string;
  description: string;
  rationale: string;
  passed: boolean;
  current_value: string;
  threshold: string;
  severity: string;
  detail: string;
}

export interface Recommendation {
  rule: string;
  action: string;
  severity: string;
}

export interface SuggestedRule {
  name: string;
  reason: string;
}

export interface AIAnalysis {
  summary: string;
  risk_level: "low" | "medium" | "high" | "unknown";
  recommendations: string[];
  stress_test: string;
  benchmarks: string;
  suggested_rules: SuggestedRule[];
}

export interface ComplianceReport {
  safe_address: string;
  total_usd: number;
  overall_status: "COMPLIANT" | "NON-COMPLIANT";
  passed: number;
  failed: number;
  total_rules: number;
  results: RuleResult[];
  recommendations: Recommendation[];
  ai_analysis: AIAnalysis | null;
}

export interface AuditHistorySummary {
  id: number;
  chain: string;
  total_usd: number;
  overall_status: string;
  passed: number;
  failed: number;
  total_rules: number;
  risk_level: string | null;
  created_at: string;
}

export interface RuleConfig {
  type: string;
  name: string;
  description: string;
  rationale: string;
  paramKey: string;
  paramLabel: string;
  defaultValue: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  severity: "breach" | "warning";
}

export type Chain = "ethereum" | "solana";

export interface Scenario {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  tagColor: "green" | "red" | "yellow";
  chain?: Chain;
  report: ComplianceReport;
}
