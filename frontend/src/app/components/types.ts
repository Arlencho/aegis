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

export interface User {
  id: number;
  email: string;
  name: string | null;
  plan: "free" | "pro";
  created_at: string;
}

export interface Organization {
  id: number;
  name: string;
  plan: "free" | "pro";
  role?: "owner" | "admin" | "viewer";
  created_at: string;
}

export interface OrgMember {
  id: number;
  user_id: number;
  role: "owner" | "admin" | "viewer";
  email: string;
  name: string | null;
  created_at: string;
}

export interface Client {
  id: number;
  user_id: number | null;
  org_id: number | null;
  name: string;
  description: string | null;
  webhook_url: string | null;
  webhook_secret: string | null;
  wallet_count?: number;
  aggregate_risk_level?: "low" | "medium" | "high" | null;
  created_at: string;
}

export interface Wallet {
  id: number;
  client_id: number;
  client_name?: string;
  address: string;
  chain: Chain;
  label: string | null;
  last_audit_at: string | null;
  last_risk_level: string | null;
  schedule_frequency: "daily" | "weekly" | "monthly" | null;
  schedule_include_ai: boolean;
  next_audit_at: string | null;
  created_at: string;
}

export interface Notification {
  id: number;
  type: "audit_alert" | "risk_change" | "schedule_failure";
  title: string;
  body: string;
  severity: "info" | "warning" | "critical";
  wallet_id: number | null;
  audit_id: number | null;
  is_read: boolean;
  created_at: string;
}

export type Chain = "ethereum" | "solana" | "bsc" | "base" | "arbitrum" | "polygon";

export interface Scenario {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  tagColor: "green" | "red" | "yellow";
  chain?: Chain;
  report: ComplianceReport;
}
