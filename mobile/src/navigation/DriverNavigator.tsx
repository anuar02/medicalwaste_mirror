import React, { useMemo } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import DriverHome from '../screens/driver/DriverHome';
import DriverSessionScreen from '../screens/driver/DriverSessionScreen';
import DriverSettings from '../screens/driver/DriverSettings';
import DriverLocationTracker from '../components/DriverLocationTracker';
import DriverHistoryStack from './DriverHistoryStack';
import DriverContainersStack from './DriverContainersStack';
import { DriverTabParamList } from '../types/navigation';
import { useActiveCollection } from '../hooks/useCollections';
import { dark } from '../theme';

const Tab = createBottomTabNavigator<DriverTabParamList>();

export default function DriverNavigator() {
  const { t } = useTranslation();
  const { data: session } = useActiveCollection();
  const hasSession = Boolean(session);

  const initialRouteName = useMemo(
    () => (hasSession ? 'DriverSession' : 'DriverHome'),
    [hasSession],
  );

  return (
    <>
      <DriverLocationTracker />
      <Tab.Navigator
        key={hasSession ? 'session-active' : 'session-idle'}
        initialRouteName={initialRouteName}
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: dark.teal,
          tabBarInactiveTintColor: dark.muted,
          tabBarStyle: {
            backgroundColor: dark.bg,
            borderTopColor: dark.border,
          },
        }}
      >
        <Tab.Screen
          name="DriverHome"
          component={DriverHome}
          options={{
            title: t('driver.tabs.home'),
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="home-variant-outline" color={color} size={size} />
            ),
          }}
        />
        <Tab.Screen
          name="DriverSession"
          component={DriverSessionScreen}
          options={{
            title: t('driver.tabs.session'),
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="package-variant-closed" color={color} size={size} />
            ),
            tabBarButton: (props) => {
              if (hasSession) {
                return <TouchableOpacity {...props} />;
              }
              return (
                <TouchableOpacity
                  {...props}
                  disabled
                  onPress={() => undefined}
                  style={[props.style, { opacity: 0.4 }]}
                />
              );
            },
          }}
        />
        <Tab.Screen
          name="DriverContainersStack"
          component={DriverContainersStack}
          options={{
            title: t('driver.tabs.containers'),
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="package-variant" color={color} size={size} />
            ),
          }}
        />
        <Tab.Screen
          name="DriverHistoryStack"
          component={DriverHistoryStack}
          options={{
            title: t('driver.tabs.history'),
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="clipboard-text-outline" color={color} size={size} />
            ),
          }}
        />
        <Tab.Screen
          name="DriverProfile"
          component={DriverSettings}
          options={{
            title: t('driver.tabs.profile'),
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="account-circle-outline" color={color} size={size} />
            ),
          }}
        />
      </Tab.Navigator>
    </>
  );
}
