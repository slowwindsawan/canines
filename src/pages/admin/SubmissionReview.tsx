import React, { useEffect, useState } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { useAdmin } from "../../context/AdminContext";
import { Protocol } from "../../types";
import {
  ArrowLeft,
  User,
  Dog,
  Brain,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Edit3,
  Paperclip,
  Pencil,
  PencilLineIcon,
  PencilIcon,
  PencilLine,
} from "lucide-react";
import { useGlobalStore } from "../../globalStore";
import { renderProtocol } from "./compoents/RenderProtocol";

function mergeProtocols(firstJson: any, secondJson: any) {
  return {
    daily_meal_plan: firstJson.daily_meal_plan || [],
    protocol: {
      supplements: secondJson.supplements || [],
      lifestyle_recommendations: secondJson.lifestyle_recommendations || [],
      next_steps: secondJson.next_steps || [],
      // custom_sections: secondJson.custom_sections || [],
    },
  };
}

const SubmissionReview: React.FC = () => {
  const { submissions, updateSubmissionStatus, assignSubmission, adminUser } =
    useAdmin();
  const [reviewNotes, setReviewNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { submission } = useGlobalStore();
  console.log(
    "Current submission in store:",
    mergeProtocols(
      submission?.dog?.overview || {},
      submission?.dog?.protocol || {}
    )
  );

  // Initialize finalProtocol state
  const [finalProtocol, setFinalProtocol] = useState<Protocol>(() => {
    if (submission?.finalProtocol) {
      return submission.finalProtocol;
    }
    return {
      id: "",
      dogId: submission?.dog?.id || "",
      phase: "reset",
      mealPlan: {
        breakfast: "",
        dinner: "",
      },
      supplements: [],
      lifestyleTips: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      upcomingChanges: "",
      nextPhaseDetails: "",
    };
  });

  // Get previous submission for re-evaluations
  const previousSubmission =
    submission?.isReevaluation && submission?.previousSubmissionId
      ? submissions.find((s) => s.id === submission.previousSubmissionId)
      : null;

  if (!submission) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Submission Not Found
          </h2>
          <Link
            to="/admin/submissions"
            className="text-emerald-600 hover:text-emerald-700"
          >
            Back to Submissions
          </Link>
        </div>
      </div>
    );
  }

  const handleStatusUpdate = async (status: typeof submission.status) => {
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    updateSubmissionStatus(submission.id, status, reviewNotes);
    setIsSubmitting(false);
  };

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case "urgent":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "under_review":
        return "bg-blue-100 text-blue-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "needs_revision":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <Link
            to="/admin/submissions"
            className="flex items-center space-x-2 text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Submissions</span>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">
              Case Review: {submission.userName}
            </h1>
            <div className="flex items-center space-x-4 mt-2">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                  submission.status
                )}`}
              >
                {submission.status.replace("_", " ").toUpperCase()}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${getUrgencyColor(
                  submission.priority
                )}`}
              >
                {submission.priority.toUpperCase()} PRIORITY
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* User Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-2 mb-4">
                <User className="h-6 w-6 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">
                  User Information
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Name
                  </label>
                  <p className="text-gray-900">{submission.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <p className="text-gray-900">{submission.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Submitted
                  </label>
                  <p className="text-gray-900">
                    {new Date(submission.created_at).toLocaleString("en-US", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Case ID
                  </label>
                  <p className="text-gray-900 font-mono">{submission.id}</p>
                </div>
              </div>
            </div>

            {/* Dog Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Dog className="h-6 w-6 text-orange-600" />
                <h2 className="text-xl font-semibold text-gray-900">
                  Dog Information
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(submission?.dog?.form_data?.fullFormFields || []).map(
                  (field: any) => {
                    // Use the value directly from the field
                    const value = field.value;

                    // Handle array values (like checkboxes) as comma-separated
                    const displayValue = Array.isArray(value)
                      ? value.join(", ")
                      : value ?? "-";

                    return (
                      <div key={field.name} className="mb-4">
                        <label className="block text-sm font-medium text-gray-700">
                          {field.label}
                        </label>
                        <p className="text-gray-900">{displayValue}</p>
                      </div>
                    );
                  }
                )}
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Symptoms
                </label>
                <div className="flex flex-wrap gap-2">
                  {submission?.symptoms?.items?.map((symptom) => (
                    <span
                      key={symptom}
                      className="px-3 py-1 bg-red-100 text-red-700 text-sm rounded-full"
                    >
                      {symptom.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </div>

              {submission.dog.behaviorNotes && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Behavior Notes
                  </label>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">
                    {submission.dog.behaviorNotes}
                  </p>
                </div>
              )}
            </div>

            {/* Overview and Protocol */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 mb-1">
                  <Paperclip className=" text-blue-600" size={18} />
                  <h2 className="text-l font-semibold text-gray-900">
                    AI Generated
                  </h2>
                </div>
                <div className="flex items-center space-x-2 mb-1 text-gray-500 cursor-pointer rounded-3xl bg-brand-offwhite px-3 py-0.5 hover:shadow-sm transition-shadow hover:bg-slate-600 hover:text-white" onClick={() => {
                  // Navigate to protocol editor with current submission ID
                  window.open(`/admin/protocol-editor/${submission.dog.id}`, "_self");
                }}>
                  <PencilLine size={14}/><span className="text-small tracking-tight">Edit</span>
                </div>
              </div>

              {renderProtocol(
                mergeProtocols(
                  submission?.dog?.overview || {},
                  submission?.dog?.protocol || {}
                )
              )}
            </div>

            {/* AI Diagnosis */}
            {submission.isReevaluation && previousSubmission && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Brain className="h-6 w-6 text-blue-600" />
                  <h2 className="text-xl font-semibold text-gray-900">
                    Previous vs Current Assessment
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">
                      Previous Assessment
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Primary Concerns
                        </label>
                        <ul className="space-y-1">
                          {previousSubmission.aiDiagnosis.primaryConcerns.map(
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Confidence
                        </label>
                        <span className="text-sm text-gray-900">
                          {Math.round(
                            previousSubmission.aiDiagnosis.confidence * 100
                          )}
                          %
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="border border-emerald-200 rounded-lg p-4 bg-emerald-50">
                    <h3 className="font-semibold text-gray-900 mb-3">
                      Current Assessment
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Primary Concerns
                        </label>
                        <ul className="space-y-1">
                          {submission.aiDiagnosis.primaryConcerns.map(
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Confidence
                        </label>
                        <span className="text-sm text-gray-900">
                          {Math.round(submission.aiDiagnosis.confidence * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Review Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Review Actions
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Review Notes
                  </label>
                  <textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Add your review notes..."
                  />
                </div>

                {/* Final Protocol Editor */}
                <div className="border-t pt-4">
                  <h4 className="text-md font-semibold text-gray-900 mb-3">
                    Final Protocol
                  </h4>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Breakfast
                      </label>
                      <input
                        type="text"
                        value={finalProtocol.mealPlan.breakfast}
                        onChange={(e) =>
                          setFinalProtocol((prev) => ({
                            ...prev,
                            mealPlan: {
                              ...prev.mealPlan,
                              breakfast: e.target.value,
                            },
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Dinner
                      </label>
                      <input
                        type="text"
                        value={finalProtocol.mealPlan.dinner}
                        onChange={(e) =>
                          setFinalProtocol((prev) => ({
                            ...prev,
                            mealPlan: {
                              ...prev.mealPlan,
                              dinner: e.target.value,
                            },
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Supplements (one per line)
                      </label>
                      <textarea
                        value={finalProtocol.supplements.join("\n")}
                        onChange={(e) =>
                          setFinalProtocol((prev) => ({
                            ...prev,
                            supplements: e.target.value
                              .split("\n")
                              .filter((s) => s.trim()),
                          }))
                        }
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Lifestyle Tips (one per line)
                      </label>
                      <textarea
                        value={finalProtocol.lifestyleTips.join("\n")}
                        onChange={(e) =>
                          setFinalProtocol((prev) => ({
                            ...prev,
                            lifestyleTips: e.target.value
                              .split("\n")
                              .filter((s) => s.trim()),
                          }))
                        }
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <button
                    onClick={() => handleStatusUpdate("approved")}
                    disabled={isSubmitting || submission.status === "approved"}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:from-green-700 hover:to-emerald-700 transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>{isSubmitting ? "Processing..." : "Approve"}</span>
                  </button>

                  <button
                    onClick={() => handleStatusUpdate("needs_revision")}
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white px-4 py-2 rounded-lg font-medium hover:from-orange-700 hover:to-red-700 transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
                  >
                    <Edit3 className="h-4 w-4" />
                    <span>Needs Revision</span>
                  </button>

                  <button
                    onClick={() => handleStatusUpdate("rejected")}
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-red-600 to-pink-600 text-white px-4 py-2 rounded-lg font-medium hover:from-red-700 hover:to-pink-700 transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
                  >
                    <XCircle className="h-4 w-4" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Previous Notes */}
            {submission.reviewNotes && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Previous Review Notes
                </h3>
                <p className="text-gray-700 text-sm bg-gray-50 p-3 rounded-lg">
                  {submission.reviewNotes}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubmissionReview;
