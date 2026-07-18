import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import AppHeader from '../components/AppHeader';
import Screen from '../components/Screen';
import { Card, Dot, ProgressBar, SecondaryButton } from '../components/ui';
import { useApp } from '../context/AppContext';
import { colors, fonts, hexToRgba, spacing } from '../theme/theme';

export default function MatchDetailScreen({ navigation }) {
  const { accent, selCandidate, sorted, detailFor, emailLang, setEmailLang, copied, copyDraft } = useApp();

  const cand = selCandidate || sorted[0];
  const d = detailFor(cand);

  if (!d) return null;

  return (
    <View style={{ flex: 1 }}>
      <AppHeader />
      <Screen>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.backLink}>← All matches</Text>
        </Pressable>

        <View style={styles.topRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.typeRow}>
              <Dot color={d.dot} />
              <Text style={styles.typeText}>{d.type}</Text>
            </View>
            <Text style={styles.name}>{d.name}</Text>
            <View style={styles.sectorWrap}>
              {d.sectors.map((sec) => (
                <View key={sec} style={styles.sectorPill}>
                  <Text style={styles.sectorText}>{sec}</Text>
                </View>
              ))}
            </View>
          </View>
          <View style={styles.bigScoreWrap}>
            <View style={[styles.bigScore, { backgroundColor: hexToRgba(accent, 0.1) }]}>
              <Text style={[styles.bigScoreText, { color: accent }]}>{d.score}</Text>
            </View>
            <Text style={styles.bigScoreLabel}>Fit score</Text>
          </View>
        </View>

        <Card style={{ marginTop: 22 }}>
          <Text style={[styles.sectionEyebrow, { color: accent }]}>Why this match</Text>
          <Text style={styles.rationale}>{d.rationale}</Text>
        </Card>

        <Card style={{ marginTop: 14 }}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionEyebrowMuted}>Fit breakdown</Text>
            <Text style={styles.confidence}>Confidence {d.confidencePct}% · rank #{d.rank}</Text>
          </View>
          <View style={{ marginTop: 8 }}>
            {d.breakdown.map((b) => (
              <View key={b.label} style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>{b.label}</Text>
                <View style={{ flex: 1 }}>
                  <ProgressBar value={b.val} accent={accent} />
                </View>
                <Text style={styles.breakdownVal}>{b.val}</Text>
              </View>
            ))}
          </View>
        </Card>

        <View style={styles.pairRow}>
          <Card style={{ flex: 1 }}>
            <Text style={[styles.sectionEyebrow, { color: accent }]}>Why now</Text>
            <Text style={styles.paraText}>{d.whyNow}</Text>
          </Card>
          <Card style={{ flex: 1 }}>
            <Text style={styles.sectionEyebrowMuted}>Why not higher</Text>
            <Text style={styles.paraText}>{d.whyNot}</Text>
          </Card>
        </View>

        <Card style={{ marginTop: 14 }}>
          <Text style={[styles.sectionEyebrowMuted, { marginBottom: 14 }]}>Key facts</Text>
          <View style={{ gap: 10 }}>
            {d.facts.map((f) => (
              <View key={f} style={styles.factRow}>
                <View style={[styles.factDot, { backgroundColor: accent }]} />
                <Text style={styles.factText}>{f}</Text>
              </View>
            ))}
          </View>
        </Card>

        <Card style={{ marginTop: 14 }}>
          <Text style={[styles.sectionEyebrowMuted, { marginBottom: 14 }]}>Source links</Text>
          {d.hasSources ? (
            <View style={{ gap: 10 }}>
              {d.sources.map((s) => (
                <Pressable key={s.url} onPress={() => Linking.openURL(s.url)} style={styles.sourceRow}>
                  <Text style={styles.sourceLabel}>{s.label}</Text>
                  <Text style={[styles.sourceOpen, { color: accent }]}>Open ↗</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={styles.noSourceBox}>
              <Text style={styles.noSourceText}>No public sources found yet. This match used your profile and disclosed data only.</Text>
            </View>
          )}
        </Card>

        <Card style={{ marginTop: 14 }}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionEyebrowMuted}>Draft introduction</Text>
            {d.hasDraft ? (
              <View style={styles.langTabs}>
                <Pressable
                  onPress={() => setEmailLang('vi')}
                  style={[styles.langTab, emailLang === 'vi' && { backgroundColor: accent }]}
                >
                  <Text style={[styles.langTabText, { color: emailLang === 'vi' ? '#fff' : colors.textMuted }]}>Tiếng Việt</Text>
                </Pressable>
                <Pressable
                  onPress={() => setEmailLang('en')}
                  style={[styles.langTab, emailLang === 'en' && { backgroundColor: accent }]}
                >
                  <Text style={[styles.langTabText, { color: emailLang === 'en' ? '#fff' : colors.textMuted }]}>English</Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          {d.hasDraft ? (
            <>
              <View style={styles.draftBox}>
                <Text style={styles.draftText}>{d.draft}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', marginTop: 12 }}>
                <SecondaryButton
                  label={copied ? '✓ Copied' : 'Copy draft'}
                  onPress={() => copyDraft(d.draft)}
                />
              </View>
            </>
          ) : (
            <View style={styles.draftErrorBox}>
              <Text style={styles.draftErrorTitle}>Draft couldn't be generated</Text>
              <Text style={styles.draftErrorText}>
                The advisor hit an error preparing this introduction. Your data is safe — try again.
              </Text>
            </View>
          )}
        </Card>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  backLink: { color: colors.textFaint, fontSize: 12.5, fontFamily: fonts.sans },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, marginTop: 22 },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeText: { color: colors.textFaint, fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase', fontFamily: fonts.sans },
  name: { marginTop: 10, color: colors.heading, fontFamily: fonts.serif, fontSize: 28, lineHeight: 34 },
  sectorWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 14 },
  sectorPill: {
    paddingVertical: 5, paddingHorizontal: 11, borderWidth: 1, borderColor: colors.border,
    borderRadius: 99, backgroundColor: colors.card,
  },
  sectorText: { color: colors.textMuted, fontSize: 12, fontFamily: fonts.sans },
  bigScoreWrap: { alignItems: 'center' },
  bigScore: { width: 84, height: 84, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  bigScoreText: { fontFamily: fonts.serifMedium, fontSize: 34 },
  bigScoreLabel: { marginTop: 8, color: colors.textFaintest, fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase', fontFamily: fonts.sans },
  sectionEyebrow: { fontSize: 11.5, letterSpacing: 0.5, textTransform: 'uppercase', fontFamily: fonts.sansSemiBold },
  sectionEyebrowMuted: { color: colors.textFaint, fontSize: 11.5, letterSpacing: 0.5, textTransform: 'uppercase', fontFamily: fonts.sansSemiBold },
  rationale: { marginTop: 12, color: '#26261f', fontFamily: fonts.serif, fontSize: 19, lineHeight: 29 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginVertical: 8 },
  breakdownLabel: { width: 100, color: colors.textBody, fontSize: 13, fontFamily: fonts.sans },
  breakdownVal: { width: 30, textAlign: 'right', color: colors.textStrong, fontSize: 13, fontFamily: fonts.sansSemiBold },
  pairRow: { flexDirection: 'row', gap: 14, marginTop: 14 },
  paraText: { marginTop: 11, color: colors.textBody, fontSize: 14, lineHeight: 21, fontFamily: fonts.sans },
  factRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  factDot: { width: 5, height: 5, borderRadius: 3 },
  factText: { color: colors.label, fontSize: 13.5, fontFamily: fonts.sans, flexShrink: 1 },
  sourceRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14,
    paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: 11, backgroundColor: colors.inputBg,
  },
  sourceLabel: { color: colors.label, fontSize: 14, fontFamily: fonts.sans },
  sourceOpen: { fontSize: 13, fontFamily: fonts.sansSemiBold },
  noSourceBox: {
    padding: 20, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.inputBorder,
    borderRadius: 12, backgroundColor: colors.inputBg,
  },
  noSourceText: { textAlign: 'center', color: colors.textFaint, fontSize: 13.5, lineHeight: 20, fontFamily: fonts.sans },
  langTabs: { flexDirection: 'row', gap: 4, padding: 3, borderWidth: 1, borderColor: colors.border, borderRadius: 9, backgroundColor: colors.inputBg },
  langTab: { paddingVertical: 7, paddingHorizontal: 13, borderRadius: 7 },
  langTabText: { fontSize: 12.5, fontFamily: fonts.sansSemiBold },
  draftBox: { marginTop: 16, padding: 20, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 12, backgroundColor: colors.inputBg },
  draftText: { color: '#33332b', fontSize: 14, lineHeight: 22, fontFamily: fonts.sans },
  draftErrorBox: { marginTop: 16, padding: 20, borderWidth: 1, borderColor: colors.errorBorderSoft, borderRadius: 12, backgroundColor: colors.errorBgSoft },
  draftErrorTitle: { color: colors.errorText, fontSize: 13.5, fontFamily: fonts.sansSemiBold },
  draftErrorText: { marginTop: 6, color: colors.errorTextSoft, fontSize: 13, lineHeight: 20, fontFamily: fonts.sans },
});
