import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { mockProgressData } from '../data/mockData';
import { useDog } from '../context/DogContext';
import { TrendingUp, Calendar, Plus, CheckCircle, AlertCircle, Dog } from 'lucide-react';
import { Link } from 'react-router-dom';

const progressSchema = z.object({
  symptoms: z.array(z.string()),
  notes: z.string().max(300, 'Notes must be under 300 characters'),
  improvementScore: z.number().min(1).max(10),
});

type ProgressFormData = z.infer<typeof progressSchema>;

const Tracker: React.FC = () => {
  const { selectedDog } = useDog();
  const [showForm, setShowForm] = React.useState(false);
  
  // Filter progress data for selected dog
  const dogProgressData = selectedDog 
    ? mockProgressData.filter(entry => entry.dogId === selectedDog.id)
    : [];
  
  const [progressData, setProgressData] = React.useState(dogProgressData);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Update progress data when selected dog changes
  React.useEffect(() => {
    const filteredData = selectedDog 
      ? mockProgressData.filter(entry => entry.dogId === selectedDog.id)
      : [];
    setProgressData(filteredData);
  }, [selectedDog]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<ProgressFormData>({
    resolver: zodResolver(progressSchema),
    defaultValues: {
      symptoms: [],
      improvementScore: 5,
    },
  });

  const watchedSymptoms = watch('symptoms');

  const symptomOptions = [
    { id: 'loose_stool', label: 'Loose stool' },
    { id: 'diarrhea', label: 'Diarrhea' },
    { id: 'constipation', label: 'Constipation' },
    { id: 'vomiting', label: 'Vomiting' },
    { id: 'lethargy', label: 'Lethargy/Low energy' },
    { id: 'loss_appetite', label: 'Loss of appetite' },
    { id: 'excessive_gas', label: 'Excessive gas' },
    { id: 'bloating', label: 'Bloating' },
    { id: 'skin_issues', label: 'Skin issues/Itching' },
    { id: 'bad_breath', label: 'Bad breath' },
  ];

  const handleSymptomChange = (symptomId: string, checked: boolean) => {
    const currentSymptoms = watchedSymptoms || [];
    if (checked) {
      setValue('symptoms', [...currentSymptoms, symptomId]);
    } else {
      setValue('symptoms', currentSymptoms.filter(id => id !== symptomId));
    }
  };

  const onSubmit = async (data: ProgressFormData) => {
    if (!selectedDog) {
      alert('Please select a dog first');
      return;
    }

    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const newEntry = {
      id: Date.now().toString(),
      dogId: selectedDog.id,
      date: new Date().toISOString().split('T')[0],
      symptoms: data.symptoms,
      notes: data.notes,
      improvementScore: data.improvementScore,
    };

    setProgressData([newEntry, ...progressData]);
    reset();
    setShowForm(false);
    setIsSubmitting(false);
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600 bg-green-100';
    if (score >= 6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 7) return <CheckCircle className="h-5 w-5 text-green-600" />;
    return <AlertCircle className="h-5 w-5 text-yellow-600" />;
  };

  // If no dog is selected, show selection prompt
  if (!selectedDog) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Dog className="h-10 w-10 text-gray-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Select a Pet</h1>
            <p className="text-lg text-gray-600 mb-8">
              Choose a pet from your dashboard to track their health progress
            </p>
            <Link
              to="/dashboard"
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-lg font-medium hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 transform hover:scale-[1.02]"
            >
              <span>Go to Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {selectedDog.name}'s Progress Tracker
            </h1>
            <p className="text-lg text-gray-600">
              Monitor your {selectedDog.breed}'s health journey
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="mt-4 sm:mt-0 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-lg font-medium hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 transform hover:scale-[1.02] flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Log Progress</span>
          </button>
        </div>

        {/* Progress Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center space-x-2 mb-6">
              <Calendar className="h-6 w-6 text-emerald-600" />
              <h2 className="text-xl font-bold text-gray-900">
                Weekly Check-In for {selectedDog.name}
              </h2>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Current Symptoms */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Current Symptoms (select all that apply)
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {symptomOptions.map((symptom) => (
                    <label
                      key={symptom.id}
                      className="flex items-center p-3 border border-gray-200 rounded-lg hover:border-emerald-500 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={watchedSymptoms?.includes(symptom.id) || false}
                        onChange={(e) => handleSymptomChange(symptom.id, e.target.checked)}
                        className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                      />
                      <span className="ml-3 text-sm text-gray-700">{symptom.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Improvement Score */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Overall Improvement Score (1-10)
                </label>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-500">Poor</span>
                  <input
                    {...register('improvementScore', { valueAsNumber: true })}
                    type="range"
                    min="1"
                    max="10"
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <span className="text-sm text-gray-500">Excellent</span>
                  <span className="text-lg font-bold text-emerald-600 min-w-[2rem] text-center">
                    {watch('improvementScore')}
                  </span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Progress Notes
                </label>
                <textarea
                  {...register('notes')}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Describe any changes in behavior, energy, appetite, etc..."
                />
                {errors.notes && (
                  <p className="mt-2 text-sm text-red-600">{errors.notes.message}</p>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-lg font-medium hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Progress'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="bg-gradient-to-r from-gray-200 to-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:from-gray-300 hover:to-gray-400 transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Progress History */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-6">
            <TrendingUp className="h-6 w-6 text-emerald-600" />
            <h2 className="text-xl font-bold text-gray-900">
              {selectedDog.name}'s Progress History
            </h2>
          </div>

          <div className="space-y-4">
            {progressData.map((entry) => (
              <div key={entry.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-sm transition-shadow">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4">
                  <div className="flex items-center space-x-4 mb-3 md:mb-0">
                    <div className="text-sm text-gray-500">
                      {new Date(entry.date).toLocaleDateString()}
                    </div>
                    <div className="flex items-center space-x-2">
                      {getScoreIcon(entry.improvementScore)}
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(entry.improvementScore)}`}>
                        Score: {entry.improvementScore}/10
                      </span>
                    </div>
                  </div>
                </div>

                {entry.symptoms.length > 0 && (
                  <div className="mb-3">
                    <span className="text-sm font-medium text-gray-700">Symptoms: </span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {entry.symptoms.map((symptom) => (
                        <span
                          key={symptom}
                          className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full"
                        >
                          {symptomOptions.find(opt => opt.id === symptom)?.label || symptom}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {entry.notes && (
                  <div>
                    <span className="text-sm font-medium text-gray-700">Notes: </span>
                    <p className="text-gray-600 text-sm mt-1">{entry.notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {progressData.length === 0 && (
            <div className="text-center py-12">
              <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No progress entries for {selectedDog.name} yet
              </h3>
              <p className="text-gray-600">
                Start tracking {selectedDog.name}'s progress to see improvements over time.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Tracker;