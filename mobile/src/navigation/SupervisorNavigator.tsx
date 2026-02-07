import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import SupervisorHome from '../screens/supervisor/SupervisorHome';
import SupervisorHandoffsScreen from '../screens/supervisor/SupervisorHandoffsScreen';
import SupervisorSettings from '../screens/supervisor/SupervisorSettings';
import { SupervisorTabParamList } from '../types/navigation';

const Tab = createBottomTabNavigator<SupervisorTabParamList>();

export default function SupervisorNavigator() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="SupervisorHome" component={SupervisorHome} options={{ title: 'Dashboard' }} />
      <Tab.Screen name="SupervisorHandoffs" component={SupervisorHandoffsScreen} options={{ title: 'Handoffs' }} />
      <Tab.Screen name="SupervisorSettings" component={SupervisorSettings} options={{ title: 'Settings' }} />
    </Tab.Navigator>
  );
}
