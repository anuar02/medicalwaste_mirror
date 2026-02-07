import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import ActiveCollectionScreen from '../screens/driver/ActiveCollectionScreen';
import DriverContainersScreen from '../screens/driver/DriverContainersScreen';
import DriverHandoffsScreen from '../screens/driver/DriverHandoffsScreen';
import DriverHistoryScreen from '../screens/driver/DriverHistoryScreen';
import DriverSettings from '../screens/driver/DriverSettings';
import { DriverTabParamList } from '../types/navigation';

const Tab = createBottomTabNavigator<DriverTabParamList>();

export default function DriverNavigator() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="ActiveCollection" component={ActiveCollectionScreen} options={{ title: 'Active' }} />
      <Tab.Screen name="DriverContainers" component={DriverContainersScreen} options={{ title: 'Containers' }} />
      <Tab.Screen name="DriverHandoffs" component={DriverHandoffsScreen} options={{ title: 'Handoffs' }} />
      <Tab.Screen name="DriverHistory" component={DriverHistoryScreen} options={{ title: 'History' }} />
      <Tab.Screen name="DriverSettings" component={DriverSettings} options={{ title: 'Settings' }} />
    </Tab.Navigator>
  );
}
