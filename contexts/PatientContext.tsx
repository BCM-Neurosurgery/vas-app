import { Patient, databaseAPI } from '@/utils/database';
import { ReactNode, createContext, useContext, useEffect, useState } from 'react';

interface PatientContextType {
  selectedPatient: Patient | null;
  setSelectedPatient: (patient: Patient | null) => void;
  patients: Patient[];
  setPatients: (patients: Patient[]) => void;
  refreshInterviews: () => void;
}

const PatientContext = createContext<PatientContextType | undefined>(undefined);

interface PatientProviderProps {
  children: ReactNode;
}

export function PatientProvider({ children }: PatientProviderProps) {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [interviewRefreshTrigger, setInterviewRefreshTrigger] = useState(0);

  // Load patients on context initialization
  useEffect(() => {
    const loadPatients = async () => {
      try {
        const patientsData = await databaseAPI.getPatients();
        setPatients(patientsData);
        // Set the first patient as selected by default
        if (patientsData.length > 0) {
          setSelectedPatient(patientsData[0]);
        }
      } catch (error) {
        console.error('Error loading patients:', error);
      }
    };

    loadPatients();
  }, []);

  const refreshInterviews = () => {
    setInterviewRefreshTrigger(prev => prev + 1);
  };

  return (
    <PatientContext.Provider value={{
      selectedPatient,
      setSelectedPatient,
      patients,
      setPatients,
      refreshInterviews,
    }}>
      {children}
    </PatientContext.Provider>
  );
}

export function usePatient() {
  const context = useContext(PatientContext);
  if (context === undefined) {
    throw new Error('usePatient must be used within a PatientProvider');
  }
  return context;
}
