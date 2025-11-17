// SIMPLE INTERVIEW MODAL FOR 2-SCALE RATING SYSTEM
// Replaces the complex 312-line InterviewDrawer with simple mood/energy sliders

import { showCrossPlatformAlert } from '@/components/CrossPlatformAlert';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { databaseAPI, SimpleInterview } from '@/utils/database';
import { getEnergyEmoji, getPainEmoji, getRatingDescription, getRatingEmoji, validateRatings } from '@/utils/simpleInterview';
import Slider from '@react-native-community/slider';
import { useEffect, useState } from 'react';
import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native';

interface SimpleInterviewModalProps {
  patientId: number;
  startTime: Date;
  isVisible: boolean;
  onClose: () => void;
  onSave?: (interview: SimpleInterview) => void;
}

type Mode = 'rating' | 'timer';

export default function SimpleInterviewModal({ 
  patientId, 
  startTime,
  isVisible, 
  onClose, 
  onSave 
}: SimpleInterviewModalProps) {
  const [moodRating, setMoodRating] = useState(4); // Default to middle (4)
  const [energyRating, setEnergyRating] = useState(4); // Default to middle (4)
  const [painRating, setPainRating] = useState(4); // Default to middle (4)
  const [isSaving, setIsSaving] = useState(false);

  // mode + timer state
  const [mode, setMode] = useState<Mode>('rating');
  const [remainingSeconds, setRemainingSeconds] = useState(180); // 3 minutes

  // Reset state whenever modal opens
  useEffect(() => {
    if (isVisible) {
      setMode('rating');
      setRemainingSeconds(180);
      setMoodRating(4);
      setEnergyRating(4);
      setPainRating(4);
      setIsSaving(false);
    }
  }, [isVisible]);

  // Timer effect for "timer" mode
  useEffect(() => {
    if (!isVisible || mode !== 'timer') return;

    const interval = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          // ⏱️ Auto-save at zero
          handleConfirmSave();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isVisible, mode]);

  const handleGoToTimer = () => {
    if (!validateRatings(moodRating, energyRating, painRating)) {
      showCrossPlatformAlert({
        title: 'Invalid Ratings',
        message: 'Please ensure mood, energy, and pain ratings are between 1 and 7.'
      });
      return;
    }

    // Switch to timer screen
    setMode('timer');
    setRemainingSeconds(180);
  };

  const handleConfirmSave = async () => {
    if (isSaving) return;

    setIsSaving(true);
    try {
      const endTime = new Date(); // end timestamp = when user confirms save

      const newInterview = await databaseAPI.saveSimpleInterview({
        patient_id: patientId,
        mood_rating: moodRating,
        energy_rating: energyRating,
        pain_rating: painRating,
        timestamp_start: startTime,
        status: 'completed'
      });

      onSave?.(newInterview);
      handleCloseInternal();

      showCrossPlatformAlert({
        title: 'Interview Saved! 🎉',
        message:
          `Your mood: ${getRatingDescription(moodRating)} (${moodRating}/7)\n` +
          `Your energy: ${getRatingDescription(energyRating)} (${energyRating}/7)\n` +
          `Your pain: ${getRatingDescription(painRating)} (${painRating}/7)\n`,
        buttons: [{ text: 'Great!' }]
      });
    } catch (error) {
      console.error('Error saving interview:', error);
      showCrossPlatformAlert({
        title: 'Error',
        message: 'Failed to save your ratings. Please try again.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelInterview = () => {
    // Optional: ask "Are you sure?" here; for now, just close & reset
    handleCloseInternal();
  };

  const handleCloseInternal = () => {
    setMoodRating(4);
    setEnergyRating(4);
    setPainRating(4);
    setMode('rating');
    setRemainingSeconds(180);
    onClose();
  };

  const renderRatingSlider = (
    title: string,
    emoji: string,
    value: number,
    onValueChange: (value: number) => void,
    color: string
  ) => (
    <View className="mb-8">
      <View className="flex-row items-center mb-4">
        <ThemedText className="text-2xl mr-3">{emoji}</ThemedText>
        <View className="flex-1">
          <ThemedText className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </ThemedText>
          <ThemedText className="text-sm text-gray-600 dark:text-gray-400">
            {getRatingDescription(value)} ({value}/7)
          </ThemedText>
        </View>
        <ThemedText className="text-3xl font-bold" style={{ color }}>
          {value}
        </ThemedText>
      </View>
      
      <View className="relative" style={{ width: '100%', height: 40 }}>
        {/* Center tick overlay */}
        <View 
          pointerEvents="none" 
          style={StyleSheet.absoluteFillObject} 
          className="items-center justify-center"
        >
          <View
            style={{ width: 2, height: 50, borderRadius: 1 }}
            className="bg-gray-300 dark:bg-gray-600"
          />
        </View>
        <Slider
          style={{ width: '100%', height: 40 }}
          minimumValue={1}
          maximumValue={7}
          step={1}
          value={value}
          onValueChange={onValueChange}
          minimumTrackTintColor={color}
          maximumTrackTintColor="#E5E7EB"
          thumbTintColor={color}
        />
      </View>
      
      <View className="flex-row justify-between mt-2">
        <ThemedText className="text-xs text-gray-500">1 - Very Low</ThemedText>
        <ThemedText className="text-xs text-gray-500">7 - Very High</ThemedText>
      </View>
    </View>
  );

  const renderTimerContent = () => {
    const minutes = Math.floor(remainingSeconds / 60)
      .toString()
      .padStart(2, '0');
    const seconds = (remainingSeconds % 60)
      .toString()
      .padStart(2, '0');

    return (
      <View className="flex-1 px-6 py-8">
        <View className="mb-6 items-center">
          <ThemedText className="text-lg text-gray-700 dark:text-gray-300 text-center mb-2">
            Interview in progress
          </ThemedText>
          <ThemedText className="text-sm text-gray-500 dark:text-gray-400 text-center mb-4">
            Neural recording is ongoing. When you’re ready, tap “Save Interview” to mark the end time.
          </ThemedText>

          <View className="mt-4 mb-6 items-center">
            <ThemedText className="text-sm text-gray-500 mb-1">
              Time remaining (target):
            </ThemedText>
            <ThemedText className="text-5xl font-mono font-bold text-blue-600">
              {minutes}:{seconds}
            </ThemedText>
          </View>
        </View>

        {/* Ratings summary */}
        <View className="mb-8 space-y-3">
          <View className="flex-row justify-between items-center mb-3">
            <ThemedText className="text-base font-semibold text-gray-700">Mood</ThemedText>
            <ThemedText className="text-base">
              {getRatingEmoji(moodRating)} {moodRating}/7 · {getRatingDescription(moodRating)}
            </ThemedText>
          </View>
          <View className="flex-row justify-between items-center mb-3">
            <ThemedText className="text-base font-semibold text-gray-700">Energy</ThemedText>
            <ThemedText className="text-base">
              {getEnergyEmoji(energyRating)} {energyRating}/7 · {getRatingDescription(energyRating)}
            </ThemedText>
          </View>
          <View className="flex-row justify-between items-center">
            <ThemedText className="text-base font-semibold text-gray-700">Pain</ThemedText>
            <ThemedText className="text-base">
              {getPainEmoji(painRating)} {painRating}/7 · {getRatingDescription(painRating)}
            </ThemedText>
          </View>
        </View>

        {/* Buttons */}
        <View className="mt-auto">
          <TouchableOpacity
            onPress={handleConfirmSave}
            disabled={isSaving}
            className={`p-4 rounded-xl mb-3 ${
              isSaving ? 'bg-gray-400' : 'bg-blue-500 active:bg-blue-600'
            }`}
          >
            <ThemedText className="text-white font-semibold text-center text-lg">
              {isSaving ? 'Saving...' : 'Save Interview Now'}
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleCancelInterview}
            disabled={isSaving}
            className="p-4 rounded-xl border border-red-400"
          >
            <ThemedText className="text-red-500 font-semibold text-center text-lg">
              Cancel Interview
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <ThemedView className="flex-1">
        {/* Header */}
        <View className="flex-row items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <View className="flex-row items-center">
            <IconSymbol name="heart.fill" size={24} color="#EF4444" />
            <ThemedText className="text-xl font-bold ml-2">
              {mode === 'rating' ? 'Daily Check-in' : 'Interview Timer'}
            </ThemedText>
          </View>
          <TouchableOpacity onPress={handleCancelInterview} className="p-2">
            <IconSymbol name="xmark" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        {mode === 'rating' ? (
          <View className="flex-1 px-6 py-8">
            <View className="mb-6">
              <ThemedText className="text-lg text-gray-700 dark:text-gray-300 text-center mb-2">
                How are you feeling today?
              </ThemedText>
              <ThemedText className="text-sm text-gray-500 dark:text-gray-400 text-center">
                Rate your current mood, energy, and pain on a scale of 1–7
              </ThemedText>
            </View>

            {/* Mood Rating */}
            {renderRatingSlider(
              'Mood',
              getRatingEmoji(moodRating),
              moodRating,
              setMoodRating,
              '#3B82F6'
            )}

            {/* Energy Rating */}
            {renderRatingSlider(
              'Energy',
              getEnergyEmoji(energyRating),
              energyRating,
              setEnergyRating,
              '#F59E0B'
            )}

            {/* Pain Rating */}
            {renderRatingSlider(
              'Pain',
              getPainEmoji(painRating),
              painRating,
              setPainRating,
              '#E02402'
            )}

            {/* Continue to Timer Button */}
            <TouchableOpacity
              onPress={handleGoToTimer}
              className="p-4 rounded-xl bg-blue-500 active:bg-blue-600"
            >
              <ThemedText className="text-white font-semibold text-center text-lg">
                Continue to Timer
              </ThemedText>
            </TouchableOpacity>

            {/* Quick Info */}
            <View className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <ThemedText className="text-sm text-blue-700 dark:text-blue-300 text-center">
                💡 After this step, you’ll see a short timer to align with neural recording before saving the interview.
              </ThemedText>
            </View>
          </View>
        ) : (
          renderTimerContent()
        )}
      </ThemedView>
    </Modal>
  );
}
