"use client";

import { useState, useEffect, FormEvent } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// --- Type Definitions ---

interface RuleResult {
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

interface Recommendation {
  rule: string;
  action: string;
  severity: string;
}

interface SuggestedRule {
  name: string;
  reason: string;
}

interface AIAnalysis {
  summary: string;
  risk_level: "low" | "medium" | "high" | "unknown";
  recommendations: string[];
  stress_test: string;
  benchmarks: string;
  suggested_rules: SuggestedRule[];
}

interface ComplianceReport {
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

interface AuditHistorySummary {
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

// --- Constants ---

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Chain = "ethereum" | "solana";

const SAMPLE_ADDRESSES: Record<Chain, string> = {
  ethereum: "0xFEB4acf3df3cDEA7399794D0869ef76A6EfAff52",
  solana: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
};

const CHAIN_CONFIG: Record<Chain, { name: string; placeholder: string; label: string }> = {
  ethereum: { name: "Ethereum", placeholder: "0x...", label: "Gnosis Safe Address" },
  solana: { name: "Solana", placeholder: "Base58 address...", label: "Solana Wallet Address" },
};

interface RuleConfig {
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

const RULE_CONFIGS: RuleConfig[] = [
  {
    type: "allocation_cap",
    name: "Single-Token Concentration",
    description: "No single token should exceed this percentage of total portfolio value.",
    rationale: "Most treasury frameworks cap single-token allocation at 25-35% to prevent catastrophic loss from one asset crashing.",
    paramKey: "max_percent",
    paramLabel: "Max % per token",
    defaultValue: 30,
    min: 10,
    max: 80,
    step: 5,
    unit: "%",
    severity: "breach",
  },
  {
    type: "stablecoin_floor",
    name: "Stablecoin Minimum",
    description: "Stablecoins must represent at least this percentage of the portfolio.",
    rationale: "Maintaining 15-25% in stablecoins ensures 3-6 months of operating runway without forced liquidation during market downturns.",
    paramKey: "min_percent",
    paramLabel: "Min % in stablecoins",
    defaultValue: 20,
    min: 5,
    max: 60,
    step: 5,
    unit: "%",
    severity: "breach",
  },
  {
    type: "single_asset_cap",
    name: "Absolute Asset Cap",
    description: "No single asset should exceed this absolute USD value.",
    rationale: "Absolute caps prevent over-exposure even when percentage rules pass. Limits maximum loss from a single token collapse.",
    paramKey: "max_usd",
    paramLabel: "Max USD per asset",
    defaultValue: 500000,
    min: 50000,
    max: 5000000,
    step: 50000,
    unit: "$",
    severity: "warning",
  },
  {
    type: "max_tx_size",
    name: "Transaction Size Limit",
    description: "No single transaction should exceed this USD value.",
    rationale: "Spending guardrails prevent unauthorized or accidental large transfers. Most treasuries set this at 5-15% of total holdings.",
    paramKey: "max_usd",
    paramLabel: "Max USD per transaction",
    defaultValue: 100000,
    min: 10000,
    max: 1000000,
    step: 10000,
    unit: "$",
    severity: "breach",
  },
  {
    type: "inactivity_alert",
    name: "Activity Monitor",
    description: "The treasury must show transaction activity within this time window.",
    rationale: "Inactive treasuries may indicate lost keys, abandoned governance, or compromised signers. 7 days balances operational cadence with security.",
    paramKey: "threshold_hours",
    paramLabel: "Max hours inactive",
    defaultValue: 168,
    min: 24,
    max: 720,
    step: 24,
    unit: "hours",
    severity: "warning",
  },
  {
    type: "min_diversification",
    name: "Minimum Diversification",
    description: "The portfolio must hold at least this many distinct tokens.",
    rationale: "EU MiCA and MAS Singapore require diversified holdings to reduce systemic risk. Standard practice across all financial jurisdictions.",
    paramKey: "min_tokens",
    paramLabel: "Min token count",
    defaultValue: 3,
    min: 2,
    max: 10,
    step: 1,
    unit: "tokens",
    severity: "warning",
  },
  {
    type: "volatile_exposure",
    name: "Volatile Asset Exposure",
    description: "Non-stablecoin (volatile) assets cannot exceed this percentage of the portfolio.",
    rationale: "Limits exposure to market swings. Aligned with EU AIFMD reserve frameworks and prudential requirements from European and Asian regulators.",
    paramKey: "max_percent",
    paramLabel: "Max % volatile assets",
    defaultValue: 80,
    min: 30,
    max: 95,
    step: 5,
    unit: "%",
    severity: "warning",
  },
  {
    type: "min_treasury_value",
    name: "Minimum Treasury Value",
    description: "Total portfolio value must remain above this USD floor.",
    rationale: "Ensures operational solvency. Inspired by Basel III capital adequacy principles adopted by Japan FSA, Finansinspektionen (Sweden), and other regulators.",
    paramKey: "min_usd",
    paramLabel: "Min total USD value",
    defaultValue: 100000,
    min: 10000,
    max: 5000000,
    step: 10000,
    unit: "$",
    severity: "breach",
  },
  {
    type: "large_tx_ratio",
    name: "Relative Transaction Cap",
    description: "No single transaction should exceed this percentage of total portfolio value.",
    rationale: "AML/CFT compliance requires monitoring transactions relative to portfolio size. Required by FinCEN (US), FCA (UK), and FATF member regulators.",
    paramKey: "max_percent",
    paramLabel: "Max % of portfolio per tx",
    defaultValue: 15,
    min: 5,
    max: 50,
    step: 5,
    unit: "%",
    severity: "breach",
  },
  {
    type: "concentration_hhi",
    name: "Concentration Index (HHI)",
    description: "The Herfindahl-Hirschman Index measures portfolio concentration (0 = diversified, 10000 = single asset).",
    rationale: "HHI is the standard financial metric used by SEC, European Commission, and BaFin for measuring concentration risk in portfolios and markets.",
    paramKey: "max_hhi",
    paramLabel: "Max HHI score",
    defaultValue: 3000,
    min: 1500,
    max: 6000,
    step: 250,
    unit: "HHI",
    severity: "warning",
  },
];

// --- Scenario Gallery Data ---

interface Scenario {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  tagColor: "green" | "red" | "yellow";
  chain?: Chain;
  report: ComplianceReport;
}

const SCENARIOS: Scenario[] = [
  {
    id: "compliant",
    title: "Well-Balanced Treasury",
    subtitle: "$2.1M, 25% stablecoins, diversified",
    tag: "Compliant",
    tagColor: "green",
    report: {
      safe_address: "0x849D...7e41 (example)",
      total_usd: 2100000,
      overall_status: "COMPLIANT",
      passed: 10,
      failed: 0,
      total_rules: 10,
      results: [
        { rule: "allocation_cap", name: "Single-Token Concentration Cap", description: "", rationale: "", passed: true, current_value: "28.5%", threshold: "30%", severity: "breach", detail: "Largest position is ETH at 28.5% — within the 30% cap" },
        { rule: "stablecoin_floor", name: "Stablecoin Minimum Floor", description: "", rationale: "", passed: true, current_value: "25.2%", threshold: "20%", severity: "breach", detail: "Stablecoins: $529,200 (25.2% of portfolio)" },
        { rule: "single_asset_cap", name: "Absolute Asset Value Cap", description: "", rationale: "", passed: true, current_value: "all within cap", threshold: "$500,000", severity: "warning", detail: "No single asset exceeds the $500,000 absolute cap" },
        { rule: "max_tx_size", name: "Transaction Size Limit", description: "", rationale: "", passed: true, current_value: "12 txs checked", threshold: "$100,000", severity: "breach", detail: "All 12 recent transactions within $100,000 cap" },
        { rule: "inactivity_alert", name: "Activity Monitor", description: "", rationale: "", passed: true, current_value: "36h ago", threshold: "168h", severity: "warning", detail: "Last transaction: 36 hours ago — well within 7-day window" },
        { rule: "min_diversification", name: "Minimum Diversification", description: "", rationale: "", passed: true, current_value: "5 tokens", threshold: "3 min", severity: "warning", detail: "Portfolio holds 5 distinct tokens" },
        { rule: "volatile_exposure", name: "Volatile Asset Exposure Cap", description: "", rationale: "", passed: true, current_value: "74.8%", threshold: "80%", severity: "warning", detail: "Volatile assets: $1,570,800 (74.8% of portfolio)" },
        { rule: "min_treasury_value", name: "Minimum Treasury Threshold", description: "", rationale: "", passed: true, current_value: "$2,100,000", threshold: "$100,000", severity: "breach", detail: "Total portfolio value: $2,100,000" },
        { rule: "large_tx_ratio", name: "Relative Transaction Cap", description: "", rationale: "", passed: true, current_value: "12 txs checked", threshold: "15%", severity: "breach", detail: "All 12 recent transactions within 15% of portfolio" },
        { rule: "concentration_hhi", name: "Portfolio Concentration Index", description: "", rationale: "", passed: true, current_value: "2180 (moderate)", threshold: "3000", severity: "warning", detail: "HHI score: 2180 (moderate)" },
      ],
      recommendations: [],
      ai_analysis: null,
    },
  },
  {
    id: "concentrated",
    title: "Over-Concentrated in ETH",
    subtitle: "$1.8M, 72% in a single token",
    tag: "High Risk",
    tagColor: "red",
    report: {
      safe_address: "0xA3f1...9c02 (example)",
      total_usd: 1800000,
      overall_status: "NON-COMPLIANT",
      passed: 5,
      failed: 5,
      total_rules: 10,
      results: [
        { rule: "allocation_cap", name: "Single-Token Concentration Cap", description: "", rationale: "", passed: false, current_value: "72.1%", threshold: "30%", severity: "breach", detail: "ETH is 72.1% of portfolio ($1,297,800) — exceeds 30% cap" },
        { rule: "stablecoin_floor", name: "Stablecoin Minimum Floor", description: "", rationale: "", passed: false, current_value: "8.3%", threshold: "20%", severity: "breach", detail: "Stablecoins: $149,400 (8.3% of portfolio) — below 20% floor" },
        { rule: "single_asset_cap", name: "Absolute Asset Value Cap", description: "", rationale: "", passed: false, current_value: "1 asset over cap", threshold: "$500,000", severity: "warning", detail: "Over cap: ETH: $1,297,800" },
        { rule: "max_tx_size", name: "Transaction Size Limit", description: "", rationale: "", passed: true, current_value: "8 txs checked", threshold: "$100,000", severity: "breach", detail: "All 8 recent transactions within $100,000 cap" },
        { rule: "inactivity_alert", name: "Activity Monitor", description: "", rationale: "", passed: true, current_value: "12h ago", threshold: "168h", severity: "warning", detail: "Last transaction: 12 hours ago" },
        { rule: "min_diversification", name: "Minimum Diversification", description: "", rationale: "", passed: false, current_value: "2 tokens", threshold: "3 min", severity: "warning", detail: "Portfolio holds 2 distinct tokens — below 3 minimum" },
        { rule: "volatile_exposure", name: "Volatile Asset Exposure Cap", description: "", rationale: "", passed: false, current_value: "91.7%", threshold: "80%", severity: "warning", detail: "Volatile assets: $1,650,600 (91.7% of portfolio) — exceeds 80% cap" },
        { rule: "min_treasury_value", name: "Minimum Treasury Threshold", description: "", rationale: "", passed: true, current_value: "$1,800,000", threshold: "$100,000", severity: "breach", detail: "Total portfolio value: $1,800,000" },
        { rule: "large_tx_ratio", name: "Relative Transaction Cap", description: "", rationale: "", passed: true, current_value: "8 txs checked", threshold: "15%", severity: "breach", detail: "All 8 recent transactions within 15% of portfolio" },
        { rule: "concentration_hhi", name: "Portfolio Concentration Index", description: "", rationale: "", passed: true, current_value: "5270 (concentrated)", threshold: "3000", severity: "warning", detail: "HHI score: 5270 (concentrated) — exceeds 3000 threshold" },
      ],
      recommendations: [
        { rule: "allocation_cap", action: "Rebalance by swapping a portion of ETH into stablecoins or diversified assets.", severity: "breach" },
        { rule: "stablecoin_floor", action: "Increase stablecoin holdings by converting volatile assets. Target USDC or DAI for maximum liquidity.", severity: "breach" },
        { rule: "single_asset_cap", action: "Reduce ETH position size. Consider dollar-cost averaging out over multiple transactions.", severity: "warning" },
        { rule: "min_diversification", action: "Add new token positions to diversify the portfolio.", severity: "warning" },
        { rule: "volatile_exposure", action: "Reduce volatile asset exposure by converting a portion into stablecoins.", severity: "warning" },
      ],
      ai_analysis: null,
    },
  },
  {
    id: "low-stable",
    title: "Low Stablecoin Reserves",
    subtitle: "$900K, only 5% stablecoins",
    tag: "Medium Risk",
    tagColor: "yellow",
    report: {
      safe_address: "0xD4e2...1b38 (example)",
      total_usd: 900000,
      overall_status: "NON-COMPLIANT",
      passed: 7,
      failed: 3,
      total_rules: 10,
      results: [
        { rule: "allocation_cap", name: "Single-Token Concentration Cap", description: "", rationale: "", passed: true, current_value: "29.8%", threshold: "30%", severity: "breach", detail: "Largest position is WBTC at 29.8% — just within the 30% cap" },
        { rule: "stablecoin_floor", name: "Stablecoin Minimum Floor", description: "", rationale: "", passed: false, current_value: "5.1%", threshold: "20%", severity: "breach", detail: "Stablecoins: $45,900 (5.1% of portfolio) — below 20% floor" },
        { rule: "single_asset_cap", name: "Absolute Asset Value Cap", description: "", rationale: "", passed: true, current_value: "all within cap", threshold: "$500,000", severity: "warning", detail: "No single asset exceeds the $500,000 absolute cap" },
        { rule: "max_tx_size", name: "Transaction Size Limit", description: "", rationale: "", passed: true, current_value: "5 txs checked", threshold: "$100,000", severity: "breach", detail: "All 5 recent transactions within $100,000 cap" },
        { rule: "inactivity_alert", name: "Activity Monitor", description: "", rationale: "", passed: true, current_value: "72h ago", threshold: "168h", severity: "warning", detail: "Last transaction: 72 hours ago" },
        { rule: "min_diversification", name: "Minimum Diversification", description: "", rationale: "", passed: true, current_value: "4 tokens", threshold: "3 min", severity: "warning", detail: "Portfolio holds 4 distinct tokens" },
        { rule: "volatile_exposure", name: "Volatile Asset Exposure Cap", description: "", rationale: "", passed: false, current_value: "94.9%", threshold: "80%", severity: "warning", detail: "Volatile assets: $854,100 (94.9% of portfolio) — exceeds 80% cap" },
        { rule: "min_treasury_value", name: "Minimum Treasury Threshold", description: "", rationale: "", passed: true, current_value: "$900,000", threshold: "$100,000", severity: "breach", detail: "Total portfolio value: $900,000" },
        { rule: "large_tx_ratio", name: "Relative Transaction Cap", description: "", rationale: "", passed: true, current_value: "5 txs checked", threshold: "15%", severity: "breach", detail: "All 5 recent transactions within 15% of portfolio" },
        { rule: "concentration_hhi", name: "Portfolio Concentration Index", description: "", rationale: "", passed: false, current_value: "2650 (concentrated)", threshold: "3000", severity: "warning", detail: "HHI score: 2650 (concentrated)" },
      ],
      recommendations: [
        { rule: "stablecoin_floor", action: "Increase stablecoin holdings by converting volatile assets. Target USDC or DAI for maximum liquidity.", severity: "breach" },
        { rule: "volatile_exposure", action: "Reduce volatile asset exposure by converting a portion into stablecoins.", severity: "warning" },
      ],
      ai_analysis: null,
    },
  },
  {
    id: "inactive",
    title: "Dormant Treasury",
    subtitle: "$450K, no activity in 30 days",
    tag: "Warning",
    tagColor: "yellow",
    report: {
      safe_address: "0x71B8...4e59 (example)",
      total_usd: 450000,
      overall_status: "NON-COMPLIANT",
      passed: 9,
      failed: 1,
      total_rules: 10,
      results: [
        { rule: "allocation_cap", name: "Single-Token Concentration Cap", description: "", rationale: "", passed: true, current_value: "24.2%", threshold: "30%", severity: "breach", detail: "No single token exceeds allocation cap" },
        { rule: "stablecoin_floor", name: "Stablecoin Minimum Floor", description: "", rationale: "", passed: true, current_value: "31.5%", threshold: "20%", severity: "breach", detail: "Stablecoins: $141,750 (31.5% of portfolio)" },
        { rule: "single_asset_cap", name: "Absolute Asset Value Cap", description: "", rationale: "", passed: true, current_value: "all within cap", threshold: "$500,000", severity: "warning", detail: "No single asset exceeds the $500,000 absolute cap" },
        { rule: "max_tx_size", name: "Transaction Size Limit", description: "", rationale: "", passed: true, current_value: "3 txs checked", threshold: "$100,000", severity: "breach", detail: "All 3 recent transactions within $100,000 cap" },
        { rule: "inactivity_alert", name: "Activity Monitor", description: "", rationale: "", passed: false, current_value: "720h ago", threshold: "168h", severity: "warning", detail: "Last transaction: 30 days ago — exceeds 168h threshold" },
        { rule: "min_diversification", name: "Minimum Diversification", description: "", rationale: "", passed: true, current_value: "4 tokens", threshold: "3 min", severity: "warning", detail: "Portfolio holds 4 distinct tokens" },
        { rule: "volatile_exposure", name: "Volatile Asset Exposure Cap", description: "", rationale: "", passed: true, current_value: "68.5%", threshold: "80%", severity: "warning", detail: "Volatile assets: $308,250 (68.5% of portfolio)" },
        { rule: "min_treasury_value", name: "Minimum Treasury Threshold", description: "", rationale: "", passed: true, current_value: "$450,000", threshold: "$100,000", severity: "breach", detail: "Total portfolio value: $450,000" },
        { rule: "large_tx_ratio", name: "Relative Transaction Cap", description: "", rationale: "", passed: true, current_value: "3 txs checked", threshold: "15%", severity: "breach", detail: "All 3 recent transactions within 15% of portfolio" },
        { rule: "concentration_hhi", name: "Portfolio Concentration Index", description: "", rationale: "", passed: true, current_value: "1920 (moderate)", threshold: "3000", severity: "warning", detail: "HHI score: 1920 (moderate)" },
      ],
      recommendations: [
        { rule: "inactivity_alert", action: "Verify signer access and confirm the treasury is actively governed. Schedule regular rebalancing transactions.", severity: "warning" },
      ],
      ai_analysis: null,
    },
  },
  {
    id: "solana-balanced",
    title: "Solana Treasury (Balanced)",
    subtitle: "$1.5M SOL + stablecoins",
    tag: "Compliant",
    tagColor: "green",
    chain: "solana",
    report: {
      safe_address: "9WzD...AWWM (Solana)",
      total_usd: 1500000,
      overall_status: "COMPLIANT",
      passed: 10,
      failed: 0,
      total_rules: 10,
      results: [
        { rule: "allocation_cap", name: "Single-Token Concentration Cap", description: "", rationale: "", passed: true, current_value: "26.7%", threshold: "30%", severity: "breach", detail: "Largest position is SOL at 26.7% — within the 30% cap" },
        { rule: "stablecoin_floor", name: "Stablecoin Minimum Floor", description: "", rationale: "", passed: true, current_value: "35.0%", threshold: "20%", severity: "breach", detail: "Stablecoins: $525,000 (35.0% of portfolio) — USDC + USDT" },
        { rule: "single_asset_cap", name: "Absolute Asset Value Cap", description: "", rationale: "", passed: true, current_value: "all within cap", threshold: "$500,000", severity: "warning", detail: "No single asset exceeds the $500,000 absolute cap" },
        { rule: "max_tx_size", name: "Transaction Size Limit", description: "", rationale: "", passed: true, current_value: "8 txs checked", threshold: "$100,000", severity: "breach", detail: "All 8 recent transactions within $100,000 cap" },
        { rule: "inactivity_alert", name: "Activity Monitor", description: "", rationale: "", passed: true, current_value: "4h ago", threshold: "168h", severity: "warning", detail: "Last transaction: 4 hours ago — very active" },
        { rule: "min_diversification", name: "Minimum Diversification", description: "", rationale: "", passed: true, current_value: "4 tokens", threshold: "3 min", severity: "warning", detail: "Portfolio holds 4 distinct tokens" },
        { rule: "volatile_exposure", name: "Volatile Asset Exposure Cap", description: "", rationale: "", passed: true, current_value: "65.0%", threshold: "80%", severity: "warning", detail: "Volatile assets: $975,000 (65.0% of portfolio)" },
        { rule: "min_treasury_value", name: "Minimum Treasury Threshold", description: "", rationale: "", passed: true, current_value: "$1,500,000", threshold: "$100,000", severity: "breach", detail: "Total portfolio value: $1,500,000" },
        { rule: "large_tx_ratio", name: "Relative Transaction Cap", description: "", rationale: "", passed: true, current_value: "8 txs checked", threshold: "15%", severity: "breach", detail: "All 8 recent transactions within 15% of portfolio" },
        { rule: "concentration_hhi", name: "Portfolio Concentration Index", description: "", rationale: "", passed: true, current_value: "2010 (moderate)", threshold: "3000", severity: "warning", detail: "HHI score: 2010 (moderate)" },
      ],
      recommendations: [],
      ai_analysis: null,
    },
  },
  {
    id: "solana-concentrated",
    title: "SOL-Heavy Portfolio",
    subtitle: "$800K, 85% in SOL",
    tag: "High Risk",
    tagColor: "red",
    chain: "solana",
    report: {
      safe_address: "DYw8...3kNz (Solana)",
      total_usd: 800000,
      overall_status: "NON-COMPLIANT",
      passed: 4,
      failed: 6,
      total_rules: 10,
      results: [
        { rule: "allocation_cap", name: "Single-Token Concentration Cap", description: "", rationale: "", passed: false, current_value: "85.0%", threshold: "30%", severity: "breach", detail: "SOL is 85.0% of portfolio ($680,000) — exceeds 30% cap" },
        { rule: "stablecoin_floor", name: "Stablecoin Minimum Floor", description: "", rationale: "", passed: false, current_value: "6.3%", threshold: "20%", severity: "breach", detail: "Stablecoins: $50,400 (6.3% of portfolio) — below 20% floor" },
        { rule: "single_asset_cap", name: "Absolute Asset Value Cap", description: "", rationale: "", passed: false, current_value: "1 asset over cap", threshold: "$500,000", severity: "warning", detail: "Over cap: SOL: $680,000" },
        { rule: "max_tx_size", name: "Transaction Size Limit", description: "", rationale: "", passed: true, current_value: "6 txs checked", threshold: "$100,000", severity: "breach", detail: "All 6 recent transactions within $100,000 cap" },
        { rule: "inactivity_alert", name: "Activity Monitor", description: "", rationale: "", passed: true, current_value: "18h ago", threshold: "168h", severity: "warning", detail: "Last transaction: 18 hours ago" },
        { rule: "min_diversification", name: "Minimum Diversification", description: "", rationale: "", passed: false, current_value: "2 tokens", threshold: "3 min", severity: "warning", detail: "Portfolio holds 2 distinct tokens — below 3 minimum" },
        { rule: "volatile_exposure", name: "Volatile Asset Exposure Cap", description: "", rationale: "", passed: false, current_value: "93.7%", threshold: "80%", severity: "warning", detail: "Volatile assets: $749,600 (93.7% of portfolio) — exceeds 80% cap" },
        { rule: "min_treasury_value", name: "Minimum Treasury Threshold", description: "", rationale: "", passed: true, current_value: "$800,000", threshold: "$100,000", severity: "breach", detail: "Total portfolio value: $800,000" },
        { rule: "large_tx_ratio", name: "Relative Transaction Cap", description: "", rationale: "", passed: true, current_value: "6 txs checked", threshold: "15%", severity: "breach", detail: "All 6 recent transactions within 15% of portfolio" },
        { rule: "concentration_hhi", name: "Portfolio Concentration Index", description: "", rationale: "", passed: false, current_value: "7260 (concentrated)", threshold: "3000", severity: "warning", detail: "HHI score: 7260 (concentrated) — exceeds 3000 threshold" },
      ],
      recommendations: [
        { rule: "allocation_cap", action: "Diversify by converting a portion of SOL into stablecoins or other assets.", severity: "breach" },
        { rule: "stablecoin_floor", action: "Increase stablecoin holdings. Target USDC on Solana for maximum liquidity.", severity: "breach" },
        { rule: "single_asset_cap", action: "Reduce SOL position size to stay within the $500,000 absolute cap.", severity: "warning" },
        { rule: "min_diversification", action: "Add new token positions to diversify the portfolio.", severity: "warning" },
        { rule: "volatile_exposure", action: "Reduce volatile asset exposure by converting a portion into stablecoins.", severity: "warning" },
      ],
      ai_analysis: null,
    },
  },
];

// --- PDF Generation ---

async function downloadAuditPDF(report: ComplianceReport, chain: Chain) {
  const { Document, Page, Text, View, StyleSheet, pdf } = await import(
    "@react-pdf/renderer"
  );

  const s = StyleSheet.create({
    page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1f2937" },
    header: { marginBottom: 20, borderBottomWidth: 2, borderBottomColor: "#3b82f6", paddingBottom: 10 },
    title: { fontSize: 20, fontFamily: "Helvetica-Bold", color: "#111827" },
    subtitle: { fontSize: 9, color: "#6b7280", marginTop: 4 },
    sectionTitle: {
      fontSize: 12, fontFamily: "Helvetica-Bold", color: "#111827",
      marginTop: 16, marginBottom: 8, paddingBottom: 4,
      borderBottomWidth: 1, borderBottomColor: "#e5e7eb",
    },
    summaryBox: { backgroundColor: "#f9fafb", padding: 12, borderRadius: 4 },
    summaryRow: { flexDirection: "row" as const, justifyContent: "space-between" as const, marginBottom: 4 },
    label: { color: "#6b7280", fontSize: 9 },
    value: { fontFamily: "Helvetica-Bold", fontSize: 10 },
    green: { color: "#16a34a" },
    red: { color: "#dc2626" },
    ruleRow: { flexDirection: "row" as const, paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: "#f3f4f6" },
    ruleStatus: { width: 36, fontSize: 8, fontFamily: "Helvetica-Bold" },
    ruleName: { flex: 1, fontSize: 9, fontFamily: "Helvetica-Bold", color: "#374151" },
    ruleValues: { width: 90, fontSize: 8, color: "#6b7280", textAlign: "right" as const },
    ruleDetail: { marginLeft: 36, fontSize: 8, color: "#9ca3af", marginTop: 2, marginBottom: 4 },
    aiBox: { backgroundColor: "#faf5ff", padding: 12, borderRadius: 4, borderLeftWidth: 3, borderLeftColor: "#a855f7" },
    bodyText: { fontSize: 9, color: "#4b5563", lineHeight: 1.5 },
    recRow: { flexDirection: "row" as const, marginBottom: 4 },
    recNum: { width: 16, fontSize: 9, color: "#3b82f6", fontFamily: "Helvetica-Bold" },
    recText: { flex: 1, fontSize: 9, color: "#4b5563" },
    footer: {
      position: "absolute" as const, bottom: 30, left: 40, right: 40,
      borderTopWidth: 1, borderTopColor: "#e5e7eb", paddingTop: 8,
      flexDirection: "row" as const, justifyContent: "space-between" as const,
    },
    footerText: { fontSize: 7, color: "#9ca3af" },
  });

  const compliant = report.overall_status === "COMPLIANT";
  const riskLevel = report.ai_analysis?.risk_level || "N/A";
  const now = new Date();

  const doc = (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.title}>AEGIS Treasury Audit Report</Text>
          <Text style={s.subtitle}>Deterministic Policy Validation + AI Risk Analysis</Text>
        </View>

        <Text style={s.sectionTitle}>Executive Summary</Text>
        <View style={s.summaryBox}>
          <View style={s.summaryRow}>
            <Text style={s.label}>Wallet Address</Text>
            <Text style={s.value}>{report.safe_address}</Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={s.label}>Chain</Text>
            <Text style={s.value}>{chain === "ethereum" ? "Ethereum" : "Solana"}</Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={s.label}>Total Portfolio Value</Text>
            <Text style={s.value}>
              ${report.total_usd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={s.label}>Compliance Status</Text>
            <Text style={[s.value, compliant ? s.green : s.red]}>{report.overall_status}</Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={s.label}>Rules Passed</Text>
            <Text style={s.value}>{report.passed} / {report.total_rules}</Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={s.label}>AI Risk Level</Text>
            <Text style={s.value}>{riskLevel.toUpperCase()}</Text>
          </View>
        </View>

        <Text style={s.sectionTitle}>Compliance Results</Text>
        {report.results.map((r, i) => (
          <View key={i} wrap={false}>
            <View style={s.ruleRow}>
              <Text style={[s.ruleStatus, r.passed ? s.green : s.red]}>
                {r.passed ? "PASS" : "FAIL"}
              </Text>
              <Text style={s.ruleName}>{r.name || r.rule}</Text>
              <Text style={s.ruleValues}>{r.current_value} / {r.threshold}</Text>
            </View>
            <Text style={s.ruleDetail}>{r.detail}</Text>
          </View>
        ))}

        {report.ai_analysis && (
          <>
            <Text style={s.sectionTitle}>AI Risk Analysis</Text>
            <View style={s.aiBox}>
              <Text style={s.bodyText}>{report.ai_analysis.summary}</Text>
            </View>

            {report.ai_analysis.stress_test && (
              <>
                <Text style={{ ...s.sectionTitle, fontSize: 10 }}>Stress Test</Text>
                <Text style={s.bodyText}>{report.ai_analysis.stress_test}</Text>
              </>
            )}

            {report.ai_analysis.benchmarks && (
              <>
                <Text style={{ ...s.sectionTitle, fontSize: 10 }}>Industry Benchmarks</Text>
                <Text style={s.bodyText}>{report.ai_analysis.benchmarks}</Text>
              </>
            )}

            {report.ai_analysis.recommendations?.length > 0 && (
              <>
                <Text style={{ ...s.sectionTitle, fontSize: 10 }}>AI Recommendations</Text>
                {report.ai_analysis.recommendations.map((rec, i) => (
                  <View key={i} style={s.recRow}>
                    <Text style={s.recNum}>{i + 1}.</Text>
                    <Text style={s.recText}>{rec}</Text>
                  </View>
                ))}
              </>
            )}
          </>
        )}

        {report.recommendations?.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Action Items</Text>
            {report.recommendations.map((rec, i) => (
              <View key={i} style={s.recRow}>
                <Text
                  style={[s.recNum, { color: rec.severity === "breach" ? "#dc2626" : "#ca8a04" }]}
                >
                  {rec.severity === "breach" ? "FIX" : "REV"}
                </Text>
                <Text style={s.recText}>[{rec.rule}] {rec.action}</Text>
              </View>
            ))}
          </>
        )}

        <View style={s.footer} fixed>
          <Text style={s.footerText}>Generated by AEGIS | aegis.rios.xyz</Text>
          <Text style={s.footerText}>Point-in-time audit | {now.toLocaleString()}</Text>
        </View>
      </Page>
    </Document>
  );

  const blob = await pdf(doc).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const prefix = report.safe_address.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8);
  link.download = `aegis-audit-${prefix}-${now.toISOString().split("T")[0]}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// --- Main Component ---

export default function Home() {
  const [chain, setChain] = useState<Chain>("ethereum");
  const [safeAddress, setSafeAddress] = useState("");
  const [ruleValues, setRuleValues] = useState<Record<string, number>>(
    Object.fromEntries(RULE_CONFIGS.map((r) => [r.type, r.defaultValue]))
  );
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [auditHistory, setAuditHistory] = useState<AuditHistorySummary[]>([]);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Fetch audit history when a live report comes in
  useEffect(() => {
    if (!report || activeScenario) return; // skip for demo scenarios
    const addr = report.safe_address;
    if (!addr || addr.includes("(example)")) return;
    fetch(`${API_URL}/audits/${encodeURIComponent(addr)}`)
      .then((r) => r.json())
      .then((d) => setAuditHistory(d.audits || []))
      .catch(() => setAuditHistory([]));
  }, [report, activeScenario]);

  async function handleDownloadPDF() {
    if (!report) return;
    setPdfLoading(true);
    try {
      await downloadAuditPDF(report, chain);
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setPdfLoading(false);
    }
  }

  function updateRuleValue(ruleType: string, value: number) {
    setRuleValues((prev) => ({ ...prev, [ruleType]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!safeAddress) return;

    setLoading(true);
    setError(null);
    setReport(null);
    setActiveScenario(null);

    const rules = RULE_CONFIGS.map((config) => ({
      type: config.type,
      params: { [config.paramKey]: ruleValues[config.type] },
      severity: config.severity,
    }));

    try {
      const res = await fetch(`${API_URL}/validate/json`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          safe_address: safeAddress,
          rules,
          include_ai: true,
          chain,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }

      const data: ComplianceReport = await res.json();
      setReport(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function handleScenarioClick(scenario: Scenario) {
    setActiveScenario(scenario.id);
    setReport(scenario.report);
    setError(null);
    if (scenario.chain) setChain(scenario.chain);
  }

  return (
    <main className="min-h-screen">
      {/* Section 1: Hero */}
      <HeroSection />

      {/* Section 2: Problem */}
      <ProblemSection />

      {/* Section 3: How It Works */}
      <HowItWorksSection />

      {/* Section 4: What AEGIS Checks */}
      <FeaturesSection />

      {/* Section 5: Manual vs AEGIS */}
      <ComparisonSection />

      {/* Section 6: Credibility Strip */}
      <CredibilityStrip />

      {/* Section 6: Interactive Demo */}
      <section id="demo" className="py-16 md:py-24 px-6 md:px-12">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Try It Now</h2>
            <p className="text-gray-400 text-sm">
              Paste any Ethereum or Solana wallet address, or explore the example scenarios
            </p>
          </div>

          {/* Chain Selector */}
          <ChainSelector chain={chain} onChange={(c) => { setChain(c); setSafeAddress(""); }} />

          {/* Scenario Gallery */}
          <ScenarioGallery
            scenarios={SCENARIOS}
            activeId={activeScenario}
            onSelect={handleScenarioClick}
          />

          {/* Rule Editor */}
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-300 mb-3">
              Policy Rules
              <span className="text-gray-600 font-normal ml-2">
                Adjust thresholds to match your risk tolerance
              </span>
            </h2>
            {RULE_CONFIGS.map((config) => (
              <RuleEditor
                key={config.type}
                config={config}
                value={ruleValues[config.type]}
                onChange={(v) => updateRuleValue(config.type, v)}
              />
            ))}
          </div>

          {/* Address Input + Submit */}
          <form onSubmit={handleSubmit} className="space-y-4 mb-8">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-300">
                {CHAIN_CONFIG[chain].label}
              </label>
              <input
                type="text"
                placeholder={CHAIN_CONFIG[chain].placeholder}
                value={safeAddress}
                onChange={(e) => setSafeAddress(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg
                           text-white placeholder-gray-500
                           focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500
                           font-mono text-sm"
                required
              />
              <button
                type="button"
                onClick={() => setSafeAddress(SAMPLE_ADDRESSES[chain])}
                className="mt-1.5 text-xs text-blue-400 hover:text-blue-300 transition"
              >
                Try a sample {CHAIN_CONFIG[chain].name} address
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || !safeAddress}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700
                         disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed
                         rounded-lg font-medium transition text-sm"
            >
              {loading ? "Analyzing with AI..." : "Run Free Audit"}
            </button>
          </form>

          {error && (
            <div className="p-4 bg-red-900/40 border border-red-800 rounded-lg mb-6">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {report && (
            <>
              <ReportCard
                report={report}
                onDownloadPDF={handleDownloadPDF}
                pdfLoading={pdfLoading}
              />
              {report.ai_analysis && (
                <AIAnalysisPanel analysis={report.ai_analysis} />
              )}
              {report.recommendations && report.recommendations.length > 0 && (
                <RecommendationPanel recommendations={report.recommendations} />
              )}
              {auditHistory.length > 1 && (
                <AuditHistoryPanel history={auditHistory} />
              )}
              <PostAuditCTA />
            </>
          )}
        </div>
      </section>

      {/* Section 7: CTA Footer */}
      <CTAFooter />
    </main>
  );
}

// --- Landing Page Sections ---

function HeroSection() {
  return (
    <section className="relative py-24 md:py-36 lg:py-44 px-6 md:px-12 overflow-hidden">
      {/* Background layers */}
      <div className="hero-glow absolute inset-0 pointer-events-none" />
      <div className="hero-grid absolute inset-0 pointer-events-none" />

      <div className="max-w-6xl mx-auto relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Copy */}
          <div className="text-center lg:text-left">
            <div className="animate-fade-in-up">
              <span className="inline-block text-xs px-3 py-1.5 bg-blue-900/30 text-blue-300 rounded-full border border-blue-800/40 mb-6 font-medium tracking-wide uppercase">
                Treasury Risk Intelligence
              </span>
            </div>

            <h1 className="animate-fade-in-up-delay-1 text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-[1.1] tracking-tight">
              Your treasury has a risk policy.{" "}
              <span className="gradient-text">But nobody&apos;s enforcing it.</span>
            </h1>

            <p className="animate-fade-in-up-delay-2 text-gray-400 text-lg md:text-xl max-w-xl mb-8 leading-relaxed mx-auto lg:mx-0">
              Paste any Ethereum or Solana wallet address. Get an instant
              compliance audit with AI-powered risk analysis — in 30 seconds.
            </p>

            <div className="animate-fade-in-up-delay-3 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-10">
              <a
                href="#demo"
                className="group px-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold
                           transition-all text-base shadow-lg shadow-blue-600/25 hover:shadow-blue-500/40
                           hover:scale-[1.02] active:scale-[0.98]"
              >
                Try the Free Audit
                <span className="inline-block ml-2 transition-transform group-hover:translate-x-1">&rarr;</span>
              </a>
              <span className="text-xs px-3 py-1.5 bg-purple-900/30 text-purple-300 rounded-full border border-purple-800/40 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                AI-Powered
              </span>
            </div>

            {/* Stats bar */}
            <div className="animate-fade-in-up-delay-3 flex items-center justify-center lg:justify-start gap-6 md:gap-8">
              <div>
                <p className="text-2xl font-bold text-white">10</p>
                <p className="text-[11px] text-gray-500 uppercase tracking-wider">Risk Rules</p>
              </div>
              <div className="w-px h-8 bg-gray-800" />
              <div>
                <p className="text-2xl font-bold text-white">30s</p>
                <p className="text-[11px] text-gray-500 uppercase tracking-wider">Full Audit</p>
              </div>
              <div className="w-px h-8 bg-gray-800" />
              <div>
                <p className="text-2xl font-bold text-white">$0</p>
                <p className="text-[11px] text-gray-500 uppercase tracking-wider">No Signup</p>
              </div>
            </div>
          </div>

          {/* Right: Mini audit preview card */}
          <div className="hidden lg:block animate-fade-in-up-delay-2">
            <div className="animate-float relative">
              {/* Glow behind card */}
              <div className="absolute -inset-4 bg-blue-500/5 rounded-3xl blur-2xl" />
              <div className="absolute -inset-[1px] rounded-2xl shimmer-border" />

              <div className="mini-audit-card relative rounded-2xl border border-gray-700/50 p-6 shadow-2xl">
                {/* Card header */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                    </div>
                    <span className="text-sm font-semibold text-gray-200">AEGIS Audit</span>
                  </div>
                  <span className="text-[10px] px-2 py-1 bg-green-900/50 text-green-400 rounded-full font-medium border border-green-800/30">
                    COMPLIANT
                  </span>
                </div>

                {/* Wallet info */}
                <div className="mb-4 p-3 bg-gray-800/40 rounded-lg">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Safe Wallet</p>
                  <p className="text-xs font-mono text-gray-300">0x849D...7e41</p>
                  <p className="text-lg font-bold text-white mt-1">$2,100,000</p>
                </div>

                {/* Mini rule results */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-green-400 font-bold text-[10px]">PASS</span>
                      <span className="text-gray-300">Concentration Cap</span>
                    </div>
                    <span className="text-gray-500 font-mono">28.5% / 30%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-green-400 font-bold text-[10px]">PASS</span>
                      <span className="text-gray-300">Stablecoin Floor</span>
                    </div>
                    <span className="text-gray-500 font-mono">25.2% / 20%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-green-400 font-bold text-[10px]">PASS</span>
                      <span className="text-gray-300">Asset Value Cap</span>
                    </div>
                    <span className="text-gray-500 font-mono">within cap</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-green-400 font-bold text-[10px]">PASS</span>
                      <span className="text-gray-300">Tx Size Limit</span>
                    </div>
                    <span className="text-gray-500 font-mono">12 txs ok</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-green-400 font-bold text-[10px]">PASS</span>
                      <span className="text-gray-300">Activity Monitor</span>
                    </div>
                    <span className="text-gray-500 font-mono">36h ago</span>
                  </div>
                </div>

                {/* AI analysis teaser */}
                <div className="p-3 bg-purple-900/15 border border-purple-800/30 rounded-lg">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                    <span className="text-[10px] font-semibold text-purple-300 uppercase tracking-wider">AI Analysis</span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Well-diversified treasury with strong compliance. Stablecoin reserves provide ~6 months runway...
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProblemSection() {
  const cards = [
    {
      hook: "Policy lives in Notion",
      detail:
        "Risk limits are written in governance docs but never enforced programmatically. Drift happens silently.",
      colorClass: "pain-card-red",
    },
    {
      hook: "Compliance is manual",
      detail:
        "Someone checks a spreadsheet — maybe. One missed rebalance and you're over-concentrated without knowing it.",
      colorClass: "pain-card-orange",
    },
    {
      hook: "No alerts until it's too late",
      detail:
        "By the time a breach surfaces in a governance call, the damage is already done.",
      colorClass: "pain-card-yellow",
    },
  ];

  return (
    <section className="py-16 md:py-24 px-6 md:px-12 bg-gray-950/50">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-center text-2xl md:text-3xl font-bold mb-4">
          The Problem
        </h2>
        <p className="text-center text-gray-500 text-sm mb-12 max-w-xl mx-auto">
          Most crypto treasuries manage millions with rules that exist only on
          paper
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {cards.map((card, i) => (
            <div
              key={i}
              className={`pain-card ${card.colorClass} p-6 bg-gray-900 border border-gray-800 rounded-xl`}
            >
              <h3 className="text-lg font-semibold text-gray-100 mb-2">
                {card.hook}
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                {card.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    {
      number: "1",
      title: "Paste your wallet address",
      detail:
        "Works with Ethereum Safe wallets and Solana wallets. No API keys, no setup, no signup.",
    },
    {
      number: "2",
      title: "Set your risk rules",
      detail:
        "10 built-in compliance rules aligned with EU, US, and Asian regulatory frameworks. Adjust thresholds or use our defaults.",
    },
    {
      number: "3",
      title: "Get AI-powered analysis",
      detail:
        "Instant compliance report + AI analyzes your risk posture, runs stress tests, and recommends actions.",
    },
  ];

  return (
    <section className="py-16 md:py-24 px-6 md:px-12">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-center text-2xl md:text-3xl font-bold mb-4">
          How It Works
        </h2>
        <p className="text-center text-gray-500 text-sm mb-12 max-w-xl mx-auto">
          From address to actionable insights in three steps
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div key={i} className="step-connector text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold text-lg shrink-0">
                  {step.number}
                </div>
                <h3 className="text-lg font-semibold">{step.title}</h3>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed md:pl-[52px]">
                {step.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const rules = [
    { name: "Single-token concentration cap", desc: "No asset exceeds your set percentage of total value" },
    { name: "Stablecoin minimum floor", desc: "Ensure operating runway with minimum stablecoin reserves" },
    { name: "Absolute asset value cap", desc: "Hard USD ceiling on any single token position" },
    { name: "Transaction size limit", desc: "Spending guardrails on individual transfers" },
    { name: "Activity monitoring", desc: "Detect dormant wallets with configurable inactivity alerts" },
    { name: "Minimum diversification", desc: "Require a minimum number of distinct tokens in the portfolio" },
    { name: "Volatile asset exposure cap", desc: "Limit non-stablecoin exposure to reduce market risk" },
    { name: "Minimum treasury value", desc: "Ensure portfolio stays above a solvency floor" },
    { name: "Relative transaction cap", desc: "Flag transactions disproportionate to portfolio size" },
    { name: "Concentration index (HHI)", desc: "Industry-standard metric for portfolio concentration risk" },
  ];

  const aiFeatures = [
    { name: "Risk posture summary", desc: "Plain-English assessment of your treasury health" },
    { name: "Stress testing", desc: "\"What if ETH drops 30%?\" — see which rules would break" },
    { name: "Industry benchmarks", desc: "Compare your allocation to similar-sized treasuries" },
    { name: "Actionable recommendations", desc: "Specific steps to improve compliance and reduce risk" },
    { name: "Suggested additional rules", desc: "AI identifies gaps in your current policy" },
  ];

  return (
    <section className="py-16 md:py-24 px-6 md:px-12 bg-gray-950/50">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-center text-2xl md:text-3xl font-bold mb-4">
          What AEGIS Checks
        </h2>
        <p className="text-center text-gray-500 text-sm mb-12 max-w-xl mx-auto">
          Deterministic rules for instant compliance, AI analysis for deeper insight
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
          {/* Deterministic Rules Column */}
          <div>
            <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              Deterministic Rules
            </h3>
            <div className="space-y-3">
              {rules.map((r, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <span className="text-green-400 mt-0.5 shrink-0">&#10003;</span>
                  <div>
                    <p className="text-sm font-medium text-gray-200">{r.name}</p>
                    <p className="text-xs text-gray-500">{r.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Analysis Column */}
          <div>
            <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              AI Analysis
            </h3>
            <div className="space-y-3">
              {aiFeatures.map((f, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <span className="text-purple-400 mt-0.5 shrink-0">&#9733;</span>
                  <div>
                    <p className="text-sm font-medium text-gray-200">{f.name}</p>
                    <p className="text-xs text-gray-500">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CredibilityStrip() {
  return (
    <section className="py-8 px-6 md:px-12 border-y border-gray-800/50">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 text-center mb-4">
          <span className="text-xs text-gray-500">
            Built for treasuries in the <span className="text-gray-300 font-medium">$250K&ndash;$10M</span> range
          </span>
          <span className="hidden md:block text-gray-800">|</span>
          <span className="text-xs text-gray-500">
            <span className="text-gray-300 font-medium">10 compliance rules</span> aligned with global standards
          </span>
          <span className="hidden md:block text-gray-800">|</span>
          <span className="text-xs text-gray-500">
            <span className="text-gray-300 font-medium">Advisory mode</span> — zero autonomous execution
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 md:gap-6">
          {[
            { region: "EU", frameworks: "MiCA, AIFMD" },
            { region: "Americas", frameworks: "SEC, FinCEN, FATF" },
            { region: "Asia", frameworks: "MAS, Japan FSA" },
            { region: "Nordics", frameworks: "Finansinspektionen" },
            { region: "UK", frameworks: "FCA" },
          ].map((item) => (
            <span key={item.region} className="text-[10px] text-gray-500 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500/40" />
              <span className="text-gray-400 font-medium">{item.region}</span>
              <span className="text-gray-600">{item.frameworks}</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function ComparisonSection() {
  return (
    <section className="py-16 md:py-24 px-6 md:px-12">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-center text-2xl md:text-3xl font-bold mb-4">
          Manual Review vs AEGIS
        </h2>
        <p className="text-center text-gray-500 text-sm mb-12 max-w-xl mx-auto">
          Same treasury, two approaches — see what gets missed
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Manual Review */}
          <div className="p-6 bg-gray-900 border border-gray-800 rounded-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-500 to-amber-600" />
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-yellow-900/30 border border-yellow-800/40 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-yellow-400">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <line x1="3" y1="15" x2="21" y2="15" />
                  <line x1="9" y1="3" x2="9" y2="21" />
                  <line x1="15" y1="3" x2="15" y2="21" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-100">Manual Review</h3>
                <p className="text-xs text-gray-500">Spreadsheet-based</p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              {[
                { text: "Takes 2-4 hours per audit", icon: "clock" },
                { text: "Checks 1-2 rules at best", icon: "check" },
                { text: "No stress testing", icon: "x" },
                { text: "Results in a shared Google Doc", icon: "doc" },
                { text: "Reviewed quarterly (if someone remembers)", icon: "cal" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className="text-yellow-500/60 shrink-0">&#9679;</span>
                  <span className="text-gray-400">{item.text}</span>
                </div>
              ))}
            </div>

            <div className="p-3 bg-yellow-900/15 border border-yellow-800/30 rounded-lg text-center">
              <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider">
                &ldquo;Looks Fine&rdquo;
              </span>
              <p className="text-[10px] text-gray-500 mt-1">Missed 2 critical violations</p>
            </div>
          </div>

          {/* AEGIS Audit */}
          <div className="p-6 bg-gray-900 border border-blue-800/40 rounded-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500" />
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-blue-900/30 border border-blue-800/40 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-blue-400">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-100">AEGIS Audit</h3>
                <p className="text-xs text-gray-500">AI-powered compliance</p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              {[
                "Takes 30 seconds, end to end",
                "10 compliance rules + AI analysis",
                "Stress tests included (\"what if ETH drops 30%?\")",
                "Professional PDF report for stakeholders",
                "On-demand — run anytime, any wallet",
              ].map((text, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className="text-blue-400 shrink-0">&#10003;</span>
                  <span className="text-gray-300">{text}</span>
                </div>
              ))}
            </div>

            <div className="p-3 bg-red-900/15 border border-red-800/30 rounded-lg text-center">
              <span className="text-xs font-bold text-red-400 uppercase tracking-wider">
                2 Violations Found
              </span>
              <p className="text-[10px] text-gray-400 mt-1">42% concentration + stablecoin floor breach</p>
            </div>
          </div>
        </div>

        {/* Narrative */}
        <div className="mt-8 text-center max-w-2xl mx-auto">
          <p className="text-sm text-gray-400 leading-relaxed">
            In this real scenario, a manual spreadsheet review concluded the treasury was
            &ldquo;healthy.&rdquo; AEGIS found a <span className="text-red-400 font-medium">42% single-token concentration</span> and
            a <span className="text-red-400 font-medium">stablecoin floor violation</span> — both
            caught in under 30 seconds with deterministic policy checks.
          </p>
        </div>
      </div>
    </section>
  );
}

function CTAFooter() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [waitlistCount, setWaitlistCount] = useState<number | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/waitlist/count`)
      .then((r) => r.json())
      .then((d) => setWaitlistCount(d.count))
      .catch(() => {});
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch(`${API_URL}/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "cta_footer" }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("success");
        setMessage(data.message);
        if (data.is_new && waitlistCount !== null) setWaitlistCount(waitlistCount + 1);
      } else {
        throw new Error(data.detail || "Failed");
      }
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  }

  return (
    <section className="py-16 md:py-24 px-6 md:px-12 bg-gray-950/50">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-3">
          Want continuous monitoring?
        </h2>
        <p className="text-gray-400 text-sm mb-8 leading-relaxed">
          We&apos;re building AEGIS Pro — automated policy enforcement for DAO
          treasuries with real-time alerts, scheduled audits, and multi-chain
          support.
        </p>

        {waitlistCount !== null && waitlistCount > 0 && (
          <p className="text-xs text-gray-500 mb-4">
            <span className="text-blue-400 font-semibold">{waitlistCount}</span> teams already on the waitlist
          </p>
        )}

        {status === "success" ? (
          <div className="p-4 bg-green-900/20 border border-green-800 rounded-lg max-w-md mx-auto">
            <p className="text-green-300 text-sm">{message}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              required
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg
                         text-white placeholder-gray-500 text-sm
                         focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700
                         disabled:bg-gray-800 disabled:text-gray-500
                         rounded-lg font-semibold transition text-sm
                         shadow-lg shadow-blue-600/20"
            >
              {status === "loading" ? "Joining..." : "Get Early Access"}
            </button>
          </form>
        )}

        {status === "error" && (
          <p className="text-red-400 text-xs mt-2">{message}</p>
        )}

        <p className="mt-10 text-xs text-gray-600">
          Built by Arlen Rios
        </p>
      </div>
    </section>
  );
}

function ChainSelector({ chain, onChange }: { chain: Chain; onChange: (c: Chain) => void }) {
  return (
    <div className="flex gap-2 mb-6">
      {(["ethereum", "solana"] as Chain[]).map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition border ${
            chain === c
              ? "bg-blue-600/20 border-blue-500 text-blue-300"
              : "bg-gray-900/50 border-gray-800 text-gray-500 hover:border-gray-700"
          }`}
        >
          {CHAIN_CONFIG[c].name}
        </button>
      ))}
    </div>
  );
}

function PostAuditCTA() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch(`${API_URL}/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "post_audit" }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("success");
        setMessage(data.message);
      } else {
        throw new Error(data.detail || "Failed");
      }
    } catch {
      setStatus("error");
      setMessage("Something went wrong.");
    }
  }

  if (status === "success") {
    return (
      <div className="mt-6 p-4 bg-green-900/20 border border-green-800 rounded-lg text-center">
        <p className="text-green-300 text-sm">{message}</p>
      </div>
    );
  }

  return (
    <div className="mt-6 p-4 bg-blue-900/10 border border-blue-800/30 rounded-lg text-center">
      <p className="text-sm text-gray-300 mb-3">
        Want automated monitoring with real-time alerts for this treasury?
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 max-w-sm mx-auto">
        <input
          type="email"
          required
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg
                     text-white placeholder-gray-500 text-xs
                     focus:outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg
                     font-medium text-xs transition disabled:bg-gray-800"
        >
          {status === "loading" ? "..." : "Notify Me"}
        </button>
      </form>
      {status === "error" && <p className="text-red-400 text-xs mt-1">{message}</p>}
    </div>
  );
}

// --- Audit History Panel ---

function AuditHistoryPanel({ history }: { history: AuditHistorySummary[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Prepare chart data (oldest first for the line chart)
  const chartData = [...history]
    .reverse()
    .map((a) => ({
      date: new Date(a.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      score: Math.round((a.passed / a.total_rules) * 100),
      passed: a.passed,
      total: a.total_rules,
    }));

  return (
    <div className="mt-6 p-4 bg-gray-900/50 border border-gray-800 rounded-lg">
      <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
        Audit History
        <span className="text-[10px] px-1.5 py-0.5 bg-blue-900/50 text-blue-300 rounded">
          {history.length} audits
        </span>
      </h3>

      {/* Compliance Trend Chart */}
      {mounted && chartData.length > 1 && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-2">Compliance Score Over Time</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "#6b7280" }}
                stroke="#374151"
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: "#6b7280" }}
                stroke="#374151"
                tickFormatter={(v: number) => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#111827",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                labelStyle={{ color: "#9ca3af" }}
                formatter={(value) => [`${value}%`, "Compliance"]}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: "#3b82f6", r: 3 }}
                activeDot={{ r: 5, fill: "#60a5fa" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* History Table */}
      <div className="space-y-1.5">
        {history.slice(0, 10).map((audit) => (
          <div
            key={audit.id}
            className="flex items-center justify-between py-2 px-3 bg-gray-800/30 rounded-lg text-xs"
          >
            <div className="flex items-center gap-3">
              <span
                className={`text-[10px] font-bold ${
                  audit.overall_status === "COMPLIANT"
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                {audit.overall_status === "COMPLIANT" ? "PASS" : "FAIL"}
              </span>
              <span className="text-gray-400">
                {new Date(audit.created_at).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-500">
                {audit.passed}/{audit.total_rules} rules
              </span>
              <span className="text-gray-500 font-mono">
                ${Number(audit.total_usd).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
              {audit.risk_level && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded ${
                    audit.risk_level === "low"
                      ? "bg-green-900/50 text-green-300"
                      : audit.risk_level === "medium"
                      ? "bg-yellow-900/50 text-yellow-300"
                      : audit.risk_level === "high"
                      ? "bg-red-900/50 text-red-300"
                      : "bg-gray-800 text-gray-400"
                  }`}
                >
                  {audit.risk_level}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Scenario Gallery ---

function ScenarioGallery({
  scenarios,
  activeId,
  onSelect,
}: {
  scenarios: Scenario[];
  activeId: string | null;
  onSelect: (s: Scenario) => void;
}) {
  return (
    <div className="mb-8">
      <h2 className="text-sm font-semibold text-gray-300 mb-3">
        Example Scenarios
        <span className="text-gray-600 font-normal ml-2">
          See what different risk profiles look like
        </span>
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {scenarios.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s)}
            className={`p-3 rounded-lg border text-left transition text-xs ${
              activeId === s.id
                ? "border-blue-500 bg-blue-900/20"
                : "border-gray-800 bg-gray-900/50 hover:border-gray-700"
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <span
                className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  s.tagColor === "green"
                    ? "bg-green-900 text-green-300"
                    : s.tagColor === "red"
                    ? "bg-red-900 text-red-300"
                    : "bg-yellow-900 text-yellow-300"
                }`}
              >
                {s.tag}
              </span>
              {s.chain === "solana" && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-900/50 text-purple-300">
                  SOL
                </span>
              )}
            </div>
            <p className="font-medium text-gray-200 text-sm">{s.title}</p>
            <p className="text-gray-500 mt-0.5">{s.subtitle}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// --- Rule Editor ---

function RuleEditor({
  config,
  value,
  onChange,
}: {
  config: RuleConfig;
  value: number;
  onChange: (v: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const displayValue =
    config.unit === "$"
      ? `$${value.toLocaleString()}`
      : config.unit === "hours"
      ? `${value}h (${Math.round(value / 24)}d)`
      : `${value}%`;

  return (
    <div className="mb-2 p-3 bg-gray-900/50 border border-gray-800 rounded-lg">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-gray-500 hover:text-gray-300 transition"
          >
            <span
              className={`transition-transform inline-block text-xs ${
                expanded ? "rotate-90" : ""
              }`}
            >
              &#9654;
            </span>
          </button>
          <span className="text-sm font-medium">{config.name}</span>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded ${
              config.severity === "breach"
                ? "bg-red-900/50 text-red-300"
                : "bg-yellow-900/50 text-yellow-300"
            }`}
          >
            {config.severity}
          </span>
        </div>
        <span className="text-sm font-mono text-blue-400">{displayValue}</span>
      </div>

      <div className="mt-2 flex items-center gap-3">
        <input
          type="range"
          min={config.min}
          max={config.max}
          step={config.step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 accent-blue-500"
        />
      </div>

      {expanded && (
        <div className="mt-2 pt-2 border-t border-gray-800">
          <p className="text-xs text-gray-400">{config.description}</p>
          <p className="text-xs text-gray-500 mt-1 italic">
            Why this rule: {config.rationale}
          </p>
        </div>
      )}
    </div>
  );
}

// --- Report Card ---

function ReportCard({
  report,
  onDownloadPDF,
  pdfLoading,
}: {
  report: ComplianceReport;
  onDownloadPDF?: () => void;
  pdfLoading?: boolean;
}) {
  const compliant = report.overall_status === "COMPLIANT";

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div
        className={`p-4 rounded-lg border ${
          compliant
            ? "bg-green-900/20 border-green-800"
            : "bg-red-900/20 border-red-800"
        }`}
      >
        <div className="flex justify-between items-center">
          <div>
            <h2
              className={`text-lg font-bold ${
                compliant ? "text-green-400" : "text-red-400"
              }`}
            >
              {report.overall_status}
            </h2>
            <p className="text-gray-500 text-xs font-mono mt-0.5">
              {report.safe_address}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold">
              $
              {report.total_usd.toLocaleString(undefined, {
                maximumFractionDigits: 0,
              })}
            </p>
            <p className="text-xs text-gray-400">
              {report.passed}/{report.total_rules} rules passed
            </p>
          </div>
        </div>
        {onDownloadPDF && (
          <button
            type="button"
            onClick={onDownloadPDF}
            disabled={pdfLoading}
            className="mt-3 w-full py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700
                       rounded-lg text-xs font-medium text-gray-300 transition
                       disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center justify-center gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {pdfLoading ? "Generating PDF..." : "Download PDF Report"}
          </button>
        )}
      </div>

      {/* Per-rule results */}
      {report.results.map((result, i) => (
        <div
          key={i}
          className={`p-3 rounded-lg border ${
            result.passed
              ? "bg-gray-900/50 border-gray-800"
              : result.severity === "breach"
              ? "bg-red-900/15 border-red-900"
              : "bg-yellow-900/15 border-yellow-900"
          }`}
        >
          <div className="flex justify-between items-start gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`text-xs font-bold shrink-0 ${
                  result.passed ? "text-green-400" : "text-red-400"
                }`}
              >
                {result.passed ? "PASS" : "FAIL"}
              </span>
              <span className="text-sm font-medium truncate">
                {result.name || result.rule}
              </span>
              {!result.passed && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                    result.severity === "breach"
                      ? "bg-red-900 text-red-200"
                      : "bg-yellow-900 text-yellow-200"
                  }`}
                >
                  {result.severity}
                </span>
              )}
            </div>
            <span className="text-xs text-gray-500 shrink-0">
              {result.current_value} / {result.threshold}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">{result.detail}</p>
        </div>
      ))}
    </div>
  );
}

// --- AI Analysis Panel ---

function AIAnalysisPanel({ analysis }: { analysis: AIAnalysis }) {
  const riskColors: Record<string, string> = {
    low: "text-green-400 bg-green-900/20 border-green-800",
    medium: "text-yellow-400 bg-yellow-900/20 border-yellow-800",
    high: "text-red-400 bg-red-900/20 border-red-800",
    unknown: "text-gray-400 bg-gray-900/20 border-gray-800",
  };

  return (
    <div className="mt-6 space-y-3">
      <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
        AI Risk Analysis
        <span className="text-[10px] px-1.5 py-0.5 bg-purple-900/50 text-purple-300 rounded">
          AI-Powered
        </span>
      </h3>

      {/* Summary + Risk Level */}
      <div
        className={`p-4 rounded-lg border ${
          riskColors[analysis.risk_level] || riskColors.unknown
        }`}
      >
        <div className="flex justify-between items-start gap-4">
          <p className="text-sm leading-relaxed">{analysis.summary}</p>
          <span className="text-xs font-bold uppercase shrink-0">
            {analysis.risk_level} risk
          </span>
        </div>
      </div>

      {/* AI Recommendations */}
      {analysis.recommendations && analysis.recommendations.length > 0 && (
        <div className="p-4 bg-gray-900/50 border border-gray-800 rounded-lg">
          <h4 className="text-xs font-semibold text-gray-400 mb-2">
            AI Recommendations
          </h4>
          <ul className="space-y-1.5">
            {analysis.recommendations.map((rec, i) => (
              <li key={i} className="text-sm text-gray-300 flex gap-2">
                <span className="text-blue-400 shrink-0">{i + 1}.</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Stress Test */}
      {analysis.stress_test && (
        <div className="p-4 bg-gray-900/50 border border-gray-800 rounded-lg">
          <h4 className="text-xs font-semibold text-gray-400 mb-2">
            Stress Test: What if ETH drops 30%?
          </h4>
          <p className="text-sm text-gray-300">{analysis.stress_test}</p>
        </div>
      )}

      {/* Benchmarks */}
      {analysis.benchmarks && (
        <div className="p-3 bg-gray-900/50 border border-gray-800 rounded-lg">
          <h4 className="text-xs font-semibold text-gray-400 mb-1">
            Industry Benchmark
          </h4>
          <p className="text-xs text-gray-400">{analysis.benchmarks}</p>
        </div>
      )}

      {/* Suggested Additional Rules */}
      {analysis.suggested_rules && analysis.suggested_rules.length > 0 && (
        <div className="p-3 bg-purple-900/10 border border-purple-900/30 rounded-lg">
          <h4 className="text-xs font-semibold text-purple-300 mb-2">
            Additional Rules to Consider
          </h4>
          {analysis.suggested_rules.map((sr, i) => (
            <div key={i} className="mb-1.5 last:mb-0">
              <p className="text-sm text-gray-300 font-medium">{sr.name}</p>
              <p className="text-xs text-gray-500">{sr.reason}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Recommendation Panel ---

function RecommendationPanel({
  recommendations,
}: {
  recommendations: Recommendation[];
}) {
  return (
    <div className="mt-4 p-4 bg-gray-900/50 border border-gray-800 rounded-lg">
      <h3 className="text-sm font-semibold text-gray-300 mb-3">
        What to Do Next
      </h3>
      <ul className="space-y-2">
        {recommendations.map((rec, i) => (
          <li key={i} className="flex gap-2 text-sm">
            <span
              className={`shrink-0 text-xs font-bold mt-0.5 ${
                rec.severity === "breach"
                  ? "text-red-400"
                  : "text-yellow-400"
              }`}
            >
              {rec.severity === "breach" ? "FIX" : "REVIEW"}
            </span>
            <div>
              <span className="text-gray-500 text-xs font-mono">
                {rec.rule}
              </span>
              <p className="text-gray-300">{rec.action}</p>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-4 pt-3 border-t border-gray-800">
        <p className="text-xs text-gray-500">
          This is a point-in-time audit. For continuous monitoring with
          real-time alerts, contact us about AEGIS Pro.
        </p>
      </div>
    </div>
  );
}
