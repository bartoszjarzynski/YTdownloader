import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';

interface LogoProps {
  /** Show the "CollabMe" wordmark next to the mark. */
  withWordmark?: boolean;
  size?: number;
}

/**
 * Simple text-based brand mark so the app has identity without binary
 * image assets. Swap for an <Image> once real art is available.
 */
export function Logo({ withWordmark = true, size = 56 }: LogoProps) {
  return (
    <View style={styles.row}>
      <View
        style={[
          styles.mark,
          { width: size, height: size, borderRadius: size / 3 },
        ]}
      >
        <Text style={[styles.markText, { fontSize: size * 0.5 }]}>C</Text>
      </View>
      {withWordmark && <Text style={styles.wordmark}>CollabMe</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  mark: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
  },
  markText: { color: colors.textInverse, fontWeight: '800' },
  wordmark: { ...typography.heading, color: colors.text },
});
