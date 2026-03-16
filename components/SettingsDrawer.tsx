import { IconSymbol } from '@/components/ui/IconSymbol';
import { databaseAPI, NotificationSchedule } from '@/db/api';
import { Patient } from '@/db/types';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useEffect, useState } from 'react';
import {
  Platform,
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
  onPatientChange: (patient: Patient) => void;
  pushToken: string;
}

export default function SettingsDrawer({
  isVisible,
  onClose,
  selectedPatient,
  onPatientChange,
  pushToken
}: SettingsDrawerProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [showNewPatientModal, setShowNewPatientModal] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // states for notifications
  const [schedule, setSchedule] = useState<NotificationSchedule | null>(null);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [creating, setCreating] = useState(false);
  const [canceling, setCanceling] = useState(false);

  // form state (when no active schedule)
  const [showCreateScheduleModal, setShowCreateScheduleModal] = useState(false);
  const [startAt, setStartAt] = useState<Date>(new Date(Date.now() + 5 * 60 * 1000)); // default: 5 min from now
  const [durationDays, setDurationDays] = useState<string>('1');
  const [cadenceMinutes, setCadenceMinutes] = useState<string>('60');
  
  // Fetch patients from database on component mount
  useEffect(() => {
    const fetchPatients = async () => {
      setIsLoading(true);
      try {
        const fetchedPatients = await databaseAPI.getPatients();
        setPatients(fetchedPatients);
        
        // Auto-select the latest patient if none is selected
        if (!selectedPatient && fetchedPatients.length > 0) {
          const latestPatient = fetchedPatients.find(p => p.latest) || fetchedPatients[0];
          onPatientChange(latestPatient);
        }
      } catch (error) {
        console.error('Failed to fetch patients:', error);
        showCrossPlatformAlert({
          title: 'Error',
          message: 'Failed to load patients. Please try again.'
        });
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
      await databaseAPI.setAsLatest(patient);
      
      // Update local state
      setPatients(prev => prev.map(p => ({ ...p, latest: p.uuid === patient.uuid })));
      onPatientChange(patient);
      onClose();
    } catch (error) {
      console.error('Failed to set patient as latest:', error);
      showCrossPlatformAlert({
        title: 'Error',
        message: 'Failed to update patient selection. Please try again.'
      });
    }
  };

  const handleNewPatient = async () => {
    if (!newPatientName.trim()) {
      showCrossPlatformAlert({
        title: 'Error',
        message: 'Please enter a patient name'
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
              
              // Create patient in database
              const newPatient = await databaseAPI.createPatient(newPatientName.trim());
              
              // Update local state
              setPatients(prev => [...prev.map(p => ({ ...p, latest: false })), newPatient]);
              setNewPatientName('');
              setShowNewPatientModal(false);
            } catch (error) {
              console.error('Failed to create patient:', error);
              showCrossPlatformAlert({
                title: 'Error',
                message: 'Failed to create new patient. Please try again.'
              });
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    });
  };

  const handleClearSelection = async () => {
    try {
      const defaultPatient = patients.find(p => p.latest) || patients[0];
      if (defaultPatient) {
        await handlePatientSelect(defaultPatient);
      }
    } catch (error) {
      console.error('Failed to reset selection:', error);
      showCrossPlatformAlert({
        title: 'Error',
        message: 'Failed to reset patient selection. Please try again.'
      });
    }
  };

  // load current schedule when drawer opens and device eligible
  const isIOS = Platform.OS === 'ios';
  const deviceEligible = isIOS && !!pushToken;  // no settings for web / unregistered device

  useEffect(() => {
    const load = async () => {
      if (!isVisible || !deviceEligible) return;
      try {
        setLoadingSchedule(true);
        const s = await databaseAPI.getSchedule();
        setSchedule(s);
      } catch (e) {
        console.error(e);
        showCrossPlatformAlert({ title: 'Error', message: 'Failed to load notification schedule.' });
      } finally {
        setLoadingSchedule(false);
      }
    };
    load();
  }, [isVisible, deviceEligible])

  // notification form handlers
  const handleCreateSchedule = async () => {
    // simple input checks
    const dur = parseInt(durationDays, 10);
    const cad = parseInt(cadenceMinutes, 10);
    if (!Number.isFinite(dur) || dur <= 0) {
      return showCrossPlatformAlert({ title: 'Invalid Input', message: 'Duration must be a positive integer (days).' });
    }
    if (!Number.isFinite(cad) || cad <= 0) {
      return showCrossPlatformAlert({ title: 'Invalid Input', message: 'Cadence must be a positive integer (minutes).' });
    }

    try {
      setCreating(true);
      // we send admin-local IOS; backend will convert using provided or default tz
      const adminTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      await databaseAPI.createSchedule({
        expo_push_token: pushToken,
        freq_minutes: cad,
        duration_days: dur,
        start_time_iso: startAt,
        admin_timezone: adminTz,
        active: true
      });
      const s = await databaseAPI.getSchedule();
      setSchedule(s);
      if (s == null) {
        throw new Error('Failed to create schedule.');
      }
      showCrossPlatformAlert({ title: 'Scheduled', message: 'Notification schedule created.' });
    } catch (e) {
      console.error(e);
      showCrossPlatformAlert({ title: 'Error', message: 'Failed to create schedule.' });
    } finally {
      setCreating(false);
      setShowCreateScheduleModal(false);
    }
  };

  const handleCancelSchedule = async () => {
    try {
      setCanceling(true);
      await databaseAPI.cancelSchedule();
      setSchedule(null);
      showCrossPlatformAlert({ title: 'Canceled', message: 'Notification schedule canceled.' });
    } catch (e) {
      console.error(e);
      showCrossPlatformAlert({ title: 'Error', message: 'Failed to cancel schedule.' });
    } finally {
      setCanceling(false);
    }
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
            
            <View className="mb-5 p-4 bg-medical-gray-light rounded-lg">
              <Text className="text-sm text-medical-text-secondary mb-1">Current Patient:</Text>
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
                  <TouchableOpacity
                    key={patient.uuid}
                    className={`flex-row justify-between items-center p-4 rounded-lg mb-2 ${
                      selectedPatient?.uuid === patient.uuid 
                        ? 'bg-primary-50 border border-primary-500' 
                        : 'bg-medical-gray-light'
                    }`}
                    onPress={() => handlePatientSelect(patient)}
                  >
                    <Text className="text-base text-medical-text-primary">{patient.emu_id}</Text>
                    {patient.latest && (
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
          {/* Notification Scheduling */}
          <View className="bg-white rounded-xl p-5 mb-5 shadow-sm">
            <Text className="text-lg font-bold mb-4 text-medical-text-primary">Notification Scheduling</Text>
            
            {!deviceEligible ? (
              <View className="p-4 bg-medical-gray-light rounded-lg">
                <Text className="text-medical-text-secondary">
                  Notifications are only available on iOS with a registered device. Open the app on your iPhone and ensure push permissions are granted.
                </Text>
              </View>
            ) : loadingSchedule ? (
              <View className="items-center py-6">
                <Text className="text-medical-text-secondary">Checking current schedule…</Text>
              </View>
            ) : schedule ? (
              // Active schedule view
              <View>
                <View className="mb-4 p-4 bg-medical-gray-light rounded-lg">
                  <Text className="text-sm text-medical-text-secondary mb-1">Status:</Text>
                  <Text className="text-base font-semibold text-medical-text-primary mb-2">Active</Text>

                  <Text className="text-sm text-medical-text-secondary mb-1">Starts (UTC):</Text>
                  <Text className="text-base text-medical-text-primary mb-2">
                    {schedule.start_time_iso.toLocaleString()}
                  </Text>

                  <Text className="text-sm text-medical-text-secondary mb-1">Duration:</Text>
                  <Text className="text-base text-medical-text-primary mb-2">
                    {schedule.duration_days} day(s)
                  </Text>

                  <Text className="text-sm text-medical-text-secondary mb-1">Cadence:</Text>
                  <Text className="text-base text-medical-text-primary">
                    Every {schedule.freq_minutes} minute(s)
                  </Text>
                </View>

                <TouchableOpacity
                  className="flex-row items-center justify-center p-4 bg-red-500 rounded-lg"
                  onPress={handleCancelSchedule}
                  disabled={canceling}
                >
                  <IconSymbol name="xmark.circle" size={20} color="white" />
                  <Text className="text-white text-base font-semibold ml-2">
                    {canceling ? 'Canceling…' : 'Cancel Schedule'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              // Create schedule form
              // When there's NO active schedule 
              <View>
                <TouchableOpacity
                  className="flex-row items-center justify-center p-4 bg-primary-500 rounded-lg"
                  onPress={() => setShowCreateScheduleModal(true)}
                  disabled={!deviceEligible}
                >
                  <IconSymbol name="bell" size={20} color="white" />
                  <Text className="text-white text-base font-semibold ml-2">Create Schedule</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
        {/* New Patient Modal */}
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
            className="bg-white rounded-2xl p-4">
            <ScrollView
              bounces={false}
              contentContainerStyle={{ paddingTop: 40, paddingBottom: 12, gap: 12 }}
              keyboardShouldPersistTaps="handled"
            >
              <TextInput
                className="border border-gray-300 rounded-lg p-3 text-base"
                placeholder="Enter patient name"
                value={newPatientName}
                onChangeText={setNewPatientName}
                autoFocus
                returnKeyType="done"
              />
              <View className="flex-row gap-3">
                <TouchableOpacity
                  className="flex-1 p-3 rounded-lg bg-medical-gray-light"
                  onPress={() => {
                    setNewPatientName('');
                    setShowNewPatientModal(false);
                  }}
                >
                  <Text className="text-medical-text-secondary text-center font-semibold">Cancel</Text>
                </TouchableOpacity>


                <TouchableOpacity
                  className="flex-1 p-3 rounded-lg bg-primary-500"
                  onPress={handleNewPatient}
                >
                  <Text className="text-white text-center font-semibold">Create</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </CrossPlatformModal>
        {/* Create Schedule Modal */}
        <CrossPlatformModal
          visible={showCreateScheduleModal}
          onClose={() => setShowCreateScheduleModal(false)}
          title="Create Notification Schedule"
          showCloseButton={true}
          animationType="fade"
          presentationStyle="formSheet"
        >
          <View
            style={{ width: '92%', maxWidth: 480, maxHeight: '80%', alignSelf: 'center' }}
            className="bg-white rounded-2xl p-4"
          >
            <ScrollView
              bounces={false}
              contentContainerStyle={{ paddingTop: 40, paddingBottom: 12, gap: 10 }}
              keyboardShouldPersistTaps="handled"
            >
              {/* Start datetime */}
              <View>
                <Text className="text-sm text-medical-text-secondary mb-1">Start (local time)</Text>
                {/* On iOS use compact; on Android default */}
                <View className="bg-medical-gray-light rounded-lg px-2 py-3">
                  <DateTimePicker
                    mode="datetime"
                    display={Platform.OS === 'ios' ? 'compact' : 'default'}
                    value={startAt}
                    onChange={(_, date) => { if (date) setStartAt(date); }}
                  />
                </View>
              </View>

              {/* Duration (days) */}
              <View>
                <Text className="text-sm text-medical-text-secondary mb-1">Duration (days)</Text>
                <TextInput
                  className="border border-gray-300 rounded-lg p-3 text-base"
                  keyboardType="number-pad"
                  value={durationDays}
                  onChangeText={setDurationDays}
                  placeholder="e.g., 7"
                  returnKeyType="done"
                />
              </View>

              {/* Cadence (minutes) */}
              <View>
                <Text className="text-sm text-medical-text-secondary mb-1">Cadence (minutes)</Text>
                <TextInput
                  className="border border-gray-300 rounded-lg p-3 text-base"
                  keyboardType="number-pad"
                  value={cadenceMinutes}
                  onChangeText={setCadenceMinutes}
                  placeholder="e.g., 60"
                  returnKeyType="done"
                />
              </View>

              {/* Actions */}
              <View className="flex-row gap-3 mt-2">
                <TouchableOpacity
                  className="flex-1 p-3 rounded-lg bg-medical-gray-light"
                  onPress={() => setShowCreateScheduleModal(false)}
                >
                  <Text className="text-medical-text-secondary text-center font-semibold">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 p-3 rounded-lg bg-primary-500"
                  onPress={handleCreateSchedule}
                  disabled={creating}
                >
                  <Text className="text-white text-center font-semibold">
                    {creating ? 'Scheduling…' : 'Create'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </CrossPlatformModal>
      </View>
    </CrossPlatformModal>
  );
}
