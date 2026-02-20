import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Circle as SvgCircle, Line, Polyline, Rect } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import { requireUserId } from '@/src/utils/auth';
import {
  getWeeklyReport,
  type WeeklyReportData,
  type DailyTotal,
} from '@/src/utils/weeklyReport';

// ── Types ───────────────────────────────────────────────────────────────────

interface WeeklyReportProps {
  visible: boolean;
  onClose: () => void;
  initialEndDate?: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function formatLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getWeekDates(endDate: string): string[] {
  const end = new Date(endDate + 'T00:00:00');
  const dates: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    dates.push(formatLocalDate(d));
  }
  return dates;
}

function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return DAY_LABELS[d.getDay() === 0 ? 6 : d.getDay() - 1];
}

// ── Component ───────────────────────────────────────────────────────────────

export default function WeeklyReport({ visible, onClose, initialEndDate }: WeeklyReportProps) {
  const { colors } = useTheme();
  const screenWidth = Dimensions.get('window').width;

  const [data, setData] = useState<WeeklyReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [endDate, setEndDate] = useState(initialEndDate ?? formatLocalDate(new Date()));
  const [selectedBar, setSelectedBar] = useState<number | null>(null);

  const fetchReport = useCallback(async (dateStr: string) => {
    setLoading(true);
    setSelectedBar(null);
    try {
      const userId = await requireUserId();
      const report = await getWeeklyReport(userId, dateStr);
      setData(report);
    } catch (err) {
      console.error('Weekly report load failed:', (err as Error).message);
      Alert.alert('Error', 'Failed to load weekly report.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      const date = initialEndDate ?? formatLocalDate(new Date());
      setEndDate(date);
      fetchReport(date);
    }
  }, [visible, initialEndDate]);

  const navigateWeek = (direction: -1 | 1) => {
    const d = new Date(endDate + 'T00:00:00');
    d.setDate(d.getDate() + direction * 7);
    const newDate = formatLocalDate(d);
    setEndDate(newDate);
    fetchReport(newDate);
  };

  // ── Build 7-day bar data ────────────────────────────────────────────────
  const weekDates = getWeekDates(endDate);
  const dailyMap: Record<string, DailyTotal> = {};
  for (const dt of data?.dailyTotals ?? []) {
    dailyMap[dt.date] = dt;
  }
  const waterMap: Record<string, number> = {};
  for (const w of data?.waterTotals ?? []) {
    waterMap[w.date] = w.totalOz;
  }

  const barData = weekDates.map((date) => ({
    date,
    label: getDayLabel(date),
    calories: dailyMap[date]?.calories ?? 0,
    protein: dailyMap[date]?.protein ?? 0,
    carbs: dailyMap[date]?.carbs ?? 0,
    fat: dailyMap[date]?.fat ?? 0,
    mealsLogged: dailyMap[date]?.mealsLogged ?? 0,
  }));

  const goalCal = data?.goals.calories ?? 2000;
  const maxCal = Math.max(...barData.map((b) => b.calories), goalCal * 1.15);

  // ── Chart dimensions ────────────────────────────────────────────────────
  const chartWidth = screenWidth - 80;
  const chartHeight = 150;
  const barWidth = (chartWidth - 48) / 7;
  const barGap = 8;

  // ── Bar color logic ─────────────────────────────────────────────────────
  function getBarColor(cal: number): string {
    if (cal === 0) return colors.border;
    if (cal > goalCal * 1.05) return colors.red;
    if (cal >= goalCal * 0.85) return colors.green;
    return colors.maroon;
  }

  // ── Macro ratio ─────────────────────────────────────────────────────────
  const avgP = data?.averages.protein ?? 0;
  const avgC = data?.averages.carbs ?? 0;
  const avgF = data?.averages.fat ?? 0;
  const totalMacroG = avgP + avgC + avgF;
  const pRatio = totalMacroG > 0 ? avgP / totalMacroG : 0.33;
  const cRatio = totalMacroG > 0 ? avgC / totalMacroG : 0.33;
  const fRatio = totalMacroG > 0 ? avgF / totalMacroG : 0.34;

  const goalP = data?.goals.protein ?? 150;
  const goalC = data?.goals.carbs ?? 250;
  const goalF = data?.goals.fat ?? 65;
  const goalTotalG = goalP + goalC + goalF;
  const goalPRatio = goalTotalG > 0 ? goalP / goalTotalG : 0.33;
  const goalCRatio = goalTotalG > 0 ? goalC / goalTotalG : 0.33;
  const goalFRatio = goalTotalG > 0 ? goalF / goalTotalG : 0.34;

  const macroBarWidth = screenWidth - 80;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[st.container, { backgroundColor: colors.background }]}>
        {/* ── Header ── */}
        <View style={[st.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={st.headerSide} activeOpacity={0.6}>
            <Text style={[st.headerAction, { color: colors.textMuted, fontFamily: 'DMSans_500Medium' }]}>
              Close
            </Text>
          </TouchableOpacity>
          <Text style={[st.headerTitle, { color: colors.text, fontFamily: 'Outfit_700Bold' }]}>
            Weekly Report
          </Text>
          <View style={st.headerSide} />
        </View>

        {loading ? (
          <View style={st.loadingWrap}>
            <ActivityIndicator size="large" color={colors.maroon} />
          </View>
        ) : !data ? (
          <View style={st.loadingWrap}>
            <Text style={{ fontSize: 32 }}>📊</Text>
            <Text style={[st.emptyText, { color: colors.textMuted, fontFamily: 'DMSans_400Regular' }]}>
              No report data available
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={st.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* ── Week navigation ── */}
            <View style={st.weekNav}>
              <TouchableOpacity onPress={() => navigateWeek(-1)} style={st.navArrow} activeOpacity={0.6}>
                <Text style={[st.navArrowText, { color: colors.maroon }]}>‹</Text>
              </TouchableOpacity>
              <Text style={[st.weekRange, { color: colors.text, fontFamily: 'DMSans_600SemiBold' }]}>
                {formatDisplayDate(data.startDate)} – {formatDisplayDate(data.endDate)}
              </Text>
              <TouchableOpacity onPress={() => navigateWeek(1)} style={st.navArrow} activeOpacity={0.6}>
                <Text style={[st.navArrowText, { color: colors.maroon }]}>›</Text>
              </TouchableOpacity>
            </View>

            {/* ── 1. Summary cards (2x2) ── */}
            <Text style={[st.sectionLabel, { color: colors.textMuted }]}>DAILY AVERAGES</Text>
            <View style={st.summaryGrid}>
              <SummaryCard
                label="Calories"
                value={`${data.averages.calories}`}
                unit="cal"
                pct={data.adherence.calories}
                color={colors.maroon}
                colors={colors}
              />
              <SummaryCard
                label="Protein"
                value={`${data.averages.protein}g`}
                unit=""
                pct={data.adherence.protein}
                color={colors.blue}
                colors={colors}
              />
              <SummaryCard
                label="Carbs"
                value={`${data.averages.carbs}g`}
                unit=""
                pct={data.adherence.carbs}
                color={colors.orange}
                colors={colors}
              />
              <SummaryCard
                label="Fat"
                value={`${data.averages.fat}g`}
                unit=""
                pct={data.adherence.fat}
                color={colors.yellow}
                colors={colors}
              />
            </View>

            {/* ── 2. Daily bar chart ── */}
            <Text style={[st.sectionLabel, { color: colors.textMuted }]}>DAILY CALORIES</Text>
            <View style={[st.chartCard, { backgroundColor: colors.cardGlass, borderColor: colors.cardGlassBorder }]}>
              <Svg width={chartWidth} height={chartHeight + 24}>
                {/* Goal line (dashed) */}
                <Line
                  x1={0}
                  y1={chartHeight - (goalCal / maxCal) * chartHeight}
                  x2={chartWidth}
                  y2={chartHeight - (goalCal / maxCal) * chartHeight}
                  stroke={colors.textMuted}
                  strokeWidth={1}
                  strokeDasharray="6,4"
                  opacity={0.5}
                />
                {/* Bars */}
                {barData.map((bar, i) => {
                  const barH = maxCal > 0 ? (bar.calories / maxCal) * chartHeight : 0;
                  const x = i * (barWidth + barGap);
                  const y = chartHeight - barH;
                  return (
                    <Rect
                      key={bar.date}
                      x={x}
                      y={y}
                      width={barWidth}
                      height={Math.max(barH, 2)}
                      rx={4}
                      fill={getBarColor(bar.calories)}
                      opacity={selectedBar !== null && selectedBar !== i ? 0.4 : 1}
                      onPress={() => setSelectedBar(selectedBar === i ? null : i)}
                    />
                  );
                })}
              </Svg>
              {/* Day labels */}
              <View style={[st.dayLabelsRow, { width: chartWidth }]}>
                {barData.map((bar, i) => (
                  <Pressable
                    key={bar.date}
                    style={[st.dayLabelWrap, { width: barWidth + barGap }]}
                    onPress={() => setSelectedBar(selectedBar === i ? null : i)}
                  >
                    <Text style={[
                      st.dayLabel,
                      { color: selectedBar === i ? colors.text : colors.textMuted, fontFamily: 'DMSans_500Medium' },
                    ]}>
                      {bar.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {/* Selected bar tooltip */}
              {selectedBar !== null && (
                <View style={[st.tooltip, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                  <Text style={[st.tooltipTitle, { color: colors.text, fontFamily: 'DMSans_600SemiBold' }]}>
                    {barData[selectedBar].label} · {formatDisplayDate(barData[selectedBar].date)}
                  </Text>
                  <Text style={[st.tooltipLine, { color: colors.textMuted, fontFamily: 'DMSans_400Regular' }]}>
                    {barData[selectedBar].calories} cal · {barData[selectedBar].protein}g P · {barData[selectedBar].carbs}g C · {barData[selectedBar].fat}g F
                  </Text>
                  <Text style={[st.tooltipLine, { color: colors.textMuted, fontFamily: 'DMSans_400Regular' }]}>
                    {barData[selectedBar].mealsLogged} meals logged
                  </Text>
                </View>
              )}
              {/* Legend */}
              <View style={st.legendRow}>
                <View style={st.legendItem}>
                  <View style={[st.legendDot, { backgroundColor: colors.maroon }]} />
                  <Text style={[st.legendText, { color: colors.textMuted }]}>Under</Text>
                </View>
                <View style={st.legendItem}>
                  <View style={[st.legendDot, { backgroundColor: colors.green }]} />
                  <Text style={[st.legendText, { color: colors.textMuted }]}>On target</Text>
                </View>
                <View style={st.legendItem}>
                  <View style={[st.legendDot, { backgroundColor: colors.red }]} />
                  <Text style={[st.legendText, { color: colors.textMuted }]}>Over</Text>
                </View>
                <Text style={[st.legendText, { color: colors.textMuted }]}>
                  --- Goal ({goalCal})
                </Text>
              </View>
            </View>

            {/* ── 3. Macro breakdown ── */}
            <Text style={[st.sectionLabel, { color: colors.textMuted }]}>MACRO BREAKDOWN</Text>
            <View style={[st.chartCard, { backgroundColor: colors.cardGlass, borderColor: colors.cardGlassBorder }]}>
              <Text style={[st.macroBarLabel, { color: colors.text, fontFamily: 'DMSans_500Medium' }]}>
                Actual
              </Text>
              <View style={[st.macroBar, { width: macroBarWidth }]}>
                <View style={[st.macroSeg, { flex: pRatio, backgroundColor: colors.blue, borderTopLeftRadius: 6, borderBottomLeftRadius: 6 }]} />
                <View style={[st.macroSeg, { flex: cRatio, backgroundColor: colors.orange }]} />
                <View style={[st.macroSeg, { flex: fRatio, backgroundColor: colors.yellow, borderTopRightRadius: 6, borderBottomRightRadius: 6 }]} />
              </View>
              <Text style={[st.macroBarLabel, { color: colors.text, fontFamily: 'DMSans_500Medium', marginTop: 12 }]}>
                Goal
              </Text>
              <View style={[st.macroBar, { width: macroBarWidth }]}>
                <View style={[st.macroSeg, { flex: goalPRatio, backgroundColor: colors.blue, opacity: 0.4, borderTopLeftRadius: 6, borderBottomLeftRadius: 6 }]} />
                <View style={[st.macroSeg, { flex: goalCRatio, backgroundColor: colors.orange, opacity: 0.4 }]} />
                <View style={[st.macroSeg, { flex: goalFRatio, backgroundColor: colors.yellow, opacity: 0.4, borderTopRightRadius: 6, borderBottomRightRadius: 6 }]} />
              </View>
              <View style={st.macroLegendRow}>
                <View style={st.legendItem}>
                  <View style={[st.legendDot, { backgroundColor: colors.blue }]} />
                  <Text style={[st.legendText, { color: colors.textMuted }]}>
                    Protein {Math.round(pRatio * 100)}%
                  </Text>
                </View>
                <View style={st.legendItem}>
                  <View style={[st.legendDot, { backgroundColor: colors.orange }]} />
                  <Text style={[st.legendText, { color: colors.textMuted }]}>
                    Carbs {Math.round(cRatio * 100)}%
                  </Text>
                </View>
                <View style={st.legendItem}>
                  <View style={[st.legendDot, { backgroundColor: colors.yellow }]} />
                  <Text style={[st.legendText, { color: colors.textMuted }]}>
                    Fat {Math.round(fRatio * 100)}%
                  </Text>
                </View>
              </View>
            </View>

            {/* ── 4. Hydration ── */}
            <Text style={[st.sectionLabel, { color: colors.textMuted }]}>HYDRATION</Text>
            <View style={[st.chartCard, { backgroundColor: colors.cardGlass, borderColor: colors.cardGlassBorder }]}>
              <View style={st.hydroRow}>
                <View>
                  <Text style={[st.hydroValue, { color: colors.blue, fontFamily: 'Outfit_700Bold' }]}>
                    {data.avgWaterOz} oz
                  </Text>
                  <Text style={[st.hydroLabel, { color: colors.textMuted, fontFamily: 'DMSans_400Regular' }]}>
                    avg daily · goal {data.goals.waterGoalOz} oz
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[st.hydroValue, { color: colors.green, fontFamily: 'Outfit_700Bold' }]}>
                    {data.daysWaterGoalMet}/7
                  </Text>
                  <Text style={[st.hydroLabel, { color: colors.textMuted, fontFamily: 'DMSans_400Regular' }]}>
                    days goal met
                  </Text>
                </View>
              </View>
              <View style={st.hydroCirclesRow}>
                {weekDates.map((date, i) => {
                  const met = (waterMap[date] ?? 0) >= data.goals.waterGoalOz;
                  return (
                    <View key={date} style={{ alignItems: 'center' }}>
                      <View
                        style={[
                          st.hydroCircle,
                          met
                            ? { backgroundColor: colors.blue }
                            : { borderWidth: 2, borderColor: colors.border },
                        ]}
                      />
                      <Text style={[st.hydroDayText, { color: colors.textMuted, fontFamily: 'DMSans_400Regular' }]}>
                        {getDayLabel(date)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* ── 5. Streaks ── */}
            <Text style={[st.sectionLabel, { color: colors.textMuted }]}>STREAKS & CONSISTENCY</Text>
            <View style={st.streakRow}>
              <View style={[st.streakCard, { backgroundColor: colors.cardGlass, borderColor: colors.cardGlassBorder }]}>
                <Feather name="zap" size={24} color={colors.orange} />
                <Text style={[st.streakValue, { color: colors.text, fontFamily: 'Outfit_700Bold' }]}>
                  {data.streak}
                </Text>
                <Text style={[st.streakLabel, { color: colors.textMuted, fontFamily: 'DMSans_400Regular' }]}>
                  day streak
                </Text>
              </View>
              <View style={[st.streakCard, { backgroundColor: colors.cardGlass, borderColor: colors.cardGlassBorder }]}>
                <Feather name="calendar" size={24} color={colors.blue} />
                <Text style={[st.streakValue, { color: colors.text, fontFamily: 'Outfit_700Bold' }]}>
                  {data.daysLogged}/7
                </Text>
                <Text style={[st.streakLabel, { color: colors.textMuted, fontFamily: 'DMSans_400Regular' }]}>
                  days logged
                </Text>
              </View>
              <View style={[st.streakCard, { backgroundColor: colors.cardGlass, borderColor: colors.cardGlassBorder }]}>
                <Feather name="star" size={24} color={colors.yellow} />
                <Text style={[st.streakValue, { color: colors.text, fontFamily: 'Outfit_700Bold' }]}>
                  {data.mostConsistentMeal}
                </Text>
                <Text style={[st.streakLabel, { color: colors.textMuted, fontFamily: 'DMSans_400Regular' }]}>
                  most consistent
                </Text>
              </View>
            </View>

            {/* ── 6. Weight trend (only if 2+ entries) ── */}
            {data.weightEntries.length >= 2 && (() => {
              const entries = data.weightEntries;
              const startW = entries[0].weight;
              const endW = entries[entries.length - 1].weight;
              const change = endW - startW;
              const changeStr = (change >= 0 ? '+' : '') + change.toFixed(1);

              const weights = entries.map((e) => e.weight);
              const minW = Math.min(...weights);
              const maxW = Math.max(...weights);
              const range = maxW - minW || 1;
              const padding = range * 0.15;
              const yMin = minW - padding;
              const yMax = maxW + padding;

              const wChartW = screenWidth - 80;
              const wChartH = 120;

              const points = entries.map((e, i) => {
                const x = entries.length === 1 ? wChartW / 2 : (i / (entries.length - 1)) * wChartW;
                const y = wChartH - ((e.weight - yMin) / (yMax - yMin)) * wChartH;
                return { x, y };
              });

              const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');

              return (
                <>
                  <Text style={[st.sectionLabel, { color: colors.textMuted }]}>WEIGHT TREND</Text>
                  <View style={[st.chartCard, { backgroundColor: colors.cardGlass, borderColor: colors.cardGlassBorder }]}>
                    <View style={st.weightHeader}>
                      <View>
                        <Text style={[st.weightValue, { color: colors.text, fontFamily: 'Outfit_700Bold' }]}>
                          {startW} lbs
                        </Text>
                        <Text style={[st.weightSubLabel, { color: colors.textMuted, fontFamily: 'DMSans_400Regular' }]}>
                          {formatDisplayDate(entries[0].date)}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'center' }}>
                        <Text style={[
                          st.weightChange,
                          {
                            color: change === 0 ? colors.textMuted : change < 0 ? colors.green : colors.orange,
                            fontFamily: 'DMSans_600SemiBold',
                          },
                        ]}>
                          {changeStr} lbs
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[st.weightValue, { color: colors.text, fontFamily: 'Outfit_700Bold' }]}>
                          {endW} lbs
                        </Text>
                        <Text style={[st.weightSubLabel, { color: colors.textMuted, fontFamily: 'DMSans_400Regular' }]}>
                          {formatDisplayDate(entries[entries.length - 1].date)}
                        </Text>
                      </View>
                    </View>
                    <Svg width={wChartW} height={wChartH} style={{ marginTop: 12 }}>
                      <Polyline
                        points={polylinePoints}
                        fill="none"
                        stroke={colors.maroon}
                        strokeWidth={2.5}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                      {points.map((p, i) => (
                        <SvgCircle
                          key={entries[i].date}
                          cx={p.x}
                          cy={p.y}
                          r={4}
                          fill={colors.maroon}
                          stroke={colors.card}
                          strokeWidth={2}
                        />
                      ))}
                    </Svg>
                  </View>
                </>
              );
            })()}

            {/* Spacer for scroll bottom */}
            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

// ── Summary card sub-component ──────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  unit,
  pct,
  color,
  colors,
}: {
  label: string;
  value: string;
  unit: string;
  pct: number;
  color: string;
  colors: any;
}) {
  return (
    <View style={[st.summaryCard, { backgroundColor: colors.cardGlass, borderColor: colors.cardGlassBorder }]}>
      <Text style={[st.summaryValue, { color, fontFamily: 'Outfit_700Bold' }]}>
        {value}
        {unit ? <Text style={st.summaryUnit}> {unit}</Text> : null}
      </Text>
      <Text style={[st.summaryLabel, { color: colors.textMuted, fontFamily: 'DMSans_400Regular' }]}>
        {label}
      </Text>
      <Text style={[
        st.summaryPct,
        {
          color: pct >= 85 && pct <= 115 ? colors.green : pct > 115 ? colors.red : colors.maroon,
          fontFamily: 'DMSans_600SemiBold',
        },
      ]}>
        {pct}% of goal
      </Text>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerSide: { width: 64 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17 },
  headerAction: { fontSize: 15 },

  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 14, marginTop: 4 },

  scrollContent: { padding: 20 },

  // Week nav
  weekNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  navArrow: { padding: 8 },
  navArrowText: { fontSize: 28, fontWeight: '600' },
  weekRange: { fontSize: 15 },

  // Section labels
  sectionLabel: {
    fontSize: 12,
    fontFamily: 'DMSans_600SemiBold',
    letterSpacing: 1.5,
    opacity: 0.3,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 20,
  },

  // Summary cards
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryCard: {
    width: '48%' as any,
    flexGrow: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  summaryValue: { fontSize: 24 },
  summaryUnit: { fontSize: 14 },
  summaryLabel: { fontSize: 12, marginTop: 2 },
  summaryPct: { fontSize: 12, marginTop: 4 },

  // Chart card
  chartCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },

  // Day labels
  dayLabelsRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  dayLabelWrap: { alignItems: 'center' },
  dayLabel: { fontSize: 11 },

  // Tooltip
  tooltip: {
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
  },
  tooltipTitle: { fontSize: 13, marginBottom: 2 },
  tooltipLine: { fontSize: 12, lineHeight: 18 },

  // Legend
  legendRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, fontFamily: 'DMSans_400Regular' },

  // Macro bars
  macroBarLabel: { fontSize: 13, marginBottom: 6 },
  macroBar: {
    flexDirection: 'row',
    height: 14,
    borderRadius: 6,
    overflow: 'hidden',
  },
  macroSeg: { height: 14 },
  macroLegendRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 12,
  },

  // Hydration
  hydroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  hydroValue: { fontSize: 22 },
  hydroLabel: { fontSize: 12, marginTop: 2 },
  hydroCirclesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  hydroCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginBottom: 4,
  },
  hydroDayText: { fontSize: 10 },

  // Streaks
  streakRow: {
    flexDirection: 'row',
    gap: 10,
  },
  streakCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
  },
  streakValue: { fontSize: 20, marginTop: 6 },
  streakLabel: { fontSize: 11, marginTop: 2, textAlign: 'center' },

  // Weight trend
  weightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  weightValue: { fontSize: 20 },
  weightSubLabel: { fontSize: 11, marginTop: 2 },
  weightChange: { fontSize: 15 },
});
