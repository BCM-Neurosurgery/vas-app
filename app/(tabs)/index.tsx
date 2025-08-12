import QuickStart from '@/components/QuickStart';
import { Alert } from 'react-native';

interface SurveyType {
  id: string;
  name: string;
  description: string;
  icon: 'house.fill' | 'paperplane.fill' | 'chevron.left.forwardslash.chevron.right' | 'chevron.right';
  color: string;
  estimatedTime: string;
  disabled?: boolean
}

export default function HomeScreen() {
  const handleStartSurvey = (surveyType: SurveyType) => {
    if (surveyType.disabled) {
    // This should never happen since the component handles disabled states
    Alert.alert(
      'Survey Unavailable',
      `${surveyType.name} is not yet available in this version.`,
      [{ text: 'OK' }]
    );
    return;
    }

    // In a real app, this would navigate to the survey flow
    Alert.alert(
      'Survey Started',
      `Beginning ${surveyType.name}...\n\nThis would launch the CAT-MH survey interface`,
      [{ text: 'OK' }]
    );
  };

  return (
    <QuickStart 
      patientName="John Doe"
      onStartSurvey={handleStartSurvey}
    />
  );
}