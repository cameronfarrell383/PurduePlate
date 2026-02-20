import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

// Restyle primitives
import { Box, Text } from '@/src/theme/restyleTheme';
import StaggeredList from '@/src/components/StaggeredList';
import AnimatedCard from '@/src/components/AnimatedCard';

import { requireUserId } from '@/src/utils/auth';
import { supabase } from '@/src/utils/supabase';
import { getTodayWater, getWaterGoal } from '@/src/utils/water';
import { calculateDailyScore, DailyScore } from '@/src/utils/dailyScore';
import { getProgressData, ProgressData } from '@/src/utils/progressData';
import { getStreakData, getBadges, getWaterStreak, getTotalMealsLogged, StreakData, Badge } from '@/src/utils/streaks';
import DailyScoreCard from '@/src/components/DailyScoreCard';
import StreakDisplay from '@/src/components/StreakDisplay';
import CalorieChart from '@/src/components/CalorieChart';
import MacroBreakdown from '@/src/components/MacroBreakdown';
import StreakBadge from '@/src/components/StreakBadge';
import WeightChart from '@/src/components/WeightChart';
import { getWeightHistory, calculateWeightTrend, WeightEntry, WeightTrend } from '@/src/utils/weightData';
import MicronutrientScreen from '@/src/components/MicronutrientScreen';
import ShareCard from '@/src/components/ShareCard';
import WeeklyReport from '@/src/components/WeeklyReport';
import { triggerHaptic } from '@/src/utils/haptics';

// ─── Direct color constants for non-Restyle elements ────────────────────────
const C = {
  white: '#FFFFFF',
  offWhite: '#FAFAFA',
  maroon: '#861F41',
  maroonDark: '#6B1835',
  gold: '#C5A55A',
  goldMuted: 'rgba(197,165,90,0.12)',
  silver: '#A8A9AD',
  silverLight: '#C8C9CC',
  silverMuted: 'rgba(168,169,173,0.10)',
  text: '#1A1A1A',
  textMuted: '#6B6B6F',
  textDim: '#9A9A9E',
  border: '#E8E8EA',
  borderLight: '#F0F0F2',
  inputBg: '#F5F5F7',
  success: '#2D8A4E',
  warning: '#D4A024',
  error: '#C0392B',
  blue: '#4A7FC5',
};

function getLocalDate(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getDayLabel(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

interface DayData {
  date: string;
  label: string;
  logged: boolean;
}

type RangeType = '1W' | '1M' | '3M' | 'All';

export default function ProgressScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [range, setRange] = useState<RangeType>('1M');

  // Data states
  const [dailyScore, setDailyScore] = useState<DailyScore | null>(null);
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [weekDots, setWeekDots] = useState<DayData[]>([]);

  // Weight data
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [weightTrend, setWeightTrend] = useState<WeightTrend | null>(null);

  // Weight logging
  const [weightInput, setWeightInput] = useState('');
  const [savingWeight, setSavingWeight] = useState(false);
  const [lastWeight, setLastWeight] = useState<number | null>(null);

  // Share
  const [userName, setUserName] = useState('');
  const [sharing, setSharing] = useState(false);
  const shareCardRef = useRef<View>(null) as React.RefObject<View>;

  // Modals
  const [weeklyReportVisible, setWeeklyReportVisible] = useState(false);
  const [showMicros, setShowMicros] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const userId = await requireUserId();

      const rangeDaysMap: Record<RangeType, number> = { '1W': 7, '1M': 30, '3M': 90, 'All': 365 };
      const numDays = rangeDaysMap[range];

      const [profileRes, waterCount, waterGoalOz, streakRes, progressRes, waterStreak, totalMeals, weightHistory] = await Promise.all([
        supabase.from('profiles').select('name, goal_calories, goal_protein_g, goal_carbs_g, goal_fat_g, weight').eq('id', userId).single(),
        getTodayWater(userId),
        getWaterGoal(userId),
        getStreakData(userId),
        getProgressData(userId, numDays),
        getWaterStreak(userId),
        getTotalMealsLogged(userId),
        getWeightHistory(userId, numDays),
      ]);

      if (profileRes.data?.name) setUserName(profileRes.data.name);
      if (profileRes.data?.weight) setLastWeight(profileRes.data.weight);

      // Weight chart data
      setWeightEntries(weightHistory);
      if (weightHistory.length >= 2) {
        setWeightTrend(calculateWeightTrend(weightHistory));
      } else {
        setWeightTrend(null);
      }
      // Update lastWeight from weight_logs if available
      if (weightHistory.length > 0) {
        setLastWeight(weightHistory[weightHistory.length - 1].weight);
      }

      setStreakData(streakRes);
      setProgressData(progressRes);

      const badgeList = getBadges(streakRes, waterStreak, totalMeals);
      setBadges(badgeList);

      // Build 7-day dots for streak section
      const dots: DayData[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = getLocalDate(-i);
        const dayLog = progressRes.days.find(d => d.date === date);
        dots.push({
          date,
          label: getDayLabel(-i),
          logged: (dayLog?.mealsLogged ?? 0) > 0,
        });
      }
      setWeekDots(dots);

      // Calculate today's daily score
      const todayStr = getLocalDate();
      const todayLog = progressRes.days.find(d => d.date === todayStr);
      if (profileRes.data) {
        const p = profileRes.data;
        const score = calculateDailyScore(
          {
            calories: todayLog?.calories ?? 0,
            protein: todayLog?.protein ?? 0,
            carbs: todayLog?.carbs ?? 0,
            fat: todayLog?.fat ?? 0,
          },
          {
            calories: p.goal_calories || 2000,
            protein: p.goal_protein_g || 150,
            carbs: p.goal_carbs_g || 200,
            fat: p.goal_fat_g || 65,
          },
          todayLog?.mealsLogged ?? 0,
          waterCount,
          waterGoalOz,
        );
        setDailyScore(score);
      }
    } catch (e) {
      console.error('Progress load error:', e);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const logWeight = async () => {
    const w = parseFloat(weightInput);
    if (!w || w < 50 || w > 500) return;
    setSavingWeight(true);
    try {
      const userId = await requireUserId();
      const todayStr = getLocalDate();
      const { error } = await supabase.from('weight_logs').upsert(
        { user_id: userId, date: todayStr, weight: w },
        { onConflict: 'user_id,date' }
      );
      if (error) {
        // Fallback: update profiles weight
        await supabase.from('profiles').update({ weight: w }).eq('id', userId);
      }
      setLastWeight(w);
      setWeightInput('');
      // Reload weight chart data
      await loadData();
    } catch (e) {
      console.error('Weight save error:', e);
      Alert.alert('Error', 'Failed to save weight. Please try again.');
    } finally {
      setSavingWeight(false);
    }
  };

  const today = getLocalDate();
  const todayData = progressData?.days.find(d => d.date === today);
  const earnedBadges = badges.filter(b => b.earned).length;

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.offWhite }}>
        <Box flex={1} justifyContent="center" alignItems="center">
          <ActivityIndicator size="large" color={C.maroon} />
        </Box>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.offWhite }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await loadData();
                setRefreshing(false);
              }}
              tintColor={C.maroon}
            />
          }
        >
          {/* Header — pageTitle */}
          <Text variant="pageTitle" marginBottom="m">Progress</Text>

          {/* Rectangular time range tabs — same style as Browse meal filters */}
          <Box flexDirection="row" marginBottom="l" style={{ gap: 0 }}>
            {(['1W', '1M', '3M', 'All'] as RangeType[]).map((r) => {
              const isActive = range === r;
              return (
                <TouchableOpacity
                  key={r}
                  onPress={() => { triggerHaptic('light'); setRange(r); }}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    alignItems: 'center',
                    backgroundColor: isActive ? C.maroon : 'transparent',
                    borderRadius: isActive ? 6 : 0,
                    borderBottomWidth: isActive ? 0 : 2,
                    borderBottomColor: isActive ? 'transparent' : C.borderLight,
                  }}
                >
                  <Text
                    variant="body"
                    style={{
                      fontFamily: 'DMSans_600SemiBold',
                      fontSize: 13,
                      color: isActive ? C.white : C.textMuted,
                    }}
                  >
                    {r}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </Box>

          {/* Empty state — no meal logs at all */}
          {(progressData?.totalMealsLogged ?? 0) === 0 && (
            <Box
              backgroundColor="card"
              borderColor="border"
              borderWidth={1}
              borderRadius="m"
              padding="m"
              marginBottom="m"
              alignItems="center"
              style={{ paddingVertical: 32 }}
            >
              <Feather name="bar-chart-2" size={32} color={C.silver} />
              <Text
                variant="cardTitle"
                style={{ marginTop: 12, textAlign: 'center' }}
              >
                Start logging meals to see your progress here!
              </Text>
              <Text
                variant="muted"
                style={{ marginTop: 8, textAlign: 'center' }}
              >
                Head to Browse to find your first meal
              </Text>
            </Box>
          )}

          {/* All section cards wrapped in StaggeredList (50ms stagger) */}
          <StaggeredList staggerDelay={50}>

            {/* SECTION 1 — Daily Score */}
            {dailyScore && (
              <Box marginBottom="m">
                <DailyScoreCard
                  score={dailyScore.score}
                  grade={dailyScore.grade}
                  gradeColor={dailyScore.gradeColor}
                  breakdown={dailyScore.breakdown}
                />
              </Box>
            )}

            {/* SECTION 2 — Streak */}
            <Box
              backgroundColor="card"
              borderColor="border"
              borderWidth={1}
              borderRadius="m"
              padding="m"
              marginBottom="m"
            >
              <StreakDisplay
                currentStreak={streakData?.currentStreak ?? 0}
                longestStreak={streakData?.longestStreak ?? 0}
              />
              {/* 7-day dot row */}
              <Box flexDirection="row" justifyContent="space-around" style={{ marginTop: 16 }}>
                {weekDots.map((d, i) => {
                  const isToday = d.date === today;
                  const isFuture = d.date > today;
                  return (
                    <Box key={i} alignItems="center">
                      <Box
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 14,
                          justifyContent: 'center',
                          alignItems: 'center',
                          backgroundColor: d.logged
                            ? C.maroon
                            : (isToday || isFuture)
                              ? 'transparent'
                              : C.silver,
                          borderWidth: (!d.logged && isToday) ? 2 : (!d.logged && isFuture) ? 2 : 0,
                          borderColor: (!d.logged && isToday)
                            ? C.gold
                            : (!d.logged && isFuture)
                              ? C.borderLight
                              : 'transparent',
                        }}
                      >
                        {d.logged && <Feather name="check" size={12} color="#fff" />}
                      </Box>
                      <Text variant="dim" style={{ marginTop: 4 }}>{d.label}</Text>
                    </Box>
                  );
                })}
              </Box>
            </Box>

            {/* SECTION 3 — Calorie Trend */}
            <Box
              backgroundColor="card"
              borderColor="border"
              borderWidth={1}
              borderRadius="m"
              padding="m"
              marginBottom="m"
            >
              <Text variant="cardTitle" marginBottom="s">Calorie Trend</Text>
              <CalorieChart
                data={progressData?.days ?? []}
                goalCalories={progressData?.goals.calories ?? 2000}
                range={range}
              />
            </Box>

            {/* SECTION 4 — Weight Trend */}
            <Box
              backgroundColor="card"
              borderColor="border"
              borderWidth={1}
              borderRadius="m"
              padding="m"
              marginBottom="m"
            >
              <Text variant="cardTitle" marginBottom="s">Weight Trend</Text>
              {weightEntries.length >= 2 && weightTrend ? (
                <WeightChart entries={weightEntries} trend={weightTrend} />
              ) : (
                <Box alignItems="center" style={{ paddingVertical: 20, gap: 8 }}>
                  <Feather name="trending-up" size={28} color={C.silver} />
                  <Text variant="muted">Log your weight to see trends here</Text>
                </Box>
              )}
            </Box>

            {/* SECTION 5 — Macro Breakdown */}
            <Box
              backgroundColor="card"
              borderColor="border"
              borderWidth={1}
              borderRadius="m"
              padding="m"
              marginBottom="m"
            >
              <Text variant="cardTitle" marginBottom="s">Macro Split (7-day avg)</Text>
              <MacroBreakdown
                actual={{
                  protein: progressData?.weeklyAverages.thisWeek.protein ?? 0,
                  carbs: progressData?.weeklyAverages.thisWeek.carbs ?? 0,
                  fat: progressData?.weeklyAverages.thisWeek.fat ?? 0,
                }}
                target={{
                  protein: progressData?.goals.protein ?? 150,
                  carbs: progressData?.goals.carbs ?? 250,
                  fat: progressData?.goals.fat ?? 65,
                }}
              />
            </Box>

            {/* SECTION 6 — Badges */}
            <Box marginBottom="m">
              <Box flexDirection="row" justifyContent="space-between" alignItems="center" marginBottom="s">
                <Text variant="cardTitle">Your Badges</Text>
                <Text variant="dim">{earnedBadges} of {badges.length}</Text>
              </Box>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12, paddingBottom: 4 }}
              >
                {badges.map((b) => (
                  <StreakBadge key={b.id} badge={b} size="small" />
                ))}
              </ScrollView>
            </Box>

            {/* SECTION 7 — Micronutrient Link */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowMicros(true)}
              style={{
                backgroundColor: C.white,
                borderWidth: 1,
                borderColor: C.border,
                borderRadius: 8,
                padding: 16,
                marginBottom: 16,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text variant="body" style={{ color: C.textMuted }}>View All Nutrients</Text>
              <Feather name="chevron-right" size={18} color={C.textDim} />
            </TouchableOpacity>

            {/* SECTION 8 — Weekly Report */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setWeeklyReportVisible(true)}
              style={{
                backgroundColor: C.white,
                borderWidth: 1,
                borderColor: C.border,
                borderRadius: 8,
                padding: 16,
                marginBottom: 16,
              }}
            >
              <Text variant="cardTitle">Weekly Report</Text>
              <Box flexDirection="row" justifyContent="space-between" alignItems="center">
                <Text variant="muted">Your weekly report is ready</Text>
                <Feather name="chevron-right" size={18} color={C.textDim} />
              </Box>
            </TouchableOpacity>

            {/* SECTION 9 — Weight Logging */}
            <Box
              backgroundColor="card"
              borderColor="border"
              borderWidth={1}
              borderRadius="m"
              padding="m"
              marginBottom="m"
            >
              <Text variant="cardTitle">Log Weight</Text>
              <Text variant="muted" style={{ marginBottom: 12 }}>
                {lastWeight ? `Last logged: ${lastWeight} lbs` : 'Track your weight to see trends'}
              </Text>
              <Box flexDirection="row" style={{ gap: 10 }}>
                <TextInput
                  style={{
                    flex: 1,
                    backgroundColor: C.inputBg,
                    borderRadius: 6,
                    padding: 14,
                    fontSize: 16,
                    fontFamily: 'DMSans_400Regular',
                    color: C.text,
                  }}
                  placeholder="Weight in lbs"
                  placeholderTextColor={C.textDim}
                  value={weightInput}
                  onChangeText={setWeightInput}
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  onPress={logWeight}
                  disabled={savingWeight}
                  activeOpacity={0.7}
                  style={{
                    backgroundColor: C.maroon,
                    borderRadius: 6,
                    paddingHorizontal: 20,
                    paddingVertical: 14,
                    justifyContent: 'center',
                    alignItems: 'center',
                    opacity: savingWeight ? 0.6 : 1,
                  }}
                >
                  <Text
                    style={{
                      color: '#fff',
                      fontSize: 14,
                      fontFamily: 'DMSans_700Bold',
                    }}
                  >
                    Save
                  </Text>
                </TouchableOpacity>
              </Box>
            </Box>

            {/* SECTION 10 — Share */}
            <TouchableOpacity
              activeOpacity={0.7}
              disabled={sharing}
              onPress={async () => {
                if (!shareCardRef.current) return;
                setSharing(true);
                try {
                  const uri = await captureRef(shareCardRef, { format: 'png', quality: 0.9 });
                  await Sharing.shareAsync(uri);
                  triggerHaptic('light');
                } catch (e) {
                  console.error('Share error:', e);
                } finally {
                  setSharing(false);
                }
              }}
              style={{
                borderWidth: 1,
                borderColor: C.maroon,
                borderRadius: 6,
                padding: 16,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                backgroundColor: 'transparent',
                opacity: sharing ? 0.6 : 1,
              }}
            >
              <Feather name="share" size={16} color={C.maroon} style={{ marginRight: 8 }} />
              <Text
                style={{
                  color: C.maroon,
                  fontSize: 15,
                  fontFamily: 'DMSans_700Bold',
                }}
              >
                Share Today's Score
              </Text>
            </TouchableOpacity>

          </StaggeredList>
        </ScrollView>
      </KeyboardAvoidingView>

      <WeeklyReport
        visible={weeklyReportVisible}
        onClose={() => setWeeklyReportVisible(false)}
      />

      <Modal
        visible={showMicros}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowMicros(false)}
      >
        <MicronutrientScreen onClose={() => setShowMicros(false)} />
      </Modal>

      {/* Off-screen share card for capture */}
      <ShareCard
        cardRef={shareCardRef}
        userName={userName}
        date={today}
        calories={todayData?.calories ?? 0}
        goalCalories={progressData?.goals.calories ?? 2000}
        protein={todayData?.protein ?? 0}
        carbs={todayData?.carbs ?? 0}
        fat={todayData?.fat ?? 0}
        grade={dailyScore?.grade ?? '–'}
        gradeColor={dailyScore?.gradeColor ?? C.textDim}
        streak={streakData?.currentStreak ?? 0}
      />
    </SafeAreaView>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// OLD CODE — commented out, not deleted (Sprint 5 rule)
// ════════════════════════════════════════════════════════════════════════════════
//
// import { StyleSheet } from 'react-native';
// import { useTheme } from '@/src/context/ThemeContext';
//
// const st = StyleSheet.create({
//   safe: { flex: 1 },
//   loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
//   scrollContent: { padding: 20, paddingBottom: 100 },
//   title: { fontSize: 26, marginBottom: 16 },
//   rangePills: { flexDirection: 'row', gap: 8, marginBottom: 20 },
//   rangePill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
//   rangePillText: { fontSize: 14 },
//   card: { borderRadius: 14, borderWidth: 1, padding: 16 },
//   cardTitle: { fontSize: 16, fontFamily: 'DMSans_600SemiBold', marginBottom: 12 },
//   dotRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 16 },
//   streakDot: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
//   dotLabel: { fontSize: 10, fontFamily: 'DMSans_400Regular', marginTop: 4 },
//   placeholderContent: { alignItems: 'center', paddingVertical: 20, gap: 8 },
//   placeholderText: { fontSize: 14, fontFamily: 'DMSans_400Regular' },
//   sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
//   sectionHeaderText: { fontSize: 16, fontFamily: 'DMSans_600SemiBold' },
//   sectionHeaderMeta: { fontSize: 12, fontFamily: 'DMSans_400Regular' },
//   badgeScroll: { gap: 12, paddingBottom: 4 },
//   linkCard: { borderRadius: 14, borderWidth: 1, padding: 16, marginTop: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
//   linkCardText: { fontSize: 15, fontFamily: 'DMSans_500Medium' },
//   reportRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
//   reportSubtext: { fontSize: 14, fontFamily: 'DMSans_400Regular' },
//   lastWeightText: { fontSize: 13, fontFamily: 'DMSans_400Regular', marginBottom: 12 },
//   weightRow: { flexDirection: 'row', gap: 10 },
//   weightInput: { flex: 1, borderRadius: 12, padding: 14, fontSize: 16, borderWidth: 1 },
//   saveBtn: { paddingHorizontal: 20, paddingVertical: 14, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
//   saveBtnText: { color: '#fff', fontSize: 14, fontFamily: 'DMSans_700Bold' },
//   shareBtn: { marginTop: 20, padding: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', borderWidth: 1, backgroundColor: 'transparent' },
//   shareBtnText: { fontSize: 15, fontFamily: 'DMSans_700Bold' },
// });
