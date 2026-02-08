import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import DriverHistoryScreen from '../screens/driver/DriverHistoryScreen';
import DriverSessionTimelineScreen from '../screens/driver/DriverSessionTimelineScreen';
import { DriverHistoryStackParamList } from '../types/navigation';
import { dark } from '../theme';

const Stack = createNativeStackNavigator<DriverHistoryStackParamList>();

export default function DriverHistoryStack() {
  const { t } = useTranslation();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: dark.bg },
        headerTintColor: dark.text,
        headerTitleStyle: { color: dark.text },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="DriverHistory"
        component={DriverHistoryScreen}
        options={{ title: t('driver.tabs.history') }}
      />
      <Stack.Screen
        name="DriverSessionTimeline"
        component={DriverSessionTimelineScreen}
        options={{ title: t('handoff.history.title') }}
      />
    </Stack.Navigator>
  );
}
