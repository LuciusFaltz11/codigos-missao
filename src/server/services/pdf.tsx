import React from "react";
import { Document, Font, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { pointLabel } from "@/lib/constants/astrology";
import { formatDegreeDecimal } from "@/features/astrology/longitude";
import type { NatalChartView } from "@/features/astrology/wheel";
import type { InterpretationResult } from "@/features/interpretation/validate";
import type { MissionActivation } from "@/features/missions/activate";
import {
  CARTOGRAPHY_CLOSING,
  COVER_BRAND,
  COVER_KICKER,
  COVER_RIGHTS,
  COVER_TAGLINE,
  COVER_WELCOME,
  DECK_TITLE,
  INSPIRATION_IMPACT,
  INSPIRATION_INTRO,
  INSPIRATION_INVITE,
  INSPIRATION_NOTES,
  INSPIRATION_QUOTE,
  INSPIRATION_RIGHTS,
  INSPIRATION_SIGNATURE,
  INSPIRATION_TITLE,
  OPENING_COPY,
  OVERVIEW_TITLE,
  OVERVIEW_TRANSITION,
  SYNTHESIS_TITLE,
} from "@/features/reading/pdf-copy";
import { activationLead, codeNumber, formatCodeNumber, groupedActivations, orderedActivations, uniqueCodes } from "@/features/reading/pdf-structure";
import { sanitizePdfText } from "@/features/reading/pdf-text";
import { PdfNatalWheel } from "@/server/services/pdf-wheel";

Font.registerHyphenationCallback((word) => [word]);

const ink = "#0B0A09";
const muted = "#60605F";
const wine = "#1E332D";
const gold = "#C7A96B";
const goldSoft = "#F6F1E6";
const ivory = "#F3F3F3";

const styles = StyleSheet.create({
  cover: {
    backgroundColor: ivory,
    color: ink,
    paddingTop: 56,
    paddingHorizontal: 56,
    paddingBottom: 48,
    fontFamily: "Times-Roman",
  },
  coverBrand: { fontFamily: "Helvetica", fontSize: 10, letterSpacing: 3.2, color: gold, marginBottom: 18 },
  coverTagline: { fontSize: 13, color: muted, marginBottom: 28, lineHeight: 1.4 },
  coverKicker: { fontFamily: "Helvetica", fontSize: 9, letterSpacing: 1.8, color: wine, textTransform: "uppercase", marginBottom: 8 },
  coverName: { fontSize: 32, color: wine, marginBottom: 28, lineHeight: 1.15 },
  coverCardWrap: { alignItems: "center", marginBottom: 28 },
  coverWelcome: { fontFamily: "Helvetica", fontSize: 10.5, lineHeight: 1.6, color: ink, marginBottom: 10 },
  coverRights: { position: "absolute", left: 56, right: 56, bottom: 40, fontFamily: "Helvetica", fontSize: 8, letterSpacing: 0.4, color: muted },
  coverRule: { height: 1, backgroundColor: gold, width: 64, marginBottom: 20 },
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
  heading: { fontSize: 22, color: wine, marginBottom: 16, marginTop: 2 },
  body: { fontFamily: "Helvetica", fontSize: 10.5, lineHeight: 1.6, color: ink, marginBottom: 9 },
  meta: { fontFamily: "Helvetica", fontSize: 8.5, color: muted, lineHeight: 1.45 },
  groupLabel: { fontFamily: "Helvetica", fontSize: 8, letterSpacing: 1.4, color: gold, textTransform: "uppercase", marginBottom: 6, marginTop: 12 },
  groupRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 4 },
  groupItem: { fontFamily: "Helvetica", fontSize: 11, color: ink, marginRight: 16, marginBottom: 6 },
  overviewSplit: { flexDirection: "row", alignItems: "flex-start", marginBottom: 16 },
  overviewWheel: { width: 280, marginRight: 18 },
  legendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: goldSoft,
  },
  legendPoint: { width: 92, fontFamily: "Helvetica", fontSize: 9, color: muted },
  legendNumber: { width: 22, fontFamily: "Helvetica", fontSize: 9, color: gold },
  legendCode: { flex: 1, fontSize: 11, color: wine, paddingRight: 8 },
  legendMeta: { width: 168, textAlign: "right", fontFamily: "Helvetica", fontSize: 8, color: muted },
  transition: { fontFamily: "Times-Italic", fontSize: 11, lineHeight: 1.5, color: wine, marginTop: 16 },
  deck: { flexDirection: "row", flexWrap: "wrap" },
  deckItem: { width: "25%", paddingRight: 10, paddingBottom: 14 },
  deckName: { fontSize: 10, color: wine, marginTop: 6, lineHeight: 1.2 },
  deckVerb: { fontFamily: "Helvetica", fontSize: 8, letterSpacing: 1, color: gold, textTransform: "uppercase", marginTop: 3 },
  deckPoints: { fontFamily: "Helvetica", fontSize: 8, color: muted, marginTop: 3 },
  hero: { flexDirection: "row", marginBottom: 18 },
  heroCopy: { flex: 1, justifyContent: "center", paddingLeft: 4 },
  archetype: { fontSize: 24, color: wine, marginBottom: 6, lineHeight: 1.2 },
  keyword: { fontFamily: "Helvetica", fontSize: 10, letterSpacing: 1.2, color: gold, textTransform: "uppercase", marginBottom: 10 },
  lead: { fontFamily: "Helvetica", fontSize: 10, lineHeight: 1.5, color: muted, marginBottom: 4 },
  narrative: { fontFamily: "Helvetica", fontSize: 10.5, lineHeight: 1.65, color: ink, marginBottom: 16 },
  pause: { fontFamily: "Times-Italic", fontSize: 12, lineHeight: 1.5, color: wine, marginTop: 8 },
  pattern: { marginBottom: 12 },
  patternTheme: { fontSize: 13, color: wine, marginBottom: 4 },
  cartography: { fontFamily: "Helvetica", fontSize: 10.5, lineHeight: 1.65, color: ink, marginTop: 8 },
  inspireTitle: { fontFamily: "Helvetica", fontSize: 10, letterSpacing: 2, color: gold, textTransform: "uppercase", marginBottom: 14 },
  inspireIntro: { fontFamily: "Helvetica", fontSize: 10.5, color: muted, marginBottom: 16 },
  inspireNote: { fontFamily: "Helvetica", fontSize: 10.5, lineHeight: 1.55, color: ink, marginBottom: 8, paddingLeft: 4 },
  inspireImpact: { fontSize: 16, color: wine, marginTop: 22, marginBottom: 14, lineHeight: 1.3 },
  inspireQuote: { fontFamily: "Times-Italic", fontSize: 13, lineHeight: 1.5, color: wine, marginTop: 10, marginBottom: 28 },
  inspireSign: { fontFamily: "Helvetica", fontSize: 9, color: muted, marginBottom: 6 },
  cardFrame: {
    borderWidth: 1.2,
    borderColor: gold,
    backgroundColor: goldSoft,
    overflow: "hidden",
  },
  cardImage: { width: "100%", height: "100%", objectFit: "cover" },
  placeholder: { flex: 1, justifyContent: "center", alignItems: "center", padding: 8 },
  placeholderTitle: { fontSize: 10, color: wine, textAlign: "center" },
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
  chart?: NatalChartView | null;
};

function formatPdfDate(iso: string) {
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}

function PageFooter({ name, extra }: { name: string; extra?: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>
        Códigos da Missão · {name}
        {extra ? ` · ${extra}` : ""}
      </Text>
      <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

function CardPortrait({
  src,
  archetype,
  width,
  height,
}: {
  src?: string;
  archetype: string;
  width: number;
  height: number;
}) {
  return (
    <View style={[styles.cardFrame, { width, height }]}>
      {src ? (
        <Image src={src} style={styles.cardImage} />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderTitle}>{archetype}</Text>
        </View>
      )}
    </View>
  );
}

function ReportDocument(input: ReportDocumentInput) {
  const images = input.cardImages ?? {};
  const activations = orderedActivations(input.activations);
  const codes = uniqueCodes(activations);
  const groups = groupedActivations(activations);
  const readingsById = new Map(input.reading.individual_readings.map((item) => [item.activation_id, item]));
  const featured = activations.find((item) => item.natalPointId === "sun") ?? activations[0] ?? null;
  const birthLine = `${formatPdfDate(input.localDate)} · ${input.localTime} · ${input.cityLabel}`;
  const markedPointIds = activations.map((item) => item.natalPointId);

  return (
    <Document
      title={`Códigos da Missão, ${input.name}`}
      author="Códigos da Missão"
      subject={`Metodologia ${input.methodologyVersion}`}
    >
      <Page size="A4" style={styles.cover}>
        <View style={styles.coverRule} />
        <Text style={styles.coverBrand}>{COVER_BRAND}</Text>
        <Text style={styles.coverTagline}>{COVER_TAGLINE}</Text>
        <Text style={styles.coverKicker}>{COVER_KICKER}</Text>
        <Text style={styles.coverName}>{input.name}</Text>
        {featured ? (
          <View style={styles.coverCardWrap}>
            <CardPortrait src={images[featured.code.id]} archetype={featured.code.archetype} width={148} height={222} />
            <Text style={{ fontFamily: "Helvetica", fontSize: 9, color: wine, marginTop: 8 }}>
              {formatCodeNumber(codeNumber(featured))} {featured.code.archetype}
            </Text>
          </View>
        ) : null}
        {COVER_WELCOME.map((paragraph) => (
          <Text key={paragraph.slice(0, 24)} style={styles.coverWelcome}>
            {paragraph}
          </Text>
        ))}
        <Text style={styles.coverRights}>{COVER_RIGHTS}</Text>
      </Page>

      <Page size="A4" style={styles.page}>
        <PageFooter name={input.name} extra={birthLine} />
        {OPENING_COPY.map((paragraph) => (
          <Text key={paragraph.slice(0, 32)} style={styles.body}>
            {paragraph}
          </Text>
        ))}
        <Text style={styles.inspireImpact}>{INSPIRATION_IMPACT}</Text>
        {groups.map((group) => (
          <View key={group.id}>
            <Text style={styles.groupLabel}>{group.label}</Text>
            <View style={styles.groupRow}>
              {group.activations.map((activation) => (
                <Text key={activation.id} style={styles.groupItem}>
                  {pointLabel(activation.natalPointId)}
                </Text>
              ))}
            </View>
          </View>
        ))}
      </Page>

      <Page size="A4" style={styles.page}>
        <PageFooter name={input.name} />
        <Text style={styles.heading}>{OVERVIEW_TITLE}</Text>
        {input.chart ? (
          <View style={styles.overviewSplit}>
            <View style={styles.overviewWheel}>
              <PdfNatalWheel chart={input.chart} markedPointIds={markedPointIds} />
            </View>
          </View>
        ) : null}
        {activations.map((activation) => (
          <View key={activation.id} style={styles.legendRow} wrap={false}>
            <Text style={styles.legendPoint}>{pointLabel(activation.natalPointId)}</Text>
            <Text style={styles.legendNumber}>{formatCodeNumber(codeNumber(activation))}</Text>
            <Text style={styles.legendCode}>{activation.code.archetype}</Text>
            <Text style={styles.legendMeta}>
              {activation.signName} {formatDegreeDecimal(activation.degreeWithinSign)}, casa {activation.houseNumber}
            </Text>
          </View>
        ))}
        <Text style={styles.transition}>{OVERVIEW_TRANSITION}</Text>
      </Page>

      <Page size="A4" style={styles.page}>
        <PageFooter name={input.name} />
        <Text style={styles.heading}>{DECK_TITLE}</Text>
        <View style={styles.deck}>
          {codes.map((code) => (
            <View key={code.missionCodeId} style={styles.deckItem} wrap={false}>
              <CardPortrait src={images[code.missionCodeId]} archetype={code.archetype} width={112} height={168} />
              <Text style={styles.deckName}>{formatCodeNumber(code.number)} {code.archetype}</Text>
              <Text style={styles.deckVerb}>{code.keyword}</Text>
              <Text style={styles.deckPoints}>{code.activations.map((item) => pointLabel(item.natalPointId)).join(", ")}</Text>
            </View>
          ))}
        </View>
      </Page>

      {activations.map((activation) => {
        const reading = readingsById.get(activation.id);
        if (!reading) return null;
        return (
          <Page key={activation.id} size="A4" style={styles.page}>
            <PageFooter name={input.name} />
            <View style={styles.hero} wrap={false}>
              <CardPortrait src={images[activation.code.id]} archetype={activation.code.archetype} width={148} height={222} />
              <View style={styles.heroCopy}>
                <Text style={styles.archetype}>{formatCodeNumber(codeNumber(activation))} {activation.code.archetype}</Text>
                <Text style={styles.keyword}>{activation.code.keyword}</Text>
                <Text style={styles.lead}>{activationLead(activation)}</Text>
              </View>
            </View>
            <Text style={styles.narrative}>{sanitizePdfText(reading.interpretation)}</Text>
            <Text style={styles.pause}>{sanitizePdfText(reading.reflective_question)}</Text>
          </Page>
        );
      })}

      <Page size="A4" style={styles.page}>
        <PageFooter name={input.name} />
        <Text style={styles.heading}>{SYNTHESIS_TITLE}</Text>
        {input.reading.patterns.map((pattern) => (
          <View key={pattern.pattern_id} style={styles.pattern} wrap={false}>
            <Text style={styles.patternTheme}>{sanitizePdfText(pattern.theme)}</Text>
            <Text style={styles.body}>{sanitizePdfText(pattern.insight)}</Text>
          </View>
        ))}
        <Text style={styles.cartography}>{CARTOGRAPHY_CLOSING}</Text>
      </Page>

      <Page size="A4" style={styles.page}>
        <PageFooter name={input.name} />
        <Text style={styles.inspireTitle}>{INSPIRATION_TITLE}</Text>
        <Text style={styles.inspireIntro}>{INSPIRATION_INTRO}</Text>
        {INSPIRATION_NOTES.map((note) => (
          <Text key={note} style={styles.inspireNote}>
            • {note}
          </Text>
        ))}
        <Text style={styles.inspireImpact}>{INSPIRATION_IMPACT}</Text>
        <Text style={styles.body}>{INSPIRATION_INVITE}</Text>
        <Text style={styles.inspireQuote}>{INSPIRATION_QUOTE}</Text>
        <Text style={styles.inspireSign}>{INSPIRATION_SIGNATURE}</Text>
        <Text style={styles.inspireSign}>{INSPIRATION_RIGHTS}</Text>
      </Page>
    </Document>
  );
}

export function renderReportPdf(input: ReportDocumentInput) {
  return renderToBuffer(<ReportDocument {...input} />);
}
