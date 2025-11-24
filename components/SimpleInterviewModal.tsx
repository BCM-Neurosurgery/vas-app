// SIMPLE INTERVIEW MODAL FOR 2-SCALE RATING SYSTEM
// Replaces the complex 312-line InterviewDrawer with simple mood/energy sliders

import { showCrossPlatformAlert } from '@/components/CrossPlatformAlert';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { databaseAPI, SimpleInterview } from '@/utils/database';
import { getEnergyEmoji, getPainEmoji, getRatingDescription, getRatingEmoji, validateRatings } from '@/utils/simpleInterview';
import Slider from '@react-native-community/slider';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';

interface SimpleInterviewModalProps {
  patientId: number;
  startTime: Date;
  isVisible: boolean;
  taskName: string;
  onClose: () => void;
  onSave?: (interview: SimpleInterview) => void;
}

type Mode = 'rating' | 'timer';

export default function SimpleInterviewModal({ 
  patientId, 
  startTime,
  isVisible, 
  taskName,
  onClose, 
  onSave 
}: SimpleInterviewModalProps) {
  const [moodRating, setMoodRating] = useState(4); // Default to middle (4)
  const [energyRating, setEnergyRating] = useState(4); // Default to middle (4)
  const [painRating, setPainRating] = useState(4); // Default to middle (4)

  const [isSaving, setIsSaving] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const isBusy = isSaving || isClosing;

  // mode + timer state
  const [mode, setMode] = useState<Mode>('rating');
  const [remainingSeconds, setRemainingSeconds] = useState(180); // 3 minutes
  const timerRef = useRef<number | null>(null);

  // Reset state whenever modal opens
  useEffect(() => {
    if (isVisible) {
      setMode('rating');
      setRemainingSeconds(180);
      setMoodRating(4);
      setEnergyRating(4);
      setPainRating(4);
      setIsSaving(false);
      setIsClosing(false);
    } else {
      // ensure timer is cleared on close
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isVisible]);

  // Timer effect for "timer" mode
  useEffect(() => {
    if (!isVisible || mode !== 'timer') return;
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          // ⏱️ Auto-save at zero (guarded by isSaving)
          handleConfirmSave();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isVisible, mode]);

  const handleGoToTimer = useCallback(() => {
    if (isBusy) return;
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
  }, [isBusy, moodRating, energyRating, painRating]);

  const handleConfirmSave = useCallback(async () => {
    if (isSaving || isClosing) return;
    setIsSaving(true);
    try {
      const newInterview = await databaseAPI.saveSimpleInterview({
        patient_id: patientId,
        mood_rating: moodRating,
        energy_rating: energyRating,
        pain_rating: painRating,
        task_name: taskName,
        timestamp_start: startTime,
        status: 'completed'
      });

      onSave?.(newInterview);

      // Lock UI and close modal; don't reset local state here (avoids flicker)
      setIsClosing(true);
      await Promise.resolve(onClose());
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
      setIsSaving(false); // allow retry
      showCrossPlatformAlert({
        title: 'Error',
        message: 'Failed to save your ratings. Please try again.'
      });
    } 
  }, [isSaving, isClosing, patientId, taskName, moodRating, energyRating, painRating, startTime, onSave, onClose]);

  const handleCancelInterview = useCallback(async () => {
    if (isBusy) return;
    setIsClosing(true);
    try {
      // just close; reset happens automatically next open
      await Promise.resolve(onClose());
    } finally {
      // if parent for some reason keeps it open, re-enable after a short grace
      setTimeout(() => setIsClosing(false), 1000);
    }
  }, [isBusy, onClose]);

  const handleRequestClose = useCallback(() => {
    // Android back button -> treat as cancel
    handleCancelInterview();
  }, [handleCancelInterview]);

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
    const minutes = Math.floor(remainingSeconds / 60).toString().padStart(2, '0');
    const seconds = (remainingSeconds % 60).toString().padStart(2, '0');

    return (
      <View className="flex-1 px-6 py-8" pointerEvents={isBusy ? 'none' : 'auto'}>
        <View className="mb-6 items-center">
          <ThemedText className="text-lg text-gray-700 dark:text-gray-300 text-center mb-2">
            Interview in progress
          </ThemedText>
          <ThemedText className="text-sm text-gray-500 dark:text-gray-400 text-center mb-4">
            Neural recording is ongoing. When you’re ready, tap “Save Interview” to mark the end time.
          </ThemedText>

          <View className="mt-4 mb-6 items-center">
            <ThemedText className="text-sm text-gray-500 mb-1">Time remaining (target):</ThemedText>
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
            disabled={isBusy}
            activeOpacity={isBusy ? 1 : 0.7}
            className={`p-4 rounded-xl mb-3 ${isBusy ? 'bg-gray-400' : 'bg-blue-500 active:bg-blue-600'}`}
          >
            <ThemedText className="text-white font-semibold text-center text-lg">
              {isSaving ? 'Saving…' : 'Save Interview Now'}
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleCancelInterview}
            disabled={isBusy}
            activeOpacity={isBusy ? 1 : 0.7}
            className="p-4 rounded-xl border border-red-400"
          >
            <ThemedText className={`font-semibold text-center text-lg ${isBusy ? 'text-gray-400' : 'text-red-500'}`}>
              {isClosing ? 'Closing…' : 'Cancel Interview'}
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
      onRequestClose={handleRequestClose}
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
          <TouchableOpacity onPress={handleCancelInterview} disabled={isBusy} activeOpacity={isBusy ? 1 : 0.6} className="p-2">
            <IconSymbol name="xmark" size={20} color={isBusy ? '#D1D5DB' : '#6B7280'} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View className="flex-1">
          {mode === 'rating' ? (
            <View className="flex-1 px-6 py-8" pointerEvents={isBusy ? 'none' : 'auto'}>
              <View className="mb-6">
                <ThemedText className="text-lg text-gray-700 dark:text-gray-300 text-center mb-2">
                  How are you feeling today?
                </ThemedText>
                <ThemedText className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  Rate your current mood, energy, and pain on a scale of 1–7
                </ThemedText>
              </View>

              {renderRatingSlider('Mood', getRatingEmoji(moodRating), moodRating, setMoodRating, '#3B82F6')}
              {renderRatingSlider('Energy', getEnergyEmoji(energyRating), energyRating, setEnergyRating, '#F59E0B')}
              {renderRatingSlider('Pain', getPainEmoji(painRating), painRating, setPainRating, '#E02402')}

              <TouchableOpacity
                onPress={handleGoToTimer}
                disabled={isBusy}
                activeOpacity={isBusy ? 1 : 0.7}
                className={`p-4 rounded-xl ${isBusy ? 'bg-gray-400' : 'bg-blue-500 active:bg-blue-600'}`}
              >
                <ThemedText className="text-white font-semibold text-center text-lg">
                  {isBusy ? 'Please wait…' : 'Continue to Timer'}
                </ThemedText>
              </TouchableOpacity>

              <View className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <ThemedText className="text-sm text-blue-700 dark:text-blue-300 text-center">
                  💡 After this step, you’ll see a short timer to align with neural recording before saving the interview.
                </ThemedText>
              </View>
            </View>
          ) : (
            renderTimerContent()
          )}

          {/* Busy overlay (blocks taps + shows spinner) */}
          {isBusy && (
            <View style={StyleSheet.absoluteFillObject} className="items-center justify-center bg-black/20">
              <View className="px-5 py-4 rounded-xl bg-white dark:bg-gray-900">
                <ActivityIndicator size="small" />
                <ThemedText className="mt-2 font-semibold text-center">
                  {isSaving ? 'Saving…' : 'Closing…'}
                </ThemedText>
              </View>
            </View>
          )}
        </View>
      </ThemedView>
    </Modal>
  );
}
