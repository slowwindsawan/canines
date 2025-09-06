import React, { useEffect, useState } from "react";
import { useAdmin } from "../../context/AdminContext";
import {
  Settings as SettingsIcon,
  Palette,
  MessageSquare,
  Save,
  Plus,
  Edit3,
  Trash2,
  User,
  Calendar,
  Flag,
  CheckCircle,
  Clock,
  AlertTriangle,
  Eye,
  UserCheck,
} from "lucide-react";
import { TonePreset, FeedbackEntry } from "../../types";
import FormBuilder from "./form-builder/FormBuilder";
import { jwtRequest } from "../../env";

const Settings: React.FC = () => {
  const {
    siteSettings,
    feedbackEntries,
    updateSiteSettings,
    updateFeedbackStatus,
    assignFeedback,
    adminUser,
    isLoading,
  } = useAdmin();

  const [activeTab, setActiveTab] = useState<"branding" | "tones" | "feedback">(
    "branding"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  // Site Settings Form State
  const [brandingForm, setBrandingForm] = useState({
    siteName: siteSettings.siteName,
    logoUrl: siteSettings.logoUrl,
    primaryColor: siteSettings.primaryColor,
    secondaryColor: siteSettings.secondaryColor,
    accentColor: siteSettings.accentColor,
  });

  const [tonePresets, setTonePresets] = useState(siteSettings.tonePresets);
  const [defaultTone, setDefaultTone] = useState(siteSettings.defaultTone);
  const [editingTone, setEditingTone] = useState<TonePreset | null>(null);
  const [showToneForm, setShowToneForm] = useState(false);
  const [showFormBuilder, setShowFormBuilder] = useState(false);

  const tabs = [
    { id: "branding", name: "Branding", icon: Palette },
    { id: "tones", name: "Tone Presets", icon: MessageSquare },
    { id: "feedback", name: "Feedback Management", icon: MessageSquare },
    { id: "form-builder", name: "Onboard Form Settings", icon: MessageSquare },
  ];

  const handleBrandingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    updateSiteSettings(brandingForm);
    setIsSubmitting(false);
  };

  const handleToneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    await new Promise((resolve) => setTimeout(resolve, 500));

    updateSiteSettings({
      tonePresets,
      defaultTone,
    });

    setEditingTone(null);
    setShowToneForm(false);
    setIsSubmitting(false);
  };

  const handleAddTone = () => {
    const newTone: TonePreset = {
      id: `tone-${Date.now()}`,
      name: "",
      description: "",
      keywords: [],
      isDefault: false,
    };
    setEditingTone(newTone);
    setShowToneForm(true);
  };

  const handleEditTone = (tone: TonePreset) => {
    setEditingTone(tone);
    setShowToneForm(true);
  };

  const handleDeleteTone = (toneId: string) => {
    setTonePresets((prev) => prev.filter((t) => t.id !== toneId));
    if (defaultTone === toneId && tonePresets.length > 1) {
      setDefaultTone(tonePresets.find((t) => t.id !== toneId)?.id || "");
    }
  };

  const handleSaveTone = () => {
    if (!editingTone) return;

    if (editingTone.name.trim() === "") return;

    setTonePresets((prev) => {
      const existing = prev.find((t) => t.id === editingTone.id);
      if (existing) {
        return prev.map((t) => (t.id === editingTone.id ? editingTone : t));
      } else {
        return [...prev, editingTone];
      }
    });

    setEditingTone(null);
    setShowToneForm(false);
  };

  const handleFeedbackStatusUpdate = async (
    id: string,
    status: FeedbackEntry["status"]
  ) => {
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 500));

    updateFeedbackStatus(id, status, adminNotes);
    setSelectedFeedback(null);
    setAdminNotes("");
    setIsSubmitting(false);
  };

  const handleAssignFeedback = async (id: string) => {
    if (!adminUser) return;

    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 500));

    assignFeedback(id, adminUser.id);
    setIsSubmitting(false);
  };

  const getStatusColor = (status: FeedbackEntry["status"]) => {
    switch (status) {
      case "new":
        return "bg-blue-100 text-blue-800";
      case "reviewed":
        return "bg-yellow-100 text-yellow-800";
      case "in_progress":
        return "bg-orange-100 text-orange-800";
      case "resolved":
        return "bg-green-100 text-green-800";
      case "closed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeColor = (type: FeedbackEntry["type"]) => {
    switch (type) {
      case "bug":
        return "bg-red-100 text-red-800";
      case "feature":
        return "bg-purple-100 text-purple-800";
      case "complaint":
        return "bg-orange-100 text-orange-800";
      case "compliment":
        return "bg-green-100 text-green-800";
      case "general":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: FeedbackEntry["priority"]) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: FeedbackEntry["status"]) => {
    switch (status) {
      case "new":
        return <Flag className="h-4 w-4" />;
      case "reviewed":
        return <Eye className="h-4 w-4" />;
      case "in_progress":
        return <Clock className="h-4 w-4" />;
      case "resolved":
        return <CheckCircle className="h-4 w-4" />;
      case "closed":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Flag className="h-4 w-4" />;
    }
  };

  const closeBuilder = () => {
    setShowFormBuilder(false);
    setActiveTab("branding");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {showFormBuilder ? (
        <>
          <FormBuilder closeBuilder={closeBuilder} />
        </>
      ) : (
        <>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center space-x-3 mb-2">
                <SettingsIcon className="h-8 w-8 text-gray-600" />
                <h1 className="text-3xl font-bold text-gray-900">
                  System Settings
                </h1>
              </div>
              <p className="text-lg text-gray-600">
                Manage site configuration and user feedback
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
              {/* Sidebar Navigation */}
              <div className="lg:col-span-1">
                <nav className="space-y-2">
                  {tabs.map((tab) => {
                    const IconComponent = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                          activeTab === tab.id
                            ? "bg-emerald-100 text-emerald-900 border border-emerald-200"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        <IconComponent className="h-5 w-5" />
                        <span className="font-medium">{tab.name}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Main Content */}
              <div className="lg:col-span-3">
                {/* Branding Tab */}
                {activeTab === "branding" && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center space-x-2 mb-6">
                      <Palette className="h-6 w-6 text-emerald-600" />
                      <h2 className="text-xl font-bold text-gray-900">
                        Branding Settings
                      </h2>
                    </div>

                    <form onSubmit={handleBrandingSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Site Name
                          </label>
                          <input
                            type="text"
                            value={brandingForm.siteName}
                            onChange={(e) =>
                              setBrandingForm((prev) => ({
                                ...prev,
                                siteName: e.target.value,
                              }))
                            }
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Logo URL
                          </label>
                          <input
                            type="text"
                            value={brandingForm.logoUrl}
                            onChange={(e) =>
                              setBrandingForm((prev) => ({
                                ...prev,
                                logoUrl: e.target.value,
                              }))
                            }
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Primary Color
                          </label>
                          <div className="flex space-x-2">
                            <input
                              type="color"
                              value={brandingForm.primaryColor}
                              onChange={(e) =>
                                setBrandingForm((prev) => ({
                                  ...prev,
                                  primaryColor: e.target.value,
                                }))
                              }
                              className="w-16 h-12 border border-gray-300 rounded-lg"
                            />
                            <input
                              type="text"
                              value={brandingForm.primaryColor}
                              onChange={(e) =>
                                setBrandingForm((prev) => ({
                                  ...prev,
                                  primaryColor: e.target.value,
                                }))
                              }
                              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Secondary Color
                          </label>
                          <div className="flex space-x-2">
                            <input
                              type="color"
                              value={brandingForm.secondaryColor}
                              onChange={(e) =>
                                setBrandingForm((prev) => ({
                                  ...prev,
                                  secondaryColor: e.target.value,
                                }))
                              }
                              className="w-16 h-12 border border-gray-300 rounded-lg"
                            />
                            <input
                              type="text"
                              value={brandingForm.secondaryColor}
                              onChange={(e) =>
                                setBrandingForm((prev) => ({
                                  ...prev,
                                  secondaryColor: e.target.value,
                                }))
                              }
                              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            />
                          </div>
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Accent Color
                          </label>
                          <div className="flex space-x-2 max-w-md">
                            <input
                              type="color"
                              value={brandingForm.accentColor}
                              onChange={(e) =>
                                setBrandingForm((prev) => ({
                                  ...prev,
                                  accentColor: e.target.value,
                                }))
                              }
                              className="w-16 h-12 border border-gray-300 rounded-lg"
                            />
                            <input
                              type="text"
                              value={brandingForm.accentColor}
                              onChange={(e) =>
                                setBrandingForm((prev) => ({
                                  ...prev,
                                  accentColor: e.target.value,
                                }))
                              }
                              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-lg font-medium hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center space-x-2"
                        >
                          <Save className="h-4 w-4" />
                          <span>
                            {isSubmitting ? "Saving..." : "Save Changes"}
                          </span>
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {activeTab === "form-builder" &&
                  (() => {
                    setShowFormBuilder(true);
                    return null;
                  })()}

                {/* Tone Presets Tab */}
                {activeTab === "tones" && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-2">
                        <MessageSquare className="h-6 w-6 text-emerald-600" />
                        <h2 className="text-xl font-bold text-gray-900">
                          Tone Presets
                        </h2>
                      </div>
                      <button
                        onClick={handleAddTone}
                        className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-2 rounded-lg font-medium hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 transform hover:scale-[1.02] flex items-center space-x-2"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Add Tone</span>
                      </button>
                    </div>

                    {/* Tone Presets List */}
                    <div className="space-y-4 mb-6">
                      {tonePresets.map((tone) => (
                        <div
                          key={tone.id}
                          className="border border-gray-200 rounded-lg p-4"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <h3 className="text-lg font-semibold text-gray-900">
                                  {tone.name}
                                </h3>
                                {defaultTone === tone.id && (
                                  <span className="px-2 py-1 bg-emerald-100 text-emerald-800 text-xs font-medium rounded-full">
                                    Default
                                  </span>
                                )}
                              </div>
                              <p className="text-gray-600 mb-2">
                                {tone.description}
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {tone.keywords.map((keyword, index) => (
                                  <span
                                    key={index}
                                    className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                                  >
                                    {keyword}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 ml-4">
                              <button
                                onClick={() => setDefaultTone(tone.id)}
                                disabled={defaultTone === tone.id}
                                className="text-emerald-600 hover:text-emerald-700 disabled:text-gray-400 text-sm font-medium"
                              >
                                Set Default
                              </button>
                              <button
                                onClick={() => handleEditTone(tone)}
                                className="text-blue-600 hover:text-blue-700 p-1"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteTone(tone.id)}
                                disabled={defaultTone === tone.id}
                                className="text-red-600 hover:text-red-700 disabled:text-gray-400 p-1"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Tone Form Modal */}
                    {showToneForm && editingTone && (
                      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                          <h3 className="text-lg font-bold text-gray-900 mb-4">
                            {tonePresets.find((t) => t.id === editingTone.id)
                              ? "Edit Tone"
                              : "Add New Tone"}
                          </h3>

                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Name
                              </label>
                              <input
                                type="text"
                                value={editingTone.name}
                                onChange={(e) =>
                                  setEditingTone((prev) =>
                                    prev
                                      ? { ...prev, name: e.target.value }
                                      : null
                                  )
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Description
                              </label>
                              <textarea
                                value={editingTone.description}
                                onChange={(e) =>
                                  setEditingTone((prev) =>
                                    prev
                                      ? { ...prev, description: e.target.value }
                                      : null
                                  )
                                }
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Keywords (comma-separated)
                              </label>
                              <input
                                type="text"
                                value={editingTone.keywords.join(", ")}
                                onChange={(e) =>
                                  setEditingTone((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          keywords: e.target.value
                                            .split(",")
                                            .map((k) => k.trim())
                                            .filter((k) => k),
                                        }
                                      : null
                                  )
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                              />
                            </div>
                          </div>

                          <div className="flex space-x-3 mt-6">
                            <button
                              onClick={handleSaveTone}
                              className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-2 rounded-lg font-medium hover:from-emerald-700 hover:to-teal-700 transition-all duration-200"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingTone(null);
                                setShowToneForm(false);
                              }}
                              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    <form onSubmit={handleToneSubmit}>
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-lg font-medium hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center space-x-2"
                        >
                          <Save className="h-4 w-4" />
                          <span>
                            {isSubmitting ? "Saving..." : "Save Tone Settings"}
                          </span>
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Feedback Management Tab */}
                {activeTab === "feedback" && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center space-x-2 mb-6">
                      <MessageSquare className="h-6 w-6 text-emerald-600" />
                      <h2 className="text-xl font-bold text-gray-900">
                        Feedback Management
                      </h2>
                    </div>

                    {/* Feedback Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <div className="flex items-center">
                          <Flag className="h-8 w-8 text-blue-500 mr-3" />
                          <div>
                            <p className="text-sm font-medium text-blue-600">
                              New
                            </p>
                            <p className="text-2xl font-bold text-blue-900">
                              {
                                feedbackEntries.filter(
                                  (f) => f.status === "new"
                                ).length
                              }
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-orange-50 rounded-lg p-4">
                        <div className="flex items-center">
                          <Clock className="h-8 w-8 text-orange-500 mr-3" />
                          <div>
                            <p className="text-sm font-medium text-orange-600">
                              In Progress
                            </p>
                            <p className="text-2xl font-bold text-orange-900">
                              {
                                feedbackEntries.filter(
                                  (f) => f.status === "in_progress"
                                ).length
                              }
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-green-50 rounded-lg p-4">
                        <div className="flex items-center">
                          <CheckCircle className="h-8 w-8 text-green-500 mr-3" />
                          <div>
                            <p className="text-sm font-medium text-green-600">
                              Resolved
                            </p>
                            <p className="text-2xl font-bold text-green-900">
                              {
                                feedbackEntries.filter(
                                  (f) => f.status === "resolved"
                                ).length
                              }
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-red-50 rounded-lg p-4">
                        <div className="flex items-center">
                          <AlertTriangle className="h-8 w-8 text-red-500 mr-3" />
                          <div>
                            <p className="text-sm font-medium text-red-600">
                              High Priority
                            </p>
                            <p className="text-2xl font-bold text-red-900">
                              {
                                feedbackEntries.filter(
                                  (f) => f.priority === "high"
                                ).length
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Feedback List */}
                    <div className="space-y-4">
                      {feedbackEntries.map((feedback) => (
                        <div
                          key={feedback.id}
                          className="border border-gray-200 rounded-lg p-4"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <User className="h-4 w-4 text-gray-400" />
                                <span className="font-medium text-gray-900">
                                  {feedback.userName}
                                </span>
                                <span className="text-gray-500">•</span>
                                <span className="text-sm text-gray-500">
                                  {feedback.userEmail}
                                </span>
                              </div>

                              <div className="flex items-center space-x-2 mb-2">
                                <span
                                  className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(
                                    feedback.type
                                  )}`}
                                >
                                  {feedback.type}
                                </span>
                                <span
                                  className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(
                                    feedback.priority
                                  )}`}
                                >
                                  {feedback.priority} priority
                                </span>
                                <div className="flex items-center space-x-1">
                                  {getStatusIcon(feedback.status)}
                                  <span
                                    className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                                      feedback.status
                                    )}`}
                                  >
                                    {feedback.status.replace("_", " ")}
                                  </span>
                                </div>
                              </div>

                              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                {feedback.subject}
                              </h3>
                              <p className="text-gray-700 mb-3">
                                {feedback.message}
                              </p>

                              {feedback.adminNotes && (
                                <div className="bg-gray-50 rounded-lg p-3 mb-3">
                                  <p className="text-sm text-gray-600">
                                    <strong>Admin Notes:</strong>{" "}
                                    {feedback.adminNotes}
                                  </p>
                                </div>
                              )}

                              <div className="flex items-center space-x-4 text-sm text-gray-500">
                                <div className="flex items-center space-x-1">
                                  <Calendar className="h-4 w-4" />
                                  <span>
                                    {new Date(
                                      feedback.timestamp
                                    ).toLocaleDateString()}
                                  </span>
                                </div>
                                {feedback.assignedTo && (
                                  <div className="flex items-center space-x-1">
                                    <UserCheck className="h-4 w-4" />
                                    <span>Assigned to {adminUser?.name}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col space-y-2 ml-4">
                              {!feedback.assignedTo && (
                                <button
                                  onClick={() =>
                                    handleAssignFeedback(feedback.id)
                                  }
                                  disabled={isSubmitting}
                                  className="text-blue-600 hover:text-blue-700 text-sm font-medium disabled:opacity-50"
                                >
                                  Assign to Me
                                </button>
                              )}

                              <select
                                value={feedback.status}
                                onChange={(e) =>
                                  handleFeedbackStatusUpdate(
                                    feedback.id,
                                    e.target.value as FeedbackEntry["status"]
                                  )
                                }
                                disabled={isSubmitting}
                                className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                              >
                                <option value="new">New</option>
                                <option value="reviewed">Reviewed</option>
                                <option value="in_progress">In Progress</option>
                                <option value="resolved">Resolved</option>
                                <option value="closed">Closed</option>
                              </select>

                              <button
                                onClick={() => setSelectedFeedback(feedback.id)}
                                className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
                              >
                                Add Notes
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Admin Notes Modal */}
                    {selectedFeedback && (
                      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                          <h3 className="text-lg font-bold text-gray-900 mb-4">
                            Add Admin Notes
                          </h3>

                          <textarea
                            value={adminNotes}
                            onChange={(e) => setAdminNotes(e.target.value)}
                            rows={4}
                            placeholder="Add your notes about this feedback..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          />

                          <div className="flex space-x-3 mt-4">
                            <button
                              onClick={() => {
                                const feedback = feedbackEntries.find(
                                  (f) => f.id === selectedFeedback
                                );
                                if (feedback) {
                                  handleFeedbackStatusUpdate(
                                    selectedFeedback,
                                    feedback.status
                                  );
                                }
                              }}
                              disabled={isSubmitting}
                              className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-2 rounded-lg font-medium hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 disabled:opacity-50"
                            >
                              {isSubmitting ? "Saving..." : "Save Notes"}
                            </button>
                            <button
                              onClick={() => {
                                setSelectedFeedback(null);
                                setAdminNotes("");
                              }}
                              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {feedbackEntries.length === 0 && (
                      <div className="text-center py-12">
                        <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          No feedback entries
                        </h3>
                        <p className="text-gray-600">
                          User feedback will appear here when submitted.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Settings;
