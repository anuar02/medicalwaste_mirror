import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { dark } from '../../theme';

interface AnimatedProgressBarProps {
  fullness: number;
  color: string;
  height?: number;
}

export default function AnimatedProgressBar({
  fullness,
  color,
  height = 8,
}: AnimatedProgressBarProps) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withSpring(Math.min(fullness, 100), {
      damping: 18,
      stiffness: 120,
    });
  }, [fullness, width]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
    backgroundColor: color,
  }));

  return (
    <View style={[styles.track, { height }]}>
      <Animated.View style={[styles.fill, { height }, animatedStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flex: 1,
    backgroundColor: dark.barTrack,
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: 999,
  },
});
