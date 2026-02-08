import React, { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { DataFreshness } from '../../utils/formatTime';

const FRESHNESS_COLORS: Record<DataFreshness, string> = {
  fresh: '#10b981',
  stale: '#f59e0b',
  old: '#64748b',
};

interface PulsingDotProps {
  freshness: DataFreshness;
  size?: number;
}

export default function PulsingDot({ freshness, size = 8 }: PulsingDotProps) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (freshness === 'fresh') {
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 800 }),
          withTiming(1, { duration: 800 }),
        ),
        -1,
      );
    } else {
      opacity.value = 1;
    }
  }, [freshness, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: FRESHNESS_COLORS[freshness],
        },
        animatedStyle,
      ]}
    />
  );
}
