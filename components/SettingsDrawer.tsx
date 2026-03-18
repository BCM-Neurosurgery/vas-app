import { IconSymbol } from '@/components/ui/IconSymbol';
import { usePatient } from '@/contexts/PatientContext';
import { databaseAPI } from '@/db/api';
import { Patient } from '@/db/types';
import { useEffect, useState } from 'react';
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { showCrossPlatformAlert } from './CrossPlatformAlert';
import CrossPlatformModal from './CrossPlatformModal';

interface SettingsDrawerProps {
  isVisible: boolean;
  onClose: () => void;
  selectedPatient: Patient | null;
  onPatientChange: (patient: Patient | null) => void;
}

export default function SettingsDrawer({
  isVisible,
  onClose,
  selectedPatient,
  onPatientChange,
}: SettingsDrawerProps) {
  const { setPatients: setContextPatients } = usePatient();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [showNewPatientModal, setShowNewPatientModal] = useState(false);
  const [patientPendingDelete, setPatientPendingDelete] = useState<Patient | null>(null);
  const [patientPendingFinalDelete, setPatientPendingFinalDelete] = useState<Patient | null>(null);
  const [newPatientName, setNewPatientName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchPatients = async () => {
      setIsLoading(true);
      try {
        const fetchedPatients = await databaseAPI.getPatients();
        setPatients(fetchedPatients);
        setContextPatients(fetchedPatients);

        if (!selectedPatient && fetchedPatients.length > 0) {
          const latestPatient = fetchedPatients.find((p) => p.latest) || fetchedPatients[0];
          onPatientChange(latestPatient);
        }
      } catch (error) {
        console.error('Failed to fetch patients:', error);
        showCrossPlatformAlert({
          title: 'Error',
          message: 'Failed to load patients. Please try again.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (isVisible) {
      fetchPatients();
    }
  }, [isVisible, selectedPatient, onPatientChange, setContextPatients]);

  const handlePatientSelect = async (patient: Patient) => {
    try {
      await databaseAPI.setAsLatest(patient);

      const updatedPatients = patients.map((p) => ({ ...p, latest: p.uuid === patient.uuid }));
      setPatients(updatedPatients);
      setContextPatients(updatedPatients);
      onPatientChange(patient);
      onClose();
    } catch (error) {
      console.error('Failed to set patient as latest:', error);
      showCrossPlatformAlert({
        title: 'Error',
        message: 'Failed to update patient selection. Please try again.',
      });
    }
  };

  const handleNewPatient = async () => {
    if (!newPatientName.trim()) {
      showCrossPlatformAlert({
        title: 'Error',
        message: 'Please enter a patient name',
      });
      return;
    }

    showCrossPlatformAlert({
      title: 'Create New Patient',
      message: `Do you want to create a new log for "${newPatientName}"?`,
      buttons: [
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
              const newPatient = await databaseAPI.createPatient(newPatientName.trim());

              const updatedPatients = [...patients.map((p) => ({ ...p, latest: false })), newPatient];
              setPatients(updatedPatients);
              setContextPatients(updatedPatients);
              onPatientChange(newPatient);
              setNewPatientName('');
              setShowNewPatientModal(false);
            } catch (error) {
              console.error('Failed to create patient:', error);
              showCrossPlatformAlert({
                title: 'Error',
                message: 'Failed to create new patient. Please try again.',
              });
            } finally {
              setIsLoading(false);
            }
          },
        },
      ],
    });
  };

  const handleClearSelection = async () => {
    try {
      const defaultPatient = patients.find((p) => p.latest) || patients[0];
      if (defaultPatient) {
        await handlePatientSelect(defaultPatient);
      }
    } catch (error) {
      console.error('Failed to reset selection:', error);
      showCrossPlatformAlert({
        title: 'Error',
        message: 'Failed to reset patient selection. Please try again.',
      });
    }
  };

  const confirmDeletePatient = async (patient: Patient) => {
    try {
      setIsLoading(true);
      const nextSelectedPatient = await databaseAPI.deletePatient(patient);
      const updatedPatients = await databaseAPI.getPatients();
      setPatients(updatedPatients);
      setContextPatients(updatedPatients);

      if (selectedPatient?.uuid === patient.uuid) {
        onPatientChange(nextSelectedPatient);
      } else if (selectedPatient) {
        const refreshedSelected =
          updatedPatients.find((candidate) => candidate.uuid === selectedPatient.uuid) ?? null;
        onPatientChange(refreshedSelected);
      }
    } catch (error) {
      console.error('Failed to delete patient:', error);
      showCrossPlatformAlert({
        title: 'Error',
        message: 'Failed to delete patient. Please try again.',
      });
    } finally {
      setIsLoading(false);
      setPatientPendingDelete(null);
      setPatientPendingFinalDelete(null);
    }
  };

  const handleDeletePatient = (patient: Patient) => {
    setPatientPendingDelete(patient);
  };

  return (
    <CrossPlatformModal
      visible={isVisible}
      onClose={onClose}
      title="Settings"
      showCloseButton={true}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View className="flex-1 bg-medical-gray">
        <ScrollView className="flex-1 p-5">
          <View className="bg-white rounded-xl p-5 mb-5 shadow-sm">
            <Text className="text-lg font-bold mb-4 text-medical-text-primary">Patient Selection</Text>

            <View className="mb-5 rounded-lg bg-medical-gray-light p-4">
              <Text className="mb-1 text-sm text-medical-text-secondary">Current Patient:</Text>
              <Text className="text-base font-semibold text-medical-text-primary">
                {selectedPatient?.emu_id || 'None selected'}
              </Text>
            </View>

            {isLoading ? (
              <View className="items-center py-8">
                <Text className="text-medical-text-secondary">Loading patients...</Text>
              </View>
            ) : (
              <View className="mb-5">
                {patients.map((patient) => (
                  <View
                    key={patient.uuid}
                    className={`mb-2 flex-row items-center rounded-lg ${
                      selectedPatient?.uuid === patient.uuid
                        ? 'border border-primary-500 bg-primary-50'
                        : 'bg-medical-gray-light'
                    }`}
                  >
                    <TouchableOpacity className="flex-1 p-4" onPress={() => handlePatientSelect(patient)}>
                      <View className="flex-row items-center justify-between">
                        <Text className="text-base text-medical-text-primary">{patient.emu_id}</Text>
                        {patient.latest && (
                          <Text className="text-xs font-semibold text-primary-500">Latest</Text>
                        )}
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      className="mr-3 rounded-lg bg-red-50 px-3 py-2"
                      onPress={() => handleDeletePatient(patient)}
                      disabled={isLoading}
                    >
                      <Text className="text-xs font-semibold text-red-700">Delete</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity
              className="mb-4 flex-row items-center justify-center rounded-lg bg-primary-500 p-4"
              onPress={() => setShowNewPatientModal(true)}
              disabled={isLoading}
            >
              <IconSymbol name="plus" size={20} color="white" />
              <Text className="ml-2 text-base font-semibold text-white">Add New Patient</Text>
            </TouchableOpacity>

            <TouchableOpacity className="items-center p-4" onPress={handleClearSelection} disabled={isLoading}>
              <Text className="text-sm text-medical-text-secondary">Reset to Default</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <CrossPlatformModal
          visible={showNewPatientModal}
          onClose={() => {
            setNewPatientName('');
            setShowNewPatientModal(false);
          }}
          title="New Patient"
          showCloseButton={true}
          animationType="fade"
          presentationStyle="formSheet"
        >
          <View
            style={{ width: '92%', maxWidth: 480, maxHeight: '80%', alignSelf: 'center' }}
            className="rounded-2xl bg-white p-4"
          >
            <ScrollView
              bounces={false}
              contentContainerStyle={{ paddingTop: 40, paddingBottom: 12, gap: 12 }}
              keyboardShouldPersistTaps="handled"
            >
              <TextInput
                className="rounded-lg border border-gray-300 p-3 text-base"
                placeholder="Enter patient name"
                value={newPatientName}
                onChangeText={setNewPatientName}
                autoFocus
                returnKeyType="done"
              />
              <View className="flex-row gap-3">
                <TouchableOpacity
                  className="flex-1 rounded-lg bg-medical-gray-light p-3"
                  onPress={() => {
                    setNewPatientName('');
                    setShowNewPatientModal(false);
                  }}
                >
                  <Text className="text-center font-semibold text-medical-text-secondary">Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity className="flex-1 rounded-lg bg-primary-500 p-3" onPress={handleNewPatient}>
                  <Text className="text-center font-semibold text-white">Create</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </CrossPlatformModal>

        <CrossPlatformModal
          visible={patientPendingDelete !== null}
          onClose={() => setPatientPendingDelete(null)}
          title="Delete Patient"
          showCloseButton={true}
          animationType="fade"
          presentationStyle="formSheet"
        >
          <View
            style={{ width: '92%', maxWidth: 480, maxHeight: '80%', alignSelf: 'center' }}
            className="rounded-2xl bg-white p-4"
          >
            <ScrollView bounces={false} contentContainerStyle={{ paddingTop: 40, paddingBottom: 12, gap: 12 }}>
              <Text className="text-base leading-6 text-medical-text-primary">
                Delete &quot;{patientPendingDelete?.emu_id}&quot; and all of its local check-ins? This will also be pushed to the server when sync is available.
              </Text>

              <View className="flex-row gap-3">
                <TouchableOpacity
                  className="flex-1 rounded-lg bg-medical-gray-light p-3"
                  onPress={() => setPatientPendingDelete(null)}
                  disabled={isLoading}
                >
                  <Text className="text-center font-semibold text-medical-text-secondary">Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="flex-1 rounded-lg bg-red-600 p-3"
                  onPress={() => {
                    setPatientPendingFinalDelete(patientPendingDelete);
                    setPatientPendingDelete(null);
                  }}
                  disabled={isLoading}
                >
                  <Text className="text-center font-semibold text-white">Delete</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </CrossPlatformModal>

        <CrossPlatformModal
          visible={patientPendingFinalDelete !== null}
          onClose={() => setPatientPendingFinalDelete(null)}
          title="Are You Sure?"
          showCloseButton={true}
          animationType="fade"
          presentationStyle="formSheet"
        >
          <View
            style={{ width: '92%', maxWidth: 480, maxHeight: '80%', alignSelf: 'center' }}
            className="rounded-2xl bg-white p-4"
          >
            <ScrollView bounces={false} contentContainerStyle={{ paddingTop: 40, paddingBottom: 12, gap: 12 }}>
              <View className="rounded-xl border border-red-100 bg-red-50 p-4">
                <Text className="text-lg font-bold text-red-800">Patient deletion is hard to reverse.</Text>
                <Text className="mt-2 text-base leading-6 text-red-900">
                  Please make sure this is necessary before proceeding.
                </Text>
              </View>

              <Text className="text-sm leading-6 text-medical-text-secondary">
                This will remove &quot;{patientPendingFinalDelete?.emu_id}&quot; from the active patient list and keep its existing check-ins deleted.
              </Text>

              <View className="flex-row gap-3">
                <TouchableOpacity
                  className="flex-1 rounded-lg bg-medical-gray-light p-3"
                  onPress={() => setPatientPendingFinalDelete(null)}
                  disabled={isLoading}
                >
                  <Text className="text-center font-semibold text-medical-text-secondary">Go Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="flex-1 rounded-lg bg-red-700 p-3"
                  onPress={() => {
                    if (patientPendingFinalDelete) {
                      void confirmDeletePatient(patientPendingFinalDelete);
                    }
                  }}
                  disabled={isLoading}
                >
                  <Text className="text-center font-semibold text-white">Delete Patient</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </CrossPlatformModal>
      </View>
    </CrossPlatformModal>
  );
}
