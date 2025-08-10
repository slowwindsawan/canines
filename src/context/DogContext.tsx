import React, { createContext, useContext, useState, useEffect } from 'react';
import { Dog, ReevaluationInput, Protocol, DiagnosisSubmission } from '../types';
import { useAuth } from './AuthContext';
import { useAdmin } from './AdminContext';
import mockProtocols from '../data/mockData';

interface DogContextType {
  dogs: Dog[];
  selectedDog: Dog | null;
  addDog: (dogData: Omit<Dog, 'id' | 'userId'>) => string;
  selectDog: (dogId: string) => void;
  updateDog: (dogId: string, updates: Partial<Dog>) => void;
  removeDog: (dogId: string) => void;
  submitReevaluation: (input: ReevaluationInput) => Promise<string>;
  getProtocolHistory: (dogId: string) => Protocol[];
  getLastDiagnosisSubmission: (dogId: string) => DiagnosisSubmission | null;
  isLoading: boolean;
}

const DogContext = createContext<DogContextType | undefined>(undefined);

export const useDog = () => {
  const context = useContext(DogContext);
  if (context === undefined) {
    throw new Error('useDog must be used within a DogProvider');
  }
  return context;
};

// Mock data for demonstration
const mockDogs: Dog[] = [
  {
    id: 'dog-1',
    userId: '1',
    name: 'Max',
    breed: 'Golden Retriever',
    age: 4,
    weight: 65,
    sex: 'male',
    neuterStatus: 'neutered',
    bodyCondition: 'ideal',
    primaryFoodType: 'dry',
    feedingSchedule: 'twice',
    waterSource: 'tap',
    livingEnvironment: 'suburban',
    climate: 'temperate',
    activityLevel: 'daily_walks',
    accessToGrassDirt: true,
    timeAndBudgetLevel: 'medium',
    stoolType: 'normal',
    symptoms: [],
    behaviorNotes: 'Friendly and energetic dog, loves playing fetch.',
    phase: 'rebuild',
    lastGutCheckDate: '2024-01-23',
    flags: [],
    healthHistory: 'Previous digestive issues resolved with dietary changes',
    allergies: ['chicken', 'wheat']
  },
  {
    id: 'dog-2',
    userId: '1',
    name: 'Luna',
    breed: 'Border Collie',
    age: 2,
    weight: 45,
    sex: 'female',
    neuterStatus: 'spayed',
    bodyCondition: 'ideal',
    primaryFoodType: 'mixed',
    feedingSchedule: 'twice',
    waterSource: 'filtered',
    livingEnvironment: 'rural',
    climate: 'temperate',
    activityLevel: 'sports',
    accessToGrassDirt: true,
    timeAndBudgetLevel: 'high',
    stoolType: 'loose',
    symptoms: ['loose_stool', 'lethargy'],
    behaviorNotes: 'Usually very active but has been showing some digestive issues lately.',
    phase: 'reset',
    lastGutCheckDate: '2024-01-20',
    flags: ['symptoms_worsening', 'overdue_tasks'],
    healthHistory: 'Recent onset of digestive sensitivity, no prior major health issues',
    allergies: ['beef']
  }
];

export const DogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { addDiagnosisSubmission, submissions } = useAdmin();
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [selectedDogId, setSelectedDogId] = useState<string | null>(null);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const selectedDog = dogs.find(dog => dog.id === selectedDogId) || null;

  useEffect(() => {
    if (user) {
      // Simulate loading user's dogs from backend/localStorage
      const savedDogs = localStorage.getItem(`dogs_${user.id}`);
      let userDogs: Dog[] = [];
      
      if (savedDogs) {
        userDogs = JSON.parse(savedDogs);
      } else {
        // For demo purposes, use mock data for user ID '1'
        if (user.id === '1') {
          userDogs = mockDogs;
          localStorage.setItem(`dogs_${user.id}`, JSON.stringify(mockDogs));
        }
      }

      setDogs(userDogs);
      
      // Load protocols for this user
      const savedProtocols = localStorage.getItem(`protocols_${user.id}`);
      let userProtocols: Protocol[] = [];
      
      if (savedProtocols) {
        userProtocols = JSON.parse(savedProtocols);
      } else {
        // For demo purposes, use mock data for user ID '1'
        if (user.id === '1') {
          userProtocols = mockProtocols;
          localStorage.setItem(`protocols_${user.id}`, JSON.stringify(mockProtocols));
        }
      }
      
      setProtocols(userProtocols);
      
      // Set the first dog as selected if available
      if (userDogs.length > 0) {
        const savedSelectedDogId = localStorage.getItem(`selectedDog_${user.id}`);
        const dogToSelect = savedSelectedDogId && userDogs.find(d => d.id === savedSelectedDogId) 
          ? savedSelectedDogId 
          : userDogs[0].id;
        setSelectedDogId(dogToSelect);
      }
      
      setIsLoading(false);
    } else {
      setDogs([]);
      setSelectedDogId(null);
      setProtocols([]);
      setIsLoading(false);
    }
  }, [user]);

  const addDog = (dogData: Omit<Dog, 'id' | 'userId'>): string => {
    if (!user) throw new Error('User must be logged in to add a dog');

    const newDog: Dog = {
      ...dogData,
      id: `dog-${Date.now()}`,
      userId: user.id,
    };

    const updatedDogs = [...dogs, newDog];
    setDogs(updatedDogs);
    setSelectedDogId(newDog.id);
    
    // Persist to localStorage
    localStorage.setItem(`dogs_${user.id}`, JSON.stringify(updatedDogs));
    localStorage.setItem(`selectedDog_${user.id}`, newDog.id);
    
    return newDog.id;
  };

  const selectDog = (dogId: string) => {
    if (dogs.find(dog => dog.id === dogId)) {
      setSelectedDogId(dogId);
      if (user) {
        localStorage.setItem(`selectedDog_${user.id}`, dogId);
      }
    }
  };

  const updateDog = (dogId: string, updates: Partial<Dog>) => {
    const updatedDogs = dogs.map(dog => 
      dog.id === dogId ? { ...dog, ...updates } : dog
    );
    setDogs(updatedDogs);
    
    if (user) {
      localStorage.setItem(`dogs_${user.id}`, JSON.stringify(updatedDogs));
      localStorage.setItem(`protocols_${user.id}`, JSON.stringify(protocols));
    }
  };

  const removeDog = (dogId: string) => {
    const updatedDogs = dogs.filter(dog => dog.id !== dogId);
    setDogs(updatedDogs);
    
    // If the removed dog was selected, select the first remaining dog
    if (selectedDogId === dogId) {
      const newSelectedId = updatedDogs.length > 0 ? updatedDogs[0].id : null;
      setSelectedDogId(newSelectedId);
      if (user && newSelectedId) {
        localStorage.setItem(`selectedDog_${user.id}`, newSelectedId);
      }
    }
    
    if (user) {
      localStorage.setItem(`dogs_${user.id}`, JSON.stringify(updatedDogs));
    }
  };

  const submitReevaluation = async (input: ReevaluationInput): Promise<string> => {
    if (!user || !selectedDog) throw new Error('User and dog must be selected');

    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get current protocol
    const currentProtocol = protocols.find(p => p.id === selectedDog.lastProtocolId);
    const currentSubmission = submissions.find(s => s.id === selectedDog.lastDiagnosisSubmissionId);

    // Generate new protocol
    const newProtocol: Protocol = {
      id: `protocol-${Date.now()}`,
      dogId: selectedDog.id,
      version: currentProtocol ? currentProtocol.version + 1 : 1,
      replacesProtocolId: currentProtocol?.id,
      mealPlan: {
        breakfast: generateUpdatedMealPlan(input, currentProtocol?.mealPlan.breakfast || ''),
        dinner: generateUpdatedMealPlan(input, currentProtocol?.mealPlan.dinner || ''),
        mealsPerDay: 2,
      },
      supplements: generateUpdatedSupplements(input, currentProtocol?.supplements || []),
      lifestyleTips: generateUpdatedLifestyleTips(input, currentProtocol?.lifestyleTips || []),
      createdAt: new Date().toISOString(),
    };

    // Generate new diagnosis submission
    const newSubmission: Omit<DiagnosisSubmission, 'id' | 'submittedAt'> = {
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      dogId: selectedDog.id,
      dogData: {
        ...selectedDog,
        weight: input.updatedWeight || selectedDog.weight,
        symptoms: input.newSymptoms || selectedDog.symptoms,
      },
      aiDiagnosis: {
        confidence: 0.85,
        primaryConcerns: generateUpdatedConcerns(input),
        recommendations: generateUpdatedRecommendations(input),
        urgencyLevel: determineUrgencyLevel(input.newSymptoms || []),
        generatedAt: new Date().toISOString(),
      },
      status: 'pending',
      priority: determineUrgencyLevel(input.newSymptoms || []) === 'urgent' ? 'high' : 'medium',
      isReevaluation: true,
      previousSubmissionId: selectedDog.lastDiagnosisSubmissionId,
      finalProtocol: newProtocol,
    };

    // Add to admin context
    const submissionId = addDiagnosisSubmission(newSubmission);

    // Update protocols
    const updatedProtocols = [...protocols, newProtocol];
    setProtocols(updatedProtocols);

    // Update dog with new references
    const updatedDogs = dogs.map(dog => 
      dog.id === selectedDog.id 
        ? { 
            ...dog, 
            weight: input.updatedWeight || dog.weight,
            symptoms: input.newSymptoms || dog.symptoms,
            lastProtocolId: newProtocol.id,
            lastDiagnosisSubmissionId: submissionId 
          }
        : dog
    );
    setDogs(updatedDogs);

    // Persist to localStorage
    if (user) {
      localStorage.setItem(`dogs_${user.id}`, JSON.stringify(updatedDogs));
      localStorage.setItem(`protocols_${user.id}`, JSON.stringify(updatedProtocols));
    }

    return submissionId;
  };

  const getProtocolHistory = (dogId: string): Protocol[] => {
    const dogProtocols = protocols.filter(p => p.dogId === dogId);
    return dogProtocols.sort((a, b) => b.version - a.version);
  };

  const getLastDiagnosisSubmission = (dogId: string): DiagnosisSubmission | null => {
    const dog = dogs.find(d => d.id === dogId);
    if (!dog?.lastDiagnosisSubmissionId) return null;
    return submissions.find(s => s.id === dog.lastDiagnosisSubmissionId) || null;
  };

  // Helper functions for AI simulation
  const generateUpdatedMealPlan = (input: ReevaluationInput, currentMeal: string): string => {
    if (input.responseToLastDiet?.toLowerCase().includes('not working') || 
        input.responseToLastDiet?.toLowerCase().includes('worse')) {
      return currentMeal.replace('turkey', 'chicken').replace('salmon', 'white fish');
    }
    return currentMeal;
  };

  const generateUpdatedSupplements = (input: ReevaluationInput, currentSupplements: string[]): string[] => {
    const newSupplements = [...currentSupplements];
    if (input.newSymptoms?.includes('skin_issues')) {
      newSupplements.push('Omega-3 Fish Oil (increased to 750mg daily)');
    }
    if (input.newSymptoms?.includes('loose_stool')) {
      newSupplements.push('Additional Probiotics (2 capsules daily)');
    }
    return newSupplements;
  };

  const generateUpdatedLifestyleTips = (input: ReevaluationInput, currentTips: string[]): string[] => {
    const newTips = [...currentTips];
    if (input.vetFeedback?.toLowerCase().includes('exercise')) {
      newTips.push('Follow veterinarian exercise recommendations');
    }
    return newTips;
  };

  const generateUpdatedConcerns = (input: ReevaluationInput): string[] => {
    const concerns = ['Ongoing health monitoring'];
    if (input.newSymptoms?.includes('skin_issues')) {
      concerns.push('Skin sensitivity requiring attention');
    }
    if (input.newSymptoms?.includes('loose_stool')) {
      concerns.push('Digestive system needs continued support');
    }
    return concerns;
  };

  const generateUpdatedRecommendations = (input: ReevaluationInput): string[] => {
    const recommendations = ['Continue current protocol with modifications'];
    if (input.responseToLastDiet?.toLowerCase().includes('improvement')) {
      recommendations.push('Maintain current dietary approach');
    } else {
      recommendations.push('Adjust dietary components based on response');
    }
    return recommendations;
  };

  const determineUrgencyLevel = (symptoms: string[]): 'low' | 'medium' | 'high' | 'urgent' => {
    if (symptoms.includes('vomiting') || symptoms.includes('diarrhea')) return 'high';
    if (symptoms.includes('loose_stool') || symptoms.includes('skin_issues')) return 'medium';
    return 'low';
  };

  return (
    <DogContext.Provider value={{
      dogs,
      selectedDog,
      addDog,
      selectDog,
      updateDog,
      removeDog,
      submitReevaluation,
      getProtocolHistory,
      getLastDiagnosisSubmission,
      isLoading,
    }}>
      {children}
    </DogContext.Provider>
  );
};