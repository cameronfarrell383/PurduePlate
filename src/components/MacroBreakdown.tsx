import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle as SvgCircle } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';

interface Props {
  actual: { protein: number; carbs: number; fat: number };
  target: { protein: number; carbs: number; fat: number };
}

const RING_SIZE = 28;
const RING_STROKE = 3;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export default function MacroBreakdown({ actual, target }: Props) {
  const { colors } = useTheme();

  // Calorie contributions for stacked bar
  const protCal = actual.protein * 4;
  const carbCal = actual.carbs * 4;
  const fatCal = actual.fat * 9;
  const totalCal = protCal + carbCal + fatCal || 1; // avoid div by 0

  const protPct = (protCal / totalCal) * 100;
  const carbPct = (carbCal / totalCal) * 100;
  const fatPct = (fatCal / totalCal) * 100;

  const macros = [
    { label: 'Protein', actual: actual.protein, target: target.protein, color: colors.blue, pct: protPct },
    { label: 'Carbs', actual: actual.carbs, target: target.carbs, color: colors.orange, pct: carbPct },
    { label: 'Fat', actual: actual.fat, target: target.fat, color: colors.yellow, pct: fatPct },
  ];

  return (
    <View>
      {/* Stacked bar */}
      <View style={[styles.barTrack, { backgroundColor: colors.barTrack }]}>
        <View style={[styles.barSegment, { width: `${protPct}%`, backgroundColor: colors.blue }]} />
        <View style={[styles.barSegment, { width: `${carbPct}%`, backgroundColor: colors.orange }]} />
        <View style={[styles.barSegment, { width: `${fatPct}%`, backgroundColor: colors.yellow }]} />
      </View>

      {/* Three columns */}
      <View style={styles.columns}>
        {macros.map((m) => {
          const fillPct = m.target > 0 ? Math.min(m.actual / m.target, 1) : 0;
          const dashOffset = RING_CIRCUMFERENCE * (1 - fillPct);

          return (
            <View key={m.label} style={styles.column}>
              <View style={styles.columnHeader}>
                <View style={[styles.dot, { backgroundColor: m.color }]} />
                <Text style={[styles.macroLabel, { color: colors.textMuted }]}>{m.label}</Text>
              </View>
              <Text style={[styles.macroValue, { color: colors.text }]}>
                {Math.round(m.actual)}g / {Math.round(m.target)}g
              </Text>
              <Svg width={RING_SIZE} height={RING_SIZE} style={styles.ring}>
                <SvgCircle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RING_RADIUS}
                  stroke={colors.barTrack}
                  strokeWidth={RING_STROKE}
                  fill="none"
                />
                <SvgCircle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RING_RADIUS}
                  stroke={m.color}
                  strokeWidth={RING_STROKE}
                  fill="none"
                  strokeDasharray={`${RING_CIRCUMFERENCE}`}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="round"
                  rotation={-90}
                  origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
                />
              </Svg>
            </View>
          );
        })}
      </View>

      {/* Split label */}
      <Text style={[styles.splitText, { color: colors.textDim }]}>
        Your split: {Math.round(protPct)}% P / {Math.round(carbPct)}% C / {Math.round(fatPct)}% F
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  barTrack: {
    height: 12,
    borderRadius: 6,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  barSegment: {
    height: 12,
  },
  columns: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
  },
  column: {
    flex: 1,
    alignItems: 'center',
  },
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  macroLabel: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
  },
  macroValue: {
    fontSize: 15,
    fontFamily: 'DMSans_600SemiBold',
    marginBottom: 6,
  },
  ring: {
    marginTop: 2,
  },
  splitText: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    textAlign: 'center',
    marginTop: 14,
  },
});
