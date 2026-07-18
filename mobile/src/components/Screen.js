import React from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/theme';

export default function Screen({ children, scroll = true, contentStyle }) {
  const insets = useSafeAreaInsets();
  const Wrapper = scroll ? ScrollView : View;
  const wrapperProps = scroll
    ? { contentContainerStyle: [styles.content, { paddingBottom: insets.bottom + 40 }, contentStyle], keyboardShouldPersistTaps: 'handled' }
    : { style: [styles.content, { paddingBottom: insets.bottom + 40, flex: 1 }, contentStyle] };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Wrapper {...wrapperProps}>{children}</Wrapper>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40 },
});
