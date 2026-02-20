import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';

interface Props {
  currentStreak: number;
  longestStreak: number;
}

export default function StreakDisplay({ currentStreak, longestStreak }: Props) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (currentStreak > 0) {
      scale.value = withRepeat(withTiming(1.03, { duration: 1000 }), -1, true);
    } else {
      scale.value = 1;
    }
  }, [currentStreak]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (currentStreak === 0) {
    return (
      <View style={styles.container}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          Log a meal to start your streak!
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Animated.Text
          style={[styles.number, { color: colors.text }, pulseStyle]}
        >
          {currentStreak}
        </Animated.Text>
        <Text style={[styles.label, { color: colors.textMuted }]}>
          day streak
        </Text>
      </View>
      <Text style={[styles.best, { color: colors.textDim }]}>
        Best: {longestStreak} days
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  number: {
    fontSize: 32,
    fontFamily: 'Outfit_800ExtraBold',
  },
  label: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
  },
  best: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    marginTop: 2,
  },
});
