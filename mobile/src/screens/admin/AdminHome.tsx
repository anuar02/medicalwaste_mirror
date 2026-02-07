import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../theme';

export default function AdminHome() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Admin Overview</Text>
        <Text style={styles.body}>Admin features are handled on web for now.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    padding: spacing.xl,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
