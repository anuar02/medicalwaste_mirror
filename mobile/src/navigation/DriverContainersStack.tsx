import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import DriverContainersScreen from '../screens/driver/DriverContainersScreen';
import DriverContainerDetailScreen from '../screens/driver/DriverContainerDetailScreen';
import { DriverContainersStackParamList } from '../types/navigation';
import { dark } from '../theme';

const Stack = createNativeStackNavigator<DriverContainersStackParamList>();

export default function DriverContainersStack() {
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
        name="DriverContainers"
        component={DriverContainersScreen}
        options={{ title: t('driver.tabs.containers') }}
      />
      <Stack.Screen
        name="DriverContainerDetail"
        component={DriverContainerDetailScreen}
        options={{ title: t('driver.containerDetail.title') }}
      />
    </Stack.Navigator>
  );
}
