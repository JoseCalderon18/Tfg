import React from 'react';
import { StyleSheet, View } from 'react-native';
import MapaOperativo from '../components/MapaOperativo';

export default function MapScreen() {
  return (
    <View style={styles.container}>
      <MapaOperativo />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
