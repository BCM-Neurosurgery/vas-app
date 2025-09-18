// SIMPLE INTERVIEW MODAL FOR 2-SCALE RATING SYSTEM
// Replaces the complex 312-line InterviewDrawer with simple mood/energy sliders

import { showCrossPlatformAlert } from '@/components/CrossPlatformAlert';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { databaseAPI, SimpleInterview } from '@/utils/database';
import { getEnergyEmoji, getRatingDescription, getRatingEmoji, validateRatings } from '@/utils/simpleInterview';
import Slider from '@react-native-community/slider';
import { useState } from 'react';
import { Modal, TouchableOpacity, View } from 'react-native';

interface SimpleInterviewModalProps {
  patientId: number;
  isVisible: boolean;
  onClose: () => void;
  onSave?: (interview: SimpleInterview) => void;
}

export default function SimpleInterviewModal({ 
  patientId, 
  isVisible, 
  onClose, 
  onSave 
}: SimpleInterviewModalProps) {
  const [moodRating, setMoodRating] = useState(4); // Default to middle (4)
  const [energyRating, setEnergyRating] = useState(4); // Default to middle (4)
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!validateRatings(moodRating, energyRating)) {
      showCrossPlatformAlert({
        title: 'Invalid Ratings',
        message: 'Please ensure both mood and energy ratings are between 1 and 7.'
      });
      return;
    }

    setIsLoading(true);
    try {
      const newInterview = await databaseAPI.saveSimpleInterview({
        patient_id: patientId,
        mood_rating: moodRating,
        energy_rating: energyRating,
        status: 'completed'
      });

      // Call onSave callback and close modal immediately
      onSave?.(newInterview);
      handleClose();
      
      // Show success message after closing
      showCrossPlatformAlert({
        title: 'Interview Saved! 🎉',
        message: `Your mood: ${getRatingDescription(moodRating)} (${moodRating}/7)\nYour energy: ${getRatingDescription(energyRating)} (${energyRating}/7)`,
        buttons: [{ text: 'Great!' }]
      });
    } catch (error) {
      console.error('Error saving interview:', error);
      showCrossPlatformAlert({
        title: 'Error',
        message: 'Failed to save your ratings. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    // Reset to default values
    setMoodRating(4);
    setEnergyRating(4);
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
      
      <View className="flex-row justify-between mt-2">
        <ThemedText className="text-xs text-gray-500">1 - Very Low</ThemedText>
        <ThemedText className="text-xs text-gray-500">7 - Very High</ThemedText>
      </View>
    </View>
  );

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
            <ThemedText className="text-xl font-bold ml-2">Daily Check-in</ThemedText>
          </View>
          <TouchableOpacity onPress={handleClose} className="p-2">
            <IconSymbol name="xmark" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View className="flex-1 px-6 py-8">
          <View className="mb-6">
            <ThemedText className="text-lg text-gray-700 dark:text-gray-300 text-center mb-2">
              How are you feeling today?
            </ThemedText>
            <ThemedText className="text-sm text-gray-500 dark:text-gray-400 text-center">
              Rate your current mood and energy level on a scale of 1-7
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

          {/* Save Button */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={isLoading}
            className={`p-4 rounded-xl ${
              isLoading
                ? 'bg-gray-400'
                : 'bg-blue-500 active:bg-blue-600'
            }`}
          >
            <ThemedText className="text-white font-semibold text-center text-lg">
              {isLoading ? 'Saving...' : 'Save My Ratings'}
            </ThemedText>
          </TouchableOpacity>

          {/* Quick Info */}
          <View className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <ThemedText className="text-sm text-blue-700 dark:text-blue-300 text-center">
              💡 This helps us track your daily well-being and identify patterns over time.
            </ThemedText>
          </View>
        </View>
      </ThemedView>
    </Modal>
  );
}
