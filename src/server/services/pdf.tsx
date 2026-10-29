import React from "react";
import { Document, Font, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { DISCLAIMER, elementLabel, pointLabel, signBySlug } from "@/lib/constants/astrology";
import { formatDegree } from "@/features/astrology/longitude";
import type { InterpretationResult } from "@/features/interpretation/validate";
import type { MissionActivation } from "@/features/missions/activate";

Font.registerHyphenationCallback((word) => [word]);

const ink = "#241D22";
const muted = "#5E5664";
const wine = "#482931";
const wineDeep = "#2B1924";
const gold = "#B99B62";
const goldSoft = "#E8DCC6";
const ivory = "#F8F6F1";
const border = "#E7E2DA";
const surface = "#FFFFFF";

const styles = StyleSheet.create({
  cover: {
    backgroundColor: wineDeep,
    color: ivory,
    paddingTop: 64,
    paddingHorizontal: 56,
    paddingBottom: 48,
    fontFamily: "Times-Roman",
  },
  coverRule: { height: 1, backgroundColor: gold, width: 72, marginBottom: 28 },
  coverBrand: { fontFamily: "Helvetica", fontSize: 10, letterSpacing: 3, color: gold, marginBottom: 18 },
  coverTitle: { fontSize: 36, lineHeight: 1.15, marginBottom: 14 },
  coverName: { fontSize: 20, color: goldSoft, marginBottom: 28 },
  coverMeta: { fontFamily: "Helvetica", fontSize: 11, lineHeight: 1.5, color: ivory },
  coverFoot: { position: "absolute", left: 56, right: 56, bottom: 48 },
  page: {
    backgroundColor: ivory,
    color: ink,
    paddingTop: 48,
    paddingHorizontal: 48,
    paddingBottom: 64,
    fontFamily: "Times-Roman",
    fontSize: 11,
    lineHeight: 1.5,
  },
  footer: {
    position: "absolute",
    left: 48,
    right: 48,
    bottom: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: goldSoft,
    paddingTop: 8,
  },
  footerText: { fontFamily: "Helvetica", fontSize: 8, letterSpacing: 0.4, color: muted },
  kicker: { fontFamily: "Helvetica", fontSize: 9, letterSpacing: 1.8, color: gold, marginBottom: 8, textTransform: "uppercase" },
  heading: { fontSize: 22, color: wine, marginBottom: 10, marginTop: 4 },
  subheading: { fontSize: 14, color: wine, marginBottom: 8, marginTop: 14 },
  body: { fontFamily: "Helvetica", fontSize: 10.5, lineHeight: 1.55, color: ink, marginBottom: 8 },
  meta: { fontFamily: "Helvetica", fontSize: 9, color: muted, lineHeight: 1.45, marginBottom: 4 },
  quote: {
    backgroundColor: surface,
    borderLeftWidth: 2,
    borderLeftColor: gold,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginVertical: 10,
  },
  quoteText: { fontFamily: "Helvetica", fontSize: 10, lineHeight: 1.5, color: muted },
  rule: { height: 1, backgroundColor: border, marginVertical: 14 },
  indexRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: goldSoft,
  },
  indexPoint: { width: 108, fontFamily: "Helvetica", fontSize: 9, color: muted },
  indexCode: { flex: 1, fontSize: 12, color: wine },
  indexMeta: { width: 150, textAlign: "right", fontFamily: "Helvetica", fontSize: 8, color: muted },
  hero: { flexDirection: "row", marginBottom: 16 },
  cardFrame: {
    width: 132,
    height: 198,
    borderWidth: 1.5,
    borderColor: gold,
    backgroundColor: goldSoft,
    overflow: "hidden",
    marginRight: 18,
  },
  cardImage: { width: "100%", height: "100%", objectFit: "cover" },
  placeholder: { flex: 1, justifyContent: "center", alignItems: "center", padding: 12 },
  placeholderKicker: { fontFamily: "Helvetica", fontSize: 8, letterSpacing: 1.4, color: muted, marginBottom: 8 },
  placeholderTitle: { fontSize: 14, color: wine, textAlign: "center" },
  heroCopy: { flex: 1, justifyContent: "center" },
  archetype: { fontSize: 24, color: wine, marginBottom: 6, lineHeight: 1.2 },
  keyword: { fontFamily: "Helvetica", fontSize: 10, letterSpacing: 1.2, color: gold, textTransform: "uppercase", marginBottom: 10 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 8 },
  chip: {
    fontFamily: "Helvetica",
    fontSize: 8,
    letterSpacing: 0.4,
    color: wine,
    backgroundColor: goldSoft,
    paddingVertical: 3,
    paddingHorizontal: 7,
    marginRight: 6,
    marginBottom: 6,
  },
  pair: { marginBottom: 10 },
  pairLabel: { fontFamily: "Helvetica", fontSize: 8, letterSpacing: 1.4, color: gold, marginBottom: 3, textTransform: "uppercase" },
  pairBody: { fontFamily: "Helvetica", fontSize: 10, lineHeight: 1.5, color: ink },
  question: {
    marginTop: 12,
    padding: 12,
    backgroundColor: surface,
    borderWidth: 1,
    borderColor: goldSoft,
  },
  questionLabel: { fontFamily: "Helvetica", fontSize: 8, letterSpacing: 1.4, color: gold, marginBottom: 4, textTransform: "uppercase" },
  questionText: { fontFamily: "Times-Italic", fontSize: 12, lineHeight: 1.45, color: wine },
  pattern: { marginBottom: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: goldSoft },
  patternTheme: { fontSize: 13, color: wine, marginBottom: 4 },
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
  cardImages?: Record<string, string>;
};

function formatPdfDate(iso: string) {
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}

function PageFooter({ name }: { name: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>Códigos da Missão · {name}</Text>
      <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

function CardPortrait({ src, archetype }: { src?: string; archetype: string }) {
  return (
    <View style={styles.cardFrame}>
      {src ? (
        <Image src={src} style={styles.cardImage} />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderKicker}>Carta</Text>
          <Text style={styles.placeholderTitle}>{archetype}</Text>
        </View>
      )}
    </View>
  );
}

function ReportDocument(input: ReportDocumentInput) {
  const images = input.cardImages ?? {};
  return (
    <Document
      title={`Códigos da Missão — ${input.name}`}
      author="Códigos da Missão"
      subject={`Metodologia ${input.methodologyVersion}`}
    >
      <Page size="A4" style={styles.cover}>
        <View style={styles.coverRule} />
        <Text style={styles.coverBrand}>CÓDIGOS DA MISSÃO</Text>
        <Text style={styles.coverTitle}>Leitura integrada</Text>
        <Text style={styles.coverName}>{input.name}</Text>
        <Text style={styles.coverMeta}>
          {formatPdfDate(input.localDate)} · {input.localTime} · {input.cityLabel}
        </Text>
        <Text style={styles.coverMeta}>{input.timezone}</Text>
        <View style={styles.coverFoot}>
          <View style={styles.coverRule} />
          <Text style={{ fontFamily: "Helvetica", fontSize: 9, color: goldSoft, marginTop: 10 }}>
            Metodologia {input.methodologyVersion}
          </Text>
        </View>
      </Page>

      <Page size="A4" style={styles.page}>
        <PageFooter name={input.name} />
        <Text style={styles.kicker}>Antes de ler</Text>
        <Text style={styles.heading}>Sobre esta leitura</Text>
        <View style={styles.quote}>
          <Text style={styles.quoteText}>{DISCLAIMER}</Text>
        </View>
        {input.notice ? <Text style={styles.body}>{input.notice}</Text> : null}
        <View style={styles.rule} />
        <Text style={styles.subheading}>Os Códigos deste mapa</Text>
        {input.activations.map((activation) => (
          <View key={activation.id} style={styles.indexRow} wrap={false}>
            <Text style={styles.indexPoint}>{pointLabel(activation.natalPointId)}</Text>
            <Text style={styles.indexCode}>{activation.code.archetype}</Text>
            <Text style={styles.indexMeta}>
              {activation.signName} {formatDegree(activation.degreeWithinSign)} · casa {activation.houseNumber}
            </Text>
          </View>
        ))}
      </Page>

      {input.reading.individual_readings.map((reading) => {
        const activation = input.activations.find((item) => item.id === reading.activation_id);
        const code = activation?.code;
        const element = activation ? signBySlug(activation.signSlug)?.element : null;
        return (
          <Page key={reading.activation_id} size="A4" style={styles.page}>
            <PageFooter name={input.name} />
            <View style={styles.hero} wrap={false}>
              <CardPortrait src={code ? images[code.id] : undefined} archetype={code?.archetype ?? reading.headline} />
              <View style={styles.heroCopy}>
                <Text style={styles.kicker}>{activation ? pointLabel(activation.natalPointId) : "Código"}</Text>
                <Text style={styles.archetype}>{code?.archetype ?? reading.headline}</Text>
                <Text style={styles.keyword}>{code?.keyword ?? ""}</Text>
                <View style={styles.chipRow}>
                  {element ? <Text style={styles.chip}>{elementLabel(element)}</Text> : null}
                  {activation ? (
                    <Text style={styles.chip}>
                      {activation.signName} {formatDegree(activation.degreeWithinSign)}
                    </Text>
                  ) : null}
                  {activation ? <Text style={styles.chip}>Casa {activation.houseNumber}</Text> : null}
                  {code ? <Text style={styles.chip}>Decanato {code.decan} · {code.decanRuler}</Text> : null}
                </View>
              </View>
            </View>
            {code ? (
              <View>
                <View style={styles.pair}>
                  <Text style={styles.pairLabel}>Luz</Text>
                  <Text style={styles.pairBody}>{code.light}</Text>
                </View>
                <View style={styles.pair}>
                  <Text style={styles.pairLabel}>Sombra</Text>
                  <Text style={styles.pairBody}>{code.shadow}</Text>
                </View>
              </View>
            ) : null}
            <Text style={styles.subheading}>Leitura</Text>
            <Text style={styles.body}>{reading.interpretation}</Text>
            <View style={styles.question} wrap={false}>
              <Text style={styles.questionLabel}>Pergunta para observar</Text>
              <Text style={styles.questionText}>{reading.reflective_question}</Text>
            </View>
          </Page>
        );
      })}

      <Page size="A4" style={styles.page}>
        <PageFooter name={input.name} />
        <Text style={styles.kicker}>Integração</Text>
        <Text style={styles.heading}>Padrões e síntese</Text>
        {input.reading.patterns.length > 0 ? (
          <View>
            {input.reading.patterns.map((pattern) => (
              <View key={pattern.pattern_id} style={styles.pattern} wrap={false}>
                <Text style={styles.patternTheme}>{pattern.theme}</Text>
                <Text style={styles.body}>{pattern.insight}</Text>
                <Text style={styles.meta}>{pattern.evidence}</Text>
              </View>
            ))}
            <View style={styles.rule} />
          </View>
        ) : null}
        <Text style={styles.body}>{input.reading.overall_synthesis}</Text>
        <View style={styles.quote}>
          <Text style={styles.quoteText}>{input.reading.closing_reflection}</Text>
        </View>
        <Text style={styles.subheading}>Perguntas finais</Text>
        {input.reading.reflective_questions.map((question) => (
          <Text key={question} style={styles.body}>
            — {question}
          </Text>
        ))}
        <View style={styles.rule} />
        <Text style={styles.meta}>Cálculo: {input.calculationVersion}</Text>
      </Page>
    </Document>
  );
}

export function renderReportPdf(input: ReportDocumentInput) {
  return renderToBuffer(<ReportDocument {...input} />);
}
