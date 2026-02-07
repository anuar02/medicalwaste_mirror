import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';

import './src/i18n';
import AppNavigator from './src/navigation/AppNavigator';
import { queryClient } from './src/services/queryClient';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <AppNavigator />
    </QueryClientProvider>
  );
}
