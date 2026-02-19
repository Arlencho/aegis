import type { ComplianceReport, Chain } from "./types";

export async function downloadAuditPDF(report: ComplianceReport, chain: Chain) {
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
          <Text style={s.footerText}>Generated by AEGIS | aegistreasury.com</Text>
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
