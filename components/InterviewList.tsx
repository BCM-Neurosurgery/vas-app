import { IconSymbol } from '@/components/ui/IconSymbol';
import { databaseAPI, Interview, Patient } from '@/utils/database';
import { useEffect, useState } from 'react';
import {
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { showCrossPlatformAlert } from './CrossPlatformAlert';

interface InterviewListProps {
  patient: Patient;
  onInterviewSelect: (interview: Interview) => void;
}

export default function InterviewList({ patient, onInterviewSelect }: InterviewListProps) {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch interviews from database
  useEffect(() => {
    const fetchInterviews = async () => {
      setIsLoading(true);
      try {
        const fetchedInterviews = await databaseAPI.getInterviews(patient);
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
  }, [patient]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#34C759';
      case 'terminated': return '#FF3B30';
      case 'in_progress': return '#FF9500';
      default: return '#666';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'terminated': return 'Terminated';
      case 'in_progress': return 'In Progress';
      default: return 'Unknown';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return 'checkmark.circle.fill';
      case 'terminated': return 'xmark.circle.fill';
      case 'in_progress': return 'clock.fill';
      default: return 'questionmark.circle.fill';
    }
  };

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

  const calculateDuration = (startTime: Date, endTime?: Date) => {
    if (!endTime) return 'In Progress';
    
    const durationMs = endTime.getTime() - startTime.getTime();
    const minutes = Math.floor(durationMs / (1000 * 60));
    
    if (minutes < 60) {
      return `${minutes} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours}h ${remainingMinutes}m`;
    }
  };

  const handleInterviewPress = (interview: Interview) => {
    if (interview.status === 'completed') {
      onInterviewSelect(interview);
    } else {
      showCrossPlatformAlert({
        title: 'Interview Not Complete',
        message: 'This interview was not completed and cannot be viewed.'
      });
    }
  };

  const renderInterviewItem = ({ item }: { item: Interview }) => (
    <TouchableOpacity
      className="bg-white rounded-xl p-5 mb-4 shadow-sm"
      onPress={() => handleInterviewPress(item)}
    >
      <View className="flex-row justify-between items-center mb-3">
        <View className="flex-1">
          <Text className="text-base font-semibold text-medical-text-primary">
            {formatDate(item.start_time)}
          </Text>
          <Text className="text-sm text-medical-text-secondary mt-1">
            {formatTime(item.start_time)}
          </Text>
        </View>
        <View className="flex-row items-center">
          <IconSymbol
            name={getStatusIcon(item.status)}
            size={16}
            color={getStatusColor(item.status)}
          />
          <Text 
            className="text-xs font-semibold ml-1"
            style={{ color: getStatusColor(item.status) }}
          >
            {getStatusText(item.status)}
          </Text>
        </View>
      </View>

      <View className="mb-3">
        <Text className="text-base font-medium text-medical-text-primary mb-1">
          {item.survey_type}
        </Text>
        <Text className="text-sm text-medical-text-secondary">
          Duration: {calculateDuration(item.start_time, item.end_time)}
        </Text>
      </View>

      {/* Show additional details for completed interviews */}
      {item.status === 'completed' && item.diagnosis && (
        <View className="mb-3 p-3 bg-green-50 rounded-lg">
          <Text className="text-sm font-medium text-green-800 mb-1">
            Diagnosis: {item.diagnosis}
          </Text>
          {item.severity && (
            <Text className="text-xs text-green-700">
              Severity: {item.severity}/10
            </Text>
          )}
          {item.confidence && (
            <Text className="text-xs text-green-700">
              Confidence: {Math.round(item.confidence * 100)}%
            </Text>
          )}
        </View>
      )}

      {item.status === 'completed' && (
        <View className="absolute right-5 top-1/2 -mt-2">
          <IconSymbol name="chevron.right" size={16} color="#007AFF" />
        </View>
      )}
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View className="flex-1 justify-center items-center py-15">
      <IconSymbol name="doc.text" size={48} color="#ccc" />
      <Text className="text-lg font-semibold text-medical-text-secondary mt-4 mb-2">No Interviews Found</Text>
      <Text className="text-sm text-medical-text-muted text-center px-10">
        Interviews for this patient will appear here once completed.
      </Text>
    </View>
  );

  return (
    <View className="flex-1 bg-medical-gray">
      <View className="p-5 bg-white border-b border-medical-gray-medium">
        <Text className="text-2xl font-bold text-medical-text-primary mb-1">Past Interviews</Text>
        <Text className="text-sm text-medical-text-secondary">
          Swipe through interviews for the selected patient
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-medical-text-secondary">Loading interviews...</Text>
        </View>
      ) : (
        <FlatList
          data={interviews}
          renderItem={renderInterviewItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 20 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
        />
      )}
    </View>
  );
}
