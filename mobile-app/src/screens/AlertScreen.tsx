import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useLocation } from '../context/LocationContext';
import { useAuth } from '../context/AuthContext';
import { useOfflineSync } from '../context/OfflineSyncContext';

export default function AlertScreen({ navigation }: any) {
  // Estado del formulario de alertas en campo.
  const [alertType, setAlertType] = useState('SOS');
  const [severity, setSeverity] = useState(3);
  const [description, setDescription] = useState('');
  const { location } = useLocation();
  const { token } = useAuth();
  const { queueAlert } = useOfflineSync();

  const handleSendAlert = async () => {
    try {
      // Validamos sesión y ubicación antes de registrar la alerta operativa.
      if (!token) {
        Alert.alert('Error', 'No hay sesión activa.');
        return;
      }

      if (!location) {
        Alert.alert('Error', 'Activa el GPS antes de enviar una alerta.');
        return;
      }

      const result = await queueAlert({
        alert_type: alertType,
        severity,
        title: `Alerta ${alertType}`,
        description,
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });

      if (!result.ok) {
        throw new Error(result.error ?? 'No se pudo registrar la alerta.');
      }

      Alert.alert(
        result.queued ? 'Alerta en cola' : 'Alerta enviada',
        result.queued
          ? 'La alerta se guardo sin conexion y se enviara automaticamente cuando vuelva la red.'
          : 'La alerta se envio correctamente.'
      );
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to send alert');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enviar alerta</Text>

      <Text style={styles.label}>Tipo de alerta</Text>
      <View style={styles.pickerContainer}>
        <Picker selectedValue={alertType} onValueChange={setAlertType}>
          <Picker.Item label="Emergencia SOS" value="SOS" />
          <Picker.Item label="Hombre caído" value="MAN_DOWN" />
          <Picker.Item label="Perdido" value="LOST" />
          <Picker.Item label="Otro" value="OTHER" />
        </Picker>
      </View>

      <Text style={styles.label}>Nivel de alerta (1-5)</Text>
      <View style={styles.pickerContainer}>
        <Picker selectedValue={severity} onValueChange={setSeverity}>
          <Picker.Item label="1 - Critico" value={1} />
          <Picker.Item label="2 - Alto" value={2} />
          <Picker.Item label="3 - Medio" value={3} />
          <Picker.Item label="4 - Bajo" value={4} />
          <Picker.Item label="5 - Información" value={5} />
        </Picker>
      </View>

      <Text style={styles.label}>Descripcion</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Describe la situación..."
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
      />

      <TouchableOpacity style={styles.button} onPress={handleSendAlert}>
        <Text style={styles.buttonText}>Enviar alerta</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#0F172A',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#F8FAFC',
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    fontWeight: '600',
    color: '#CBD5E1',
  },
  pickerContainer: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#475569',
  },
  input: {
    backgroundColor: '#1E293B',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#475569',
    color: '#F8FAFC',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#DC2626',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
