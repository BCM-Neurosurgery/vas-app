import { showCrossPlatformAlert } from '@/components/CrossPlatformAlert';
import InterviewList from '@/components/InterviewList';
import { Interview } from '@/utils/database';

export default function InterviewsScreen() {
  const handleInterviewSelect = (interview: Interview) => {
    // In a real app, this would navigate to the interview results
    showCrossPlatformAlert({
      title: 'Interview Results',
      message: `Viewing results for ${interview.surveyType} on ${interview.date}\n\nThis would show detailed assessment results and recommendations.`
    });
    
    // Example navigation to results (uncomment when you have results screens)
    // router.push(`/results/${interview.id}`);
  };

  return (
    <InterviewList
      patientId="1"
      onInterviewSelect={handleInterviewSelect}
    />
  );
}
