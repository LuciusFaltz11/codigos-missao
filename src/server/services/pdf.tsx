import React from "react";
import { Document, Font, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { DISCLAIMER } from "@/lib/constants/astrology";
import { formatDegree } from "@/features/astrology/longitude";
import type { InterpretationResult } from "@/features/interpretation/validate";
import type { MissionActivation } from "@/features/missions/activate";

Font.registerHyphenationCallback((word) => [word]);

const styles = StyleSheet.create({
  cover: { backgroundColor: "#2B1924", color: "#F8F6F1", padding: 56, fontFamily: "Times-Roman" },
  page: { backgroundColor: "#F8F6F1", color: "#241D22", padding: 48, fontFamily: "Times-Roman", fontSize: 12, lineHeight: 1.45 },
  kicker: { fontFamily: "Helvetica", fontSize: 10, letterSpacing: 1.5, color: "#B99B62", marginBottom: 16 },
  title: { fontSize: 32, marginBottom: 12 },
  body: { fontFamily: "Helvetica", fontSize: 11, lineHeight: 1.5, marginBottom: 10 },
  heading: { fontSize: 18, marginBottom: 8, marginTop: 8 },
  meta: { fontFamily: "Helvetica", fontSize: 10, color: "#706772", marginBottom: 4 },
  rule: { height: 1, backgroundColor: "#E7E2DA", marginVertical: 12 },
});

export type ReportDocumentInput = {
  name: string;
  cityLabel: string;
  localDate: string;
  localTime: string;
  timezone: string;
  methodologyVersion: string;
  calculationVersion: string;
  notice: string;
  activations: MissionActivation[];
  reading: InterpretationResult;
};

function ReportDocument(input: ReportDocumentInput) {
  return (
    <Document
      title={`Códigos da Missão — ${input.name}`}
      author="Códigos da Missão"
      subject={`Metodologia ${input.methodologyVersion}`}
    >
      <Page size="A4" style={styles.cover}>
        <Text style={styles.kicker}>CÓDIGOS DA MISSÃO</Text>
        <Text style={styles.title}>Leitura integrada</Text>
        <Text style={{ fontSize: 16, marginBottom: 24 }}>{input.name}</Text>
        <Text style={{ fontFamily: "Helvetica", fontSize: 11 }}>
          {input.localDate} · {input.localTime} · {input.cityLabel}
        </Text>
        <Text style={{ fontFamily: "Helvetica", fontSize: 11, marginTop: 6 }}>{input.timezone}</Text>
        <Text style={{ fontFamily: "Helvetica", fontSize: 10, marginTop: 36, color: "#E8DCC6" }}>
          Metodologia {input.methodologyVersion}
        </Text>
      </Page>
      <Page size="A4" style={styles.page}>
        <Text style={styles.heading}>Sobre esta leitura</Text>
        <Text style={styles.body}>{DISCLAIMER}</Text>
        {input.notice ? <Text style={styles.body}>{input.notice}</Text> : null}
        <Text style={styles.meta}>Cálculo: {input.calculationVersion}</Text>
        <View style={styles.rule} />
        <Text style={styles.heading}>Ativações</Text>
        {input.activations.map((activation) => (
          <Text key={activation.id} style={styles.body}>
            {activation.trail.join(" → ")}
          </Text>
        ))}
      </Page>
      {input.reading.individual_readings.map((reading) => {
        const activation = input.activations.find((item) => item.id === reading.activation_id);
        return (
          <Page key={reading.activation_id} size="A4" style={styles.page}>
            <Text style={styles.kicker}>{activation?.code.keyword ?? "Código"}</Text>
            <Text style={styles.heading}>{activation?.code.archetype ?? reading.headline}</Text>
            <Text style={styles.meta}>
              {activation ? `${activation.code.archetype} · ${activation.signName} ${formatDegree(activation.degreeWithinSign)} · casa ${activation.houseNumber}` : reading.activation_id}
            </Text>
            {activation ? <Text style={styles.body}>Luz: {activation.code.light}</Text> : null}
            {activation ? <Text style={styles.body}>Sombra: {activation.code.shadow}</Text> : null}
            <Text style={styles.body}>{reading.interpretation}</Text>
            <Text style={styles.body}>{reading.reflective_question}</Text>
          </Page>
        );
      })}
      <Page size="A4" style={styles.page}>
        <Text style={styles.heading}>Padrões e síntese</Text>
        {input.reading.patterns.map((pattern) => (
          <View key={pattern.pattern_id}>
            <Text style={styles.body}>{pattern.theme}</Text>
            <Text style={styles.body}>{pattern.insight}</Text>
            <Text style={styles.meta}>{pattern.evidence}</Text>
          </View>
        ))}
        <View style={styles.rule} />
        <Text style={styles.body}>{input.reading.overall_synthesis}</Text>
        <Text style={styles.body}>{input.reading.closing_reflection}</Text>
        {input.reading.reflective_questions.map((question) => (
          <Text key={question} style={styles.body}>
            {question}
          </Text>
        ))}
      </Page>
    </Document>
  );
}

export function renderReportPdf(input: ReportDocumentInput) {
  return renderToBuffer(<ReportDocument {...input} />);
}
