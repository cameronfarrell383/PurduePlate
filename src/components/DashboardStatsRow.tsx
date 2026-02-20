import React from 'react';
import { View, StyleSheet } from 'react-native';
import AnimatedCard from './AnimatedCard';
import AnimatedNumber from './AnimatedNumber';
import GradientText from './GradientText';
import { Box, Text } from '../theme/restyleTheme';

// Milestones that get gold gradient text
const MILESTONES = [7, 14, 30, 60, 100];

// Grade color mapping (A uses GradientText, others use flat)
const GRADE_COLORS: Record<string, string> = {
  B: '#2D8A4E',
  C: '#D4A024',
  D: '#A8325A',
  F: '#C0392B',
};

interface DashboardStatsRowProps {
  streak: number;
  score: number;
  grade: string;
}

export default function DashboardStatsRow({
  streak,
  score,
  grade,
}: DashboardStatsRowProps) {
  const isMilestone = MILESTONES.includes(streak);
  const isGradeA = grade === 'A';
  const gradeColor = GRADE_COLORS[grade] || '#1A1A1A';

  return (
    <Box flexDirection="row" gap="s">
      {/* Streak Card */}
      <Box flex={1}>
        <AnimatedCard
          padding="m"
          borderRadius="m"
          backgroundColor="card"
          borderColor="border"
          borderWidth={1}
          overflow="hidden"
        >
          <Text variant="statLabel">CURRENT STREAK</Text>
          <Box marginTop="xs" marginBottom="xxs">
            {isMilestone ? (
              <GradientText
                text={String(streak)}
                gradientType="gold"
                fontSize={32}
                fontFamily="Outfit_700Bold"
              />
            ) : (
              <AnimatedNumber
                value={streak}
                textVariant="grade"
                duration={600}
              />
            )}
          </Box>
          <Text variant="muted">days</Text>
          {/* Thin maroon bottom-left accent */}
          <View style={styles.streakAccent} />
        </AnimatedCard>
      </Box>

      {/* Score Card */}
      <Box flex={1}>
        <AnimatedCard
          padding="m"
          borderRadius="m"
          backgroundColor="card"
          borderColor="border"
          borderWidth={1}
        >
          <Text variant="statLabel">TODAY'S SCORE</Text>
          <Box marginTop="xs" marginBottom="xxs">
            {isGradeA ? (
              <GradientText
                text={grade}
                gradientType="gold"
                fontSize={32}
                fontFamily="Outfit_700Bold"
              />
            ) : (
              <Text
                variant="grade"
                style={{ color: gradeColor }}
              >
                {grade}
              </Text>
            )}
          </Box>
          <AnimatedNumber
            value={score}
            suffix=" / 100"
            textVariant="muted"
            duration={600}
          />
        </AnimatedCard>
      </Box>
    </Box>
  );
}

const styles = StyleSheet.create({
  streakAccent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '30%',
    height: 2,
    backgroundColor: '#861F41',
  },
});
