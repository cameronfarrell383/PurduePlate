import React from 'react';

import { Box, Text } from '../theme/restyleTheme';
import AnimatedNumber from './AnimatedNumber';
import GradientText from './GradientText';

// ─── Direct color constants ─────────────────────────────────────────────────
const C = {
  text: '#1A1A1A',
  textMuted: '#6B6B6F',
};

const MILESTONES = [7, 14, 30, 60, 100];

interface Props {
  currentStreak: number;
  longestStreak: number;
}

export default function StreakDisplay({ currentStreak, longestStreak }: Props) {
  const isMilestone = MILESTONES.includes(currentStreak);

  if (currentStreak === 0) {
    return (
      <Box style={{ paddingVertical: 4 }}>
        <Text variant="muted">
          Log a meal to start your streak!
        </Text>
      </Box>
    );
  }

  return (
    <Box style={{ paddingVertical: 4 }}>
      <Box flexDirection="row" alignItems="baseline" style={{ gap: 8 }}>
        {isMilestone ? (
          <GradientText
            text={`${currentStreak}`}
            gradientType="gold"
            fontSize={32}
            fontFamily="Outfit_700Bold"
          />
        ) : (
          <AnimatedNumber
            value={currentStreak}
            textVariant="grade"
            color={C.text}
            decimals={0}
          />
        )}
        <Text variant="bodySmall" color="textMuted">
          day streak
        </Text>
      </Box>
      <Text variant="dim" style={{ marginTop: 2 }}>
        Best: {longestStreak} days
      </Text>
    </Box>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// OLD CODE — commented out, not deleted
// ════════════════════════════════════════════════════════════════════════════════
//
// import { View, Text, StyleSheet } from 'react-native';
// import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';
// import { useTheme } from '../context/ThemeContext';
//
// const styles = StyleSheet.create({
//   container: { paddingVertical: 4 },
//   row: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
//   number: { fontSize: 32, fontFamily: 'Outfit_800ExtraBold' },
//   label: { fontSize: 14, fontFamily: 'DMSans_400Regular' },
//   emptyText: { fontSize: 14, fontFamily: 'DMSans_400Regular' },
//   best: { fontSize: 12, fontFamily: 'DMSans_400Regular', marginTop: 2 },
// });
