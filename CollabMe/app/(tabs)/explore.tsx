import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { colors, radius, spacing, typography } from '@/theme';
import type { ActivityCategory } from '@/types';

interface CategoryCard {
  key: ActivityCategory;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const CATEGORIES: CategoryCard[] = [
  {
    key: 'gaming',
    label: 'Gaming',
    description: 'Find teammates and squads',
    icon: 'game-controller-outline',
  },
  {
    key: 'sports',
    label: 'Sports',
    description: 'Pickup games and matches',
    icon: 'football-outline',
  },
  {
    key: 'fitness',
    label: 'Fitness',
    description: 'Gym buddies and classes',
    icon: 'barbell-outline',
  },
  {
    key: 'outdoors',
    label: 'Outdoors',
    description: 'Hikes, runs and rides',
    icon: 'trail-sign-outline',
  },
  {
    key: 'social',
    label: 'Social',
    description: 'Meetups and hangouts',
    icon: 'people-outline',
  },
];

export default function ExploreScreen() {
  return (
    <ScreenContainer>
      <Text style={styles.title}>Explore</Text>
      <Text style={styles.subtitle}>Browse by activity type</Text>

      <View style={styles.grid}>
        {CATEGORIES.map((cat) => (
          <Pressable
            key={cat.key}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`Explore ${cat.label}`}
          >
            <View style={styles.iconCircle}>
              <Ionicons name={cat.icon} size={24} color={colors.primary} />
            </View>
            <Text style={styles.cardLabel}>{cat.label}</Text>
            <Text style={styles.cardDesc}>{cat.description}</Text>
          </Pressable>
        ))}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.title, color: colors.text },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  card: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  pressed: { opacity: 0.85 },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  cardLabel: { ...typography.subheading, color: colors.text },
  cardDesc: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
});
