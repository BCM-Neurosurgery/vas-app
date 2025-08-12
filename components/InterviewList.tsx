import { IconSymbol } from '@/components/ui/IconSymbol';
import { databaseAPI, Interview } from '@/utils/database';
import { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';



interface InterviewListProps {
  patientId: string;
  onInterviewSelect: (interview: Interview) => void;
}

export default function InterviewList({ patientId, onInterviewSelect }: InterviewListProps) {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch interviews from database
  useEffect(() => {
    const fetchInterviews = async () => {
      setIsLoading(true);
      try {
        const fetchedInterviews = await databaseAPI.getInterviews(patientId);
        setInterviews(fetchedInterviews);
      } catch (error) {
        console.error('Failed to fetch interviews:', error);
        Alert.alert('Error', 'Failed to load interviews. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInterviews();
  }, [patientId]);

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

  const handleInterviewPress = (interview: Interview) => {
    if (interview.status === 'completed') {
      onInterviewSelect(interview);
    } else {
      Alert.alert(
        'Interview Not Complete',
        'This interview was not completed and cannot be viewed.',
        [{ text: 'OK' }]
      );
    }
  };

  const renderInterviewItem = ({ item }: { item: Interview }) => (
    <TouchableOpacity
      className="bg-white rounded-xl p-5 mb-4 shadow-sm"
      onPress={() => handleInterviewPress(item)}
    >
      <View className="flex-row justify-between items-center mb-3">
        <View className="flex-1">
          <Text className="text-base font-semibold text-medical-text-primary">{item.date}</Text>
          <Text className="text-sm text-medical-text-secondary mt-1">{item.time}</Text>
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
        <Text className="text-base font-medium text-medical-text-primary mb-1">{item.surveyType}</Text>
        <Text className="text-sm text-medical-text-secondary">Duration: {item.duration}</Text>
      </View>

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
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
        />
      )}
    </View>
  );
}
