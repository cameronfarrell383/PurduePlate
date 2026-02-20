import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, {
  Path,
  Circle as SvgCircle,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import type { WeightEntry, WeightTrend } from '../utils/weightData';

interface Props {
  entries: WeightEntry[];
  trend: WeightTrend;
}

const CHART_HEIGHT = 180;
const PAD_TOP = 16;
const PAD_BOTTOM = 8;
const PAD_H = 4;

function buildPath(points: { x: number; y: number }[]): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
}

export default function WeightChart({ entries, trend }: Props) {
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const chartWidth = screenWidth - 72;

  if (entries.length < 2) return null;

  const plotW = chartWidth - PAD_H * 2;
  const plotH = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;

  // Y scale with padding
  const allWeights = [...entries.map((e) => e.weight), ...trend.smoothed.map((s) => s.weight)];
  const minW = Math.min(...allWeights) - 1;
  const maxW = Math.max(...allWeights) + 1;

  const xScale = (i: number) => PAD_H + (i / (entries.length - 1)) * plotW;
  const yScale = (val: number) => PAD_TOP + plotH - ((val - minW) / (maxW - minW)) * plotH;

  // Raw weight points
  const rawPts = entries.map((e, i) => ({ x: xScale(i), y: yScale(e.weight) }));
  const rawPath = buildPath(rawPts);

  // Trend (smoothed) points
  const trendPts = trend.smoothed.map((s, i) => ({ x: xScale(i), y: yScale(s.weight) }));
  const trendPath = buildPath(trendPts);

  // Fill area under trend line
  const trendFill = `${trendPath} L${trendPts[trendPts.length - 1].x},${PAD_TOP + plotH} L${trendPts[0].x},${PAD_TOP + plotH} Z`;

  // Diff color
  const diffColor = trend.difference < 0 ? colors.green : trend.difference > 0 ? colors.red : colors.textMuted;
  const diffSign = trend.difference > 0 ? '+' : '';

  // Date range label
  const firstDate = entries[0].date;
  const lastDate = entries[entries.length - 1].date;
  const fmtDate = (d: string) => { const p = d.split('-'); return `${p[1]}/${p[2]}`; };

  // Insight pill helper
  const pillColor = (val: number | null) => {
    if (val == null) return colors.textMuted;
    return val < 0 ? colors.green : val > 0 ? colors.red : colors.textMuted;
  };
  const pillText = (val: number | null) => {
    if (val == null) return '—';
    const sign = val > 0 ? '+' : '';
    return `${sign}${val}`;
  };

  return (
    <View>
      {/* Stats header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.avgWeight, { color: colors.text }]}>{trend.average} lbs</Text>
          <Text style={[styles.dateRange, { color: colors.textDim }]}>
            {fmtDate(firstDate)} – {fmtDate(lastDate)}
          </Text>
        </View>
        <Text style={[styles.diff, { color: diffColor }]}>{diffSign}{trend.difference} lbs</Text>
      </View>

      {/* SVG chart */}
      <Svg width={chartWidth} height={CHART_HEIGHT}>
        <Defs>
          <LinearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="rgba(91,127,255,0.08)" />
            <Stop offset="1" stopColor="rgba(91,127,255,0)" />
          </LinearGradient>
        </Defs>

        {/* Trend fill area */}
        <Path d={trendFill} fill="url(#trendFill)" />

        {/* Raw weight line */}
        <Path d={rawPath} stroke={colors.textDim} strokeWidth={1} fill="none" opacity={0.25} />

        {/* Trend line */}
        <Path d={trendPath} stroke={colors.blue} strokeWidth={2} fill="none" />

        {/* Raw data points */}
        {rawPts.map((p, i) => (
          <SvgCircle
            key={entries[i].date}
            cx={p.x}
            cy={p.y}
            r={2.5}
            fill={colors.textDim}
            opacity={0.3}
          />
        ))}
      </Svg>

      {/* Insight pills */}
      <View style={styles.pillRow}>
        <View style={[styles.pill, { backgroundColor: colors.cardAlt }]}>
          <Text style={[styles.pillText, { color: pillColor(trend.change3Day) }]}>
            3-day: {pillText(trend.change3Day)} lbs
          </Text>
        </View>
        <View style={[styles.pill, { backgroundColor: colors.cardAlt }]}>
          <Text style={[styles.pillText, { color: pillColor(trend.change7Day) }]}>
            7-day: {pillText(trend.change7Day)} lbs
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  avgWeight: {
    fontSize: 24,
    fontFamily: 'Outfit_700Bold',
  },
  diff: {
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
    marginTop: 4,
  },
  dateRange: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    marginTop: 2,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  pill: {
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  pillText: {
    fontSize: 13,
    fontFamily: 'DMSans_500Medium',
  },
});
