import { showCrossPlatformAlert } from '@/components/CrossPlatformAlert';
import QuickStart from '@/components/QuickStart';

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
    showCrossPlatformAlert({
      title: 'Survey Unavailable',
      message: `${surveyType.name} is not yet available in this version.`
    });
    return;
    }

    // In a real app, this would navigate to the survey flow
    showCrossPlatformAlert({
      title: 'Survey Started',
      message: `Beginning ${surveyType.name}...\n\nThis would launch the CAT-MH survey interface`
    });
  };

  return (
    <QuickStart 
      patientName="John Doe"
      onStartSurvey={handleStartSurvey}
    />
  );
}