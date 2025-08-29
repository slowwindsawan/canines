import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { url, z } from "zod";
import { useAuth } from "../context/AuthContext";
import { useDog } from "../context/DogContext";
import { useAdmin } from "../context/AdminContext";
import { mockProgressData, mockProtocols } from "../data/mockData";
import paws from "../assets/paws.png";
import foodIcon from "../assets/pet-food.png";
import healthIcon from "../assets/health.png"
import energyIcon from "../assets/energy.png"
import stoolIcon from "../assets/stool.png"
import dogIcon from "../assets/dog.png"
import dishIcon from "../assets/dish.png"
import capsuleIcon from "../assets/capsule.png"
import boneIcon from "../assets/bone.png"
import reportIcon from "../assets/report.png"
import heartIcon from "../assets/heart.png"

import {
  ClipboardList,
  FileText,
  TrendingUp,
  Crown,
  BookOpen,
  Calendar,
  Award,
  ChevronDown,
  Plus,
  AlertTriangle,
  MessageCircle,
  Activity,
  Heart,
  AlertCircle,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  Minus,
  X,
  Utensils,
  Clock,
  Pill,
  Dog,
  Bone,
  Carrot,
  ArrowRight,
  Circle,
  Lock,
  Lightbulb,
} from "lucide-react";
import HealthUpdateForm from "../components/HealthUpdateForm";
import { jwtRequest } from "../env";

const progressSchema = z.object({
  symptoms: z.array(z.string()),
  notes: z.string().max(300, "Notes must be under 300 characters"),
  improvementScore: z.number().min(1).max(10),
});

type ProgressFormData = z.infer<typeof progressSchema>;

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const {
    selectDog,
    getProtocolHistory,
    getLastDiagnosisSubmission,
    isLoading,
  } = useDog();
  const { submissions } = useAdmin();
  const [showDogSelector, setShowDogSelector] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<
    "overview" | "protocol" | "tracker"
  >("overview");
  const [showProgressForm, setShowProgressForm] = React.useState(false);
  const [isSubmittingProgress, setIsSubmittingProgress] = React.useState(false);
  const [showHealthUpdateForm, setShowHealthUpdateForm] = React.useState(false);
  const [showBadgeSuccessPopup, setShowBadgeSuccessPopup]=useState(false)
  console.log(user)
  const [dogs, setDogs]=useState([])
  const [selectedDog, setSelectedDog]=useState(null)

  useEffect(()=>{
    setDogs(user?.dogs)
  },[user])

  useEffect(()=>{
    if(dogs){
      setSelectedDog(dogs[0] || null);
    }
  },[dogs])


  // Filter progress data for selected dog
  const dogProgressData = selectedDog
    ? mockProgressData.filter((entry) => entry.dogId === selectedDog.id)
    : [];

  // Find protocol for selected dog
  const dogProtocol = selectedDog
    ? mockProtocols.find((protocol) => protocol.dogId === selectedDog.id)
    : null;

  // Progress data state for tracker
  const [progressData, setProgressData] = React.useState(dogProgressData);

  // Update progress data when selected dog changes
  React.useEffect(() => {
    const filteredData = selectedDog
      ? mockProgressData.filter((entry) => entry.dogId === selectedDog.id)
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

  const watchedSymptoms = watch("symptoms");
  const watchedScore = watch("improvementScore");

  // Calculate dynamic metrics
  const calculateMetrics = () => {
    if (!selectedDog || dogProgressData.length === 0) {
      return {
        overallWellbeing: 0,
        energyLevel: 0,
        stoolQuality: 0,
        appetite: 0,
        recentTrend: "stable",
      };
    }

    const latestEntry = dogProgressData[0]; // Most recent entry
    const previousEntry = dogProgressData[1]; // Previous entry for comparison

    // Calculate metrics based on symptoms and improvement scores
    const overallWellbeing = latestEntry.improvementScore * 10;

    // Energy level based on lethargy symptoms and improvement score
    const hasLethargy = latestEntry.symptoms.includes("lethargy");
    const energyLevel = hasLethargy
      ? Math.max(30, latestEntry.improvementScore * 8)
      : latestEntry.improvementScore * 10;

    // Stool quality based on stool-related symptoms
    const hasStoolIssues = latestEntry.symptoms.some(
      (s) =>
        s.includes("stool") ||
        s.includes("diarrhea") ||
        s.includes("constipation")
    );
    const stoolQuality = hasStoolIssues
      ? Math.max(40, latestEntry.improvementScore * 9)
      : 95;

    // Appetite based on appetite loss symptoms
    const hasAppetiteIssues = latestEntry.symptoms.includes("loss_appetite");
    const appetite = hasAppetiteIssues
      ? Math.max(35, latestEntry.improvementScore * 8)
      : latestEntry.improvementScore * 10;

    // Calculate trend
    let recentTrend = "stable";
    if (previousEntry) {
      const trendDiff =
        latestEntry.improvementScore - previousEntry.improvementScore;
      if (trendDiff > 1) recentTrend = "improving";
      else if (trendDiff < -1) recentTrend = "declining";
    }

    return {
      overallWellbeing,
      energyLevel,
      stoolQuality,
      appetite,
      recentTrend,
    };
  };

  const metrics = calculateMetrics();

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "improving":
        return <ArrowUp className="w-4 h-4 text-green-600" />;
      case "declining":
        return <ArrowDown className="w-4 h-4 text-red-600" />;
      default:
        return <Minus className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "improving":
        return "text-green-600";
      case "declining":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getMetricColor = (value: number) => {
    if (value >= 80) return "bg-green-500";
    if (value >= 60) return "bg-yellow-500";
    if (value >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  const symptomOptions = [
    { id: "loose_stool", label: "Loose stool" },
    { id: "diarrhea", label: "Diarrhea" },
    { id: "constipation", label: "Constipation" },
    { id: "vomiting", label: "Vomiting" },
    { id: "lethargy", label: "Lethargy/Low energy" },
    { id: "loss_appetite", label: "Loss of appetite" },
    { id: "excessive_gas", label: "Excessive gas" },
    { id: "bloating", label: "Bloating" },
    { id: "skin_issues", label: "Skin issues/Itching" },
    { id: "bad_breath", label: "Bad breath" },
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

  const onSubmitProgress = async (data: ProgressFormData) => {
    if (!selectedDog) {
      alert("Please select a dog first");
      return;
    }

    setIsSubmittingProgress(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const newEntry = {
      id: Date.now().toString(),
      dogId: selectedDog.id,
      date: new Date().toISOString().split("T")[0],
      symptoms: data.symptoms,
      notes: data.notes,
      improvementScore: data.improvementScore,
    };

    setProgressData([newEntry, ...progressData]);
    reset();
    setShowProgressForm(false);
    setIsSubmittingProgress(false);
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-600 bg-green-100";
    if (score >= 6) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };

  const getScoreIcon = (score: number) => {
    if (score >= 7) return <CheckCircle className="h-5 w-5 text-green-600" />;
    return <AlertCircle className="h-5 w-5 text-yellow-600" />;
  };

  const handleHealthUpdateSuccess = () => {
    setShowHealthUpdateForm(false);
    // Optionally switch to protocol tab to show updated plan
    setActiveTab("protocol");
  };

  // Get protocol history and last diagnosis for selected dog
  const protocolHistory = selectedDog ? getProtocolHistory(selectedDog.id) : [];
  const lastDiagnosisSubmission = selectedDog
    ? getLastDiagnosisSubmission(selectedDog.id)
    : null;
  const currentProtocol = protocolHistory[0]; // Most recent protocol

  //Next steps
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  // Generate next steps based on dog's current phase and progress
  const generateNextSteps = (): NextStep[] => {
    const currentPhase = selectedDog?.currentProtocolPhase || "reset";
    const steps: NextStep[] = [];

    // Phase-specific steps
    if (currentPhase === "reset") {
      steps.push({
        id: "add-probiotics",
        title: "Add probiotics to morning meal",
        description: "Start with half dose for first 3 days, then full dose",
        icon: Pill,
        completed: false,
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        priority: "high",
        category: "supplement",
      });

      steps.push({
        id: "eliminate-treats",
        title: "Remove all treats and table scraps",
        description: "Stick to protocol meals only during reset phase",
        icon: Circle,
        completed: false,
        priority: "high",
        category: "diet",
      });
    }

    if (currentPhase === "rebuild") {
      steps.push({
        id: "add-fish-oil",
        title: "Add fish oil this week",
        description: "Start with 500mg daily with dinner",
        icon: Pill,
        completed: false,
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        priority: "medium",
        category: "supplement",
      });

      steps.push({
        id: "book-rebuild-call",
        title: "Book your Rebuild phase call",
        description: "Schedule 30-min consultation to review progress",
        icon: Phone,
        completed: false,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        priority: "high",
        category: "appointment",
      });
    }

    // General steps
    steps.push({
      id: "daily-gut-check",
      title: "Complete daily gut check",
      description: "Track mood, energy, skin, appetite, and stool quality",
      icon: CheckCircle,
      completed: false,
      priority: "medium",
      category: "monitoring",
    });

    steps.push({
      id: "read-gut-guide",
      title: "Read the Gut Repair Guide",
      description: "Learn about the science behind your dog's protocol",
      icon: BookOpen,
      completed: false,
      priority: "low",
      category: "education",
    });

    return steps.map((step) => ({
      ...step,
      completed: completedSteps.includes(step.id),
    }));
  };

  const nextSteps = generateNextSteps();
  const pendingSteps = nextSteps.filter((step) => !step.completed);
  const completedCount = nextSteps.filter((step) => step.completed).length;

  const toggleStepCompletion = (stepId: string) => {
    setCompletedSteps((prev) =>
      prev.includes(stepId)
        ? prev.filter((id) => id !== stepId)
        : [...prev, stepId]
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-gray-50";
      case "medium":
        return "bg-gray-50";
      case "low":
        return "bg-gray-50";
      default:
        return "bg-gray-50";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {showHealthUpdateForm && (
        <HealthUpdateForm
          onClose={() => setShowHealthUpdateForm(false)}
          onSuccess={handleHealthUpdateSuccess}
        />
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div
          className="bg-gradient-to-r p-2 text-white mb-8 rounded-2xl relative"
          style={{ background: "linear-gradient(45deg, #5A5A5A, #313030)" }}
        >
          <div
            className="absolute inset-0 bg-center bg-cover opacity-20"
            style={{
              backgroundImage: `url(${paws})`,
              backgroundSize: "auto",
            }}
          ></div>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between p-6">
            <div className="mb-6 lg:mb-0">
              <h1 className="text-3xl font-bold mb-2 ">
                Welcome back, {user?.name}!
              </h1>
              <p className="text-lg text-blue-100">
                Your dog's personalised gut health journey starts here
              </p>
            </div>
            <div className="flex flex-col items-start lg:items-end">
              <div className="flex items-center space-x-2 mb-2">
                <Award className="h-5 w-5 text-blue-200" />
                <span className="text-sm text-blue-200">Your Active Plan</span>
              </div>
              <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-white/20 text-white backdrop-blur-sm">
                {user?.subscription_tier||"Unknown"}
              </span>
            </div>
          </div>
          {/* Dog Management Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            {selectedDog ? (
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center space-x-6 mb-6 lg:mb-0">
                  <div className="w-16 h-16 bg-gradient-to-br bg-brand-offwhite rounded-full flex items-center justify-center">
                    <Dog className="h-8 w-8 text-brand-charcoal" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 ">
                      {selectedDog.name}
                    </h2>
                    <p className="text-gray-600">
                      {selectedDog.breed} • {selectedDog.age} years old •{" "}
                      {selectedDog.weight} lbs
                    </p>
                    <div className="flex items-center space-x-2 mt-2">
                      {getTrendIcon(metrics.recentTrend)}
                      <span
                        className={`text-sm font-medium ${getTrendColor(
                          metrics.recentTrend
                        )}`}
                      >
                        Health trend: {metrics.recentTrend}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {dogs.length > 1 && (
                    <div className="relative">
                      <button
                        onClick={() => setShowDogSelector(!showDogSelector)}
                        className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors"
                      >
                        <span className="text-sm font-medium">Switch Pet</span>
                        <ChevronDown className="h-4 w-4" />
                      </button>

                      {showDogSelector && (
                        <div className="absolute left-0 mt-2 w-72 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-lg border border-gray-200 z-10">
                          <div className="p-3 sm:p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-base sm:text-lg font-semibold text-gray-900 ">
                                Select Pet
                              </h3>
                              <button
                                onClick={() => setShowDogSelector(false)}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                <X className="h-5 w-5" />
                              </button>
                            </div>
                            <div className="space-y-2 max-h-60 sm:max-h-64 overflow-y-auto">
                              {dogs.map((dog) => (
                                <button
                                  key={dog.id}
                                  onClick={() => {
                                    selectDog(dog.id);
                                    setShowDogSelector(false);
                                    setSelectedDog(dog)
                                  }}
                                  className={`w-full flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 rounded-lg text-left transition-colors ${
                                    selectedDog?.id === dog.id
                                      ? "bg-brand-offwhite"
                                      : "hover:bg-gray-50"
                                  }`}
                                >
                                  <div className="w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center flex-shrink-0">
                                    <Dog className="h-4 w-4 text-brand-charcoal" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                      {dog.name}
                                    </p>
                                    <p className="text-xs text-gray-500 truncate">
                                      {dog.breed} • {dog.age} years old
                                    </p>
                                  </div>
                                  {selectedDog?.id === dog.id && (
                                    <CheckCircle className="h-5 w-5 text-brand-midgrey flex-shrink-0" />
                                  )}
                                </button>
                              ))}
                            </div>
                            <div className="mt-3 sm:mt-4 pt-3 border-t border-gray-200">
                              <Link
                                to="/intake"
                                onClick={() => setShowDogSelector(false)}
                                className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r  px-3 sm:px-4 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-[1.02] text-sm sm:text-base bg-brand-charcoal text-brand-offwhite hover:bg-gray-900 hover:text-white"
                              >
                                <Plus className="h-4 w-4" />
                                <span>Add New Pet</span>
                              </Link>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <Link
                    to="/intake"
                    className="flex items-center space-x-2 bg-gradient-to-r px-4 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-[1.02] bg-brand-charcoal text-brand-offwhite hover:bg-gray-900 hover:text-white"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add New Pet</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Dog className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2 ">
                  No pets added yet
                </h3>
                <p className="text-gray-600 mb-6">
                  Start your pet's health journey by adding their profile
                </p>
                <Link
                  to="/intake"
                  className="inline-flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-lg font-medium hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 transform hover:scale-[1.02]"
                >
                  <Plus className="h-5 w-5" />
                  <span>Add Your First Pet</span>
                </Link>
              </div>
            )}
          </div>
        </div>

        {showBadgeSuccessPopup ? (
          <>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div
                className="relative flex flex-col items-center justify-center p-8 rounded-2xl shadow-2xl border border-gray-200 w-full max-w-sm overflow-hidden 
    animate-[popIn_0.5s_ease-out_forwards] bg-white"
              >
                {/* Sun Glow BEHIND the card */}
                <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div className="w-[300px] h-[300px] rounded-full bg-gradient-to-br blur-3xl opacity-40 animate-pulse"></div>
                </div>

                {/* Looping Confetti */}
                <div className="absolute inset-0 pointer-events-none animate-[confettiLoop_2s_linear_infinite]">
                  <svg
                    className="absolute w-full h-full opacity-40"
                    viewBox="0 0 200 200"
                  >
                    <g fill="none" strokeWidth="4">
                      <circle cx="50" cy="50" r="4" stroke="#fbbf24" />
                      <circle cx="150" cy="50" r="4" stroke="#34d399" />
                      <circle cx="50" cy="150" r="4" stroke="#60a5fa" />
                      <circle cx="150" cy="150" r="4" stroke="#f87171" />
                    </g>
                  </svg>
                </div>

                {/* Badge Icon */}
                <div className="relative z-10 bg-gradient-to-r from-amber-400 to-yellow-500 p-6 rounded-full shadow-lg animate-bounce">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-12 w-12 text-white"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 2l2.09 6.26h6.57l-5.33 3.87 2.04 6.3L12 14.77l-5.37 3.66 2.04-6.3-5.33-3.87h6.57L12 2z" />
                  </svg>
                </div>

                {/* Text */}
                <h2 className="mt-6 text-2xl font-bold text-gray-800 relative z-10">
                  Badge Unlocked!
                </h2>
                <p className="text-sm text-gray-600 mt-1 relative z-10">
                  You’ve earned the “Pet Care Pro” badge 🎉
                </p>

                {/* CTA */}
                <button className="mt-6 px-5 py-2 bg-brand-midgrey text-white rounded-lg text-sm font-medium shadow relative z-10" onClick={()=>setShowBadgeSuccessPopup(false)}>
                  View Badges
                </button>
              </div>
            </div>
          </>
        ) : (
          <></>
        )}

        <div className="w-full rounded-xl bg-gradient-to-r bg-brand-offwhite border border-white p-3 sm:p-4 md:p-5 shadow-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-yellow-500 grid place-items-center font-semibold text-xs sm:text-sm border shadow-lg">
              <Lightbulb className="text-black" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] sm:text-xs uppercase tracking-wide black">
                Daily Gut Tip · Lauren
              </div>
              <p className="text-sm sm:text-base text-brand-midgrey break-words">
                Hydration boosts energy—add a splash of bone broth to water
                today.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs text-emerald-800/70">
            <span className="inline-block h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-brand-charcoal" />
            <span>Aug 13, 2025</span>
          </div>
        </div>

        {selectedDog && (
          <>
            {/* Tab Navigation */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6">
                  <button
                    onClick={() => setActiveTab("overview")}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === "overview"
                        ? "border-brand-charcoal"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveTab("protocol")}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === "protocol"
                        ? "text-brand-charcol border-brand-charcoal"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    Gut Health Protocol
                  </button>
                  <div className="relative inline-block group">
                    <button
                      onClick={() => setActiveTab("tracker")}
                      className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center ${
                        activeTab === "tracker"
                          ? "text-brand-charcoal border-brand-charcoal"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      Progress Tracker
                      <Lock
                        className="ml-2 text-bold text-brand-midgrey"
                        size={15}
                      />
                    </button>

                    {/* Popover */}
                    <div
                      className="absolute top-full -left-60 bg-white shadow-lg rounded-lg border border-gray-200 p-4 text-sm z-50 w-80 
  opacity-0 scale-95 invisible 
  group-hover:opacity-100 group-hover:scale-100 group-hover:visible 
  transition-all duration-300 ease-out origin-top"
                    >
                      <h3 className="font-semibold text-gray-800 mb-3">
                        Compare plans and features
                      </h3>

                      <div className="space-y-3">
                        {/* Foundation Plan */}
                        <div className="border rounded-lg p-3 hover:shadow-md transition-shadow duration-200">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-medium">Foundation</span>
                            <span className="text-gray-500">$29/mo</span>
                          </div>
                          <ul className="list-disc list-inside text-gray-600 text-xs space-y-1">
                            <li>AI gut plan</li>
                            <li>Tips</li>
                            <li>Library</li>
                            <li>Guides</li>
                          </ul>
                        </div>

                        {/* Therapeutic Plan */}
                        <div className="border-2 border-green-500 rounded-lg p-3 bg-green-50 hover:shadow-md transition-shadow duration-200">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-semibold text-green-700">
                              Therapeutic Plan (Recommended)
                            </span>
                            <span className="text-green-700 font-medium">
                              $69/mo
                            </span>
                          </div>
                          <ul className="list-disc list-inside text-gray-700 text-xs space-y-1">
                            <li>Foundations +</li>
                            <li>Weekly meal plans</li>
                            <li>Symptom tracker charts</li>
                            <li>Supplement cycling</li>
                            <li>Phase upgrade request</li>
                          </ul>
                        </div>

                        {/* Comprehensive Plan */}
                        <div className="border rounded-lg p-3 hover:shadow-md transition-shadow duration-200">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-medium">
                              Comprehensive Plan
                            </span>
                            <span className="text-gray-500">$149/mo</span>
                          </div>
                          <ul className="list-disc list-inside text-gray-600 text-xs space-y-1">
                            <li>Therapeutic +</li>
                            <li>Live group calls</li>
                            <li>Personalised AI-human reviews</li>
                            <li>Discount on 1:1 consult</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {/* Overview Tab */}
                {activeTab === "overview" && (
                  <div className="space-y-8">
                    {/* Today's Meal Plan */}
                    <div>
                      <div className="flex items-center space-x-2 mb-6">
                        <img src={dishIcon} style={{ height: "52px" }} />
                        <h2 className="text-xl font-bold text-gray-900 ">
                          Today's Meal Plan
                        </h2>
                        <div className="flex items-center space-x-2 bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
                          <Clock className="h-4 w-4" />
                          <span>
                            Phase: Reset - calming the storm in the gut - 56%
                          </span>
                        </div>
                      </div>

                      <p className="mb-4 text-sm">
                        Estimated time: 9 days, Next review: 03/05/2026
                      </p>

                      {dogProtocol ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-lg p-4 border border-orange-200">
                            <h3 className="font-semibold text-gray-900 mb-2 flex items-center ">
                              <span className="text-orange-500 mr-2">
                                <Bone />
                              </span>
                              Breakfast
                            </h3>
                            <p className="text-gray-700 text-sm">
                              {dogProtocol.mealPlan.breakfast}
                            </p>
                          </div>

                          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                            <h3 className="font-semibold text-gray-900 mb-2 flex items-center ">
                              <span className="text-blue-500 mr-2">
                                <Carrot />
                              </span>
                              Dinner
                            </h3>
                            <p className="text-gray-700 text-sm">
                              {dogProtocol.mealPlan.dinner}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 bg-gray-50 rounded-lg">
                          <Utensils className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2 ">
                            We haven’t built Maple’s plan yet. let’s fix that.
                            Start your gut check now.
                          </h3>
                          <p className="text-gray-600 mb-4">
                            Complete a health assessment to get a personalized
                            meal plan for {selectedDog.name}
                          </p>
                          <Link
                            to={"/intake?id="+selectedDog?.id}
                            className="inline-flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-2 rounded-lg font-medium hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 transform hover:scale-[1.02]"
                          >
                            <Plus className="h-4 w-4" />
                            <span>Start Assessment</span>
                          </Link>
                        </div>
                      )}
                    </div>

                    {/* Gut check */}
                    <>
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="text-center">
                          <div className="flex justify-center mb-4">
                            <img src={dogIcon} className="w-[160px] h-auto" />
                          </div>
                          <h2 className="text-xl font-bold text-gray-900 mb-2">
                            How's {selectedDog.name} doing today?
                          </h2>
                          <p className="text-gray-600 mb-6">
                            Quick daily check-in to track {selectedDog.name}'s
                            progress
                          </p>
                          <button
                            onClick={() => setShowHealthUpdateForm(true)}
                            className="bg-gradient-to-r from-pink-600 to-rose-600 text-white px-6 py-3 rounded-lg font-medium hover:from-pink-700 hover:to-rose-700 transition-all duration-200 transform hover:scale-[1.02] flex items-center space-x-2 mx-auto"
                          >
                            <span>Start Gut Check</span>
                            <ArrowRight className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </>

                    {/* Wins tracker */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Quick Wins Tracker
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center">
                          <div className="w-16 h-16 bg-brand-offwhite rounded-full flex items-center justify-center mx-auto mb-2">
                            <img src={stoolIcon} />
                          </div>
                          <h4 className="font-medium text-gray-900">
                            Stool Quality
                          </h4>
                          <p className="text-sm text-gray-600">Improving</p>
                        </div>

                        <div className="text-center">
                          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2">
                            <img src={energyIcon} />
                          </div>
                          <h4 className="font-medium text-gray-900">
                            Energy Level
                          </h4>
                          <p className="text-sm text-gray-600">Stable</p>
                        </div>

                        <div className="text-center">
                          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                          <img src={healthIcon} />
                          </div>
                          <h4 className="font-medium text-gray-900">
                            Overall Health
                          </h4>
                          <p className="text-sm text-gray-600">Good</p>
                        </div>
                      </div>
                    </div>

                    {/* <div>
                      <h2 className="text-xl font-bold text-gray-900 mb-6 ">
                        How Maple’s Doing
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-gray-700 ">
                              Overall Wellbeing
                            </h3>
                            <Heart className="w-5 h-5 text-pink-500" />
                          </div>
                          <div className="mb-3">
                            <div className="flex justify-between text-sm mb-2">
                              <span className="text-gray-600">Current</span>
                              <span className="font-bold text-gray-900">
                                {metrics.overallWellbeing}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                              <div
                                className={`h-3 rounded-full transition-all duration-500 ${getMetricColor(
                                  metrics.overallWellbeing
                                )}`}
                                style={{
                                  width: `${metrics.overallWellbeing}%`,
                                }}
                              ></div>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500">
                            Based on latest assessment
                          </p>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-gray-700 ">
                              Energy Level
                            </h3>
                            <Activity className="w-5 h-5 text-orange-500" />
                          </div>
                          <div className="mb-3">
                            <div className="flex justify-between text-sm mb-2">
                              <span className="text-gray-600">Current</span>
                              <span className="font-bold text-gray-900">
                                {metrics.energyLevel}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                              <div
                                className={`h-3 rounded-full transition-all duration-500 ${getMetricColor(
                                  metrics.energyLevel
                                )}`}
                                style={{ width: `${metrics.energyLevel}%` }}
                              ></div>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500">
                            Activity and playfulness
                          </p>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-gray-700 ">
                              Digestive Health
                            </h3>
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          </div>
                          <div className="mb-3">
                            <div className="flex justify-between text-sm mb-2">
                              <span className="text-gray-600">Current</span>
                              <span className="font-bold text-gray-900">
                                {metrics.stoolQuality}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                              <div
                                className={`h-3 rounded-full transition-all duration-500 ${getMetricColor(
                                  metrics.stoolQuality
                                )}`}
                                style={{ width: `${metrics.stoolQuality}%` }}
                              ></div>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500">
                            Stool quality and consistency
                          </p>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-gray-700 ">
                              Appetite
                            </h3>
                            <AlertCircle className="w-5 h-5 text-blue-500" />
                          </div>
                          <div className="mb-3">
                            <div className="flex justify-between text-sm mb-2">
                              <span className="text-gray-600">Current</span>
                              <span className="font-bold text-gray-900">
                                {metrics.appetite}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                              <div
                                className={`h-3 rounded-full transition-all duration-500 ${getMetricColor(
                                  metrics.appetite
                                )}`}
                                style={{ width: `${metrics.appetite}%` }}
                              ></div>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500">
                            Food interest and intake
                          </p>
                        </div>
                      </div>
                    </div> */}

                    {/* Next steps */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center">
                          <ArrowRight className="h-6 w-6 text-blue-600 mr-2" />
                          What to do now (Goals)
                        </h2>
                        <div className="text-sm text-gray-600">
                          {completedCount}/{nextSteps.length} completed
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-6">
                        <div className="flex justify-between text-sm text-gray-600 mb-2">
                          <span>Progress</span>
                          <span>
                            {Math.round(
                              (completedCount / nextSteps.length) * 100
                            )}
                            %
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-lime-600 to-brand-charcoal h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${
                                (completedCount / nextSteps.length) * 100
                              }%`,
                            }}
                          ></div>
                        </div>
                      </div>

                      {/* Steps List */}
                      <div className="space-y-4">
                        {nextSteps.map((step) => {
                          const IconComponent = step.icon;
                          const isOverdue =
                            step.dueDate &&
                            new Date(step.dueDate) < new Date() &&
                            !step.completed;

                          return (
                            <div
                              key={step.id}
                              className={`border-l-4 rounded-lg p-4 transition-all duration-200 ${
                                step.completed
                                  ? "border-l-green-500 bg-green-50 opacity-75"
                                  : getPriorityColor(step.priority)
                              } ${isOverdue ? "ring-2 ring-red-200" : ""}`}
                            >
                              <div className="flex items-start space-x-4">
                                <button
                                  onClick={() => {toggleStepCompletion(step.id);!step.completed?setShowBadgeSuccessPopup(true):null}}
                                  className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                    step.completed
                                      ? "bg-green-600 border-green-600 text-white"
                                      : "border-gray-300 hover:border-green-500"
                                  }`}
                                >
                                  {step.completed && (
                                    <CheckCircle className="h-4 w-4" />
                                  )}
                                </button>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <IconComponent
                                      className={`h-4 w-4 ${
                                        step.completed
                                          ? "text-green-600"
                                          : "text-gray-600"
                                      }`}
                                    />
                                    <h3
                                      className={`font-medium ${
                                        step.completed
                                          ? "text-green-800 line-through"
                                          : "text-gray-900"
                                      }`}
                                    >
                                      {step.title}
                                    </h3>
                                    {step.priority === "high" &&
                                      !step.completed && (
                                        <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                                          High Priority
                                        </span>
                                      )}
                                    {isOverdue && (
                                      <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                                        Overdue
                                      </span>
                                    )}
                                  </div>

                                  <p
                                    className={`text-sm ${
                                      step.completed
                                        ? "text-green-700"
                                        : "text-gray-600"
                                    }`}
                                  >
                                    {step.description}
                                  </p>

                                  {step.dueDate && !step.completed && (
                                    <div className="flex items-center space-x-1 mt-2 text-xs text-gray-500">
                                      <Clock className="h-3 w-3" />
                                      <span>
                                        Due:{" "}
                                        {new Date(
                                          step.dueDate
                                        ).toLocaleDateString()}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Encouragement Message */}
                      {pendingSteps.length > 0 && (
                        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-sm text-blue-800">
                            <strong>Keep it up!</strong> You're doing great with{" "}
                            {selectedDog.name}'s health journey.
                            {pendingSteps.length === 1
                              ? " Just one more step to complete!"
                              : ` ${pendingSteps.length} steps remaining.`}
                          </p>
                        </div>
                      )}

                      {/* All Complete Message */}
                      {pendingSteps.length === 0 && nextSteps.length > 0 && (
                        <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            <p className="text-sm text-green-800">
                              <strong>Excellent work!</strong> You've completed
                              all current action items for {selectedDog.name}.
                              New steps will appear as you progress through the
                              gut health protocol.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Recent Activity and Health Summary */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center space-x-2 mb-6">
                          <Calendar className="h-6 w-6 text-emerald-600" />
                          <h3 className="text-xl font-semibold text-gray-900 ">
                            Recent Activity
                          </h3>
                        </div>
                        <div className="space-y-4">
                          {dogProgressData.slice(0, 3).map((entry, index) => (
                            <div
                              key={entry.id}
                              className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg"
                            >
                              <div
                                className={`w-3 h-3 rounded-full mt-2 ${
                                  entry.improvementScore >= 7
                                    ? "bg-green-500"
                                    : entry.improvementScore >= 5
                                    ? "bg-yellow-500"
                                    : "bg-red-500"
                                }`}
                              ></div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <p className="text-sm font-medium text-gray-900">
                                    Gut Check #{dogProgressData.length - index}
                                  </p>
                                  <span className="text-xs text-gray-500">
                                    {new Date(entry.date).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 line-clamp-2">
                                  {entry.notes}
                                </p>
                                <div className="flex items-center space-x-2 mt-2">
                                  <span className="text-xs text-gray-500">
                                    Score:
                                  </span>
                                  <span
                                    className={`text-xs font-medium ${
                                      entry.improvementScore >= 7
                                        ? "text-green-600"
                                        : entry.improvementScore >= 5
                                        ? "text-yellow-600"
                                        : "text-red-600"
                                    }`}
                                  >
                                    {entry.improvementScore}/10
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}

                          {dogProgressData.length === 0 && (
                            <div className="text-center py-8">
                              <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                              <p className="text-gray-500 text-sm">
                                No activity logged yet
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center space-x-2 mb-6">
                          <TrendingUp className="h-6 w-6 text-emerald-600" />
                          <h3 className="text-xl font-semibold text-gray-900 ">
                            Health Summary
                          </h3>
                        </div>
                        <div className="space-y-6">
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium text-gray-700">
                                Overall Progress
                              </span>
                              <span className="text-sm text-emerald-600 font-semibold">
                                {metrics.overallWellbeing}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                              <div
                                className="bg-gradient-to-r bg-brand-charcoal bg-brand-midgrey h-3 rounded-full transition-all duration-500"
                                style={{
                                  width: `${metrics.overallWellbeing}%`,
                                }}
                              ></div>
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium text-gray-700">
                                Treatment Adherence
                              </span>
                              <span className="text-sm text-blue-600 font-semibold">
                                {dogProgressData.length > 0 ? "92%" : "0%"}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                              <div
                                className="bg-gradient-to-r bg-brand-charcoal bg-brand-midgrey h-3 rounded-full transition-all duration-500"
                                style={{
                                  width:
                                    dogProgressData.length > 0 ? "92%" : "0%",
                                }}
                              ></div>
                            </div>
                          </div>

                          {dogProgressData.length > 0 && (
                            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-4">
                              <div className="flex items-center space-x-2 mb-2">
                                {getTrendIcon(metrics.recentTrend)}
                                <span className="text-sm font-medium text-gray-900">
                                  Health Trend
                                </span>
                              </div>
                              <p className="text-sm text-gray-600">
                                {selectedDog.name}'s health is currently{" "}
                                <span
                                  className={`font-medium ${getTrendColor(
                                    metrics.recentTrend
                                  )}`}
                                >
                                  {metrics.recentTrend}
                                </span>{" "}
                                based on recent assessments.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Protocol Tab */}
                {activeTab === "protocol" && (
                  <div className="space-y-8">
                    {/* AI Diagnosis Display */}
                    {lastDiagnosisSubmission && (
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center space-x-2 mb-4">
                          <MessageCircle className="h-6 w-6 text-purple-600" />
                          <h3 className="text-xl font-semibold text-gray-900 ">
                            AI Assessment
                          </h3>
                          <span className="text-sm text-gray-500">
                            Confidence:{" "}
                            {Math.round(
                              lastDiagnosisSubmission.aiDiagnosis.confidence *
                                100
                            )}
                            %
                          </span>
                          {lastDiagnosisSubmission.isReevaluation && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                              Re-evaluation
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2 ">
                              Primary Concerns
                            </h4>
                            <ul className="space-y-1">
                              {lastDiagnosisSubmission.aiDiagnosis.primaryConcerns.map(
                                (concern, index) => (
                                  <li
                                    key={index}
                                    className="flex items-center space-x-2"
                                  >
                                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                    <span className="text-sm text-gray-700">
                                      {concern}
                                    </span>
                                  </li>
                                )
                              )}
                            </ul>
                          </div>

                          <div>
                            <h4 className="font-medium text-gray-900 mb-2 ">
                              AI Recommendations
                            </h4>
                            <ul className="space-y-1">
                              {lastDiagnosisSubmission.aiDiagnosis.recommendations
                                .slice(0, 3)
                                .map((rec, index) => (
                                  <li
                                    key={index}
                                    className="flex items-start space-x-2"
                                  >
                                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                                    <span className="text-sm text-gray-700">
                                      {rec}
                                    </span>
                                  </li>
                                ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Protocol History */}
                    {protocolHistory.length > 1 && (
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 ">
                          Protocol History
                        </h3>
                        <div className="space-y-3">
                          {protocolHistory.map((protocol, index) => (
                            <div
                              key={protocol.id}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                              <div>
                                <span className="font-medium text-gray-900">
                                  Version {protocol.version}
                                </span>
                                <span className="text-sm text-gray-500 ml-2">
                                  {new Date(
                                    protocol.createdAt
                                  ).toLocaleDateString()}
                                </span>
                                {index === 0 && (
                                  <span className="ml-2 px-2 py-1 bg-emerald-100 text-emerald-800 text-xs rounded-full">
                                    Current
                                  </span>
                                )}
                              </div>
                              {protocol.replacesProtocolId && (
                                <span className="text-xs text-gray-500">
                                  Updated from v{protocol.version - 1}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {currentProtocol ? (
                      <>
                        {/* Header */}
                        <div className="text-center">
                          <div className="flex justify-center mb-4">
                            <CheckCircle className="h-12 w-12 text-brand-midgrey" />
                          </div>
                          <h1 className="text-3xl font-bold text-gray-900 mb-2 ">
                            {selectedDog.name}'s Gut Health Protocol
                          </h1>
                          <p className="text-lg text-gray-600">
                            Custom plan for your {selectedDog.breed}
                          </p>
                          <div className="mt-4 inline-flex items-center space-x-2 bg-brand-offwhite text-brand-charcoal px-4 py-2 rounded-full text-sm font-medium">
                            <Calendar className="h-4 w-4" />
                            <span>
                              Created on{" "}
                              {new Date(
                                currentProtocol.createdAt
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                          {/* Meal Plan */}
                          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center space-x-2 mb-6">
                              <img src={boneIcon} className="w-10"/>
                              <h2 className="text-xl font-bold text-gray-900 ">
                                Daily Meal Plan
                              </h2>
                            </div>

                            {/* Phase banner */}
                            <div className="flex items-center my-4 w-full bg-white py-3 px-8">
                              {/* Step 1: Past */}
                              <div className="flex items-center">
                                <div className="w-6 h-6 flex items-center justify-center rounded-full bg-brand-charcoal text-white text-xs font-bold">
                                  ✓
                                </div>
                                <span className="ml-2 text-gray-600">
                                  Reset
                                </span>
                              </div>
                              <div className="mx-4 h-0.5 w-8 bg-brand-charcoal"></div>

                              {/* Step 2: Current */}
                              <div className="flex items-center">
                                <div className="w-6 h-6 flex items-center justify-center rounded-full bg-brand-midgrey text-white text-xs font-bold">
                                  2
                                </div>
                                <span className="ml-2 font-bold text-brand-midgrey">
                                  Rebuild
                                </span>
                              </div>
                              <div className="mx-4 h-0.5 w-8 bg-gray-300"></div>

                              {/* Step 3: Future */}
                              <div className="flex items-center">
                                <div className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-300 text-gray-500 text-xs font-bold">
                                  3
                                </div>
                                <span className="ml-2 text-gray-400">
                                  Strengthen
                                </span>
                              </div>
                            </div>

                            <div className="space-y-6">
                              <div className="bg-brand-offwhite rounded-lg p-4">
                                <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                                  <span className="w-3 h-3 bg-orange-500 rounded-full mr-2"></span>
                                  Breakfast
                                </h3>
                                <p className="text-gray-700">
                                  {currentProtocol.mealPlan.breakfast}
                                </p>
                              </div>

                              <div className="bg-brand-offwhite rounded-lg p-4">
                                <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                                  <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                                  Dinner
                                </h3>
                                <p className="text-gray-700">
                                  {currentProtocol.mealPlan.dinner}
                                </p>
                              </div>

                              <div className="bg-gray-50 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-gray-700">
                                    Meals per day:
                                  </span>
                                  <span className="text-lg font-bold text-emerald-600">
                                    {currentProtocol.mealPlan.mealsPerDay}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Supplements */}
                          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center space-x-2 mb-6">
                              <img src={capsuleIcon} className="w-10"/>
                              <h2 className="text-xl font-bold text-gray-900">
                                Supplement Protocol
                              </h2>
                            </div>

                            <div className="space-y-4">
                              {currentProtocol.supplements.map(
                                (supplement, index) => (
                                  <div
                                    key={index}
                                    className="flex items-start space-x-3 p-4 bg-brand-offwhite rounded-lg"
                                  >
                                    <CheckCircle className="h-5 w-5 text-brand-charcoal mt-0.5 flex-shrink-0" />
                                    <div>
                                      <p className="text-gray-900 font-medium">
                                        {supplement}
                                      </p>
                                    </div>
                                  </div>
                                )
                              )}
                            </div>

                            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                              <p className="text-sm text-yellow-800">
                                <strong>Important:</strong> Always consult with
                                your veterinarian before starting any new
                                supplements.
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Lifestyle Tips */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                          <div className="flex items-center space-x-2 mb-6">
                            <img src={heartIcon} style={{height:"34px"}}/>
                            <h2 className="text-xl font-bold text-gray-900">
                              Lifestyle Recommendations
                            </h2>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {currentProtocol.lifestyleTips.map((tip, index) => (
                              <div
                                key={index}
                                onClick={(e) => {
                                  const [hollow, filled] =
                                    e.currentTarget.querySelectorAll("svg");
                                  hollow.classList.toggle("hidden");
                                  filled.classList.toggle("hidden");
                                }}
                                className="flex items-start space-x-3 p-4 bg-emerald-50 rounded-lg cursor-pointer"
                              >
                                {/* Hollow (default) */}
                                <Circle className="h-5 w-5 text-brand-charcoal mt-0.5 flex-shrink-0" />

                                {/* Filled (hidden by default) */}
                                <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0 hidden" />

                                <p className="text-gray-700">{tip}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Next Steps */}
                        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 p-6">
                          <h3 className="text-lg font-bold text-gray-900 mb-4 ">
                            Next Steps
                          </h3>
                          <div className="space-y-3">
                            <div className="flex items-center space-x-3">
                              <span className="flex-shrink-0 w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                1
                              </span>
                              <p className="text-gray-700">
                                Start implementing the meal plan gradually over
                                7-10 days
                              </p>
                            </div>
                            <div className="flex items-center space-x-3">
                              <span className="flex-shrink-0 w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                2
                              </span>
                              <p className="text-gray-700">
                                Begin supplement routine as recommended
                              </p>
                            </div>
                            <div className="flex items-center space-x-3">
                              <span className="flex-shrink-0 w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                3
                              </span>
                              <p className="text-gray-700">
                                Track your dog's progress weekly using our
                                tracker
                              </p>
                            </div>
                            <div className="flex items-center space-x-3">
                              <span className="flex-shrink-0 w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                4
                              </span>
                              <p className="text-gray-700">
                                Schedule follow-up assessment in 4 weeks
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                          <div className="flex flex-col sm:flex-row gap-4">
                            <button className="bg-gradient-to-r px-6 py-3 rounded-lg font-medium transition-all duration-200 transform hover:scale-[1.02] flex items-center justify-center space-x-2 bg-brand-charcoal text-brand-offwhite hover:bg-brand-midgrey hover:text-white">
                              <span>📄</span>
                              <span>Download Plan (PDF)</span>
                            </button>
                            <button className="bg-gradient-to-r px-6 py-3 rounded-lg font-medium transition-all duration-200 transform hover:scale-[1.02] flex items-center justify-center space-x-2 bg-blue-700 text-brand-offwhite hover:bg-brand-midgrey hover:text-white">
                              <span>📅</span>
                              <span>Book Consultation</span>
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-16">
                        <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                          <img src={heartIcon} style={{height:"34px"}}/>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-4 ">
                          Gut Health Protocol Not Available
                        </h1>
                        <p className="text-lg text-gray-600 mb-2">
                          {selectedDog.name} doesn't have a gut health protocol
                          yet
                        </p>
                        <p className="text-gray-600 mb-8">
                          Complete a health assessment to generate a
                          personalized gut health protocol
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                          <button
                            onClick={() => setShowHealthUpdateForm(true)}
                            className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-lg font-medium hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 transform hover:scale-[1.02]"
                          >
                            Start Health Assessment
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Tracker Tab */}
                {activeTab === "tracker" && (
                  <div className="space-y-8">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2 ">
                          {selectedDog.name}'s Progress Tracker
                        </h1>
                        <p className="text-lg text-gray-600">
                          Monitor your {selectedDog.breed}'s health journey
                        </p>
                      </div>
                      <button
                        onClick={() => setShowProgressForm(!showProgressForm)}
                        className="mt-4 sm:mt-0 bg-gradient-to-r px-6 py-3 rounded-lg font-medium transition-all duration-200 transform hover:scale-[1.02] flex items-center space-x-2 bg-brand-charcoal text-brand-offwhite hover:bg-gray-900 hover:text-white"
                      >
                        <Plus className="h-5 w-5" />
                        <span>Log Progress</span>
                      </button>
                    </div>

                    {/* Progress Form */}
                    {showProgressForm && (
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center space-x-2 mb-6">
                          <Calendar className="h-6 w-6 text-emerald-600" />
                          <h2 className="text-xl font-bold text-gray-900 ">
                            Weekly Check-In for {selectedDog.name}
                          </h2>
                        </div>

                        <form
                          onSubmit={handleSubmit(onSubmitProgress)}
                          className="space-y-6"
                        >
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
                                    checked={
                                      watchedSymptoms?.includes(symptom.id) ||
                                      false
                                    }
                                    onChange={(e) =>
                                      handleSymptomChange(
                                        symptom.id,
                                        e.target.checked
                                      )
                                    }
                                    className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                  />
                                  <span className="ml-3 text-sm text-gray-700">
                                    {symptom.label}
                                  </span>
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
                              <span className="text-sm text-gray-500">
                                Poor
                              </span>
                              <input
                                {...register("improvementScore", {
                                  valueAsNumber: true,
                                })}
                                type="range"
                                min="1"
                                max="10"
                                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                              />
                              <span className="text-sm text-gray-500">
                                Excellent
                              </span>
                              <span className="text-lg font-bold text-emerald-600 min-w-[2rem] text-center">
                                {watchedScore}
                              </span>
                            </div>
                          </div>

                          {/* Notes */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Progress Notes
                            </label>
                            <textarea
                              {...register("notes")}
                              rows={4}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                              placeholder="Describe any changes in behavior, energy, appetite, etc..."
                            />
                            {errors.notes && (
                              <p className="mt-2 text-sm text-red-600">
                                {errors.notes.message}
                              </p>
                            )}
                          </div>

                          {/* Submit Button */}
                          <div className="flex space-x-3">
                            <button
                              type="submit"
                              disabled={isSubmittingProgress}
                              className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-lg font-medium hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                            >
                              {isSubmittingProgress
                                ? "Submitting..."
                                : "Submit Progress"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowProgressForm(false)}
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
                        <h2 className="text-xl font-bold text-gray-900 ">
                          {selectedDog.name}'s Progress History
                        </h2>
                      </div>

                      <div className="space-y-4">
                        {progressData.map((entry) => (
                          <div
                            key={entry.id}
                            className="border border-gray-200 rounded-lg p-6 hover:shadow-sm transition-shadow"
                          >
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4">
                              <div className="flex items-center space-x-4 mb-3 md:mb-0">
                                <div className="text-sm text-gray-500">
                                  {new Date(entry.date).toLocaleDateString()}
                                </div>
                                <div className="flex items-center space-x-2">
                                  {getScoreIcon(entry.improvementScore)}
                                  <span
                                    className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(
                                      entry.improvementScore
                                    )}`}
                                  >
                                    Score: {entry.improvementScore}/10
                                  </span>
                                </div>
                              </div>
                            </div>

                            {entry.symptoms.length > 0 && (
                              <div className="mb-3">
                                <span className="text-sm font-medium text-gray-700">
                                  Symptoms:{" "}
                                </span>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {entry.symptoms.map((symptom) => (
                                    <span
                                      key={symptom}
                                      className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full"
                                    >
                                      {symptomOptions.find(
                                        (opt) => opt.id === symptom
                                      )?.label || symptom}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {entry.notes && (
                              <div>
                                <span className="text-sm font-medium text-gray-700">
                                  Notes:{" "}
                                </span>
                                <p className="text-gray-600 text-sm mt-1">
                                  {entry.notes}
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {progressData.length === 0 && (
                        <div className="text-center py-12">
                          <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2 ">
                            No progress entries for {selectedDog.name} yet
                          </h3>
                          <p className="text-gray-600">
                            Start tracking {selectedDog.name}'s progress to see
                            improvements over time.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
