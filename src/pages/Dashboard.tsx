import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { url, z } from "zod";
import { useAuth } from "../context/AuthContext";
import { useDog } from "../context/DogContext";
import { useAdmin } from "../context/AdminContext";
import { mockProgressData, mockProtocols } from "../data/mockData";
import paws from "../assets/paws.png";
import healthIcon from "../assets/health.png";
import energyIcon from "../assets/energy.png";
import stoolIcon from "../assets/stool.png";
import dogIcon from "../assets/dog.png";
import dishIcon from "../assets/dish.png";
import capsuleIcon from "../assets/capsule.png";
import boneIcon from "../assets/bone.png";
import heartIcon from "../assets/heart.png";

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
  CircleDashed,
} from "lucide-react";
import HealthUpdateForm from "../components/HealthUpdateForm";
import { isSubscriptionActive, jwtRequest } from "../env";
import SubscribeNow from "../components/SubscriptionStatus";
import PlansComparision from "../components/PlansComparision";
import GamifiedGoals from "./admin/compoents/GamifiedGoals";
import { motion, AnimatePresence } from "framer-motion";

const progressSchema = z.object({
  symptoms: z.array(z.string()),
  notes: z.string().max(300, "Notes must be under 300 characters"),
  improvementScore: z.number().min(1).max(10),
});

function addQueryParam(key, value) {
  const url = new URL(window.location);
  url.searchParams.set(key, value);
  window.history.pushState({}, '', url);
}

type ProgressFormData = z.infer<typeof progressSchema>;

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const {
    selectDog,
    getProtocolHistory,
    getLastDiagnosisSubmission,
    isLoading,
  } = useDog();
  const navigate = useNavigate();
  const { submissions } = useAdmin();
  const [showDogSelector, setShowDogSelector] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<
    "overview" | "protocol" | "tracker"
  >("overview");
  const [showProgressForm, setShowProgressForm] = React.useState(false);
  const [isSubmittingProgress, setIsSubmittingProgress] = React.useState(false);
  const [showHealthUpdateForm, setShowHealthUpdateForm] = React.useState(false);
  const [unit, setUnit] = useState("kg");
  const [dogs, setDogs] = useState([]);
  const [selectedDog, setSelectedDog] = useState(null);
  const [updatingIndex, setUpdatingIndex] = useState<number | null>(null);
  const [showIframe, setShowIframe] = useState(false);
  const [showSubmittingGutForm, setShowSubmittingGutForm] = useState(false);
  const calendlyLink = "https://calendly.com/hello-thecaninenutritionist/45min";

  useEffect(() => {
    setDogs(user?.dogs);
  }, [user]);

  useEffect(() => {
    if (dogs) {
      const params = new URLSearchParams(window.location.search);
      const dog_id = params.get("dog_id"); // Replace 'key' with your parameter name
      const sd = dogs.find((dog) => dog.id === dog_id);
      setSelectedDog(sd || dogs[dogs?.length - 1] || null);
    }
  }, [dogs]);

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
    formState: { errors },
    setValue,
    watch,
    handleSubmit,
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

  const symptomOptions = [
    { id: "loose_stool", label: "Loose stool", name: "symptom-loose-stool" },
    { id: "diarrhea", label: "Diarrhea" },
    { id: "constipation", label: "Constipation", name: "symptom-constipation" },
    { id: "vomiting", label: "Vomiting", name: "symptom-vomiting" },
    { id: "lethargy", label: "Lethargy/Low energy", name: "symptom-lethargy" },
    {
      id: "loss_appetite",
      label: "Loss of appetite",
      name: "symptom-loss-of-appetite",
    },
    {
      id: "excessive_gas",
      label: "Excessive gas",
      name: "symptom-exessive-gas",
    },
    { id: "bloating", label: "Bloating", name: "symptom-bloating" },
    {
      id: "skin_issues",
      label: "Skin issues/Itching",
      name: "symptom-skin-issues",
    },
    { id: "bad_breath", label: "Bad breath", name: "symptom-bad-breathe" },
    {
      id: "blood_in_stood",
      label: "Blood in stool",
      name: "symptom-blood-in-stool",
    },
    {
      id: "black_tary_stoll",
      label: "Black tary stool",
      name: "symptom-black-tary-stool",
    },
  ];

  function humanReadableProgressForm(formJson) {
    const sections = [];

    sections.push(`Dog Name: ${formJson["dog-name"] || "-"}`);
    sections.push(`Dog age: ${selectedDog?.form_data?.age || "-"}`);
    sections.push(`Dog breed: ${selectedDog.breed || "-"}`);
    sections.push(
      `Age: ${formJson["dog-age"] ? formJson["dog-age"] + " months" : "-"}`
    );
    sections.push(`Breed: ${formJson["dog-breed"] || "-"}`);
    sections.push(
      `Weight: ${
        formJson["dog-weight"]
          ? `${formJson["dog-weight"]} ${formJson["dog-weight-unit"]}`
          : "-"
      }`
    );
    sections.push(
      `Tolerance to Egg: ${formJson["dog-is-tolerance-to-egg"] || "-"}`
    );
    sections.push(`Activity Level: ${formJson["dog-activity-level"] || "-"}`);
    sections.push(`Body Condition: ${formJson["dog-body-condition"] || "-"}`);

    // Core health
    sections.push(
      `Vomiting Frequency (per day): ${
        formJson["dog-vomiting-frequency-per-day"] || "-"
      }`
    );
    sections.push(
      `Symptoms Duration (days): ${
        formJson["dog-symptoms-duration-in-days"] || "-"
      }`
    );
    sections.push(`Appetite: ${formJson["appetite-compare"] || "-"}`);
    sections.push(`Daily Food Intake: ${formJson["daily-food"] || "-"}`);
    sections.push(`Energy: ${formJson["daily-energy"] || "-"}`);
    sections.push(`Sleep Quality: ${formJson["sleep-quality"] || "-"}`);
    sections.push(`Mobility: ${formJson["mobility"] || "-"}`);
    sections.push(`Mood: ${formJson["behaviour-mood"] || "-"}`);
    sections.push(`Other Behaviour: ${formJson["behaviour-other"] || "-"}`);

    // Stool details
    const stoolObs = [
      formJson["stool-detail-blood"] === "on" ? "Blood" : null,
      formJson["stool-detail-mucus"] === "on" ? "Mucus" : null,
      formJson["stool-detail-gas"] === "on" ? "Gas" : null,
      formJson["stool-detail-smelly"] === "on" ? "Smelly" : null,
    ].filter(Boolean);
    sections.push(`Stool Consistency: ${formJson["stool-consistency"] || "-"}`);
    sections.push(
      `Stool Observations: ${stoolObs.length > 0 ? stoolObs.join(", ") : "-"}`
    );

    // Skin issues
    const skinIssues = [
      formJson["skin-redness"] === "on" ? "Redness" : null,
      formJson["skin-hotspots"] === "on" ? "Hotspots" : null,
      formJson["skin-itch-severity"]
        ? `Itching (${formJson["skin-itch-severity"]})`
        : null,
    ].filter(Boolean);
    sections.push(
      `Skin Issues: ${skinIssues.length > 0 ? skinIssues.join(", ") : "-"}`
    );

    // Scan checks
    const scans = [
      formJson["scan-behaviour"] === "on" ? "Behaviour" : null,
      formJson["scan-itching"] === "on" ? "Itching" : null,
      formJson["scan-limping"] === "on" ? "Limping" : null,
      formJson["scan-skin-changes"] === "on" ? "Skin Changes" : null,
    ].filter(Boolean);
    sections.push(`Scans Noted: ${scans.length > 0 ? scans.join(", ") : "-"}`);

    // Diet preferences
    const prefs = [
      formJson["dog-owner-preference-home-cooked"] === "on"
        ? "Home-cooked"
        : null,
      formJson["dog-owner-preference-no-grains"] === "on" ? "No grains" : null,
      formJson["dog-owner-preference-no-poultry"] === "on"
        ? "No poultry"
        : null,
    ].filter(Boolean);
    sections.push(
      `Diet Preferences: ${prefs.length > 0 ? prefs.join(", ") : "-"}`
    );
    sections.push(
      `Owner’s Primary Goal: ${formJson["dog-owner-primary-goal"] || "-"}`
    );

    // Supplements
    const supplements = [
      formJson["supplement-0"] === "on" ? "Supplement 0" : null,
      formJson["supplement-1"] === "on" ? "Supplement 1" : null,
      formJson["supplement-2"] === "on" ? "Supplement 2" : null,
    ].filter(Boolean);
    if (formJson["supplement-new"]) {
      supplements.push(
        `New Supplement: ${formJson["supplement-new"]} (at ${formJson["supplement-time"]})`
      );
    }
    sections.push(
      `Supplements: ${supplements.length > 0 ? supplements.join(", ") : "-"}`
    );

    // Notes
    sections.push(`Additional Notes: ${formJson["additional-notes"] || "-"}`);

    return sections.join("\n");
  }

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

  const onSubmitProgress = async (e) => {
    e.preventDefault();
    setShowSubmittingGutForm(true);
    const formData = JSON.stringify(
      humanReadableProgressForm(
        Object.fromEntries(new FormData(e.currentTarget))
      )
    );

    if (!selectedDog) {
      alert("Please select a dog first");
      return;
    }

    setIsSubmittingProgress(true);

    try {
      // send to backend
      const payload = {
        form_data: formData,
      };

      const response = await jwtRequest(
        `/dogs/update/${selectedDog?.id}`,
        "PUT",
        payload
      );

      if (response?.success) {
        alert("Dog updated successfully!");
        window.location.href = "/dashboard";
      } else {
        alert(response?.message || "Failed to update dog.");
      }

      // update local state with new entry
      if (true) {
        alert("Successfully submitted.");
        setSelectedDog({ ...selectDog, progress: response });
      }
      setShowProgressForm(false);
    } catch (err) {
      console.error("Error submitting progress:", err);
      alert("Failed to submit progress");
    } finally {
      setIsSubmittingProgress(false);
    }
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

  const toggleStepCompletion = async (stepId: any) => {
    setSelectedDog((prevDog) => {
      if (!prevDog) return prevDog;

      const updatedOverview = {
        ...prevDog.overview,
        what_to_do_goals: prevDog.overview.what_to_do_goals?.map((step) =>
          step.id === stepId ? { ...step, completed: !step.completed } : step
        ),
      };

      // Optimistically update UI
      const updatedDog = { ...prevDog, overview: updatedOverview };

      // Fire API call in background
      (async () => {
        try {
          const response = await jwtRequest(`/dogs/update-by-payload`, "PUT", {
            id: prevDog.id,
            overview: updatedOverview, // ✅ send updated overview
          });

          if (response?.success) {
            setSelectedDog((d) => ({ ...d, ...response.dog })); // sync with server response
          } else {
            alert("Failed to update step. Please try again.");
          }
        } catch (error) {
          console.error("Error updating step:", error);
          alert("Something went wrong while updating.");
        }
      })();

      return updatedDog;
    });
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
        {!user?.subscription_current_period_end ||
        !isSubscriptionActive(user?.subscription_current_period_end) ? (
          <></>
        ) : (
          <>
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
                    <span className="text-sm text-blue-200">
                      Your Active Plan
                    </span>
                  </div>
                  <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-white/20 text-white backdrop-blur-sm">
                    {user?.subscription_tier &&
                    user?.subscription_status == "active"
                      ? user?.subscription_tier
                      : "No plan"}
                  </span>
                </div>
              </div>
              {/* Dog Management Section */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                {selectedDog ? (
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center space-x-6 mb-6 lg:mb-0">
                      <div className="w-16 h-16 bg-gradient-to-br bg-brand-offwhite rounded-full flex items-center justify-center">
                        {selectedDog?.image_url ? (
                          <>
                            <img
                              className="w-16 h-16 bg-gradient-to-br bg-brand-offwhite rounded-full flex items-center justify-center"
                              src={selectedDog?.image_url}
                            />
                          </>
                        ) : (
                          <>
                            <Dog className="h-8 w-8 text-brand-charcoal" />
                          </>
                        )}
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 ">
                          {selectedDog.name}
                        </h2>
                        <p className="text-gray-600">
                          {selectedDog.breed} • {selectedDog?.form_data?.age}{" "}
                          years old •{" "}
                          {
                            selectedDog?.form_data?.fullFormFields?.find(
                              (f) => f.name === "weight"
                            )?.value
                          }{" "}
                          lbs
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
                      {dogs?.length > 1 && (
                        <div className="relative">
                          <button
                            onClick={() => setShowDogSelector(!showDogSelector)}
                            className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors"
                          >
                            <span className="text-sm font-medium">
                              Switch Pet
                            </span>
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
                                  {dogs
                                    ?.slice()
                                    .reverse()
                                    .map((dog) => (
                                      <button
                                        key={dog.id}
                                        onClick={() => {
                                          selectDog(dog.id);
                                          setShowDogSelector(false);
                                          setSelectedDog(dog);
                                          addQueryParam("dog_id", dog.id);
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
                                    to={
                                      isSubscriptionActive(
                                        user?.subscription_current_period_end
                                      )
                                        ? "/intake"
                                        : "#"
                                    }
                                    onClick={() => {
                                      if (
                                        isSubscriptionActive(
                                          user?.subscription_current_period_end
                                        )
                                      ) {
                                        setShowDogSelector(false);
                                      }
                                    }}
                                    className={` w-full flex items-center justify-center space-x-2 px-4 sm:px-6 py-3 rounded-xl font-semibold text-sm sm:text-base transition-all duration-200 transform ${
                                      isSubscriptionActive(
                                        user?.subscription_current_period_end
                                      )
                                        ? "bg-gradient-to-r from-brand-charcoal to-brand-midgrey text-white hover:scale-[1.03] hover:shadow-lg"
                                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                                    }
                    `}
                                  >
                                    <Plus
                                      className={`h-5 w-5 ${
                                        isSubscriptionActive(
                                          user?.subscription_current_period_end
                                        )
                                          ? "text-white"
                                          : "text-gray-400"
                                      }`}
                                    />
                                    <span>
                                      {isSubscriptionActive(
                                        user?.subscription_current_period_end
                                      )
                                        ? "Add New Pet"
                                        : "Upgrade to Add More Pets"}
                                    </span>
                                  </Link>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <Link
                        to={
                          isSubscriptionActive(
                            user?.subscription_current_period_end
                          )
                            ? "/intake"
                            : "#"
                        }
                        onClick={() => {
                          if (
                            isSubscriptionActive(
                              user?.subscription_current_period_end
                            )
                          ) {
                            setShowDogSelector(false);
                          }
                        }}
                        className={` w-full flex items-center justify-center space-x-2 px-4 sm:px-6 py-3 rounded-xl font-semibold text-sm sm:text-base transition-all duration-200 transform ${
                          isSubscriptionActive(
                            user?.subscription_current_period_end
                          )
                            ? "bg-gradient-to-r from-brand-charcoal to-brand-midgrey text-white hover:scale-[1.03] hover:shadow-lg"
                            : "bg-gray-300 text-gray-500 cursor-not-allowed"
                        }
                    `}
                      >
                        <Plus
                          className={`h-5 w-5 ${
                            isSubscriptionActive(
                              user?.subscription_current_period_end
                            )
                              ? "text-white"
                              : "text-gray-400"
                          }`}
                        />
                        <span>
                          {isSubscriptionActive(
                            user?.subscription_current_period_end
                          )
                            ? "Add New Pet"
                            : "Upgrade to Add More Pets"}
                        </span>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <img src={dogIcon} className="w-[160px] h-auto" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2 ">
                      No pets added yet
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Start your pet's health journey by adding their profile
                    </p>
                    <Link
                      to="/intake"
                      className="inline-flex items-center space-x-2 bg-gradient-to-r from-[#3a3a3a] to-[#6e6e6e] text-white px-6 py-3 rounded-lg font-medium hover:from-[#4a4a4a] hover:to-[#7e7e7e] transition-all duration-200 transform hover:scale-[1.02]"
                    >
                      <Plus className="h-5 w-5" />
                      <span>Add Your First Pet</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        <div className="w-full rounded-xl bg-gradient-to-r bg-brand-offwhite border border-white p-3 sm:p-4 md:p-5 shadow-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div className="flex gap-3 items-start">
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-yellow-500 grid place-items-center font-semibold text-xs sm:text-sm border shadow-lg">
              <Lightbulb className="text-black w-8 h-8 p-1" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] sm:text-xs uppercase tracking-wide black">
                <span className="font-bold">Daily Gut Tip ·</span> Lauren
              </div>
              <p className="text-sm sm:text-base text-brand-midgrey break-words">
                {user?.tips}
              </p>
            </div>
          </div>
        </div>
        {!user?.subscription_current_period_end ||
        !isSubscriptionActive(user?.subscription_current_period_end) ? (
          <>
            {user ? (
              <>
                <SubscribeNow
                  currentStatus={user?.subscription_status}
                  currentPlan={user?.subscription_tier}
                />
              </>
            ) : (
              <></>
            )}
          </>
        ) : (
          <>
            {selectedDog && (
              <>
                {/* Tab Navigation */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
                  {selectedDog?.status == "in_review" ? (
                    <></>
                  ) : (
                    <>
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
                            </button>
                          </div>
                        </nav>
                      </div>
                    </>
                  )}

                  {/* Tab Content */}
                  {selectedDog?.status == "in_review" ? (
                    <>
                      <section
                        className="flex items-center justify-center p-8"
                        role="region"
                        aria-labelledby="submission-status-heading"
                      >
                        <div
                          role="status"
                          aria-live="polite"
                          className="max-w-3xl bg-white/95 backdrop-blur-sm border border-gray-100 rounded-3xl p-4 text-center"
                        >
                          {/* Top badge */}
                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-sm font-semibold mb-4">
                            <svg
                              className="w-4 h-4"
                              viewBox="0 0 24 24"
                              fill="none"
                              aria-hidden
                            >
                              <path
                                d="M12 2v6"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M6 10v6a6 6 0 006 6v0a6 6 0 006-6v-6"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            Submitted for review
                          </div>

                          {/* Hero graphic */}
                          <div className="mx-auto w-28 h-28 rounded-full bg-gradient-to-br from-amber-100 to-rose-100 flex items-center justify-center mb-4 shadow-md">
                            <svg
                              viewBox="0 0 48 48"
                              className="w-16 h-16 animate-pulse"
                              aria-hidden
                            >
                              <path
                                d="M24 30c-3 0-5 2-5 5s2 5 5 5 5-2 5-5-2-5-5-5z"
                                fill="#FB923C"
                              />
                              <path
                                d="M16 18c-1.4-1.6-4-1.8-5.6-.4-1.6 1.4-1.8 3.9-.4 5.5 1.4 1.6 4 1.8 5.6.4 1.6-1.4 1.8-3.9.4-5.5zM40 18c-1.4-1.6-4-1.8-5.6-.4-1.6 1.4-1.8 3.9-.4 5.5 1.4 1.6 4 1.8 5.6.4 1.6-1.4 1.8-3.9.4-5.5zM29 13c-.9-1-2.6-1-3.5 0-.9 1-1 2.5 0 3.5 1 1 2.6 1 3.5 0 .9-1 1-2.5 0-3.5z"
                                fill="#FDE68A"
                              />
                            </svg>
                          </div>

                          {/* Title & description */}
                          <h2
                            id="submission-status-heading"
                            className="text-2xl font-semibold text-slate-800 mb-2"
                          >
                            Your request is in review
                          </h2>

                          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                            Thanks — we've received your application. A
                            qualified vet is now reviewing the submission and
                            any attached files. You will receive a clear
                            diagnosis and care recommendations as soon as the
                            review is complete. We know waiting can be hard —
                            we’re working to get it right.
                          </p>

                          {/* Progress / steps */}
                          <div className="w-full bg-gray-50 rounded-xl p-4 mb-4">
                            <ol className="flex items-center justify-between text-left gap-3">
                              {/* Step 1 */}
                              <li className="flex-1">
                                <div className="flex items-start gap-3">
                                  <div className="flex-none">
                                    <div
                                      className="w-9 h-9 rounded-full flex items-center justify-center bg-emerald-100 text-emerald-700 font-semibold"
                                      aria-hidden
                                    >
                                      ✓
                                    </div>
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-sm font-medium text-slate-800">
                                      Submitted
                                    </div>
                                    <div className="text-xs text-slate-400">
                                      We've received your request
                                    </div>
                                  </div>
                                </div>
                              </li>

                              {/* Step 2 - current */}
                              <li className="flex-1" aria-current="step">
                                <div className="flex items-start gap-3">
                                  <div className="flex-none">
                                    <div
                                      className="w-9 h-9 rounded-full flex items-center justify-center bg-amber-50 text-amber-700 font-semibold animate-pulse"
                                      title="In review"
                                      aria-hidden
                                    >
                                      …
                                    </div>
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-sm font-medium text-slate-800">
                                      In review
                                    </div>
                                    <div className="text-xs text-slate-400">
                                      A vet is evaluating the case
                                    </div>
                                  </div>
                                </div>
                              </li>

                              {/* Step 3 */}
                              <li className="flex-1">
                                <div className="flex items-start gap-3">
                                  <div className="flex-none">
                                    <div
                                      className="w-9 h-9 rounded-full flex items-center justify-center bg-slate-100 text-slate-400 font-semibold"
                                      aria-hidden
                                    >
                                      ⟳
                                    </div>
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-sm font-medium text-slate-800">
                                      Diagnosis ready
                                    </div>
                                    <div className="text-xs text-slate-400">
                                      You'll get results & next steps
                                    </div>
                                  </div>
                                </div>
                              </li>
                            </ol>
                          </div>

                          {/* Helpful details */}
                          <div className="text-left text-xs text-slate-500 mb-6 space-y-3">
                            <div className="flex items-start gap-3">
                              <svg
                                className="w-4 h-4 mt-1 flex-none"
                                viewBox="0 0 24 24"
                                fill="none"
                                aria-hidden
                              >
                                <path
                                  d="M3 12h18"
                                  stroke="currentColor"
                                  strokeWidth="1.2"
                                  strokeLinecap="round"
                                />
                                <path
                                  d="M12 3v18"
                                  stroke="currentColor"
                                  strokeWidth="1.2"
                                  strokeLinecap="round"
                                />
                              </svg>
                              <div>
                                <div className="font-medium text-slate-700">
                                  What happens next
                                </div>
                                <div className="text-slate-400">
                                  Vet review → lab checks (if needed) →
                                  diagnosis & recommendations
                                </div>
                              </div>
                            </div>

                            <div className="flex items-start gap-3">
                              <svg
                                className="w-4 h-4 mt-1 flex-none"
                                viewBox="0 0 24 24"
                                fill="none"
                                aria-hidden
                              >
                                <path
                                  d="M12 8v4l3 3"
                                  stroke="currentColor"
                                  strokeWidth="1.2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <circle
                                  cx="12"
                                  cy="12"
                                  r="9"
                                  stroke="currentColor"
                                  strokeWidth="1.2"
                                />
                              </svg>
                              <div>
                                <div className="font-medium text-slate-700">
                                  Typical turnaround
                                </div>
                                <div className="text-slate-400">
                                  Most cases complete within 24–72 hours.
                                  Complex cases may take longer.
                                </div>
                              </div>
                            </div>

                            <div className="flex items-start gap-3">
                              <svg
                                className="w-4 h-4 mt-1 flex-none"
                                viewBox="0 0 24 24"
                                fill="none"
                                aria-hidden
                              >
                                <path
                                  d="M12 2l2 5h5l-4 3 2 5-5-3-5 3 2-5-4-3h5z"
                                  stroke="currentColor"
                                  strokeWidth="1.1"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                              <div>
                                <div className="font-medium text-slate-700">
                                  Reference
                                </div>
                                <div className="text-slate-400">
                                  Ref: PC-3491 — keep this for follow-ups
                                </div>
                              </div>
                            </div>
                          </div>

                          <p className="text-xs text-slate-400 mt-4">
                            Please be patient — we're improving too. You'll be
                            notified as soon as the diagnosis is ready.
                          </p>
                        </div>
                      </section>
                    </>
                  ) : (
                    <>
                      <div className="p-6">
                        {/* Overview Tab */}
                        {activeTab === "overview" && (
                          <div className="space-y-8">
                            {/* Today's Meal Plan */}
                            {user?.subscription_tier == "foundation" ? (
                              <>
                                <div className="max-w-3xl mx-auto mt-10 p-8 bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl flex flex-col md:flex-row items-center md:items-start gap-8">
                                  {/* Left Side: Text */}
                                  <div className="flex-1 text-center md:text-left">
                                    <h2 className="text-3xl font-extrabold text-gray-800 mb-3 flex">
                                      Create Your Dog’s Daily Meal Plan 🍴
                                    </h2>
                                    <p className="text-gray-600 leading-relaxed">
                                      A personalised meal plan keeps your dog’s
                                      gut balanced, boosts energy, and helps
                                      track progress faster. Tailored daily
                                      guidance = fewer flare-ups, happier tummy,
                                      and easier feeding routine.
                                    </p>
                                  </div>

                                  {/* Right Side: Card + Button */}
                                  <div className="flex-1 w-full">
                                    <div className="bg-gray-100 p-5 rounded-xl mb-6 shadow-sm">
                                      <p className="text-gray-700 text-sm italic text-center">
                                        “Meal plans are proven to improve
                                        results by 30% within the first month.”
                                      </p>
                                    </div>

                                    <button
                                      className="w-full py-3 px-6 bg-gradient-to-r from-brand-midgrey to-brand-charcoal hover:from-brand-charcoal hover:to-gray-900 text-white font-semibold rounded-xl shadow-md transition duration-300"
                                      onClick={() =>
                                        (window.location.href = "/subscription")
                                      }
                                    >
                                      🚀 Unlock Meal Plans
                                    </button>

                                    <p className="text-xs text-gray-500 mt-4 text-center">
                                      Available in the{" "}
                                      <span className="font-semibold text-gray-700">
                                        Therapeutic
                                      </span>{" "}
                                      and{" "}
                                      <span className="font-semibold text-gray-700">
                                        Comprehensive
                                      </span>{" "}
                                      plans.
                                      <br />
                                      <div className="relative inline-block group mt-2 font-bold text-blue-600 cursor-pointer text-lg">
                                        Compare plans » <PlansComparision />
                                      </div>
                                    </p>
                                  </div>
                                </div>
                              </>
                            ) : (
                              <>
                                <div>
                                  <div className="flex items-center space-x-2 mb-6">
                                    <img
                                      src={dishIcon}
                                      style={{ height: "52px" }}
                                    />
                                    <h2 className="text-xl font-bold text-gray-900 ">
                                      Today's Meal Plan
                                    </h2>
                                    <div className="flex items-center space-x-2 bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
                                      <Clock className="h-4 w-4" />
                                      <span>
                                        Phase:{" "}
                                        {selectedDog?.overview?.phase?.title
                                          ? selectedDog.overview.phase.title
                                              .charAt(0)
                                              .toUpperCase() +
                                            selectedDog.overview.phase.title.slice(
                                              1
                                            )
                                          : ""}
                                        -{" "}
                                        {
                                          selectedDog?.overview?.phase
                                            ?.description
                                        }
                                      </span>
                                    </div>
                                  </div>

                                  <p className="mb-4 text-sm">
                                    Estimated time:{" "}
                                    {selectedDog?.overview?.estimated_time}{" "}
                                    days, Next review:{" "}
                                    {selectedDog?.overview?.next_revision
                                      ? new Date(
                                          selectedDog?.overview?.next_revision
                                        )
                                          .toLocaleDateString("en-GB", {
                                            day: "numeric",
                                            month: "short",
                                            year: "numeric",
                                          })
                                          .replace(/ /g, " ")
                                          .replace(
                                            /(\d{1,2}) (\w{3}) (\d{4})/,
                                            "$1 $2, $3"
                                          )
                                      : ""}
                                  </p>
                                  {selectedDog?.overview &&
                                  selectedDog?.overview?.daily_meal_plan ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                      <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-lg p-4 border border-orange-200">
                                        <h3 className="font-semibold text-gray-900 mb-2 flex items-center ">
                                          <span className="text-orange-500 mr-2">
                                            <Bone />
                                          </span>
                                          Breakfast
                                        </h3>
                                        <p className="text-gray-700 text-sm">
                                          {selectedDog?.overview?.daily_meal_plan?.map(
                                            (element, index) =>
                                              element.title === "Breakfast" ? (
                                                <span key={index}>
                                                  {element?.description}
                                                </span>
                                              ) : null
                                          )}
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
                                          {selectedDog?.overview?.daily_meal_plan?.map(
                                            (element, index) =>
                                              element.title === "Dinner" ? (
                                                <span key={index}>
                                                  {element.description}
                                                </span>
                                              ) : (
                                                <></>
                                              )
                                          )}
                                        </p>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                                      <Utensils className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                      <h3 className="text-lg font-medium text-gray-900 mb-2 ">
                                        We haven’t built Maple’s plan yet. let’s
                                        fix that. Start your gut check now.
                                      </h3>
                                      <p className="text-gray-600 mb-4">
                                        Complete a health assessment to get a
                                        personalized meal plan for{" "}
                                        {selectedDog.name}
                                      </p>
                                      <Link
                                        to={"/intake?id=" + selectedDog?.id}
                                        className="inline-flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-2 rounded-lg font-medium hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 transform hover:scale-[1.02]"
                                      >
                                        <Plus className="h-4 w-4" />
                                        <span>Start Assessment</span>
                                      </Link>
                                    </div>
                                  )}
                                </div>
                              </>
                            )}

                            {/* Gut check */}
                            <>
                              {!showProgressForm && (
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                  <div className="text-center">
                                    <div className="flex justify-center mb-4">
                                      <img
                                        src={dogIcon}
                                        className="w-[160px] h-auto"
                                      />
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-900 mb-2">
                                      How's {selectedDog.name} doing today?
                                    </h2>
                                    <p className="text-gray-600 mb-6">
                                      Quick daily check-in to track{" "}
                                      {selectedDog.name}
                                      's progress
                                    </p>
                                    {isSubscriptionActive(
                                      user?.subscription_current_period_end
                                    ) ? (
                                      <>
                                        <button
                                          onClick={() => {
                                            setShowProgressForm(true);
                                            window.location.href = "#gut-check";
                                          }}
                                          className="bg-gradient-to-r from-brand-charcoal to-brand-midgrey text-white px-6 py-3 rounded-lg font-medium hover:to-brand-charcoal hover:from-brand-midgrey transition-all duration-200 transform hover:scale-[1.02] flex items-center space-x-2 mx-auto"
                                        >
                                          <span>Start Gut Check</span>
                                          <ArrowRight className="h-5 w-5" />
                                        </button>
                                      </>
                                    ) : (
                                      <div className="w-full max-w-md mx-auto p-6 bg-gradient-to-r from-brand-charcoal to-brand-midgrey rounded-2xl shadow-lg text-center">
                                        <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
                                          ⚠️ Upgrade Required
                                        </h3>
                                        <p className="text-white text-sm sm:text-base opacity-90">
                                          Currently your have no plan active.
                                          Upgrade your plan to unlock{" "}
                                          <span className="font-semibold">
                                            Gut Check&nbsp;
                                          </span>
                                          and track your dog’s health progress.
                                        </p>
                                        <button
                                          className="mt-4 px-6 py-2 bg-white text-brand-charcoal font-semibold rounded-lg shadow hover:bg-gray-100 transition"
                                          onClick={() =>
                                            (window.location.href =
                                              "/subscription")
                                          }
                                        >
                                          Upgrade Now
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Progress Form */}
                              {showProgressForm && (
                                <div
                                  className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
                                  id="gut-check"
                                >
                                  <div className="flex items-center space-x-2 mb-6">
                                    <Calendar className="h-6 w-6 text-emerald-600" />
                                    <h2 className="text-xl font-bold text-gray-900 ">
                                      Weekly Check-In for {selectedDog.name}
                                    </h2>
                                  </div>
                                  {/* Upgrade prompt */}
                                  {user?.subscription_tier !==
                                    "comprehensive" && (
                                    <section
                                      role="region"
                                      aria-label="Upgrade for detailed dog diagnosis"
                                      className="w-full rounded-2xl overflow-hidden flex flex-col sm:flex-row items-stretch text-sm shadow-sm mb-4"
                                    >
                                      {/* left accent — collapses to a top bar on small screens */}
                                      <div className="bg-brand-charcoal text-yellow-400 p-3 flex items-center justify-center w-full sm:w-auto sm:min-w-[64px]">
                                        <svg
                                          className="w-6 h-6 sm:w-7 sm:h-7"
                                          viewBox="0 0 24 24"
                                          fill="currentColor"
                                          xmlns="http://www.w3.org/2000/svg"
                                          aria-hidden
                                        >
                                          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                                        </svg>
                                        <h3 className="text-sm font-semibold leading-tight text-white sm:hidden block ml-2">
                                          Upgrade for a more detailed diagnosis
                                        </h3>
                                      </div>

                                      {/* main content — stacks on small screens */}
                                      <div className="bg-brand-midgrey flex-1 p-3 sm:p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                                        <div className="flex-1 min-w-0">
                                          <h3 className="text-sm font-semibold leading-tight text-white truncate hidden sm:block">
                                            Upgrade for a more detailed
                                            diagnosis
                                          </h3>
                                          <p className="mt-1 text-xs leading-snug text-gray-200 break-words">
                                            Provide a few critical data points
                                            about your dog to unlock deeper,
                                            more accurate health insights and
                                            tailored care suggestions.
                                          </p>
                                        </div>

                                        {/* action — full width on mobile, inline on larger screens */}
                                        <div className="w-full sm:w-auto flex-shrink-0">
                                          <a
                                            href="/subscription"
                                            className="block w-full sm:inline-block text-center px-3 py-1.5 rounded-full bg-white/95 text-black text-xs font-semibold shadow-sm whitespace-nowrap"
                                            aria-label="Go to upgrade page"
                                          >
                                            Upgrade
                                          </a>
                                        </div>
                                      </div>
                                    </section>
                                  )}

                                  <form
                                    onSubmit={onSubmitProgress}
                                    className="space-y-6"
                                  >
                                    {/* Dog Profile (auto-fill) */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                          Dog name
                                        </label>
                                        <input
                                          defaultValue={selectedDog?.name}
                                          type="text"
                                          readOnly
                                          className="w-full px-4 py-3 border border-gray-300 bg-gray-50 rounded-lg focus:outline-none"
                                          name="dog-name"
                                        />
                                      </div>
                                    </div>

                                    {/* --- Tier 1: Gut Fix Core (Fast + Safe) --- */}
                                    <div className="p-4 border border-gray-100 rounded-lg bg-white">
                                      {/* Food & Feeding */}
                                      <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                          Did your dog eat their meals today?
                                        </label>
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                                          <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer">
                                            <input
                                              name="daily-food"
                                              type="radio"
                                              value="finished"
                                              className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                            />
                                            <span className="ml-3 text-sm text-gray-700">
                                              Yes, finished everything
                                            </span>
                                          </label>

                                          <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer">
                                            <input
                                              name="daily-food"
                                              type="radio"
                                              value="most"
                                              className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                            />
                                            <span className="ml-3 text-sm text-gray-700">
                                              Ate most
                                            </span>
                                          </label>

                                          <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer">
                                            <input
                                              name="daily-food"
                                              type="radio"
                                              value="picked"
                                              className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                            />
                                            <span className="ml-3 text-sm text-gray-700">
                                              Picked at it
                                            </span>
                                          </label>

                                          <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer">
                                            <input
                                              name="daily-food"
                                              type="radio"
                                              value="refused"
                                              className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                            />
                                            <span className="ml-3 text-sm text-gray-700">
                                              Refused meal
                                            </span>
                                          </label>
                                        </div>
                                      </div>

                                      {/* Stool Consistency */}
                                      <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                          What was your dog’s poop like today?
                                        </label>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                          <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer">
                                            <input
                                              name="stool-consistency"
                                              type="radio"
                                              value="normal"
                                              className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                            />
                                            <span className="ml-3 text-sm text-gray-700">
                                              Normal, firm
                                            </span>
                                          </label>

                                          <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer">
                                            <input
                                              name="stool-consistency"
                                              type="radio"
                                              value="soft"
                                              className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                            />
                                            <span className="ml-3 text-sm text-gray-700">
                                              Soft/mushy
                                            </span>
                                          </label>

                                          <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer">
                                            <input
                                              name="stool-consistency"
                                              type="radio"
                                              value="watery"
                                              className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                            />
                                            <span className="ml-3 text-sm text-gray-700">
                                              Watery/diarrhea
                                            </span>
                                          </label>

                                          <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer">
                                            <input
                                              name="stool-consistency"
                                              type="radio"
                                              value="hard"
                                              className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                            />
                                            <span className="ml-3 text-sm text-gray-700">
                                              Hard/straining
                                            </span>
                                          </label>

                                          <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer">
                                            <input
                                              name="stool-consistency"
                                              type="radio"
                                              value="none"
                                              className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                            />
                                            <span className="ml-3 text-sm text-gray-700">
                                              No stool today
                                            </span>
                                          </label>
                                        </div>

                                        <div className="mt-3 flex items-center space-x-3">
                                          <label className="flex items-center text-sm">
                                            <input
                                              name="stool-blood-mucus"
                                              type="checkbox"
                                              className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                            />
                                            <span className="ml-2 text-gray-700">
                                              Did you see blood or mucus?
                                            </span>
                                          </label>
                                        </div>
                                      </div>

                                      {/* Energy Level */}
                                      <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                          How was your dog’s energy today?
                                        </label>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                          <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer">
                                            <input
                                              name="daily-energy"
                                              type="radio"
                                              value="normal"
                                              className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                            />
                                            <span className="ml-3 text-sm text-gray-700">
                                              Normal
                                            </span>
                                          </label>

                                          <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer">
                                            <input
                                              name="daily-energy"
                                              type="radio"
                                              value="high"
                                              className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                            />
                                            <span className="ml-3 text-sm text-gray-700">
                                              High/hyper
                                            </span>
                                          </label>

                                          <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer">
                                            <input
                                              name="daily-energy"
                                              type="radio"
                                              value="low"
                                              className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                            />
                                            <span className="ml-3 text-sm text-gray-700">
                                              Low/tired
                                            </span>
                                          </label>
                                        </div>
                                      </div>

                                      {/* Quick Symptom Scan (checkbox grid) */}
                                      <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                          Did you notice any new issues today?
                                          (check all that apply)
                                        </label>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                          <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer">
                                            <input
                                              name="scan-itching"
                                              type="checkbox"
                                              className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                            />
                                            <span className="ml-3 text-sm text-gray-700">
                                              Itching, licking, chewing
                                            </span>
                                          </label>

                                          <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer">
                                            <input
                                              name="scan-skin-changes"
                                              type="checkbox"
                                              className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                            />
                                            <span className="ml-3 text-sm text-gray-700">
                                              Skin changes (redness, rash, hot
                                              spots)
                                            </span>
                                          </label>

                                          <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer">
                                            <input
                                              name="scan-behaviour"
                                              type="checkbox"
                                              className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                            />
                                            <span className="ml-3 text-sm text-gray-700">
                                              Unusual behaviour (anxious, quiet,
                                              aggressive)
                                            </span>
                                          </label>

                                          <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer">
                                            <input
                                              name="scan-limping"
                                              type="checkbox"
                                              className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                            />
                                            <span className="ml-3 text-sm text-gray-700">
                                              Limping or stiffness
                                            </span>
                                          </label>

                                          <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer">
                                            <input
                                              name="scan-none"
                                              type="checkbox"
                                              className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                            />
                                            <span className="ml-3 text-sm text-gray-700">
                                              None
                                            </span>
                                          </label>

                                          <div className="col-span-1 md:col-span-3">
                                            <input
                                              name="scan-other"
                                              type="text"
                                              placeholder="Other (brief)"
                                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* --- Tier 2: Gut Fix Pro (Smarter Insights) --- */}
                                    {user?.subscription_tier == "therapeutic" ||
                                    user?.subscription_tier ==
                                      "comprehensive" ? (
                                      <>
                                        <div className="p-4 border border-gray-100 rounded-lg bg-white">
                                          {/* Appetite Detail */}
                                          <div className="mb-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                              Compared to usual, how is your
                                              dog’s appetite?
                                            </label>
                                            <div className="flex flex-wrap gap-2">
                                              <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer flex-1 min-w-[140px]">
                                                <input
                                                  name="appetite-compare"
                                                  type="radio"
                                                  value="no_change"
                                                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                                />
                                                <span className="ml-3 text-sm text-gray-700">
                                                  No change
                                                </span>
                                              </label>

                                              <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer flex-1 min-w-[140px]">
                                                <input
                                                  name="appetite-compare"
                                                  type="radio"
                                                  value="more"
                                                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                                />
                                                <span className="ml-3 text-sm text-gray-700">
                                                  Eating more
                                                </span>
                                              </label>

                                              <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer flex-1 min-w-[140px]">
                                                <input
                                                  name="appetite-compare"
                                                  type="radio"
                                                  value="less"
                                                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                                />
                                                <span className="ml-3 text-sm text-gray-700">
                                                  Eating less
                                                </span>
                                              </label>
                                            </div>
                                          </div>

                                          {/* Stool Details (pro) */}
                                          <div className="mb-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                              Did you notice any other poop
                                              issues?
                                            </label>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                              <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer">
                                                <input
                                                  name="stool-detail-gas"
                                                  type="checkbox"
                                                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                                />
                                                <span className="ml-3 text-sm text-gray-700">
                                                  Excessive gas
                                                </span>
                                              </label>

                                              <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer">
                                                <input
                                                  name="stool-detail-smelly"
                                                  type="checkbox"
                                                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                                />
                                                <span className="ml-3 text-sm text-gray-700">
                                                  Very smelly stool
                                                </span>
                                              </label>

                                              <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer">
                                                <input
                                                  name="stool-detail-mucus"
                                                  type="checkbox"
                                                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                                />
                                                <span className="ml-3 text-sm text-gray-700">
                                                  Mucus present
                                                </span>
                                              </label>

                                              <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer">
                                                <input
                                                  name="stool-detail-blood"
                                                  type="checkbox"
                                                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                                />
                                                <span className="ml-3 text-sm text-gray-700">
                                                  Blood present
                                                </span>
                                              </label>

                                              <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer">
                                                <input
                                                  name="stool-detail-none"
                                                  type="checkbox"
                                                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                                />
                                                <span className="ml-3 text-sm text-gray-700">
                                                  None
                                                </span>
                                              </label>
                                            </div>
                                          </div>

                                          {/* Skin & Coat severity */}
                                          <div className="mb-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                              Was your dog itching, licking, or
                                              chewing today?
                                            </label>
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                                              <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer">
                                                <input
                                                  name="skin-itch-severity"
                                                  type="radio"
                                                  value="none"
                                                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                                />
                                                <span className="ml-3 text-sm text-gray-700">
                                                  None
                                                </span>
                                              </label>

                                              <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer">
                                                <input
                                                  name="skin-itch-severity"
                                                  type="radio"
                                                  value="mild"
                                                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                                />
                                                <span className="ml-3 text-sm text-gray-700">
                                                  Mild, occasional
                                                </span>
                                              </label>

                                              <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer">
                                                <input
                                                  name="skin-itch-severity"
                                                  type="radio"
                                                  value="moderate"
                                                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                                />
                                                <span className="ml-3 text-sm text-gray-700">
                                                  Moderate, frequent
                                                </span>
                                              </label>

                                              <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer">
                                                <input
                                                  name="skin-itch-severity"
                                                  type="radio"
                                                  value="severe"
                                                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                                />
                                                <span className="ml-3 text-sm text-gray-700">
                                                  Severe, constant
                                                </span>
                                              </label>
                                            </div>
                                          </div>

                                          {/* Sleep Quality */}
                                          <div className="mb-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                              How did your dog sleep last night?
                                            </label>
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                                              <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer">
                                                <input
                                                  name="sleep-quality"
                                                  type="radio"
                                                  value="restful"
                                                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                                />
                                                <span className="ml-3 text-sm text-gray-700">
                                                  Restful, normal
                                                </span>
                                              </label>

                                              <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer">
                                                <input
                                                  name="sleep-quality"
                                                  type="radio"
                                                  value="restless"
                                                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                                />
                                                <span className="ml-3 text-sm text-gray-700">
                                                  Restless/fidgety
                                                </span>
                                              </label>

                                              <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer">
                                                <input
                                                  name="sleep-quality"
                                                  type="radio"
                                                  value="awake-often"
                                                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                                />
                                                <span className="ml-3 text-sm text-gray-700">
                                                  Awake often / pacing
                                                </span>
                                              </label>

                                              <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer">
                                                <input
                                                  name="sleep-quality"
                                                  type="radio"
                                                  value="whining"
                                                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                                />
                                                <span className="ml-3 text-sm text-gray-700">
                                                  Whining/barking overnight
                                                </span>
                                              </label>
                                            </div>
                                          </div>
                                        </div>
                                      </>
                                    ) : (
                                      <></>
                                    )}

                                    {/* --- Tier 3: Gut Fix VIP (Full Clinical Tracking) --- */}
                                    {user?.subscription_tier ==
                                    "comprehensive" ? (
                                      <>
                                        <div className="p-4 border border-gray-100 rounded-lg bg-white">
                                          {/* Skin & Coat Details (multi-checkbox) */}
                                          <div className="mb-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                              Did you notice any visible skin
                                              changes today?
                                            </label>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                              <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer">
                                                <input
                                                  name="skin-redness"
                                                  type="checkbox"
                                                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                                />
                                                <span className="ml-3 text-sm text-gray-700">
                                                  Redness
                                                </span>
                                              </label>

                                              <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer">
                                                <input
                                                  name="skin-hotspots"
                                                  type="checkbox"
                                                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                                />
                                                <span className="ml-3 text-sm text-gray-700">
                                                  Hot spots
                                                </span>
                                              </label>

                                              <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer">
                                                <input
                                                  name="skin-flaky"
                                                  type="checkbox"
                                                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                                />
                                                <span className="ml-3 text-sm text-gray-700">
                                                  Flaky/dry skin
                                                </span>
                                              </label>

                                              <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer">
                                                <input
                                                  name="skin-hairloss"
                                                  type="checkbox"
                                                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                                />
                                                <span className="ml-3 text-sm text-gray-700">
                                                  Hair loss/patches
                                                </span>
                                              </label>

                                              <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer">
                                                <input
                                                  name="skin-none"
                                                  type="checkbox"
                                                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                                />
                                                <span className="ml-3 text-sm text-gray-700">
                                                  None
                                                </span>
                                              </label>
                                            </div>
                                          </div>

                                          {/* Behaviour & Mood */}
                                          <div className="mb-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                              How was your dog’s mood/behaviour
                                              today?
                                            </label>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                              <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer">
                                                <input
                                                  name="behaviour-mood"
                                                  type="radio"
                                                  value="normal"
                                                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                                />
                                                <span className="ml-3 text-sm text-gray-700">
                                                  Normal
                                                </span>
                                              </label>

                                              <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer">
                                                <input
                                                  name="behaviour-mood"
                                                  type="radio"
                                                  value="anxious"
                                                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                                />
                                                <span className="ml-3 text-sm text-gray-700">
                                                  Anxious/reactive
                                                </span>
                                              </label>

                                              <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer">
                                                <input
                                                  name="behaviour-mood"
                                                  type="radio"
                                                  value="withdrawn"
                                                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                                />
                                                <span className="ml-3 text-sm text-gray-700">
                                                  Withdrawn/quiet
                                                </span>
                                              </label>

                                              <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer">
                                                <input
                                                  name="behaviour-mood"
                                                  type="radio"
                                                  value="irritable"
                                                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                                />
                                                <span className="ml-3 text-sm text-gray-700">
                                                  Irritable/aggressive
                                                </span>
                                              </label>

                                              <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer">
                                                <input
                                                  name="behaviour-mood"
                                                  type="radio"
                                                  value="clingy"
                                                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                                />
                                                <span className="ml-3 text-sm text-gray-700">
                                                  Clingy/needy
                                                </span>
                                              </label>

                                              <div className="col-span-1 md:col-span-3">
                                                <input
                                                  name="behaviour-other"
                                                  type="text"
                                                  placeholder="Other (brief)"
                                                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                                />
                                              </div>
                                            </div>
                                          </div>

                                          {/* Joint & Mobility */}
                                          <div className="mb-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                              Did you notice any mobility
                                              issues?
                                            </label>
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                                              <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer">
                                                <input
                                                  name="mobility"
                                                  type="radio"
                                                  value="normal"
                                                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                                />
                                                <span className="ml-3 text-sm text-gray-700">
                                                  Normal mobility
                                                </span>
                                              </label>

                                              <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer">
                                                <input
                                                  name="mobility"
                                                  type="radio"
                                                  value="stiffness"
                                                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                                />
                                                <span className="ml-3 text-sm text-gray-700">
                                                  Stiffness after rest
                                                </span>
                                              </label>

                                              <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer">
                                                <input
                                                  name="mobility"
                                                  type="radio"
                                                  value="limping"
                                                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                                />
                                                <span className="ml-3 text-sm text-gray-700">
                                                  Limping / reluctance to move
                                                </span>
                                              </label>

                                              <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer">
                                                <input
                                                  name="mobility"
                                                  type="radio"
                                                  value="difficulty-jumping"
                                                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                                />
                                                <span className="ml-3 text-sm text-gray-700">
                                                  Difficulty jumping / climbing
                                                </span>
                                              </label>
                                            </div>
                                          </div>

                                          {/* Supplements, Meds, Treats */}
                                          <div className="mb-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                              Did your dog have any supplements,
                                              medications, or treats today?
                                            </label>

                                            {/* Saved list (if any) */}
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                                              {(
                                                selectedDog?.form_data
                                                  ?.supplements || [
                                                  "Probiotic",
                                                  "Omega-3",
                                                  "Multivitamin",
                                                ]
                                              ).map((s, i) => (
                                                <label
                                                  key={s + i}
                                                  className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer"
                                                >
                                                  <input
                                                    name={`supplement-${i}`}
                                                    type="checkbox"
                                                    className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                                  />
                                                  <span className="ml-3 text-sm text-gray-700">
                                                    {s}
                                                  </span>
                                                </label>
                                              ))}
                                            </div>

                                            {/* Add new */}
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                              <input
                                                name="supplement-new"
                                                type="text"
                                                placeholder="Add new supplement / med / treat"
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                              />
                                            </div>
                                          </div>

                                          {/* Additional Notes */}
                                          <div className="mb-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                              Additional notes
                                            </label>
                                            <textarea
                                              name="additional-notes"
                                              rows={3}
                                              placeholder="Anything else you want to note today?"
                                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                            />
                                          </div>
                                        </div>
                                      </>
                                    ) : (
                                      <></>
                                    )}

                                    {/* Structured symptom fields (maps to schema) */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                          Symptom's Duration (days)
                                        </label>
                                        <input
                                          name="dog-symptoms-duration-in-days"
                                          type="number"
                                          min="0"
                                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                          placeholder="e.g. 2"
                                        />
                                      </div>

                                      <div className="flex flex-col">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                          Vomiting frequency / day
                                        </label>
                                        <input
                                          name="dog-vomiting-frequency-per-day"
                                          type="number"
                                          min="0"
                                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                          placeholder="e.g. 0"
                                        />
                                      </div>

                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                          Primary Goal (from profile)
                                        </label>
                                        <select
                                          name="dog-owner-primary-goal"
                                          defaultValue={
                                            selectedDog?.form_data
                                              ?.primary_goal || ""
                                          }
                                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                        >
                                          <option value="">Select</option>
                                          <option value="acute_diarrhea">
                                            Acute diarrhea
                                          </option>
                                          <option value="chronic_diarrhea">
                                            Chronic diarrhea
                                          </option>
                                          <option value="vomiting">
                                            Vomiting
                                          </option>
                                          <option value="itching">
                                            Itching
                                          </option>
                                          <option value="gas">Gas</option>
                                          <option value="yeast">Yeast</option>
                                          <option value="general_gut_reset">
                                            General gut reset
                                          </option>
                                        </select>
                                      </div>
                                    </div>

                                    {/* Owner Preferences (kept for context) */}
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-4">
                                        Owner Preferences
                                      </label>
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer">
                                          <input
                                            name="dog-owner-preference-home-cooked"
                                            type="checkbox"
                                            className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                          />
                                          <span className="ml-3 text-sm text-gray-700">
                                            Home cooked
                                          </span>
                                        </label>

                                        <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer">
                                          <input
                                            name="dog-owner-preference-no-poultry"
                                            type="checkbox"
                                            className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                          />
                                          <span className="ml-3 text-sm text-gray-700">
                                            No poultry
                                          </span>
                                        </label>

                                        <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer">
                                          <input
                                            name="dog-owner-preference-no-grains"
                                            type="checkbox"
                                            className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                          />
                                          <span className="ml-3 text-sm text-gray-700">
                                            No grains
                                          </span>
                                        </label>
                                      </div>
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
                                        onClick={() =>
                                          setShowProgressForm(false)
                                        }
                                        className="bg-gradient-to-r from-gray-200 to-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:from-gray-300 hover:to-gray-400 transition-all duration-200"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </form>
                                </div>
                              )}
                            </>

                            {/* Wins tracker */}
                            {/* <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
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
                                  <p className="text-sm text-gray-600">
                                    Improving
                                  </p>
                                </div>

                                <div className="text-center">
                                  <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                    <img src={energyIcon} />
                                  </div>
                                  <h4 className="font-medium text-gray-900">
                                    Energy Level
                                  </h4>
                                  <p className="text-sm text-gray-600">
                                    Stable
                                  </p>
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
                            </div> */}

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
                            <GamifiedGoals
                              selectedDog={selectedDog}
                              toggleStepCompletion={toggleStepCompletion}
                              stoolIcon={stoolIcon}
                              energyIcon={energyIcon}
                              healthIcon={healthIcon}
                            />

                            {/* Recent Activity and Health Summary */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              {/* <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <div className="flex items-center space-x-2 mb-6">
                                  <Calendar className="h-6 w-6 text-emerald-600" />
                                  <h3 className="text-xl font-semibold text-gray-900 ">
                                    Recent Activity
                                  </h3>
                                </div>
                                <div className="space-y-4">
                                  {Array.isArray(selectedDog?.activities) &&
                                    selectedDog?.activities?.map(
                                      (entry, index) => (
                                        <div
                                          key={index}
                                          className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg"
                                        >
                                          <div
                                            className={`w-3 h-3 rounded-full mt-2 ${
                                              entry.type === "consultation"
                                                ? "bg-green-500"
                                                : "bg-yellow-500"
                                            }`}
                                          ></div>
                                          <div className="flex-1">
                                            <div className="flex items-center justify-between mb-1">
                                              <p className="text-sm font-medium text-gray-900">
                                                {entry.title}
                                              </p>
                                              <span className="text-xs text-gray-500">
                                                {new Date(
                                                  entry.timestamp
                                                ).toLocaleDateString()}
                                              </span>
                                            </div>
                                            <p className="text-sm text-gray-600 line-clamp-2">
                                              {entry.description}
                                            </p>
                                          </div>
                                        </div>
                                      )
                                    )}

                                  {!selectedDog?.activities &&
                                    !Array.isArray(selectedDog?.activities) && (
                                      <div className="text-center py-8">
                                        <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                        <p className="text-gray-500 text-sm">
                                          No activity logged yet
                                        </p>
                                      </div>
                                    )}
                                </div>
                              </div> */}

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
                                        {selectedDog?.health_summary
                                          ?.health_score || 0}
                                        %
                                      </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-3">
                                      <div
                                        className="bg-gradient-to-r bg-brand-charcoal h-3 rounded-full transition-all duration-500"
                                        style={{
                                          width: `${
                                            selectedDog?.health_summary
                                              ?.health_score || 0
                                          }%`,
                                        }}
                                      ></div>
                                    </div>
                                  </div>

                                  {/* <div>
                                    <div className="flex justify-between items-center mb-2">
                                      <span className="text-sm font-medium text-gray-700">
                                        Confidence
                                      </span>
                                      <span className="text-sm text-blue-600 font-semibold">
                                        {selectedDog?.health_summary
                                          ?.confidence || 0}
                                      </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-3">
                                      <div
                                        className="bg-gradient-to-r bg-brand-charcoal bg-brand-midgrey h-3 rounded-full transition-all duration-500"
                                        style={{
                                          width: `${
                                            selectedDog?.health_summary
                                              ?.confidence || 0
                                          }%`,
                                        }}
                                      ></div>
                                    </div>
                                  </div> */}

                                  <div className="p-3 bg-white/80 rounded-lg shadow-sm space-y-4">
                                    <div>
                                      <h4 className="text-sm font-semibold text-gray-800 mb-1">
                                        Key Observations
                                      </h4>
                                      <ul className="list-disc list-inside space-y-1">
                                        {selectedDog?.health_summary
                                          ?.key_observations?.length ? (
                                          selectedDog.health_summary.key_observations?.map(
                                            (txt, i) => (
                                              <li
                                                key={i}
                                                className="text-sm text-gray-700 leading-snug break-words"
                                              >
                                                {txt}
                                              </li>
                                            )
                                          )
                                        ) : (
                                          <li className="text-sm text-gray-500 italic">
                                            No observations available
                                          </li>
                                        )}
                                      </ul>
                                    </div>

                                    <div>
                                      <h4 className="text-sm font-semibold text-gray-800 mb-1">
                                        Recommendations
                                      </h4>
                                      <ul className="list-disc list-inside space-y-1">
                                        {selectedDog?.health_summary
                                          ?.recommendations?.length ? (
                                          selectedDog.health_summary.recommendations?.map(
                                            (txt, i) => (
                                              <li
                                                key={i}
                                                className="text-sm text-gray-700 leading-snug break-words"
                                              >
                                                {txt}
                                              </li>
                                            )
                                          )
                                        ) : (
                                          <li className="text-sm text-gray-500 italic">
                                            No recommendations available
                                          </li>
                                        )}
                                      </ul>
                                    </div>
                                  </div>

                                  {dogProgressData?.length > 0 && (
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
                                      lastDiagnosisSubmission.aiDiagnosis
                                        .confidence * 100
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
                                      {lastDiagnosisSubmission.aiDiagnosis.primaryConcerns?.map(
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
                            {protocolHistory?.length > 1 && (
                              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4 ">
                                  Protocol History
                                </h3>
                                <div className="space-y-3">
                                  {protocolHistory?.map((protocol, index) => (
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

                            {selectedDog?.overview ? (
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
                                    <span>Created on 1/20/2024</span>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                  {/* Meal Plan */}
                                  {user?.subscription_tier === "foundation" ? (
                                    <>
                                      <div className="max-w-4xl mx-auto mt-10 p-8 bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl flex flex-col md:flex-row items-center md:items-start gap-8">
                                        {/* Left Side: Text */}
                                        <div className="flex-1 text-center md:text-left">
                                          <h2 className="text-3xl font-extrabold text-gray-800 mb-3 flex">
                                            Create Your Dog’s Daily Meal Plan &
                                            Supplement Protocols
                                          </h2>
                                          <p className="text-gray-600 leading-relaxed">
                                            A personalised meal plan with
                                            supplement protocols keeps your
                                            dog’s gut balanced, boosts energy,
                                            and helps track progress faster.
                                            Tailored daily guidance = fewer
                                            flare-ups, a happier tummy, and a
                                            smoother routine with the right
                                            nutrition and supplements working
                                            together.
                                          </p>
                                        </div>

                                        {/* Right Side: Card + Button */}
                                        <div className="flex-1 w-full">
                                          <div className="bg-gray-100 p-5 rounded-xl mb-6 shadow-sm">
                                            <p className="text-gray-700 text-sm italic text-center">
                                              “Meal plans and supplement
                                              protocols are proven to improve
                                              results by 70% within the first
                                              month.”
                                            </p>
                                          </div>

                                          <button
                                            className="w-full py-3 px-6 bg-gradient-to-r from-brand-midgrey to-brand-charcoal hover:from-brand-charcoal hover:to-gray-900 text-white font-semibold rounded-xl shadow-md transition duration-300"
                                            onClick={() =>
                                              (window.location.href =
                                                "/subscription")
                                            }
                                          >
                                            🚀 Unlock The Plans
                                          </button>

                                          <p className="text-xs text-gray-500 mt-4 text-center">
                                            Available in the{" "}
                                            <span className="font-semibold text-gray-700">
                                              Therapeutic
                                            </span>{" "}
                                            and{" "}
                                            <span className="font-semibold text-gray-700">
                                              Comprehensive
                                            </span>{" "}
                                            plans.
                                            <br />
                                            <div className="relative inline-block group mt-2 font-bold text-blue-600 cursor-pointer text-lg">
                                              Compare plans »{" "}
                                              <PlansComparision />
                                            </div>
                                          </p>
                                        </div>
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                        <div className="flex items-center space-x-2 mb-6">
                                          <img
                                            src={boneIcon}
                                            className="w-10"
                                          />
                                          <h2 className="text-xl font-bold text-gray-900 ">
                                            Daily Meal Plan
                                          </h2>
                                        </div>

                                        {/* Phase banner */}
                                        <div
                                          className="flex items-center my-4 w-full bg-white py-3 px-8"
                                          style={{ overflowX: "scroll" }}
                                        >
                                          {[
                                            "reset",
                                            "rebuild",
                                            "strengthen",
                                          ].map((step, index) => {
                                            const currentPhase =
                                              selectedDog?.overview?.phase?.title?.toLowerCase();
                                            const stepKey = step.toLowerCase();
                                            const stepNumber = index + 1;
                                            const isDone =
                                              selectedDog?.overview?.status ===
                                              "done";

                                            let circleClasses =
                                              "w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ";
                                            let textClasses = "ml-2 ";
                                            let content;

                                            if (isDone) {
                                              // ✅ all steps done
                                              circleClasses +=
                                                "bg-brand-charcoal text-white";
                                              textClasses += "text-gray-600";
                                              content = "✓";
                                            } else if (
                                              [
                                                "reset",
                                                "rebuild",
                                                "strengthen",
                                              ].indexOf(currentPhase) > index
                                            ) {
                                              // ✅ past steps
                                              circleClasses +=
                                                "bg-brand-charcoal text-white";
                                              textClasses += "text-gray-600";
                                              content = "✓";
                                            } else if (
                                              currentPhase === stepKey
                                            ) {
                                              // 🔵 current step
                                              circleClasses +=
                                                "bg-brand-midgrey text-white";
                                              textClasses +=
                                                "font-bold text-brand-midgrey";
                                              content = stepNumber;
                                            } else {
                                              // ⬜ future steps
                                              circleClasses +=
                                                "bg-gray-300 text-gray-500";
                                              textClasses += "text-gray-400";
                                              content = stepNumber;
                                            }

                                            return (
                                              <React.Fragment key={stepKey}>
                                                <div className="flex items-center">
                                                  <div
                                                    className={circleClasses}
                                                  >
                                                    {content}
                                                  </div>
                                                  <span className={textClasses}>
                                                    {step
                                                      .charAt(0)
                                                      .toUpperCase() +
                                                      step.slice(1)}
                                                  </span>
                                                </div>
                                                {index < 2 && (
                                                  <div className="mx-4 h-0.5 w-8 bg-gray-300"></div>
                                                )}
                                              </React.Fragment>
                                            );
                                          })}
                                        </div>

                                        <div className="space-y-6">
                                          {selectedDog?.overview?.daily_meal_plan?.map(
                                            (el, i) => (
                                              <div
                                                key={i}
                                                className="bg-brand-offwhite rounded-lg p-4"
                                                style={{
                                                  overflowWrap: "anywhere",
                                                }}
                                              >
                                                <h3 className="font-semibold text-gray-900 mb-1 flex items-center">
                                                  <CircleDashed
                                                    size={15}
                                                    className="mr-2 text-purple-700 text-bold"
                                                  />
                                                  {el?.title || `Meal ${i + 1}`}
                                                </h3>
                                                <p className="text-gray-700">
                                                  {el?.description || ""}
                                                </p>
                                              </div>
                                            )
                                          )}

                                          <div className="bg-gray-50 rounded-lg p-4">
                                            <div className="flex items-center justify-between">
                                              <span className="font-medium text-gray-700">
                                                Meals per day:
                                              </span>
                                              <span className="text-lg font-bold text-emerald-600">
                                                {
                                                  selectedDog?.overview
                                                    ?.daily_meal_plan?.length
                                                }
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </>
                                  )}

                                  {/* Supplements */}
                                  {user?.subscription_tier == "foundation" ? (
                                    <div className="hidden">
                                      <div className="max-w-3xl mx-auto mt-10 p-8 bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl flex flex-col md:flex-row items-center md:items-start gap-8">
                                        {/* Left Side: Text */}
                                        <div className="flex-1 text-center md:text-left">
                                          <h2 className="text-3xl font-extrabold text-gray-800 mb-3 flex">
                                            Create Your Dog’s Daily Meal Plan 🍴
                                          </h2>
                                          <p className="text-gray-600 leading-relaxed">
                                            A personalised meal plan keeps your
                                            dog’s gut balanced, boosts energy,
                                            and helps track progress faster.
                                            Tailored daily guidance = fewer
                                            flare-ups, happier tummy, and easier
                                            feeding routine.
                                          </p>
                                        </div>

                                        {/* Right Side: Card + Button */}
                                        <div className="flex-1 w-full">
                                          <div className="bg-gray-100 p-5 rounded-xl mb-6 shadow-sm">
                                            <p className="text-gray-700 text-sm italic text-center">
                                              “Meal plans are proven to improve
                                              results by 30% within the first
                                              month.”
                                            </p>
                                          </div>

                                          <button
                                            className="w-full py-3 px-6 bg-gradient-to-r from-brand-midgrey to-brand-charcoal hover:from-brand-charcoal hover:to-gray-900 text-white font-semibold rounded-xl shadow-md transition duration-300"
                                            onClick={() =>
                                              (window.location.href =
                                                "/subscription")
                                            }
                                          >
                                            🚀 Unlock Meal Plans
                                          </button>

                                          <p className="text-xs text-gray-500 mt-4 text-center">
                                            Available in the{" "}
                                            <span className="font-semibold text-gray-700">
                                              Therapeutic
                                            </span>{" "}
                                            and{" "}
                                            <span className="font-semibold text-gray-700">
                                              Comprehensive
                                            </span>{" "}
                                            plans.
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                        <div className="flex items-center space-x-2 mb-6">
                                          <img
                                            src={capsuleIcon}
                                            className="w-10"
                                          />
                                          <h2 className="text-xl font-bold text-gray-900">
                                            Supplement Protocol
                                          </h2>
                                        </div>
                                        {selectedDog?.protocol?.supplements && (
                                          <div className="space-y-4">
                                            {selectedDog?.protocol?.supplements.map(
                                              (supplement, index) => (
                                                <div className="flex items-start space-x-3 p-4 bg-brand-offwhite rounded-lg">
                                                  <CheckCircle className="h-5 w-5 text-brand-charcoal mt-0.5 flex-shrink-0" />
                                                  <div>
                                                    <p className="text-gray-900 font-medium">
                                                      {supplement.title}
                                                    </p>
                                                  </div>
                                                </div>
                                              )
                                            )}
                                          </div>
                                        )}

                                        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                          <p className="text-sm text-yellow-800">
                                            <strong>Important:</strong> Always
                                            consult with your veterinarian
                                            before starting any new supplements.
                                          </p>
                                        </div>
                                      </div>
                                    </>
                                  )}

                                  {/* Custom cards */}
                                  {selectedDog?.protocol?.custom_sections ? (
                                    <>
                                      {selectedDog?.protocol?.custom_sections?.map(
                                        (sec) => (
                                          <>
                                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                              <div className="flex items-center space-x-2 mb-6">
                                                <h2 className="text-xl font-bold text-gray-900">
                                                  {sec.section_name}
                                                </h2>
                                              </div>
                                              {sec.items && (
                                                <div className="space-y-4">
                                                  {sec.items.map(
                                                    (el, index) => (
                                                      <div className="flex items-start space-x-3 p-4 bg-brand-offwhite rounded-lg">
                                                        <div
                                                          key={index}
                                                          className="bg-brand-offwhite rounded-lg p-4"
                                                          style={{
                                                            overflowWrap:
                                                              "anywhere",
                                                          }}
                                                        >
                                                          <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                                                            <span className="w-3 h-3 bg-blue-300 rounded-full mr-2"></span>
                                                            {el?.title ||
                                                              `Meal ${i + 1}`}
                                                          </h3>
                                                          <p className="text-gray-700">
                                                            {el?.description ||
                                                              ""}
                                                          </p>
                                                        </div>
                                                      </div>
                                                    )
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          </>
                                        )
                                      )}
                                    </>
                                  ) : (
                                    <></>
                                  )}
                                </div>

                                {/* Lifestyle Tips */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                  <div className="flex items-center space-x-2 mb-6">
                                    <img
                                      src={heartIcon}
                                      style={{ height: "34px" }}
                                    />
                                    <h2 className="text-xl font-bold text-gray-900">
                                      Lifestyle Recommendations
                                    </h2>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {selectedDog?.protocol &&
                                      selectedDog?.protocol?.lifestyle_recommendations?.map(
                                        (tip, index) => (
                                          <div
                                            key={tip?.id ?? index}
                                            onClick={async () => {
                                              if (!selectedDog) return;
                                              // prevent double clicks while one request is in flight
                                              if (updatingIndex !== null)
                                                return;

                                              const originalProtocol =
                                                selectedDog.protocol;
                                              const recs = Array.isArray(
                                                originalProtocol.lifestyle_recommendations
                                              )
                                                ? originalProtocol.lifestyle_recommendations
                                                : [];

                                              // Build updated protocol (toggle completed for this item)
                                              const updatedRecs = recs.map(
                                                (r: any, i: number) =>
                                                  i === index
                                                    ? {
                                                        ...r,
                                                        completed: !r.completed,
                                                      }
                                                    : r
                                              );
                                              const updatedProtocol = {
                                                ...originalProtocol,
                                                lifestyle_recommendations:
                                                  updatedRecs,
                                              };

                                              // Optimistically update local state
                                              setSelectedDog((prev) =>
                                                prev
                                                  ? {
                                                      ...prev,
                                                      protocol: updatedProtocol,
                                                    }
                                                  : prev
                                              );

                                              setUpdatingIndex(index);
                                              try {
                                                const response =
                                                  await jwtRequest(
                                                    "/dogs/update-by-payload",
                                                    "PUT",
                                                    {
                                                      id: selectedDog.id,
                                                      protocol: updatedProtocol,
                                                    }
                                                  );

                                                if (response?.success) {
                                                  // Sync state with server canonical dog if returned
                                                  setSelectedDog((d) =>
                                                    d
                                                      ? {
                                                          ...d,
                                                          ...response.dog,
                                                        }
                                                      : d
                                                  );
                                                  alert(
                                                    "Recommendation updated successfully."
                                                  );
                                                } else {
                                                  // revert optimistic update
                                                  setSelectedDog((d) =>
                                                    d
                                                      ? {
                                                          ...d,
                                                          protocol:
                                                            originalProtocol,
                                                        }
                                                      : d
                                                  );
                                                  alert(
                                                    "Failed to update recommendation. Please try again."
                                                  );
                                                  console.error(
                                                    "Update failed:",
                                                    response
                                                  );
                                                }
                                              } catch (error) {
                                                // revert optimistic update
                                                setSelectedDog((d) =>
                                                  d
                                                    ? {
                                                        ...d,
                                                        protocol:
                                                          originalProtocol,
                                                      }
                                                    : d
                                                );
                                                alert(
                                                  "Something went wrong while updating the recommendation."
                                                );
                                                console.error(
                                                  "Error updating recommendation:",
                                                  error
                                                );
                                              } finally {
                                                setUpdatingIndex(null);
                                              }
                                            }}
                                            className={`flex items-start space-x-3 p-4 rounded-lg cursor-pointer ${
                                              tip?.completed
                                                ? "bg-emerald-50"
                                                : "bg-white"
                                            }`}
                                            role="button"
                                            aria-pressed={!!tip?.completed}
                                            aria-disabled={
                                              updatingIndex !== null
                                            }
                                          >
                                            {/* render based on completed flag — no direct DOM toggling */}
                                            {tip?.completed ? (
                                              <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                                            ) : (
                                              <Circle className="h-5 w-5 text-brand-charcoal mt-0.5 flex-shrink-0" />
                                            )}

                                            <p className="text-gray-700">
                                              {tip.title}
                                            </p>

                                            {/* optional small inline indicator while updating */}
                                            {updatingIndex === index && (
                                              <span className="ml-auto text-xs italic">
                                                Updating…
                                              </span>
                                            )}
                                          </div>
                                        )
                                      )}
                                  </div>
                                </div>

                                {/* Next Steps */}
                                {selectedDog?.protocol?.next_steps ? (
                                  <>
                                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 p-6">
                                      <h3 className="text-lg font-bold text-gray-900 mb-4 ">
                                        Next Steps
                                      </h3>
                                      <div className="space-y-3">
                                        {selectedDog?.protocol?.next_steps?.map(
                                          (step, index) => (
                                            <>
                                              <div className="flex items-center space-x-3">
                                                <span className="flex-shrink-0 w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                                  {index + 1}
                                                </span>
                                                <p className="text-gray-700">
                                                  {step.title}
                                                </p>
                                              </div>
                                            </>
                                          )
                                        )}
                                      </div>
                                    </div>
                                  </>
                                ) : (
                                  <></>
                                )}

                                {user?.subscription_tier !== "comprehensive" ? (
                                  <>
                                    <div className="w-full bg-gradient-to-r from-brand-charcoal to-brand-midgrey text-white py-6 px-4 mt-10 rounded-2xl shadow-lg">
                                      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                                        {/* Text Content */}
                                        <div className="text-center md:text-left">
                                          <h2 className="text-xl md:text-2xl lg:text-3xl font-bold mb-2">
                                            🎯 1-on-1 Personal Consultation
                                          </h2>
                                          <p className="text-sm md:text-base lg:text-lg text-indigo-100 max-w-xl">
                                            Get expert guidance tailored to your
                                            dog’s{" "}
                                            <span className="font-semibold">
                                              health & nutrition
                                            </span>
                                            . Faster results, fewer flare-ups,
                                            and a happier pup — all included in
                                            your{" "}
                                            <span className="font-semibold">
                                              Comprehensive Plan
                                            </span>
                                            .
                                          </p>
                                        </div>

                                        {/* Action */}
                                        <div className="flex flex-col items-center md:items-end">
                                          <button
                                            onClick={() =>
                                              (window.location.href =
                                                "/subscription")
                                            }
                                            className="px-5 py-2.5 md:px-6 md:py-3 bg-white text-indigo-700 font-semibold rounded-xl shadow hover:bg-indigo-100 transition"
                                          >
                                            📅 Book My Session
                                          </button>
                                          <p className="text-xs text-indigo-200 mt-2">
                                            Exclusive for Comprehensive
                                            subscribers.
                                          </p>
                                          <br />
                                          <div className="relative inline-block group mt-2 font-bold text-brand-offwhite cursor-pointer text-lg">
                                            Compare plans »{" "}
                                            <PlansComparision position="top" />
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                      <div className="relative">
                                        {/* Button */}
                                        <button
                                          onClick={() => setShowIframe(true)}
                                          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-[1.02] flex items-center justify-center space-x-2"
                                        >
                                          <span>📅</span>
                                          <span>Book Consultation</span>
                                        </button>

                                        {/* Iframe Modal */}
                                        {showIframe && (
                                          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                                            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl h-[80vh] relative">
                                              {/* Close button */}
                                              <button
                                                onClick={() =>
                                                  setShowIframe(false)
                                                }
                                                className="absolute top-3 right-3 text-gray-600 hover:text-black p-2 bg-white hover:bg-gray-200 shadow-lg"
                                                style={{ borderRadius: "50%" }}
                                              >
                                                ✖
                                              </button>

                                              <iframe
                                                src={calendlyLink}
                                                className="w-full h-full rounded-2xl"
                                                style={{ border: "none" }}
                                                title="Book Consultation"
                                              />
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </>
                                )}
                              </>
                            ) : (
                              <div className="text-center py-16">
                                <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                  <img
                                    src={heartIcon}
                                    style={{ height: "34px" }}
                                  />
                                </div>
                                <h1 className="text-3xl font-bold text-gray-900 mb-4 ">
                                  Gut Health Protocol Not Available
                                </h1>
                                <p className="text-lg text-gray-600 mb-2">
                                  {selectedDog.name} doesn't have a gut health
                                  protocol yet
                                </p>
                                <p className="text-gray-600 mb-8">
                                  Complete a health assessment to generate a
                                  personalized gut health protocol
                                </p>
                                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                  <button
                                    onClick={() =>
                                      navigate("/intake?id=" + selectedDog?.id)
                                    }
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
                                  Monitor your {selectedDog.breed}'s health
                                  journey
                                </p>
                              </div>
                            </div>

                            {/* Progress History */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                              <div className="flex items-center space-x-2 mb-6">
                                <TrendingUp className="h-6 w-6 text-emerald-600" />
                                <h2 className="text-xl font-bold text-gray-900 ">
                                  {selectedDog.name}'s Progress History
                                </h2>
                              </div>

                              <div className="space-y-4">
                                {selectedDog.progress?.map((entry) => (
                                  <>
                                    {entry.improvement_score > 0 && (
                                      <div
                                        key={entry.id}
                                        className="border border-gray-200 rounded-lg p-6 hover:shadow-sm transition-shadow"
                                      >
                                        <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4">
                                          <div className="flex items-center space-x-4 mb-3 md:mb-0">
                                            <div className="text-sm text-gray-500">
                                              {new Date(
                                                entry.date
                                              ).toLocaleDateString()}
                                            </div>
                                            <div className="flex items-center space-x-2">
                                              {getScoreIcon(
                                                entry.improvement_score
                                              )}
                                              <span
                                                className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(
                                                  entry.improvement_score
                                                )}`}
                                              >
                                                Score:{" "}
                                                {Math.floor(
                                                  entry.improvement_score / 10
                                                ) ?? "N/A"}
                                                /10
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                        <small>{entry?.summary}</small>
                                        {entry.symptoms?.length > 0 && (
                                          <div className="mb-3">
                                            <span className="text-sm font-medium text-gray-700">
                                              Symptoms:{" "}
                                            </span>
                                            <div className="flex flex-wrap gap-2 mt-1">
                                              {entry.symptoms?.map(
                                                (symptom) => (
                                                  <span
                                                    key={symptom}
                                                    className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full"
                                                  >
                                                    {symptomOptions.find(
                                                      (opt) =>
                                                        opt.id === symptom
                                                    )?.label || symptom}
                                                  </span>
                                                )
                                              )}
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
                                    )}
                                  </>
                                ))}
                              </div>

                              {!selectedDog.progress && (
                                <div className="text-center py-12">
                                  <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                  <h3 className="text-lg font-medium text-gray-900 mb-2 ">
                                    No progress entries for {selectedDog.name}{" "}
                                    yet
                                  </h3>
                                  <p className="text-gray-600">
                                    Start tracking {selectedDog.name}'s progress
                                    to see improvements over time.
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
      {showSubmittingGutForm && (
        <AnimatePresence>
          {showSubmittingGutForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 shadow-lg"
              style={{ backdropFilter: "blur(8px)" }}
            >
              <motion.div
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.92, opacity: 0 }}
                transition={{ type: "spring", stiffness: 250, damping: 22 }}
                className="bg-white dark:bg-brand-charcoal rounded-2xl p-5 sm:p-6 w-full max-w-md shadow-xl text-center"
                role="status"
                aria-live="polite"
              >
                {/* Animated header area: bouncing dog + paw trail + floating hearts */}
                <div className="flex items-center justify-center gap-4 mb-4">
                  {/* Paw trail (three paws that move & bounce) */}
                  <div className="flex items-end gap-2">
                    {[0, 1, 2].map((i) => (
                      <motion.svg
                        key={i}
                        viewBox="0 0 24 24"
                        className="w-6 h-6 text-brand-charcoal dark:text-emerald-400"
                        initial={{
                          x: i === 0 ? -18 : i === 1 ? -6 : 6,
                          y: 6,
                          opacity: 0,
                        }}
                        animate={{
                          x: [
                            i === 0 ? -18 : i === 1 ? -6 : 6,
                            0,
                            i === 0 ? 18 : i === 1 ? 6 : 24,
                          ],
                          y: [6, -6, 6],
                          opacity: [0, 1, 0.9],
                        }}
                        transition={{
                          repeat: Infinity,
                          repeatType: "loop",
                          duration: 2.2,
                          delay: i * 0.18,
                          ease: "easeInOut",
                        }}
                        fill="currentColor"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden
                      >
                        <path d="M12 13c-3.866 0-7 3.134-7 7h14c0-3.866-3.134-7-7-7zM7.5 8.5a1.75 1.75 0 11.001-3.501A1.75 1.75 0 017.5 8.5zm4.5-2.5a1.5 1.5 0 11.001-3.001A1.5 1.5 0 0112 6zm4 2.5a1.75 1.75 0 11.001-3.501A1.75 1.75 0 0116 8.5z" />
                      </motion.svg>
                    ))}
                  </div>

                  {/* Bouncing dog silhouette */}
                  <motion.svg
                    viewBox="0 0 24 24"
                    className="w-12 h-12 text-brand-midgrey"
                    initial={{ y: 0, scale: 0.98 }}
                    animate={{ y: [0, -8, 0], scale: [0.98, 1.02, 0.98] }}
                    transition={{
                      repeat: Infinity,
                      duration: 1.2,
                      ease: "easeInOut",
                    }}
                    fill="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden
                  >
                    <path d="M5 13s1-4 4-4 4 2 6 2 4-2 4-2v7H5v-3zM3 11a1 1 0 100-2 1 1 0 000 2z" />
                  </motion.svg>

                  {/* Floating hearts */}
                  <div className="relative w-8 h-10">
                    {[
                      { left: 2, delay: 0 },
                      { left: 14, delay: 0.18 },
                      { left: 6, delay: 0.36 },
                    ].map((h, idx) => (
                      <motion.span
                        key={idx}
                        className="absolute inline-block w-3 h-3 rounded-full bg-pink-400/90"
                        style={{ left: h.left }}
                        initial={{ y: 6, scale: 0.7, opacity: 0.9 }}
                        animate={{
                          y: [-2, -18],
                          scale: [0.7, 1],
                          opacity: [0.9, 0],
                        }}
                        transition={{
                          repeat: Infinity,
                          duration: 1.6,
                          delay: h.delay,
                          ease: "easeOut",
                        }}
                        aria-hidden
                      />
                    ))}
                  </div>
                </div>

                {/* Title & message */}
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Generating Diagnosis
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-700 mb-4 px-2">
                  Hold tight — we’re analyzing your dog’s data to create a
                  tailored health report.
                </p>

                {/* Loader area: progress dots + subtle progress bar */}
                <div className="flex flex-col items-center gap-3">
                  {/* Pulsing dots */}
                  <div className="flex items-center gap-2" aria-hidden>
                    {[0, 1, 2].map((n) => (
                      <motion.span
                        key={n}
                        className="inline-block w-2.5 h-2.5 rounded-full bg-brand-midgrey"
                        initial={{ scale: 0.9, opacity: 0.7 }}
                        animate={{
                          scale: [0.9, 1.4, 0.9],
                          opacity: [0.7, 1, 0.7],
                        }}
                        transition={{
                          repeat: Infinity,
                          duration: 1.1,
                          delay: n * 0.18,
                        }}
                      />
                    ))}
                  </div>

                  {/* Thin progress bar that pulses — purely decorative */}
                  <div className="w-full px-6">
                    <div className="h-1.5 bg-gray-200 dark:bg-gray-400 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-brand-charcoal"
                        initial={{ x: "-40%" }}
                        animate={{ x: ["-40%", "40%", "-40%"] }}
                        transition={{
                          repeat: Infinity,
                          duration: 2.2,
                          ease: "easeInOut",
                        }}
                        style={{ width: "60%" }}
                      />
                    </div>
                  </div>
                </div>

                {/* Screen-reader hint (keeps UI accessible) */}
                <span className="sr-only">
                  Diagnosis generation in progress
                </span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
};

export default Dashboard;
