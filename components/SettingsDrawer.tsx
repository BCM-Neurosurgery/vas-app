import { IconSymbol } from '@/components/ui/IconSymbol';
import { databaseAPI, Patient } from '@/utils/database';
import { useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface SettingsDrawerProps {
  isVisible: boolean;
  onClose: () => void;
  selectedPatient: Patient | null;
  onPatientChange: (patient: Patient) => void;
}



export default function SettingsDrawer({
  isVisible,
  onClose,
  selectedPatient,
  onPatientChange,
}: SettingsDrawerProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [showNewPatientModal, setShowNewPatientModal] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Fetch patients from database on component mount
  useEffect(() => {
    const fetchPatients = async () => {
      setIsLoading(true);
      try {
        const fetchedPatients = await databaseAPI.getPatients();
        setPatients(fetchedPatients);
        
        // Auto-select the latest patient if none is selected
        if (!selectedPatient && fetchedPatients.length > 0) {
          const latestPatient = fetchedPatients.find(p => p.isLatest) || fetchedPatients[0];
          onPatientChange(latestPatient);
        }
      } catch (error) {
        console.error('Failed to fetch patients:', error);
        Alert.alert('Error', 'Failed to load patients. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    if (isVisible) {
      fetchPatients();
    }
  }, [isVisible, selectedPatient, onPatientChange]);

  const handlePatientSelect = async (patient: Patient) => {
    try {
      // Update database to set this patient as latest
      await databaseAPI.setAsLatest(patient.id);
      
      // Update local state
      setPatients(prev => prev.map(p => ({ ...p, isLatest: p.id === patient.id })));
      onPatientChange(patient);
      onClose();
    } catch (error) {
      console.error('Failed to set patient as latest:', error);
      Alert.alert('Error', 'Failed to update patient selection. Please try again.');
    }
  };

  const handleNewPatient = async () => {
    if (!newPatientName.trim()) {
      Alert.alert('Error', 'Please enter a patient name');
      return;
    }

    Alert.alert(
      'Create New Patient',
      `Do you want to create a new log for "${newPatientName}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {
            setNewPatientName('');
            setShowNewPatientModal(false);
          },
        },
        {
          text: 'Create',
          onPress: async () => {
            try {
              setIsLoading(true);
              
              // Create patient in database
              const newPatient = await databaseAPI.createPatient(newPatientName.trim());
              
              // Update local state
              setPatients(prev => [...prev.map(p => ({ ...p, isLatest: false })), newPatient]);
              onPatientChange(newPatient);
              
              setNewPatientName('');
              setShowNewPatientModal(false);
              onClose();
            } catch (error) {
              console.error('Failed to create patient:', error);
              Alert.alert('Error', 'Failed to create new patient. Please try again.');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleClearSelection = async () => {
    try {
      const defaultPatient = patients.find(p => p.isLatest) || patients[0];
      if (defaultPatient) {
        await handlePatientSelect(defaultPatient);
      }
    } catch (error) {
      console.error('Failed to reset selection:', error);
      Alert.alert('Error', 'Failed to reset patient selection. Please try again.');
    }
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-medical-gray">
        <View className="flex-row justify-between items-center p-5 pt-15 bg-white border-b border-medical-gray-medium">
          <Text className="text-xl font-bold text-medical-text-primary">Settings</Text>
          <TouchableOpacity onPress={onClose} className="p-1">
            <IconSymbol name="xmark" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 p-5">
          <View className="bg-white rounded-xl p-5 mb-5 shadow-sm">
            <Text className="text-lg font-bold mb-4 text-medical-text-primary">Patient Selection</Text>
            
            <View className="mb-5 p-4 bg-medical-gray-light rounded-lg">
              <Text className="text-sm text-medical-text-secondary mb-1">Current Patient:</Text>
              <Text className="text-base font-semibold text-medical-text-primary">
                {selectedPatient?.name || 'None selected'}
              </Text>
            </View>

            {isLoading ? (
              <View className="items-center py-8">
                <Text className="text-medical-text-secondary">Loading patients...</Text>
              </View>
            ) : (
              <View className="mb-5">
                {patients.map((patient) => (
                  <TouchableOpacity
                    key={patient.id}
                    className={`flex-row justify-between items-center p-4 rounded-lg mb-2 ${
                      selectedPatient?.id === patient.id 
                        ? 'bg-primary-50 border border-primary-500' 
                        : 'bg-medical-gray-light'
                    }`}
                    onPress={() => handlePatientSelect(patient)}
                  >
                    <Text className="text-base text-medical-text-primary">{patient.name}</Text>
                    {patient.isLatest && (
                      <Text className="text-xs text-primary-500 font-semibold">Latest</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TouchableOpacity
              className="flex-row items-center justify-center p-4 bg-primary-500 rounded-lg mb-4"
              onPress={() => setShowNewPatientModal(true)}
              disabled={isLoading}
            >
              <IconSymbol name="plus" size={20} color="white" />
              <Text className="text-white text-base font-semibold ml-2">Add New Patient</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="items-center p-4"
              onPress={handleClearSelection}
              disabled={isLoading}
            >
              <Text className="text-medical-text-secondary text-sm">Reset to Default</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* New Patient Modal */}
        <Modal
          visible={showNewPatientModal}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowNewPatientModal(false)}
        >
          <View className="flex-1 bg-black/50 justify-center items-center">
            <View className="bg-white rounded-xl p-5 w-4/5 max-w-sm">
              <Text className="text-lg font-bold mb-5 text-center">New Patient</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3 text-base mb-5"
                placeholder="Enter patient name"
                value={newPatientName}
                onChangeText={setNewPatientName}
                autoFocus
              />
              <View className="flex-row justify-between">
                <TouchableOpacity
                  className="flex-1 p-3 rounded-lg bg-medical-gray-light mr-2"
                  onPress={() => {
                    setNewPatientName('');
                    setShowNewPatientModal(false);
                  }}
                >
                  <Text className="text-medical-text-secondary text-center font-semibold">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 p-3 rounded-lg bg-primary-500 ml-2"
                  onPress={handleNewPatient}
                >
                  <Text className="text-white text-center font-semibold">Create</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}
