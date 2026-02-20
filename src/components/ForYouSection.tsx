import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Box, Text } from '../theme/restyleTheme';
import AnimatedCard from './AnimatedCard';

// ── Types ───────────────────────────────────────────────────────────────────

export interface ForYouItem {
  id: number;
  name: string;
  calories: number;
  hallName: string;
}

export interface ForYouSubSection {
  title: string;
  iconName: string;
  items: ForYouItem[];
  filter?: string;
}

interface ForYouSectionProps {
  sections: ForYouSubSection[];
  onSeeAll?: (filter: string) => void;
  onItemPress?: (item: ForYouItem) => void;
}

// ── Component ───────────────────────────────────────────────────────────────

export default function ForYouSection({
  sections,
  onSeeAll,
  onItemPress,
}: ForYouSectionProps) {
  const visibleSections = sections.filter((s) => s.items.length > 0);

  if (visibleSections.length === 0) {
    return (
      <Box>
        <Text variant="cardTitle" marginBottom="m">
          For You
        </Text>
        <Box
          backgroundColor="card"
          borderColor="border"
          borderWidth={1}
          borderRadius="m"
          padding="l"
          alignItems="center"
        >
          <Feather name="compass" size={32} color="#A8A9AD" />
          <Text variant="muted" style={{ marginTop: 8, textAlign: 'center' }}>
            Check back after logging a few meals
          </Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <Text variant="cardTitle" marginBottom="m">
        For You
      </Text>

      {visibleSections.map((section) => (
        <Box key={section.title} marginBottom="m">
          {/* Sub-section header */}
          <Box
            flexDirection="row"
            justifyContent="space-between"
            alignItems="center"
            marginBottom="s"
          >
            <Text variant="body" style={{ fontFamily: 'DMSans_600SemiBold' }}>
              {section.title}
            </Text>
            {section.filter && onSeeAll && (
              <Text
                variant="bodySmall"
                color="maroon"
                style={{ fontFamily: 'DMSans_600SemiBold' }}
                onPress={() => onSeeAll(section.filter!)}
              >
                See All →
              </Text>
            )}
          </Box>

          {/* Horizontal scroll of food cards */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {section.items.map((item) => (
              <AnimatedCard
                key={item.id}
                padding="m"
                borderRadius="m"
                backgroundColor="card"
                borderColor="border"
                borderWidth={1}
                style={styles.foodCard}
                onPress={() => onItemPress?.(item)}
                haptic
              >
                {/* Maroon left-border accent */}
                <Box style={styles.leftAccent} />

                {/* Icon top-right */}
                <Box style={styles.iconWrap}>
                  <Feather
                    name={section.iconName as any}
                    size={14}
                    color="#9A9A9E"
                  />
                </Box>

                <Text
                  variant="body"
                  style={{ fontFamily: 'DMSans_600SemiBold' }}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                <Text variant="muted" style={{ marginTop: 2 }}>
                  {item.calories} cal
                </Text>
                {item.hallName ? (
                  <Text variant="dim" style={{ marginTop: 2 }} numberOfLines={1}>
                    {item.hallName}
                  </Text>
                ) : null}
              </AnimatedCard>
            ))}
          </ScrollView>
        </Box>
      ))}
    </Box>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingRight: 20,
  },
  foodCard: {
    width: 140,
    marginRight: 10,
    overflow: 'hidden',
  },
  leftAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#861F41', // maroon
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  iconWrap: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
});
