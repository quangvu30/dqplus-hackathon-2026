import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import AppHeader from '../components/AppHeader';
import Screen from '../components/Screen';
import { Card, Dot, Eyebrow, ScoreBadge, SerifHeading, Tab } from '../components/ui';
import { useApp } from '../context/AppContext';
import { colors, fonts, spacing } from '../theme/theme';
import { INTENTS } from '../data/mockData';

const K_OPTIONS = [
  { value: 5, label: 'Top 5' },
  { value: 10, label: 'Top 10' },
  { value: 999, label: 'All' },
];

export default function MatchesScreen({ navigation }) {
  const {
    accent, isInvestor, intent, goIntent, topK, setTopK,
    sorted, shown, rankOf, openCandidate, matchTitle, matchSub,
  } = useApp();

  const onOpen = (c) => {
    openCandidate(c);
    navigation.navigate('MatchDetail');
  };

  return (
    <View style={{ flex: 1 }}>
      <AppHeader />
      <Screen>
        <Pressable onPress={() => navigation.navigate('ProfileForm')}>
          <Text style={styles.backLink}>← Edit profile</Text>
        </Pressable>

        <Eyebrow style={{ marginTop: 20 }}>Matches · reasoning-ranked</Eyebrow>
        <SerifHeading style={{ marginTop: 12 }}>{matchTitle}</SerifHeading>
        <Text style={styles.subtitle}>{matchSub} Scored 0–100 so you don't spend time searching.</Text>

        <View style={styles.tabsRow}>
          {INTENTS.map((it) => (
            <Tab
              key={it.id}
              label={it.id === 'investors' && isInvestor ? 'Startup' : it.tab}
              accent={accent}
              active={it.id === intent}
              onPress={() => goIntent(it.id)}
            />
          ))}
        </View>

        <View style={styles.countRow}>
          <Text style={styles.countText}>Showing top {shown.length} of {sorted.length}</Text>
          <View style={styles.kSwitch}>
            {K_OPTIONS.map((k) => {
              const active = k.value >= sorted.length ? k.value === 999 : topK === k.value;
              const isActive = topK === k.value || (k.value === 999 && topK >= sorted.length);
              return (
                <Pressable
                  key={k.value}
                  onPress={() => setTopK(k.value)}
                  style={[styles.kBtn, isActive && { backgroundColor: accent }]}
                >
                  <Text style={[styles.kBtnText, { color: isActive ? '#fff' : colors.textMuted }]}>{k.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{ marginTop: spacing.lg, gap: 12 }}>
          {shown.map((m) => (
            <Pressable key={m.name} onPress={() => onOpen(m)}>
              <Card style={styles.matchCard}>
                <View style={styles.matchTop}>
                  <Text style={styles.rank}>#{rankOf(m)}</Text>
                  <ScoreBadge score={m.score} accent={accent} />
                  <View style={{ flex: 1 }}>
                    <View style={styles.typeRow}>
                      <Dot color={m.dot} />
                      <Text style={styles.typeText}>{m.type}</Text>
                    </View>
                    <Text style={styles.name}>{m.name}</Text>
                    <Text style={styles.rationale}>{m.rationale}</Text>
                    {m.people && m.people.length ? (
                      <View style={styles.peopleWrap}>
                        {m.people.map((p) => (
                          <View key={p.name} style={styles.personRow}>
                            <Text style={styles.arrow}>→</Text>
                            <Text style={styles.personName}>{p.name}</Text>
                            <Text style={styles.dotSep}>·</Text>
                            <Text style={styles.personRole}>{p.role}</Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </View>
                </View>
                <Text style={[styles.analysisLink, { color: accent }]}>Analysis →</Text>
              </Card>
            </Pressable>
          ))}
        </View>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  backLink: { color: colors.textFaint, fontSize: 12.5, fontFamily: fonts.sans },
  subtitle: { marginTop: 14, color: colors.textMuted, fontSize: 16, lineHeight: 24, fontFamily: fonts.sans },
  tabsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 24 },
  countRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22 },
  countText: { color: colors.textMuted, fontSize: 13.5, fontFamily: fonts.sans },
  kSwitch: {
    flexDirection: 'row', gap: 4, padding: 4, borderWidth: 1, borderColor: colors.border,
    borderRadius: 11, backgroundColor: colors.card,
  },
  kBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  kBtnText: { fontSize: 12.5, fontFamily: fonts.sansSemiBold },
  matchCard: { gap: 14 },
  matchTop: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  rank: { color: colors.textFaintest, fontSize: 13, fontFamily: fonts.sansSemiBold, marginTop: 4 },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeText: { color: colors.textFaint, fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase', fontFamily: fonts.sans },
  name: { marginTop: 6, marginBottom: 4, color: colors.heading, fontFamily: fonts.serif, fontSize: 20 },
  rationale: { color: colors.textMuted, fontSize: 13.5, lineHeight: 19, fontFamily: fonts.sans },
  peopleWrap: {
    marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.borderSoft, gap: 6,
  },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  arrow: { color: '#b8b6ab', fontSize: 13 },
  personName: { color: colors.label, fontSize: 13, fontFamily: fonts.sansSemiBold },
  dotSep: { color: colors.textFaintest, fontSize: 13 },
  personRole: { color: colors.textMuted, fontSize: 13, fontFamily: fonts.sans },
  analysisLink: { alignSelf: 'flex-end', fontSize: 13, fontFamily: fonts.sansSemiBold },
});
