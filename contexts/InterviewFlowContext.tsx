import React, { createContext, useContext, useState } from 'react';

type Ctx = { isStarting: boolean; setIsStarting: (v: boolean) => void };
const InterviewFlowContext = createContext<Ctx | null>(null);

export const InterviewFlowProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
    const [isStarting, setIsStarting] = useState(false);
    return (
        <InterviewFlowContext.Provider value={{ isStarting, setIsStarting }}>
            {children}
        </InterviewFlowContext.Provider>
    );
};

export const useInterviewFlow = () => {
    const context = useContext(InterviewFlowContext);
    if (!context) throw new Error('useInterviewFlow must be used within InterviewFlowProvider');
    return context;
};