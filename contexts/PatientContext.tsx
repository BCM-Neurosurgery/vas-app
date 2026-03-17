import { databaseAPI } from "@/db/api";
import { patientRepo } from "@/db/repo/patientRepo";
import { syncEngine } from "@/db/sync/syncEngine";
import { subscribePatientRebind } from "@/db/sync/syncNotice";
import { Patient } from "@/db/types";
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

        const latest = patientsData.find((p) => p.latest) ?? patientsData[0] ?? null;
        setSelectedPatient(latest);
      } catch (error) {
        console.error('Error loading patients:', error);
      }
    };

    loadPatients();
  }, []);

  const refreshInterviews = () => setInterviewRefreshTrigger(prev => prev + 1);

  // When select patient changes, trigger sync + refresh interviews
  useEffect(() => {
    if (!selectedPatient) return;
    void syncEngine.syncNow(selectedPatient.uuid);
    refreshInterviews();
  }, [selectedPatient?.uuid]);

  useEffect(() => {
    const unsubscribe = subscribePatientRebind((oldUuid, newUuid) => {
      void (async () => {
        const updatedPatients = await databaseAPI.getPatients();
        setPatients(updatedPatients);

        if (selectedPatient?.uuid === oldUuid) {
          const reboundPatient = await patientRepo.getByUuid(newUuid);
          setSelectedPatient(reboundPatient);
        }
      })();
    });

    return unsubscribe;
  }, [selectedPatient?.uuid]);

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
