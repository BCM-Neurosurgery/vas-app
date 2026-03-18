// SIMPLIFIED INTERVIEW LIST FOR 2-SCALE RATING SYSTEM
// Much simpler than the complex 212-line InterviewList

import { useFocusEffect } from '@react-navigation/native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { usePatient } from '@/contexts/PatientContext';
import { databaseAPI } from '@/db/api';
import { Patient, SimpleInterview } from '@/db/types';
import { getEnergyEmoji, getPainEmoji, getRatingDescription, getRatingEmoji } from '@/utils/simpleInterview';
import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { showCrossPlatformAlert } from './CrossPlatformAlert';
import CrossPlatformModal from './CrossPlatformModal';
import SettingsPasswordModal from './SettingsPasswordModal';

const ADMIN_PASSWORD = process.env.EXPO_PUBLIC_SETTINGS_PASSWORD;

type PendingProtectedAction =
  | { type: 'delete'; interview: SimpleInterview }
  | { type: 'move'; interview: SimpleInterview; targetPatient: Patient };

interface SimpleInterviewListProps {
  patient: Patient;
  onInterviewSelect?: (interview: SimpleInterview) => void;
}

export default function SimpleInterviewList({ patient, onInterviewSelect }: SimpleInterviewListProps) {
  const [interviews, setInterviews] = useState<SimpleInterview[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [movingInterview, setMovingInterview] = useState<SimpleInterview | null>(null);
  const [isApplyingAction, setIsApplyingAction] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [pendingProtectedAction, setPendingProtectedAction] = useState<PendingProtectedAction | null>(null);

  // Fetch interviews from database
  useEffect(() => {
    const fetchInterviews = async () => {
      setIsLoading(true);
      try {
        const fetchedInterviews = await databaseAPI.getSimpleInterviews(patient);
        setInterviews(fetchedInterviews);
      } catch (error) {
        console.error('Failed to fetch interviews:', error);
        showCrossPlatformAlert({
          title: 'Error',
          message: 'Failed to load interviews. Please try again.'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchInterviews();
  }, [patient, refreshTrigger]);

  // Listen for refresh events from context
  const { patients, refreshInterviews } = usePatient();
  useEffect(() => {
    // Increment refresh trigger when refreshInterviews changes
    setRefreshTrigger(prev => prev + 1);
  }, [refreshInterviews]);

  useFocusEffect(
    useCallback(() => {
      setRefreshTrigger((prev) => prev + 1);
    }, [])
  );

  const availableMoveTargets = patients.filter((candidate) => candidate.uuid !== patient.uuid);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleInterviewPress = (interview: SimpleInterview) => {
    if (onInterviewSelect) {
      onInterviewSelect(interview);
    } else {
      showCrossPlatformAlert({
        title: 'Daily Check-in',
        message: `${formatDate(interview.timestamp_start)} at ${formatTime(interview.timestamp_save)}\n\nMood: ${getRatingDescription(interview.mood_rating)} (${interview.mood_rating}/7) ${getRatingEmoji(interview.mood_rating)}\nEnergy: ${getRatingDescription(interview.energy_rating)} (${interview.energy_rating}/7) ${getEnergyEmoji(interview.energy_rating)}`
      });
    }
  };

  const getMoodColor = (rating: number) => {
    if (rating <= 2) return '#EF4444'; // Red
    if (rating <= 3) return '#F59E0B'; // Orange
    if (rating <= 4) return '#F59E0B'; // Yellow
    if (rating <= 5) return '#10B981'; // Green
    return '#059669'; // Dark green
  };

  const getEnergyColor = (rating: number) => {
    if (rating <= 2) return '#6B7280'; // Gray
    if (rating <= 3) return '#F59E0B'; // Orange
    if (rating <= 4) return '#F59E0B'; // Yellow
    if (rating <= 5) return '#3B82F6'; // Blue
    return '#8B5CF6'; // Purple
  };

  const getPainColor = (rating: number) => {
    if (rating <= 2) return '#2EC965'; // Green
    if (rating <= 3) return '#F2EF3A'; // Yellow
    if (rating <= 4) return '#DE3333'; // Red
    if (rating <= 5) return '#290404'; // Maroon
    return '#171717'; // Black
  };

  const executeProtectedAction = async (action: PendingProtectedAction) => {
    try {
      setIsApplyingAction(true);

      if (action.type === 'delete') {
        await databaseAPI.deleteSimpleInterview(action.interview);
      } else {
        await databaseAPI.moveSimpleInterview(action.interview, action.targetPatient.uuid);
        showCrossPlatformAlert({
          title: 'Check-in Moved',
          message: `This check-in now belongs to ${action.targetPatient.emu_id}.`,
        });
      }

      refreshInterviews();
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error(`Failed to ${action.type} interview:`, error);
      showCrossPlatformAlert({
        title: 'Error',
        message: action.type === 'delete'
          ? 'Failed to delete check-in. Please try again.'
          : 'Failed to move check-in. Please try again.',
      });
    } finally {
      setIsApplyingAction(false);
    }
  };

  const requestProtectedAction = (action: PendingProtectedAction) => {
    if (!ADMIN_PASSWORD) {
      void executeProtectedAction(action);
      return;
    }

    setPendingProtectedAction(action);
    setShowPasswordPrompt(true);
  };

  const handleDeleteInterview = (interview: SimpleInterview) => {
    showCrossPlatformAlert({
      title: 'Delete Check-in',
      message: 'This check-in will be removed locally and deleted from the server the next time sync succeeds.',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            requestProtectedAction({ type: 'delete', interview });
          },
        },
      ],
    });
  };

  const handleMoveInterview = (targetPatient: Patient) => {
    if (!movingInterview) return;
    const interview = movingInterview;
    setMovingInterview(null);
    requestProtectedAction({ type: 'move', interview, targetPatient });
  };

  const renderInterviewItem = ({ item }: { item: SimpleInterview }) => (
    <View className="bg-white rounded-xl p-5 mb-4 shadow-sm border border-gray-100">
      <TouchableOpacity onPress={() => handleInterviewPress(item)}>
      {/* Header with date and time */}
      <View className="flex-row justify-between items-center mb-4">
        <View className="flex-1">
          <Text className="text-base font-semibold text-medical-text-primary">
            {formatDate(item.timestamp_start)}
          </Text>
          <Text className="text-sm text-medical-text-secondary mt-1">
            {`start: ${formatTime(item.timestamp_start)}\n`}
            {`end: ${formatTime(item.timestamp_save)}`}
          </Text>
        </View>
        <View className="flex-row items-center">
          <IconSymbol
            name="checkmark.circle.fill"
            size={16}
            color="#10B981"
          />
          <Text className="text-xs font-semibold ml-1 text-green-600">
            Completed
          </Text>
        </View>
      </View>

      {/* Ratings */}
      <View className="flex-row justify-between">
        {/* Mood Rating */}
        <View className="flex-1 mr-3">
          <View className="flex-row items-center mb-2">
            <Text className="text-lg mr-2">{getRatingEmoji(item.mood_rating)}</Text>
            <Text className="text-sm font-medium text-gray-700">Mood</Text>
          </View>
          <View className="flex-row items-center">
            <View 
              className="w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: getMoodColor(item.mood_rating) }}
            />
            <Text className="text-lg font-bold" style={{ color: getMoodColor(item.mood_rating) }}>
              {item.mood_rating}/7
            </Text>
            <Text className="text-sm text-gray-500 ml-2">
              {getRatingDescription(item.mood_rating)}
            </Text>
          </View>
        </View>

        {/* Energy Rating */}
        <View className="flex-1 ml-3">
          <View className="flex-row items-center mb-2">
            <Text className="text-lg mr-2">{getEnergyEmoji(item.energy_rating)}</Text>
            <Text className="text-sm font-medium text-gray-700">Energy</Text>
          </View>
          <View className="flex-row items-center">
            <View 
              className="w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: getEnergyColor(item.energy_rating) }}
            />
            <Text className="text-lg font-bold" style={{ color: getEnergyColor(item.energy_rating) }}>
              {item.energy_rating}/7
            </Text>
            <Text className="text-sm text-gray-500 ml-2">
              {getRatingDescription(item.energy_rating)}
            </Text>
          </View>
        </View>

        {/* Pain Rating */}
        <View className="flex-1 ml-3">
          <View className="flex-row items-center mb-2">
            <Text className="text-lg mr-2">{getPainEmoji(item.pain_rating)}</Text>
            <Text className="text-sm font-medium text-gray-700">Pain</Text>
          </View>
          <View className="flex-row items-center">
            <View 
              className="w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: getPainColor(item.pain_rating) }}
            />
            <Text className="text-lg font-bold" style={{ color: getPainColor(item.pain_rating) }}>
              {item.pain_rating}/7
            </Text>
            <Text className="text-sm text-gray-500 ml-2">
              {getRatingDescription(item.pain_rating)}
            </Text>
          </View>
        </View>
      </View>

        
      {/* Tap indicator */}
      <View className="absolute right-5 top-1/2 -mt-2">
        <IconSymbol name="chevron.right" size={16} color="#007AFF" />
      </View>
      </TouchableOpacity>

      <View className="mt-4 flex-row justify-end gap-3 border-t border-gray-100 pt-4">
        {availableMoveTargets.length > 0 && (
          <TouchableOpacity
            className="rounded-lg bg-blue-50 px-4 py-2"
            onPress={() => setMovingInterview(item)}
            disabled={isApplyingAction}
          >
            <Text className="font-semibold text-blue-700">Move</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          className="rounded-lg bg-red-50 px-4 py-2"
          onPress={() => handleDeleteInterview(item)}
          disabled={isApplyingAction}
        >
          <Text className="font-semibold text-red-700">Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View className="flex-1 justify-center items-center py-15">
      <IconSymbol name="heart" size={48} color="#ccc" />
      <Text className="text-lg font-semibold text-medical-text-secondary mt-4 mb-2">
        No Check-ins Yet
      </Text>
      <Text className="text-sm text-medical-text-muted text-center px-10">
        Your daily mood and energy check-ins will appear here once completed.
      </Text>
    </View>
  );

  return (
    <View className="flex-1 bg-medical-gray">
      <View className="p-5 bg-white border-b border-medical-gray-medium">
        <Text className="text-2xl font-bold text-medical-text-primary mb-1">
          Daily Check-ins
        </Text>
        <Text className="text-sm text-medical-text-secondary">
          Track your mood and energy over time
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-medical-text-secondary">Loading check-ins...</Text>
        </View>
      ) : (
        <FlatList
          data={interviews}
          renderItem={renderInterviewItem}
          keyExtractor={(item) => item.uuid}
          contentContainerStyle={{ padding: 20 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
        />
      )}

      <CrossPlatformModal
        visible={movingInterview !== null}
        onClose={() => setMovingInterview(null)}
        title="Move Check-in"
        presentationStyle="formSheet"
      >
        <View
          style={{ width: '92%', maxWidth: 520, maxHeight: '80%', alignSelf: 'center' }}
          className="rounded-2xl bg-white"
        >
          <ScrollView
            bounces={false}
            contentContainerStyle={{ paddingTop: 12, paddingBottom: 12 }}
            showsVerticalScrollIndicator={false}
          >
            <View className="mx-1 mb-4 rounded-2xl bg-sky-50 p-4">
              <Text className="text-xs font-semibold uppercase tracking-widest text-sky-700">
                Move Destination
              </Text>
              <Text className="mt-2 text-base font-semibold text-medical-text-primary">
                Choose the patient who should own this check-in.
              </Text>
              {movingInterview && (
                <Text className="mt-2 text-sm leading-5 text-medical-text-secondary">
                  {formatDate(movingInterview.timestamp_start)} at {formatTime(movingInterview.timestamp_save)}
                </Text>
              )}
            </View>

            <View className="gap-3">
              {availableMoveTargets.map((target) => (
                <TouchableOpacity
                  key={target.uuid}
                  className="rounded-2xl border border-gray-200 bg-white px-4 py-4"
                  onPress={() => handleMoveInterview(target)}
                  disabled={isApplyingAction}
                >
                  <View className="flex-row items-center justify-between">
                    <View>
                      <Text className="text-base font-semibold text-medical-text-primary">{target.emu_id}</Text>
                      <Text className="mt-1 text-sm text-medical-text-secondary">
                        Move this check-in to this patient
                      </Text>
                    </View>
                    <View className="rounded-full bg-sky-100 px-3 py-1">
                      <Text className="text-xs font-semibold text-sky-700">Select</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              className="mt-4 items-center rounded-xl bg-medical-gray-light p-3"
              onPress={() => setMovingInterview(null)}
              disabled={isApplyingAction}
            >
              <Text className="text-sm font-semibold text-medical-text-secondary">Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </CrossPlatformModal>

      <SettingsPasswordModal
        visible={showPasswordPrompt}
        onCancel={() => {
          setShowPasswordPrompt(false);
          setPendingProtectedAction(null);
        }}
        onSuccess={() => {
          const action = pendingProtectedAction;
          setShowPasswordPrompt(false);
          setPendingProtectedAction(null);
          if (action) {
            void executeProtectedAction(action);
          }
        }}
        adminPassword={ADMIN_PASSWORD}
        title="Admin Approval"
        message="Enter the admin password to confirm this interview change."
        submitLabel="Confirm"
      />
    </View>
  );
}
