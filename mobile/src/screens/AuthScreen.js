import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Screen from '../components/Screen';
import { Card, ErrorText, FieldLabel, PrimaryButton, TextField } from '../components/ui';
import { useApp } from '../context/AppContext';
import { colors, fonts } from '../theme/theme';

export default function AuthScreen() {
  const {
    accent, authMode, authEmail, authPassword, authError,
    setAuthEmail, setAuthPassword, doAuth, toggleAuthMode,
  } = useApp();

  const isLogin = authMode === 'login';

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.brandRow}>
        <View style={[styles.logo, { backgroundColor: accent }]}>
          <Text style={styles.logoText}>V</Text>
        </View>
        <View>
          <Text style={styles.brandName}>VietNexus</Text>
          <Text style={styles.brandSub}>INNOVATION OS</Text>
        </View>
      </View>

      <Text style={styles.title}>{isLogin ? 'Enter the ecosystem' : 'Create your account'}</Text>
      <Text style={styles.subtitle}>
        The ecosystem is private. Sign in to view profiles, signals and matches.
      </Text>

      <Card style={styles.card}>
        {authError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{authError}</Text>
          </View>
        ) : null}

        <FieldLabel>Email</FieldLabel>
        <TextField
          value={authEmail}
          onChangeText={setAuthEmail}
          placeholder="you@startup.vn"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <View style={{ height: 16 }} />
        <FieldLabel>Password</FieldLabel>
        <TextField
          value={authPassword}
          onChangeText={setAuthPassword}
          placeholder="Your password"
          secureTextEntry
          autoCapitalize="none"
        />

        <View style={{ height: 22 }} />
        <PrimaryButton label={isLogin ? 'Sign in' : 'Create account'} onPress={doAuth} accent={accent} />

        <View style={styles.switchRow}>
          <Text style={styles.switchText}>
            {isLogin ? 'New to VietNexus? ' : 'Already have an account? '}
          </Text>
          <Text onPress={toggleAuthMode} style={[styles.switchLink, { color: accent }]}>
            {isLogin ? 'Create an account' : 'Sign in'}
          </Text>
        </View>
      </Card>

      <Text style={styles.footNote}>🔒 Your session is private. Draft data stays with your account.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'center', padding: 28 },
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 11 },
  logo: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  logoText: { color: '#fff', fontFamily: fonts.sansSemiBold, fontSize: 17 },
  brandName: { color: colors.text, fontFamily: fonts.sansSemiBold, fontSize: 18, letterSpacing: -0.2 },
  brandSub: { color: colors.textFaint, fontSize: 10, letterSpacing: 1 },
  title: {
    marginTop: 26,
    textAlign: 'center',
    color: colors.text,
    fontFamily: fonts.serif,
    fontSize: 28,
    lineHeight: 34,
  },
  subtitle: {
    marginTop: 12,
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: fonts.sans,
  },
  card: { marginTop: 26 },
  errorBanner: {
    marginBottom: 16,
    padding: 11,
    borderRadius: 10,
    backgroundColor: colors.errorBg,
  },
  errorBannerText: { color: colors.errorText, fontSize: 13, fontFamily: fonts.sans },
  switchRow: { marginTop: 18, flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' },
  switchText: { color: colors.textFaint, fontSize: 13, fontFamily: fonts.sans },
  switchLink: { fontSize: 13, fontFamily: fonts.sansSemiBold },
  footNote: { marginTop: 18, textAlign: 'center', color: colors.textFaintest, fontSize: 11.5, fontFamily: fonts.sans },
});
