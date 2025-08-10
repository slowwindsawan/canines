import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDog } from '../context/DogContext';
import { ReevaluationInput } from '../types';
import { Heart, ArrowRight, X } from 'lucide-react';

const reevaluationSchema = z.object({
  updatedWeight: z.number().min(1, 'Weight must be at least 1 lb').max(300, 'Weight must be realistic').optional(),
  newSymptoms: z.array(z.string()).optional(),
  responseToLastDiet: z.string().max(500, 'Response must be under 500 characters').optional(),
  vetFeedback: z.string().max(500, 'Feedback must be under 500 characters').optional(),
});

type ReevaluationFormData = z.infer<typeof reevaluationSchema>;

interface HealthUpdateFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

const HealthUpdateForm: React.FC<HealthUpdateFormProps> = ({ onClose, onSuccess }) => {
  const { selectedDog, submitReevaluation } = useDog();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ReevaluationFormData>({
    resolver: zodResolver(reevaluationSchema),
    defaultValues: {
      updatedWeight: selectedDog?.weight,
      newSymptoms: selectedDog?.symptoms || [],
      responseToLastDiet: '',
      vetFeedback: '',
    },
  });

  const watchedSymptoms = watch('newSymptoms');

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
    { id: 'weight_loss', label: 'Unexplained weight loss' },
    { id: 'behavioral_changes', label: 'Behavioral changes' },
  ];

  const handleSymptomChange = (symptomId: string, checked: boolean) => {
    const currentSymptoms = watchedSymptoms || [];
    if (checked) {
      setValue('newSymptoms', [...currentSymptoms, symptomId]);
    } else {
      setValue('newSymptoms', currentSymptoms.filter(id => id !== symptomId));
    }
  };

  const onSubmit = async (data: ReevaluationFormData) => {
    if (!selectedDog) return;

    setIsSubmitting(true);
    try {
      const input: ReevaluationInput = {
        dogId: selectedDog.id,
        updatedWeight: data.updatedWeight,
        newSymptoms: data.newSymptoms,
        responseToLastDiet: data.responseToLastDiet,
        vetFeedback: data.vetFeedback,
      };

      await submitReevaluation(input);
      onSuccess();
    } catch (error) {
      console.error('Failed to submit reevaluation:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!selectedDog) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Heart className="h-6 w-6 text-emerald-600" />
            <h2 className="text-xl font-bold text-gray-900">
              Gut Check for {selectedDog.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Current Weight */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Weight (lbs)
            </label>
            <input
              {...register('updatedWeight', { valueAsNumber: true })}
              type="number"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder={`Previous: ${selectedDog.weight} lbs`}
            />
            {errors.updatedWeight && (
              <p className="mt-2 text-sm text-red-600">{errors.updatedWeight.message}</p>
            )}
          </div>

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

          {/* Response to Last Diet */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              How has {selectedDog.name} responded to the current diet plan?
            </label>
            <textarea
              {...register('responseToLastDiet')}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Describe any improvements, issues, or changes you've noticed..."
            />
            {errors.responseToLastDiet && (
              <p className="mt-2 text-sm text-red-600">{errors.responseToLastDiet.message}</p>
            )}
          </div>

          {/* Vet Feedback */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recent Veterinarian Feedback (Optional)
            </label>
            <textarea
              {...register('vetFeedback')}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Any recent advice or observations from your veterinarian..."
            />
            {errors.vetFeedback && (
              <p className="mt-2 text-sm text-red-600">{errors.vetFeedback.message}</p>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex space-x-4 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-lg font-medium hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
            >
              <span>{isSubmitting ? 'Processing...' : 'Submit Health Update'}</span>
              {!isSubmitting && <ArrowRight className="h-5 w-5" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HealthUpdateForm;