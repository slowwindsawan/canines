import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useDog } from "../context/DogContext";
import { Heart, ArrowRight } from "lucide-react";
import heartIcon from "../assets/heart.png"

const intakeSchema = z.object({
  name: z.string().min(2, "Please enter your dog's name"),
  breed: z.string().min(2, "Please enter your dog's breed"),
  age: z
    .number()
    .min(0.5, "Age must be at least 6 months")
    .max(25, "Age must be realistic"),
  weight: z
    .number()
    .min(1, "Weight must be at least 1 lb")
    .max(300, "Weight must be realistic"),
  dateOfBirth: z.string().optional(),
  sex: z.enum(["male", "female"], {
    errorMap: () => ({ message: "Please select sex" }),
  }),
  neuterStatus: z.enum(["intact", "neutered", "spayed"], {
    errorMap: () => ({ message: "Please select neuter status" }),
  }),
  bodyCondition: z.enum(["underweight", "ideal", "overweight"], {
    errorMap: () => ({ message: "Please select body condition" }),
  }),

  // Current Diet Details
  primaryFoodType: z.enum(["dry", "wet", "raw", "cooked", "mixed"], {
    errorMap: () => ({ message: "Please select primary food type" }),
  }),
  brandAndProduct: z.string().optional(),
  treatsAndExtras: z.string().optional(),
  feedingSchedule: z.enum(["once", "twice", "grazing", "other"], {
    errorMap: () => ({ message: "Please select feeding schedule" }),
  }),
  accessToOtherFoods: z.string().optional(),
  currentSupplements: z.string().optional(),
  waterSource: z.enum(["tap", "filtered", "tank", "bore", "other"], {
    errorMap: () => ({ message: "Please select water source" }),
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
  livingEnvironment: z.enum(["urban", "suburban", "rural", "farm"], {
    errorMap: () => ({ message: "Please select living environment" }),
  }),
  climate: z.enum(["hot", "humid", "cold", "dry", "temperate"], {
    errorMap: () => ({ message: "Please select climate" }),
  }),
  activityLevel: z.enum(["working", "sports", "daily_walks", "low_activity"], {
    errorMap: () => ({ message: "Please select activity level" }),
  }),
  accessToGrassDirt: z.boolean(),
  stressFactors: z.string().optional(),

  // Owner Goals & Priorities
  mainHealthConcern: z.string().optional(),
  secondaryConcerns: z.string().optional(),
  priorityOutcome: z.string().optional(),
  timeAndBudgetLevel: z.enum(["low", "medium", "high"], {
    errorMap: () => ({ message: "Please select time and budget level" }),
  }),

  // Existing fields
  stoolType: z.enum(["normal", "loose", "watery", "hard", "mucousy"], {
    errorMap: () => ({ message: "Please select a stool type" }),
  }),
  symptoms: z.array(z.string()).min(0),
  behaviorNotes: z.string().max(500, "Notes must be under 500 characters"),
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
      behaviorNotes: "",
    },
  });

  const watchedSymptoms = watch("symptoms");

  const symptomOptions = [
    // Digestion
    { id: "loose_stool", label: "Loose stool" },
    { id: "diarrhea", label: "Diarrhea" },
    { id: "constipation", label: "Constipation" },
    { id: "vomiting", label: "Vomiting" },
    { id: "excessive_gas", label: "Excessive gas" },
    { id: "bloating", label: "Bloating" },
    { id: "scooting", label: "Scooting/Anal gland issues" },

    // Skin & Coat
    { id: "skin_issues", label: "Skin issues/Itching" },
    { id: "hot_spots", label: "Hot spots" },
    { id: "yeast_smell", label: "Yeasty smell/Greasy coat" },
    { id: "hair_loss", label: "Hair loss/Thinning" },
    { id: "paw_licking", label: "Paw licking/Redness" },

    // Behavior & Mood
    { id: "anxiety", label: "Anxiety/Nervousness" },
    { id: "reactivity", label: "Reactivity/Aggression" },
    { id: "hyperactivity", label: "Hyperactivity" },
    { id: "lethargy", label: "Lethargy/Low energy" },
    { id: "poor_sleep", label: "Poor sleep quality" },

    // Other
    { id: "ear_infections", label: "Frequent ear infections" },
    { id: "eye_discharge", label: "Eye discharge/Staining" },
    { id: "bad_breath", label: "Bad breath" },
    { id: "loss_appetite", label: "Loss of appetite" },
    { id: "weight_loss", label: "Unexplained weight loss" },
    { id: "muscle_wastage", label: "Muscle wastage" },
  ];

  const stoolTypeOptions = [
    { value: "normal", label: "Normal (firm, well-formed)" },
    { value: "loose", label: "Loose (soft but formed)" },
    { value: "watery", label: "Watery/Liquid" },
    { value: "hard", label: "Hard/Dry" },
    { value: "mucousy", label: "Contains mucus or blood" },
  ];

  const handleSymptomChange = (symptomId: string, checked: boolean) => {
    const currentSymptoms = watchedSymptoms || [];
    if (checked) {
      setValue("symptoms", [...currentSymptoms, symptomId]);
    } else {
      setValue(
        "symptoms",
        currentSymptoms.filter((id) => id !== symptomId)
      );
    }
  };

  const onSubmit = async (data: IntakeFormData) => {
    setIsSubmitting(true);
    // Simulate API submission
    await new Promise((resolve) => setTimeout(resolve, 2000));

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
      navigate("/protocol");
    }

    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img src={heartIcon} style={{height:"84px"}}/>
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
              <p className="text-gray-600 mb-6">
                First things first, let's meet your dog.
              </p>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What’s your dog’s name?
                </label>
                <input
                  {...register("name")}
                  type="text"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="e.g., Max, Luna, Buddy"
                />
                {errors.name && (
                  <p className="mt-2 text-sm text-red-600">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Breed (or mix)
                  </label>
                  <input
                    {...register("breed")}
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="e.g., Golden Retriever, Mixed"
                  />
                  {errors.breed && (
                    <p className="mt-2 text-sm text-red-600">
                      {errors.breed.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Age (years)
                  </label>
                  <input
                    {...register("age", { valueAsNumber: true })}
                    type="number"
                    step="0.5"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="e.g., 3.5"
                  />
                  {errors.age && (
                    <p className="mt-2 text-sm text-red-600">
                      {errors.age.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date of Birth (optional)
                  </label>
                  <input
                    {...register("dateOfBirth")}
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
                      { value: "male", label: "Male" },
                      { value: "female", label: "Female" },
                    ].map((option) => (
                      <label key={option.value} className="flex items-center">
                        <input
                          {...register("sex")}
                          type="radio"
                          value={option.value}
                          className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          {option.label}
                        </span>
                      </label>
                    ))}
                  </div>
                  {errors.sex && (
                    <p className="mt-2 text-sm text-red-600">
                      {errors.sex.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    Neutered
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: "intact", label: "Yes" },
                      { value: "neutered", label: "No" },
                    ].map((option) => (
                      <label key={option.value} className="flex items-center">
                        <input
                          {...register("neuterStatus")}
                          type="radio"
                          value={option.value}
                          className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          {option.label}
                        </span>
                      </label>
                    ))}
                  </div>
                  {errors.neuterStatus && (
                    <p className="mt-2 text-sm text-red-600">
                      {errors.neuterStatus.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Weight
                  </label>
                  <div className="flex">
                    {/* Weight input */}
                    <input
                      {...register("weight", { valueAsNumber: true })}
                      type="number"
                      className="w-full px-4 py-3 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="e.g., 65"
                    />

                    {/* Unit selector */}
                    <select
                      {...register("weightUnit")}
                      className="px-3 py-3 border border-l-0 border-gray-300 rounded-r-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                    >
                      <option value="lb">lb</option>
                      <option value="kg">kg</option>
                    </select>
                  </div>

                  {/* Validation error */}
                  {errors.weight && (
                    <p className="mt-2 text-sm text-red-600">
                      {errors.weight.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Body Condition
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    {
                      value: "underweight",
                      label: "Underweight (ribs easily visible)",
                    },
                    {
                      value: "ideal",
                      label: "Ideal weight (ribs easily felt)",
                    },
                    {
                      value: "overweight",
                      label: "A bit cuddly (ribs hard to feel)",
                    },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className="relative flex items-center p-4 border border-gray-300 rounded-lg hover:border-emerald-500 cursor-pointer group"
                    >
                      <input
                        {...register("bodyCondition")}
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
                  <p className="mt-2 text-sm text-red-600">
                    {errors.bodyCondition.message}
                  </p>
                )}
              </div>
            </div>

            {/* SECTION 2: What's in the Bowl */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                What's in the Bowl
              </h3>
              <p className="text-gray-600 mb-6">
                Tell me what's going into the tank.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    Current diet
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: "dry", label: "Raw" },
                      { value: "wet", label: "Kibble" },
                      { value: "raw", label: "Cooked " },
                      { value: "cooked", label: "Mixed" },
                    ].map((option) => (
                      <label key={option.value} className="flex items-center">
                        <input
                          {...register("primaryFoodType")}
                          type="radio"
                          value={option.value}
                          className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          {option.label}
                        </span>
                      </label>
                    ))}
                  </div>
                  {errors.primaryFoodType && (
                    <p className="mt-2 text-sm text-red-600">
                      {errors.primaryFoodType.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    Feeding frequency
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: "once", label: "Once daily" },
                      { value: "twice", label: "Twice daily" },
                      { value: "grazing", label: "Thrice daily" },
                      { value: "other", label: "More than thrice daily" },
                    ].map((option) => (
                      <label key={option.value} className="flex items-center">
                        <input
                          {...register("feedingSchedule")}
                          type="radio"
                          value={option.value}
                          className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          {option.label}
                        </span>
                      </label>
                    ))}
                  </div>
                  {errors.feedingSchedule && (
                    <p className="mt-2 text-sm text-red-600">
                      {errors.feedingSchedule.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Brand and Product Name (if commercial)
                  </label>
                  <input
                    {...register("brandAndProduct")}
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
                      { value: "tap", label: "Tap water" },
                      { value: "filtered", label: "Filtered water" },
                      { value: "tank", label: "Tank water" },
                      { value: "bore", label: "Bore water" },
                      { value: "other", label: "Other" },
                    ].map((option) => (
                      <label key={option.value} className="flex items-center">
                        <input
                          {...register("waterSource")}
                          type="radio"
                          value={option.value}
                          className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          {option.label}
                        </span>
                      </label>
                    ))}
                  </div>
                  {errors.waterSource && (
                    <p className="mt-2 text-sm text-red-600">
                      {errors.waterSource.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Treats, Extras & Table Scraps
                </label>
                <textarea
                  {...register("treatsAndExtras")}
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
                    {...register("accessToOtherFoods")}
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
                    {...register("currentSupplements")}
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
              <p className="text-gray-600 mb-6">
                Now let's cover their health so we get the full picture.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Any known food intolerances?
                  </label>
                  <textarea
                    {...register("currentMedications")}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="List any current medications with dosage..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Previous gut issues?
                  </label>
                  <textarea
                    {...register("pastMedications")}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Any notable past medications..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Frequency of stool changes
                  </label>
                  <textarea
                    {...register("diagnosedConditions")}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Any diagnosed conditions (skin, joints, digestive, etc.)..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stool quality over last month?
                  </label>
                  <textarea
                    {...register("surgeriesOrInjuries")}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Any surgeries or major injuries..."
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                Skin & Coat
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Access to Other Foods
                  </label>
                  <input
                    type="number"
                    step="1"
                    min={0}
                    defaultValue={0}
                    max={10}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="e.g., 3.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    Any hot spots?
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: "intact", label: "Yes" },
                      { value: "neutered", label: "No" },
                    ].map((option) => (
                      <label key={option.value} className="flex items-center">
                        <input
                          {...register("neuterStatus")}
                          type="radio"
                          value={option.value}
                          className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          {option.label}
                        </span>
                      </label>
                    ))}
                  </div>
                  {errors.neuterStatus && (
                    <p className="mt-2 text-sm text-red-600">
                      {errors.neuterStatus.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    Coat issues?
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: "intact", label: "Dull" },
                      { value: "neutered", label: "Shedding" },
                      { value: "neutered", label: "Both" },
                      { value: "neutered", label: "None" },
                    ].map((option) => (
                      <label key={option.value} className="flex items-center">
                        <input
                          {...register("neuterStatus")}
                          type="radio"
                          value={option.value}
                          className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          {option.label}
                        </span>
                      </label>
                    ))}
                  </div>
                  {errors.neuterStatus && (
                    <p className="mt-2 text-sm text-red-600">
                      {errors.neuterStatus.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                Energy & Behaviour
              </h3>
              <p className="text-gray-600 mb-6">
                Tick all that apply — even if they seem unrelated.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    Average daily activity?
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: "intact", label: "Low" },
                      { value: "neutered", label: "Moderate" },
                      { value: "neutered", label: "High" },
                    ].map((option) => (
                      <label key={option.value} className="flex items-center">
                        <input
                          {...register("neuterStatus")}
                          type="radio"
                          value={option.value}
                          className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          {option.label}
                        </span>
                      </label>
                    ))}
                  </div>
                  {errors.neuterStatus && (
                    <p className="mt-2 text-sm text-red-600">
                      {errors.neuterStatus.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    Energy dips after meals?
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: "intact", label: "Yes" },
                      { value: "neutered", label: "No" },
                    ].map((option) => (
                      <label key={option.value} className="flex items-center">
                        <input
                          {...register("neuterStatus")}
                          type="radio"
                          value={option.value}
                          className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          {option.label}
                        </span>
                      </label>
                    ))}
                  </div>
                  {errors.neuterStatus && (
                    <p className="mt-2 text-sm text-red-600">
                      {errors.neuterStatus.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    Mood changes?
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: "intact", label: "Lethargic " },
                      { value: "neutered", label: "Restless " },
                      { value: "neutered", label: "Normal " },
                    ].map((option) => (
                      <label key={option.value} className="flex items-center">
                        <input
                          {...register("neuterStatus")}
                          type="radio"
                          value={option.value}
                          className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          {option.label}
                        </span>
                      </label>
                    ))}
                  </div>
                  {errors.neuterStatus && (
                    <p className="mt-2 text-sm text-red-600">
                      {errors.neuterStatus.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                Medical Background:
              </h3>
              <p className="text-gray-600 mb-6">
                What's their day-to-day like?
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    Past vet diagnoses?
                  </label>
                  <textarea
                    {...register("stressFactors")}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Past vet diagnoses"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    Current medications
                  </label>
                  <textarea
                    {...register("stressFactors")}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Your dog's current medicaitons"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-4">
                      Past antibiotic use?
                    </label>
                    <div className="space-y-2">
                      {[
                        { value: "intact", label: "Never" },
                        { value: "neutered", label: "Once" },
                        { value: "neutered", label: "Multiple in past year" },
                      ].map((option) => (
                        <label key={option.value} className="flex items-center">
                          <input
                            {...register("neuterStatus")}
                            type="radio"
                            value={option.value}
                            className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            {option.label}
                          </span>
                        </label>
                      ))}
                    </div>
                    {errors.neuterStatus && (
                      <p className="mt-2 text-sm text-red-600">
                        {errors.neuterStatus.message}
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-4">
                      Past antibiotic use?
                    </label>
                    <input
                      className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      type="date"
                    />
                    {errors.neuterStatus && (
                      <p className="mt-2 text-sm text-red-600">
                        {errors.neuterStatus.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                Supplement & Treat Intake:
              </h3>

              <div className="space-y-6 grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Supplements currently given?
                  </label>
                  <textarea
                    {...register("mainHealthConcern")}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Describe your main concern in your own words..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Treat frequency & type?
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: "intact", label: "Daily " },
                      { value: "neutered", label: "Weekly " },
                      { value: "neutered", label: "Never " },
                    ].map((option) => (
                      <label key={option.value} className="flex items-center">
                        <input
                          {...register("neuterStatus")}
                          type="radio"
                          value={option.value}
                          className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          {option.label}
                        </span>
                      </label>
                    ))}
                    <input
                      className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 max-w-[200px]"
                      placeholder="Custom"
                      type="text"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Behavior Notes */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                Owner Goals:
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Main reason for joining?
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: "intact", label: "Better stool " },
                      { value: "neutered", label: " Less itch " },
                      { value: "neutered", label: "More energy " },
                      { value: "neutered", label: "General wellness " },
                    ].map((option) => (
                      <label key={option.value} className="flex items-center">
                        <input
                          {...register("neuterStatus")}
                          type="checkbox"
                          value={option.value}
                          className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          {option.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Main reason for joining?
                  </label>
                  <textarea
                    {...register("stressFactors")}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Your dog's current medicaitons"
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    {watch("behaviorNotes")?.length || 0}/500 characters
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Willingness to follow strict plan?
                  </label>
                  <input
                    type="number"
                    step="1"
                    min={0}
                    defaultValue={0}
                    max={10}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="e.g., 3.5"
                  />
                  <p className="mt-2 text-sm text-gray-500">Rank on 0 to 10</p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-center">
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-8 py-4 rounded-lg font-medium hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center space-x-2 text-lg"
              >
                <span>
                  {isSubmitting ? "Adding Dog..." : "Add Dog & Get Plan"}
                </span>
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
