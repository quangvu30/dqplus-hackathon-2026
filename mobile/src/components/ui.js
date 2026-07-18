import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fonts, hexToRgba, radii, spacing } from '../theme/theme';

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Eyebrow({ children, style }) {
  return <Text style={[styles.eyebrow, style]}>{children}</Text>;
}

export function SerifHeading({ children, style }) {
  return <Text style={[styles.serifHeading, style]}>{children}</Text>;
}

export function BodyText({ children, style }) {
  return <Text style={[styles.body, style]}>{children}</Text>;
}

export function FieldLabel({ children, required, style }) {
  return (
    <View style={styles.labelRow}>
      <Text style={[styles.label, style]}>{children}</Text>
      {required ? <Text style={styles.required}> *</Text> : null}
    </View>
  );
}

export function TextField({ value, onChangeText, placeholder, error, secureTextEntry, keyboardType, autoCapitalize = 'sentences' }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.placeholder}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      style={[styles.input, error && styles.inputError]}
    />
  );
}

export function TextAreaField({ value, onChangeText, placeholder, error, minHeight = 92 }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.placeholder}
      multiline
      textAlignVertical="top"
      style={[styles.input, styles.textarea, { minHeight }, error && styles.inputError]}
    />
  );
}

export function ErrorText({ children }) {
  return <Text style={styles.errorText}>{children}</Text>;
}

export function PrimaryButton({ label, onPress, disabled, accent = colors.accent, style }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.primaryBtn,
        { backgroundColor: accent, opacity: disabled ? 0.55 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      <Text style={styles.primaryBtnText}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({ label, onPress, style }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.secondaryBtn, { opacity: pressed ? 0.7 : 1 }, style]}
    >
      <Text style={styles.secondaryBtnText}>{label}</Text>
    </Pressable>
  );
}

export function Chip({ label, active, onPress, accent = colors.accent }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        active
          ? { borderColor: accent, backgroundColor: hexToRgba(accent, 0.1) }
          : { borderColor: colors.inputBorder, backgroundColor: colors.card },
      ]}
    >
      <Text style={[styles.chipText, { color: active ? accent : colors.textMuted, fontFamily: active ? fonts.sansSemiBold : fonts.sansMedium }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Tab({ label, active, onPress, accent = colors.accent }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.tab,
        active
          ? { borderColor: accent, backgroundColor: hexToRgba(accent, 0.1) }
          : { borderColor: colors.border, backgroundColor: colors.card },
      ]}
    >
      <Text style={[styles.tabText, { color: active ? accent : colors.textMuted, fontFamily: active ? fonts.sansSemiBold : fonts.sansMedium }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function SegmentedControl({ options, value, onChange, accent = colors.accent }) {
  return (
    <View style={styles.segmentWrap}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[styles.segmentBtn, active && { backgroundColor: accent }]}
          >
            <Text style={[styles.segmentText, { color: active ? '#fff' : colors.textMuted }]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ScoreBadge({ score, accent = colors.accent, size = 52, fontSize = 19 }) {
  return (
    <View
      style={[
        styles.scoreBadge,
        { width: size, height: size, borderRadius: size * 0.25, backgroundColor: hexToRgba(accent, 0.1) },
      ]}
    >
      <Text style={{ color: accent, fontFamily: fonts.sansSemiBold, fontSize }}>{score}</Text>
    </View>
  );
}

export function StatusPill({ ready, accent = colors.accent }) {
  return (
    <View
      style={[
        styles.statusPill,
        ready ? { backgroundColor: hexToRgba(accent, 0.12) } : { backgroundColor: '#efece4' },
      ]}
    >
      <Text style={[styles.statusPillText, { color: ready ? accent : colors.textFaint }]}>
        {ready ? '● Ready' : '○ Draft'}
      </Text>
    </View>
  );
}

export function ProgressBar({ value, accent = colors.accent }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: accent }]} />
    </View>
  );
}

export function Dot({ color, size = 7 }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: 20,
  },
  eyebrow: {
    color: colors.textFaintest,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontFamily: fonts.sansSemiBold,
  },
  serifHeading: {
    color: colors.heading,
    fontFamily: fonts.serif,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.3,
  },
  body: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 23,
    fontFamily: fonts.sans,
  },
  labelRow: { flexDirection: 'row', marginBottom: spacing.sm },
  label: { fontSize: 12.5, fontFamily: fonts.sansSemiBold, color: colors.label },
  required: { color: colors.error, fontSize: 12.5, fontFamily: fonts.sansSemiBold },
  input: {
    width: '100%',
    minHeight: 46,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radii.md,
    backgroundColor: colors.inputBg,
    color: colors.text,
    fontSize: 15,
    fontFamily: fonts.sans,
  },
  textarea: { lineHeight: 21 },
  inputError: { borderColor: colors.errorBorder, backgroundColor: '#fdf6f3' },
  errorText: { marginTop: 6, color: colors.error, fontSize: 12, fontFamily: fonts.sans },
  primaryBtn: {
    height: 48,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontFamily: fonts.sansSemiBold },
  secondaryBtn: {
    height: 48,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.card,
  },
  secondaryBtnText: { color: colors.label, fontSize: 14, fontFamily: fonts.sansSemiBold },
  chip: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: radii.pill,
  },
  chipText: { fontSize: 13 },
  tab: {
    paddingVertical: 9,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderRadius: radii.md,
  },
  tabText: { fontSize: 13 },
  segmentWrap: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md + 1,
    backgroundColor: colors.card,
    alignSelf: 'flex-start',
  },
  segmentBtn: {
    paddingVertical: 9,
    paddingHorizontal: 20,
    borderRadius: radii.sm,
  },
  segmentText: { fontSize: 13.5, fontFamily: fonts.sansSemiBold },
  scoreBadge: { alignItems: 'center', justifyContent: 'center' },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: radii.pill,
    alignSelf: 'flex-start',
  },
  statusPillText: { fontSize: 11.5, fontFamily: fonts.sansBold, letterSpacing: 0.5, textTransform: 'uppercase' },
  progressTrack: { height: 7, borderRadius: 4, backgroundColor: '#eceae2', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
});
