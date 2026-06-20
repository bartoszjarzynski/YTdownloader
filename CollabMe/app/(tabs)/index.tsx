import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { useAuth } from '@/context/AuthContext';
import { colors, radius, spacing, typography } from '@/theme';
import type { ActivityCategory } from '@/types';

interface FeedActivity {
  id: string;
  title: string;
  host: string;
  category: ActivityCategory;
  when: string;
  location: string;
  spotsLeft: number;
}

/** Placeholder feed data — replace with a real activities API. */
const SAMPLE_FEED: FeedActivity[] = [
  {
    id: '1',
    title: 'Ranked Valorant — need a fifth',
    host: 'Marta',
    category: 'gaming',
    when: 'Tonight, 8:00 PM',
    location: 'Online',
    spotsLeft: 1,
  },
  {
    id: '2',
    title: 'Saturday morning 5-a-side football',
    host: 'Kuba',
    category: 'sports',
    when: 'Sat, 10:00 AM',
    location: 'Katowice, Park Śląski',
    spotsLeft: 3,
  },
  {
    id: '3',
    title: 'Beginner-friendly bouldering session',
    host: 'Ola',
    category: 'fitness',
    when: 'Sun, 5:00 PM',
    location: 'Boulder Gym Center',
    spotsLeft: 4,
  },
  {
    id: '4',
    title: 'Sunset trail run, ~8km easy pace',
    host: 'Tomek',
    category: 'outdoors',
    when: 'Fri, 7:30 PM',
    location: 'Dolina Trzech Stawów',
    spotsLeft: 6,
  },
];

const CATEGORY_ICON: Record<ActivityCategory, keyof typeof Ionicons.glyphMap> = {
  gaming: 'game-controller-outline',
  sports: 'football-outline',
  fitness: 'barbell-outline',
  outdoors: 'trail-sign-outline',
  social: 'people-outline',
};

function ActivityCard({ item }: { item: FeedActivity }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardIcon}>
        <Ionicons
          name={CATEGORY_ICON[item.category]}
          size={22}
          color={colors.primary}
        />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardMeta}>
          Hosted by {item.host} · {item.when}
        </Text>
        <View style={styles.cardFooter}>
          <View style={styles.tag}>
            <Ionicons name="location-outline" size={13} color={colors.textMuted} />
            <Text style={styles.tagText}>{item.location}</Text>
          </View>
          <Text style={styles.spots}>{item.spotsLeft} spots left</Text>
        </View>
      </View>
    </View>
  );
}

export default function FeedScreen() {
  const { user } = useAuth();
  const firstName = user?.name.split(' ')[0] ?? 'there';

  return (
    <ScreenContainer contentStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hi {firstName} 👋</Text>
        <Text style={styles.subtitle}>Activities happening near you</Text>
      </View>

      <FlatList
        data={SAMPLE_FEED}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ActivityCard item={item} />}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 0 },
  header: { marginBottom: spacing.lg },
  greeting: { ...typography.title, color: colors.text },
  subtitle: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs },
  list: { paddingBottom: spacing.xl },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  cardTitle: { ...typography.subheading, color: colors.text },
  cardMeta: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tagText: { ...typography.caption, color: colors.textMuted },
  spots: { ...typography.caption, color: colors.primary, fontWeight: '700' },
});
