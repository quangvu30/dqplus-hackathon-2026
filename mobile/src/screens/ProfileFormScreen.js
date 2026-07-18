import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AppHeader from '../components/AppHeader';
import Screen from '../components/Screen';
import {
  Chip, ErrorText, Eyebrow, FieldLabel, PrimaryButton, SecondaryButton,
  SegmentedControl, SerifHeading, TextAreaField, TextField,
} from '../components/ui';
import { useApp } from '../context/AppContext';
import { colors, fonts, spacing } from '../theme/theme';

const STAGES = [
  { value: 'pre_seed', label: 'Pre-seed' },
  { value: 'seed', label: 'Seed' },
  { value: 'series_a', label: 'Series A' },
  { value: 'series_b', label: 'Series B+' },
  { value: 'growth', label: 'Growth' },
];

export default function ProfileFormScreen({ navigation }) {
  const {
    accent, isInvestor, chooseRole, form, setField, toggleSector,
    validity, showErrors, allValid, missingLabels, status, savedAt,
    saveDraft, markReady, SECTORS,
  } = useApp();

  const se = showErrors;
  const ready = status === 'ready';

  const onReady = () => {
    const ok = markReady();
    if (ok || ready) navigation.navigate('Matches');
  };

  return (
    <View style={{ flex: 1 }}>
      <AppHeader />
      <Screen>
        <Eyebrow>Your profile · one form</Eyebrow>
        <SerifHeading style={{ marginTop: 12 }}>Tell the ecosystem who you are.</SerifHeading>
        <Text style={styles.intro}>
          One calm form. Save a draft anytime — your profile only becomes{' '}
          <Text style={{ fontFamily: fonts.sansSemiBold }}>Ready</Text> for matching once the essentials check out.
        </Text>

        <View style={{ marginTop: spacing.xl }}>
          <SegmentedControl
            accent={accent}
            value={isInvestor ? 'investor' : 'startup'}
            onChange={(v) => chooseRole(v)}
            options={[{ value: 'startup', label: 'Startup' }, { value: 'investor', label: 'Investor' }]}
          />
        </View>

        <View style={styles.fieldGroup}>
          <FieldLabel required>{isInvestor ? 'Fund name' : 'Startup name'}</FieldLabel>
          <TextField
            value={form.name}
            onChangeText={(v) => setField('name', v)}
            placeholder={isInvestor ? 'e.g. Mekong Capital' : 'e.g. enfarm'}
            error={se && !validity.name}
          />
          {se && !validity.name ? <ErrorText>This field is required.</ErrorText> : null}
        </View>

        <View style={styles.fieldGroup}>
          <FieldLabel required>Website</FieldLabel>
          <TextField
            value={form.website}
            onChangeText={(v) => setField('website', v)}
            placeholder="https://…"
            autoCapitalize="none"
            keyboardType="url"
            error={se && !validity.website}
          />
          {se && !validity.website ? <ErrorText>Enter a valid website URL.</ErrorText> : null}
        </View>

        <View style={styles.fieldGroup}>
          <FieldLabel required>{isInvestor ? 'Stage focus' : 'Stage'}</FieldLabel>
          <View style={styles.chipsRow}>
            {STAGES.map((s) => (
              <Chip
                key={s.value}
                label={s.label}
                accent={accent}
                active={form.stage === s.value}
                onPress={() => setField('stage', s.value)}
              />
            ))}
          </View>
          {se && !validity.stage ? <ErrorText>Please select a stage.</ErrorText> : null}
        </View>

        <View style={styles.fieldGroup}>
          <FieldLabel required>Geography</FieldLabel>
          <TextField
            value={form.geography}
            onChangeText={(v) => setField('geography', v)}
            placeholder="e.g. Vietnam · Southeast Asia"
            error={se && !validity.geography}
          />
          {se && !validity.geography ? <ErrorText>This field is required.</ErrorText> : null}
        </View>

        <View style={styles.fieldGroup}>
          <View style={styles.labelWithHint}>
            <FieldLabel required>Sectors</FieldLabel>
            <Text style={styles.hint}>· choose one or more</Text>
          </View>
          <View style={styles.chipsRow}>
            {SECTORS.map((sec) => (
              <Chip
                key={sec.id}
                label={sec.label}
                accent={accent}
                active={form.sectors.includes(sec.id)}
                onPress={() => toggleSector(sec.id)}
              />
            ))}
          </View>
          {se && !validity.sectors ? <ErrorText>Select at least one sector.</ErrorText> : null}
        </View>

        <View style={styles.fieldGroup}>
          <FieldLabel required>{isInvestor ? 'Collaboration need' : 'Funding need'}</FieldLabel>
          <TextAreaField
            value={form.need}
            onChangeText={(v) => setField('need', v)}
            placeholder={isInvestor ? 'What partnerships or deal flow are you looking for?' : 'How much are you raising, and what for?'}
            error={se && !validity.need}
          />
          {se && !validity.need ? <ErrorText>This field is required.</ErrorText> : null}
        </View>

        <View style={styles.fieldGroup}>
          <View style={styles.labelWithHint}>
            <FieldLabel>Traction</FieldLabel>
            <Text style={styles.hint}>· optional</Text>
          </View>
          <TextAreaField
            value={form.traction}
            onChangeText={(v) => setField('traction', v)}
            placeholder={isInvestor ? 'Portfolio size, notable investments, focus…' : 'Revenue, users, pilots, growth…'}
          />
        </View>

        <Chip
          label={form.consent ? '✓ Consent given' : 'Tap to give consent'}
          accent={accent}
          active={form.consent}
          onPress={() => setField('consent', !form.consent)}
        />
        <Text style={styles.consentText}>
          I consent to VietNexus using this profile to generate explainable matches, and to sharing it with NIC when
          I request an introduction.
        </Text>
        {se && !validity.consent ? <ErrorText>Consent is required before your profile can be Ready.</ErrorText> : null}

        {se && !allValid ? (
          <View style={styles.summaryBox}>
            <Text style={styles.summaryTitle}>{missingLabels.length} thing(s) still needed before Ready</Text>
            <Text style={styles.summaryText}>Still needed: {missingLabels.join(', ')}.</Text>
          </View>
        ) : null}

        <Text style={styles.helper}>
          {ready ? 'Your profile is Ready for matching.' : savedAt ? 'Draft saved.' : 'Draft — not yet visible for matching.'}
        </Text>

        <View style={styles.actionsRow}>
          <SecondaryButton label="Save draft" onPress={saveDraft} style={{ flex: 1 }} />
          <PrimaryButton
            label={ready ? 'See matches →' : 'Mark as Ready'}
            onPress={onReady}
            accent={accent}
            style={[{ flex: 1 }, !(ready || allValid) && { opacity: 0.55 }]}
          />
        </View>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  intro: { marginTop: 14, color: colors.textMuted, fontSize: 16, lineHeight: 24, fontFamily: fonts.sans },
  fieldGroup: { marginTop: spacing.xl },
  labelWithHint: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  hint: { color: colors.textFaintest, fontSize: 12.5, fontFamily: fonts.sans },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  consentText: { marginTop: 10, color: colors.textBody, fontSize: 13.5, lineHeight: 20, fontFamily: fonts.sans },
  summaryBox: {
    marginTop: spacing.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.errorBorderSoft,
    borderRadius: 14,
    backgroundColor: colors.errorBgSoft,
  },
  summaryTitle: { color: colors.errorText, fontSize: 12.5, fontFamily: fonts.sansSemiBold },
  summaryText: { marginTop: 8, color: colors.errorTextSoft, fontSize: 13, lineHeight: 20, fontFamily: fonts.sans },
  helper: { marginTop: spacing.xl, color: colors.textFaintest, fontSize: 12.5, fontFamily: fonts.sans },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
});
