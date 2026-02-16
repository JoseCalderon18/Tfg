import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useLocation } from '../context/LocationContext';

export default function AlertScreen({ navigation }: any) {
  const [alertType, setAlertType] = useState('SOS');
  const [severity, setSeverity] = useState(3);
  const [description, setDescription] = useState('');
  const { location } = useLocation();

  const handleSendAlert = async () => {
    try {
      // TODO: Enviar alerta al backend
      console.log('Sending alert:', {
        type: alertType,
        severity,
        description,
        location: location?.coords,
      });
      Alert.alert('Success', 'Alert sent successfully');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to send alert');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Send Alert</Text>

      <Text style={styles.label}>Alert Type</Text>
      <View style={styles.pickerContainer}>
        <Picker selectedValue={alertType} onValueChange={setAlertType}>
          <Picker.Item label="SOS Emergency" value="SOS" />
          <Picker.Item label="Man Down" value="MAN_DOWN" />
          <Picker.Item label="Lost" value="LOST" />
          <Picker.Item label="Other" value="OTHER" />
        </Picker>
      </View>

      <Text style={styles.label}>Severity (1-5)</Text>
      <View style={styles.pickerContainer}>
        <Picker selectedValue={severity} onValueChange={setSeverity}>
          <Picker.Item label="1 - Critical" value={1} />
          <Picker.Item label="2 - High" value={2} />
          <Picker.Item label="3 - Medium" value={3} />
          <Picker.Item label="4 - Low" value={4} />
          <Picker.Item label="5 - Info" value={5} />
        </Picker>
      </View>

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Describe the situation..."
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
      />

      <TouchableOpacity style={styles.button} onPress={handleSendAlert}>
        <Text style={styles.buttonText}>Send Alert</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    fontWeight: '600',
  },
  pickerContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  input: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#FF3B30',
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
