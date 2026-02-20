import React from 'react';
import { Box } from '../theme/restyleTheme';
import AnimatedNumber from './AnimatedNumber';

interface MacroData {
  current: number;
  goal: number;
}

interface MacroLegendProps {
  calories: MacroData;
  protein: MacroData;
  carbs: MacroData;
  fat: MacroData;
}

// Dot colors: maroon, steel blue, flat gold, flat silver
const LEGEND_ITEMS: { label: string; key: keyof MacroLegendProps; dotColor: string; suffix: string }[] = [
  { label: 'Cal', key: 'calories', dotColor: '#861F41', suffix: '' },
  { label: 'Protein', key: 'protein', dotColor: '#4A7FC5', suffix: 'g' },
  { label: 'Carbs', key: 'carbs', dotColor: '#C5A55A', suffix: 'g' },
  { label: 'Fat', key: 'fat', dotColor: '#A8A9AD', suffix: 'g' },
];

export default function MacroLegend({ calories, protein, carbs, fat }: MacroLegendProps) {
  const data: Record<string, MacroData> = { calories, protein, carbs, fat };

  return (
    <Box
      flexDirection="row"
      justifyContent="space-between"
      alignItems="center"
      paddingHorizontal="s"
    >
      {LEGEND_ITEMS.map((item) => {
        const macro = data[item.key];
        return (
          <Box key={item.key} flexDirection="row" alignItems="center" gap="xs">
            <Box
              width={8}
              height={8}
              borderRadius="full"
              style={{ backgroundColor: item.dotColor }}
            />
            <AnimatedNumber
              value={macro.current}
              textVariant="bodySmall"
              color="#6B6B6F"
              suffix={` / ${macro.goal}${item.suffix}`}
            />
          </Box>
        );
      })}
    </Box>
  );
}
