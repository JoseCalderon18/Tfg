import React from 'react';
import { StyleSheet, View } from 'react-native';
import MapaOperativo from '../components/MapaOperativo';

export default function MapScreen({ route }: any) {
  const focusedAlert = route?.params?.focusedAlert ?? null;

  return (
    <View style={styles.container}>
      <MapaOperativo alertaEnfocada={focusedAlert} centrarEnAlerta={Boolean(focusedAlert)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
