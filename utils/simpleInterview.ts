// SIMPLE INTERVIEW UTILITY FOR 2-SCALE RATING SYSTEM
// Replaces the complex 620-line interview orchestrator with simple functions

export interface SimpleInterview {
  id?: number;
  patient_id: number;
  mood_rating: number;  // 1-7 scale
  energy_rating: number;  // 1-7 scale
  timestamp: Date;
  status: 'completed' | 'draft';
}

export interface SimpleInterviewData {
  patient_id: number;
  mood_rating: number;
  energy_rating: number;
  status?: 'completed' | 'draft';
}

// Simple function to save a mood/energy rating
export async function saveSimpleInterview(data: SimpleInterviewData): Promise<SimpleInterview> {
  try {
    // TODO: Replace with actual API call to your backend
    // For now, simulate saving to database
    const newInterview: SimpleInterview = {
      id: Math.floor(Math.random() * 10000), // Temporary ID
      patient_id: data.patient_id,
      mood_rating: data.mood_rating,
      energy_rating: data.energy_rating,
      timestamp: new Date(),
      status: data.status || 'completed'
    };
    
    console.log('Saving simple interview:', newInterview);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return newInterview;
  } catch (error) {
    console.error('Error saving simple interview:', error);
    throw new Error('Failed to save interview');
  }
}

// Simple function to get all interviews for a patient
export async function getSimpleInterviews(patientId: number): Promise<SimpleInterview[]> {
  try {
    // TODO: Replace with actual API call to your backend
    // For now, simulate fetching from database
    const mockInterviews: SimpleInterview[] = [
      {
        id: 1,
        patient_id: patientId,
        mood_rating: 5,
        energy_rating: 6,
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        status: 'completed'
      },
      {
        id: 2,
        patient_id: patientId,
        mood_rating: 3,
        energy_rating: 4,
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        status: 'completed'
      },
      {
        id: 3,
        patient_id: patientId,
        mood_rating: 6,
        energy_rating: 7,
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        status: 'completed'
      }
    ];
    
    console.log('Fetching simple interviews for patient:', patientId);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return mockInterviews;
  } catch (error) {
    console.error('Error fetching simple interviews:', error);
    throw new Error('Failed to fetch interviews');
  }
}

// Simple function to validate ratings (1-7)
export function validateRatings(moodRating: number, energyRating: number): boolean {
  return moodRating >= 1 && moodRating <= 7 && energyRating >= 1 && energyRating <= 7;
}

// Simple function to get rating description
export function getRatingDescription(rating: number): string {
  switch (rating) {
    case 1: return 'Very Low';
    case 2: return 'Low';
    case 3: return 'Below Average';
    case 4: return 'Average';
    case 5: return 'Above Average';
    case 6: return 'High';
    case 7: return 'Very High';
    default: return 'Invalid';
  }
}

// Simple function to get rating emoji
export function getRatingEmoji(rating: number): string {
  switch (rating) {
    case 1: return '😔';
    case 2: return '😕';
    case 3: return '😐';
    case 4: return '🙂';
    case 5: return '😊';
    case 6: return '😄';
    case 7: return '🤩';
    default: return '❓';
  }
}
