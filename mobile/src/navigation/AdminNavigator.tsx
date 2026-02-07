import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import AdminHome from '../screens/admin/AdminHome';
import AdminSettings from '../screens/admin/AdminSettings';
import { AdminTabParamList } from '../types/navigation';

const Tab = createBottomTabNavigator<AdminTabParamList>();

export default function AdminNavigator() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="AdminHome" component={AdminHome} options={{ title: 'Admin' }} />
      <Tab.Screen name="AdminSettings" component={AdminSettings} options={{ title: 'Settings' }} />
    </Tab.Navigator>
  );
}
