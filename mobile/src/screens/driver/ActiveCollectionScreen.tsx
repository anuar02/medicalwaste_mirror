import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';

import DriverRoutePanel from '../../components/DriverRoutePanel';
import { colors } from '../../theme';

export default function ActiveCollectionScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <DriverRoutePanel showTitle />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
