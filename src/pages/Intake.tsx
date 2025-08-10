import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDog } from '../context/DogContext';
import { Heart, ArrowRight } from 'lucide-react';

const intakeSchema = z.object({
  name: z.string().min(2, 'Please enter your dog\'s name'),
  breed: z.string().min(2, 'Please enter your dog\'s breed'),
  age: z.number().min(0.5, 'Age must be at least 6 months').max(25, 'Age must be realistic'),
  weight: z.number().min(1, 'Weight must be at least 1 lb').max(300, 'Weight must be realistic'),
  dateOfBirth: z.string().optional(),
  sex: z.enum(['male', 'female'], {
    errorMap: () => ({ message: 'Please select sex' }),
  }),
  neuterStatus: z.enum(['intact', 'neutered', 'spayed'], {
    errorMap: () => ({ message: 'Please select neuter status' }),
  }),
  bodyCondition: z.enum(['underweight', 'ideal', 'overweight'], {
    errorMap: () => ({ message: 'Please select body condition' }),
  }),
  
  // Current Diet Details
  primaryFoodType: z.enum(['dry', 'wet', 'raw', 'cooked', 'mixed'], {
    errorMap: () => ({ message: 'Please select primary food type' }),
  }),
  brandAndProduct: z.string().optional(),
  treatsAndExtras: z.string().optional(),
  feedingSchedule: z.enum(['once', 'twice', 'grazing', 'other'], {
    errorMap: () => ({ message: 'Please select feeding schedule' }),
  }),
  accessToOtherFoods: z.string().optional(),
  currentSupplements: z.string().optional(),
  waterSource: z.enum(['tap', 'filtered', 'tank', 'bore', 'other'], {
    errorMap: () => ({ message: 'Please select water source' }),
  }),
  
  // Medical & Health History
  currentMedications: z.string().optional(),
  pastMedications: z.string().optional(),
  vaccinationHistory: z.string().optional(),
  fleaTickWormingProducts: z.string().optional(),
  surgeriesOrInjuries: z.string().optional(),
  diagnosedConditions: z.string().optional(),
  pastLabResults: z.string().optional(),
  
  // Environment & Lifestyle
  livingEnvironment: z.enum(['urban', 'suburban', 'rural', 'farm'], {
    errorMap: () => ({ message: 'Please select living environment' }),
  }),
  climate: z.enum(['hot', 'humid', 'cold', 'dry', 'temperate'], {
    errorMap: () => ({ message: 'Please select climate' }),
  }),
  activityLevel: z.enum(['working', 'sports', 'daily_walks', 'low_activity'], {
    errorMap: () => ({ message: 'Please select activity level' }),
  }),
  accessToGrassDirt: z.boolean(),
  stressFactors: z.string().optional(),
  
  // Owner Goals & Priorities
  mainHealthConcern: z.string().optional(),
  secondaryConcerns: z.string().optional(),
  priorityOutcome: z.string().optional(),
  timeAndBudgetLevel: z.enum(['low', 'medium', 'high'], {
    errorMap: () => ({ message: 'Please select time and budget level' }),
  }),
  
  // Existing fields
  stoolType: z.enum(['normal', 'loose', 'watery', 'hard', 'mucousy'], {
    errorMap: () => ({ message: 'Please select a stool type' }),
  }),
  symptoms: z.array(z.string()).min(0),
  behaviorNotes: z.string().max(500, 'Notes must be under 500 characters'),
});

type IntakeFormData = z.infer<typeof intakeSchema>;

const Intake: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addDog } = useDog();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<IntakeFormData>({
    resolver: zodResolver(intakeSchema),
    defaultValues: {
      symptoms: [],
      behaviorNotes: '',
    },
  });

  const watchedSymptoms = watch('symptoms');

  const symptomOptions = [
    // Digestion
    { id: 'loose_stool', label: 'Loose stool' },
    { id: 'diarrhea', label: 'Diarrhea' },
    { id: 'constipation', label: 'Constipation' },
    { id: 'vomiting', label: 'Vomiting' },
    { id: 'excessive_gas', label: 'Excessive gas' },
    { id: 'bloating', label: 'Bloating' },
    { id: 'scooting', label: 'Scooting/Anal gland issues' },
    
    // Skin & Coat
    { id: 'skin_issues', label: 'Skin issues/Itching' },
    { id: 'hot_spots', label: 'Hot spots' },
    { id: 'yeast_smell', label: 'Yeasty smell/Greasy coat' },
    { id: 'hair_loss', label: 'Hair loss/Thinning' },
    { id: 'paw_licking', label: 'Paw licking/Redness' },
    
    // Behavior & Mood
    { id: 'anxiety', label: 'Anxiety/Nervousness' },
    { id: 'reactivity', label: 'Reactivity/Aggression' },
    { id: 'hyperactivity', label: 'Hyperactivity' },
    { id: 'lethargy', label: 'Lethargy/Low energy' },
    { id: 'poor_sleep', label: 'Poor sleep quality' },
    
    // Other
    { id: 'ear_infections', label: 'Frequent ear infections' },
    { id: 'eye_discharge', label: 'Eye discharge/Staining' },
    { id: 'bad_breath', label: 'Bad breath' },
    { id: 'loss_appetite', label: 'Loss of appetite' },
    { id: 'weight_loss', label: 'Unexplained weight loss' },
    { id: 'muscle_wastage', label: 'Muscle wastage' },
  ];

  const stoolTypeOptions = [
    { value: 'normal', label: 'Normal (firm, well-formed)' },
    { value: 'loose', label: 'Loose (soft but formed)' },
    { value: 'watery', label: 'Watery/Liquid' },
    { value: 'hard', label: 'Hard/Dry' },
    { value: 'mucousy', label: 'Contains mucus or blood' },
  ];

  const handleSymptomChange = (symptomId: string, checked: boolean) => {
    const currentSymptoms = watchedSymptoms || [];
    if (checked) {
      setValue('symptoms', [...currentSymptoms, symptomId]);
    } else {
      setValue('symptoms', currentSymptoms.filter(id => id !== symptomId));
    }
  };

  const onSubmit = async (data: IntakeFormData) => {
    setIsSubmitting(true);
    // Simulate API submission
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Add the new dog to the user's dogs list
    if (user) {
      const dogId = addDog({
        name: data.name,
        breed: data.breed,
        age: data.age,
        weight: data.weight,
        stoolType: data.stoolType,
        symptoms: data.symptoms,
        behaviorNotes: data.behaviorNotes,
      });
      
      // Navigate to protocol page - the newly added dog is automatically selected
      navigate('/protocol');
    }
    
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Heart className="h-12 w-12 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Tell Us About Your Dog
          </h1>
          <p className="text-lg text-gray-600">
            This information helps us create a personalized health protocol
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* SECTION 1: Let's Get to Know Them */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                Let's Get to Know Them
              </h3>
              <p className="text-gray-600 mb-6">First things first, let's meet your dog.</p>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dog's Name
                </label>
                <input
                  {...register('name')}
                  type="text"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="e.g., Max, Luna, Buddy"
                />
                {errors.name && (
                  <p className="mt-2 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Breed (or mix)
                  </label>
                  <input
                    {...register('breed')}
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="e.g., Golden Retriever, Mixed"
                  />
                  {errors.breed && (
                    <p className="mt-2 text-sm text-red-600">{errors.breed.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Age (years)
                  </label>
                  <input
                    {...register('age', { valueAsNumber: true })}
                    type="number"
                    step="0.5"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="e.g., 3.5"
                  />
                  {errors.age && (
                    <p className="mt-2 text-sm text-red-600">{errors.age.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date of Birth (optional)
                  </label>
                  <input
                    {...register('dateOfBirth')}
                    type="date"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    Sex
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: 'male', label: 'Male' },
                      { value: 'female', label: 'Female' }
                    ].map((option) => (
                      <label key={option.value} className="flex items-center">
                        <input
                          {...register('sex')}
                          type="radio"
                          value={option.value}
                          className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{option.label}</span>
                      </label>
                    ))}
                  </div>
                  {errors.sex && (
                    <p className="mt-2 text-sm text-red-600">{errors.sex.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    Neuter Status
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: 'intact', label: 'Intact' },
                      { value: 'neutered', label: 'Neutered' },
                      { value: 'spayed', label: 'Spayed' }
                    ].map((option) => (
                      <label key={option.value} className="flex items-center">
                        <input
                          {...register('neuterStatus')}
                          type="radio"
                          value={option.value}
                          className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{option.label}</span>
                      </label>
                    ))}
                  </div>
                  {errors.neuterStatus && (
                    <p className="mt-2 text-sm text-red-600">{errors.neuterStatus.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Weight (lbs)
                  </label>
                  <input
                    {...register('weight', { valueAsNumber: true })}
                    type="number"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="e.g., 65"
                  />
                  {errors.weight && (
                    <p className="mt-2 text-sm text-red-600">{errors.weight.message}</p>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Body Condition
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { value: 'underweight', label: 'Underweight (ribs easily visible)' },
                    { value: 'ideal', label: 'Ideal weight (ribs easily felt)' },
                    { value: 'overweight', label: 'A bit cuddly (ribs hard to feel)' }
                  ].map((option) => (
                    <label
                      key={option.value}
                      className="relative flex items-center p-4 border border-gray-300 rounded-lg hover:border-emerald-500 cursor-pointer group"
                    >
                      <input
                        {...register('bodyCondition')}
                        type="radio"
                        value={option.value}
                        className="sr-only"
                      />
                      <span className="w-4 h-4 border-2 border-gray-300 rounded-full mr-3 group-hover:border-emerald-500 group-focus-within:border-emerald-500"></span>
                      <span className="text-sm text-gray-700 group-hover:text-gray-900">
                        {option.label}
                      </span>
                    </label>
                  ))}
                </div>
                {errors.bodyCondition && (
                  <p className="mt-2 text-sm text-red-600">{errors.bodyCondition.message}</p>
                )}
              </div>
            </div>

            {/* SECTION 2: What's in the Bowl */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                What's in the Bowl
              </h3>
              <p className="text-gray-600 mb-6">Tell me what's going into the tank.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    Primary Food Type
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: 'dry', label: 'Dry kibble' },
                      { value: 'wet', label: 'Wet/canned food' },
                      { value: 'raw', label: 'Raw diet' },
                      { value: 'cooked', label: 'Home-cooked' },
                      { value: 'mixed', label: 'Mixed diet' }
                    ].map((option) => (
                      <label key={option.value} className="flex items-center">
                        <input
                          {...register('primaryFoodType')}
                          type="radio"
                          value={option.value}
                          className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{option.label}</span>
                      </label>
                    ))}
                  </div>
                  {errors.primaryFoodType && (
                    <p className="mt-2 text-sm text-red-600">{errors.primaryFoodType.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    Feeding Schedule
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: 'once', label: 'Once daily' },
                      { value: 'twice', label: 'Twice daily' },
                      { value: 'grazing', label: 'Free feeding/grazing' },
                      { value: 'other', label: 'Other schedule' }
                    ].map((option) => (
                      <label key={option.value} className="flex items-center">
                        <input
                          {...register('feedingSchedule')}
                          type="radio"
                          value={option.value}
                          className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{option.label}</span>
                      </label>
                    ))}
                  </div>
                  {errors.feedingSchedule && (
                    <p className="mt-2 text-sm text-red-600">{errors.feedingSchedule.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Brand and Product Name (if commercial)
                  </label>
                  <input
                    {...register('brandAndProduct')}
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="e.g., Royal Canin Adult, Hills Science Diet"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    Water Source
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: 'tap', label: 'Tap water' },
                      { value: 'filtered', label: 'Filtered water' },
                      { value: 'tank', label: 'Tank water' },
                      { value: 'bore', label: 'Bore water' },
                      { value: 'other', label: 'Other' }
                    ].map((option) => (
                      <label key={option.value} className="flex items-center">
                        <input
                          {...register('waterSource')}
                          type="radio"
                          value={option.value}
                          className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{option.label}</span>
                      </label>
                    ))}
                  </div>
                  {errors.waterSource && (
                    <p className="mt-2 text-sm text-red-600">{errors.waterSource.message}</p>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Treats, Extras & Table Scraps
                </label>
                <textarea
                  {...register('treatsAndExtras')}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="List any treats, human food, or extras they get..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Access to Other Foods
                  </label>
                  <textarea
                    {...register('accessToOtherFoods')}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Cat food, scavenging, stock feed, compost raids..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Supplements
                  </label>
                  <textarea
                    {...register('currentSupplements')}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="List any supplements with brand and dosage..."
                  />
                </div>
              </div>
            </div>

            {/* SECTION 3: Health History */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                Health History
              </h3>
              <p className="text-gray-600 mb-6">Now let's cover their health so we get the full picture.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Medications
                  </label>
                  <textarea
                    {...register('currentMedications')}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="List any current medications with dosage..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Past Medications (especially antibiotics, steroids, anti-inflammatories)
                  </label>
                  <textarea
                    {...register('pastMedications')}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Any notable past medications..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Diagnosed Health Conditions
                  </label>
                  <textarea
                    {...register('diagnosedConditions')}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Any diagnosed conditions (skin, joints, digestive, etc.)..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Surgeries or Major Injuries
                  </label>
                  <textarea
                    {...register('surgeriesOrInjuries')}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Any surgeries or major injuries..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vaccination History
                  </label>
                  <input
                    {...register('vaccinationHistory')}
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Last vaccination date and frequency..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Flea/Tick/Worming Products
                  </label>
                  <input
                    {...register('fleaTickWormingProducts')}
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Brand and frequency..."
                  />
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Past Lab Results (if available)
                </label>
                <textarea
                  {...register('pastLabResults')}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Any recent blood work, stool tests, allergy panels..."
                />
              </div>
            </div>

            {/* Stool Type */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                Symptom Assessment
              </h3>
              <p className="text-gray-600 mb-6">Tick all that apply — even if they seem unrelated.</p>
              
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Current Stool Type
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {stoolTypeOptions.map((option) => (
                  <label
                    key={option.value}
                    className="relative flex items-center p-4 border border-gray-300 rounded-lg hover:border-emerald-500 cursor-pointer group"
                  >
                    <input
                      {...register('stoolType')}
                      type="radio"
                      value={option.value}
                      className="sr-only"
                    />
                    <span className="w-4 h-4 border-2 border-gray-300 rounded-full mr-3 group-hover:border-emerald-500 group-focus-within:border-emerald-500"></span>
                    <span className="text-sm text-gray-700 group-hover:text-gray-900">
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
              {errors.stoolType && (
                <p className="mt-2 text-sm text-red-600">{errors.stoolType.message}</p>
              )}

              <label className="block text-sm font-medium text-gray-700 mb-4 mt-8">
                Other Current Symptoms (select all that apply)
              </label>
              
              {/* Digestion Symptoms */}
              <div className="mb-6">
                <h4 className="text-md font-medium text-gray-800 mb-3">Digestion</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {symptomOptions.slice(0, 6).map((symptom) => (
                    <label
                      key={symptom.id}
                      className="flex items-center p-3 border border-gray-200 rounded-lg hover:border-emerald-500 cursor-pointer group"
                    >
                      <input
                        type="checkbox"
                        checked={watchedSymptoms?.includes(symptom.id) || false}
                        onChange={(e) => handleSymptomChange(symptom.id, e.target.checked)}
                        className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                      />
                      <span className="ml-3 text-sm text-gray-700 group-hover:text-gray-900">
                        {symptom.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Skin & Coat Symptoms */}
              <div className="mb-6">
                <h4 className="text-md font-medium text-gray-800 mb-3">Skin & Coat</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {symptomOptions.slice(6, 11).map((symptom) => (
                    <label
                      key={symptom.id}
                      className="flex items-center p-3 border border-gray-200 rounded-lg hover:border-emerald-500 cursor-pointer group"
                    >
                      <input
                        type="checkbox"
                        checked={watchedSymptoms?.includes(symptom.id) || false}
                        onChange={(e) => handleSymptomChange(symptom.id, e.target.checked)}
                        className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                      />
                      <span className="ml-3 text-sm text-gray-700 group-hover:text-gray-900">
                        {symptom.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Behavior & Mood Symptoms */}
              <div className="mb-6">
                <h4 className="text-md font-medium text-gray-800 mb-3">Behavior & Mood</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {symptomOptions.slice(11, 16).map((symptom) => (
                    <label
                      key={symptom.id}
                      className="flex items-center p-3 border border-gray-200 rounded-lg hover:border-emerald-500 cursor-pointer group"
                    >
                      <input
                        type="checkbox"
                        checked={watchedSymptoms?.includes(symptom.id) || false}
                        onChange={(e) => handleSymptomChange(symptom.id, e.target.checked)}
                        className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                      />
                      <span className="ml-3 text-sm text-gray-700 group-hover:text-gray-900">
                        {symptom.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Other Symptoms */}
              <div className="mb-6">
                <h4 className="text-md font-medium text-gray-800 mb-3">Other</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {symptomOptions.slice(16).map((symptom) => (
                    <label
                      key={symptom.id}
                      className="flex items-center p-3 border border-gray-200 rounded-lg hover:border-emerald-500 cursor-pointer group"
                    >
                      <input
                        type="checkbox"
                        checked={watchedSymptoms?.includes(symptom.id) || false}
                        onChange={(e) => handleSymptomChange(symptom.id, e.target.checked)}
                        className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                      />
                      <span className="ml-3 text-sm text-gray-700 group-hover:text-gray-900">
                        {symptom.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* SECTION 4: Environment & Lifestyle */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                Lifestyle & Environment
              </h3>
              <p className="text-gray-600 mb-6">What's their day-to-day like?</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    Living Environment
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: 'urban', label: 'City/Urban' },
                      { value: 'suburban', label: 'Suburbs' },
                      { value: 'rural', label: 'Rural' },
                      { value: 'farm', label: 'Farm' }
                    ].map((option) => (
                      <label key={option.value} className="flex items-center">
                        <input
                          {...register('livingEnvironment')}
                          type="radio"
                          value={option.value}
                          className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{option.label}</span>
                      </label>
                    ))}
                  </div>
                  {errors.livingEnvironment && (
                    <p className="mt-2 text-sm text-red-600">{errors.livingEnvironment.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    Climate
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: 'hot', label: 'Hot' },
                      { value: 'humid', label: 'Humid' },
                      { value: 'cold', label: 'Cold' },
                      { value: 'dry', label: 'Dry' },
                      { value: 'temperate', label: 'Temperate' }
                    ].map((option) => (
                      <label key={option.value} className="flex items-center">
                        <input
                          {...register('climate')}
                          type="radio"
                          value={option.value}
                          className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{option.label}</span>
                      </label>
                    ))}
                  </div>
                  {errors.climate && (
                    <p className="mt-2 text-sm text-red-600">{errors.climate.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    Activity Level
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: 'working', label: 'Working dog' },
                      { value: 'sports', label: 'Sports/agility' },
                      { value: 'daily_walks', label: 'Daily walks' },
                      { value: 'low_activity', label: 'Low activity/couch potato' }
                    ].map((option) => (
                      <label key={option.value} className="flex items-center">
                        <input
                          {...register('activityLevel')}
                          type="radio"
                          value={option.value}
                          className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{option.label}</span>
                      </label>
                    ))}
                  </div>
                  {errors.activityLevel && (
                    <p className="mt-2 text-sm text-red-600">{errors.activityLevel.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    Access to Grass/Dirt/Livestock
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        {...register('accessToGrassDirt')}
                        type="checkbox"
                        className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Yes, they have access to grass, dirt, or livestock</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recent Stress Factors
                </label>
                <textarea
                  {...register('stressFactors')}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Moving house, new baby, owner schedule changes, recent loss..."
                />
              </div>
            </div>

            {/* SECTION 5: Your Goals */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                Your Goals
              </h3>
              <p className="text-gray-600 mb-6">This is about what matters to you.</p>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    What's your number one concern right now?
                  </label>
                  <textarea
                    {...register('mainHealthConcern')}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Describe your main concern in your own words..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Any secondary concerns? (optional)
                  </label>
                  <textarea
                    {...register('secondaryConcerns')}
                    rows={2}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Other things you'd like to address..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    If I could wave a magic wand, in 3 months your dog would...
                  </label>
                  <textarea
                    {...register('priorityOutcome')}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Describe your ideal outcome..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    How much time & effort are you ready to put into their food plan?
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                      { value: 'low', label: 'Low - Simple changes only' },
                      { value: 'medium', label: 'Medium - Some meal prep okay' },
                      { value: 'high', label: 'High - I\'m all in!' }
                    ].map((option) => (
                      <label
                        key={option.value}
                        className="relative flex items-center p-4 border border-gray-300 rounded-lg hover:border-emerald-500 cursor-pointer group"
                      >
                        <input
                          {...register('timeAndBudgetLevel')}
                          type="radio"
                          value={option.value}
                          className="sr-only"
                        />
                        <span className="w-4 h-4 border-2 border-gray-300 rounded-full mr-3 group-hover:border-emerald-500 group-focus-within:border-emerald-500"></span>
                        <span className="text-sm text-gray-700 group-hover:text-gray-900">
                          {option.label}
                        </span>
                      </label>
                    ))}
                  </div>
                  {errors.timeAndBudgetLevel && (
                    <p className="mt-2 text-sm text-red-600">{errors.timeAndBudgetLevel.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Behavior Notes */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                Additional Notes
              </h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes About Behavior or Health
                </label>
                <textarea
                  {...register('behaviorNotes')}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Anything else you'd like us to know..."
                />
                {errors.behaviorNotes && (
                  <p className="mt-2 text-sm text-red-600">{errors.behaviorNotes.message}</p>
                )}
                <p className="mt-2 text-sm text-gray-500">
                  {watch('behaviorNotes')?.length || 0}/500 characters
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-center">
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-8 py-4 rounded-lg font-medium hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center space-x-2 text-lg"
              >
                <span>{isSubmitting ? 'Adding Dog...' : 'Add Dog & Get Plan'}</span>
                {!isSubmitting && <ArrowRight className="h-5 w-5" />}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Intake;