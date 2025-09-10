import React, { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "../context/AuthContext";
import { membershipTiers } from "../data/mockData";
import Tiers from "./Tiers";
import {
  User,
  Settings,
  CreditCard,
  Bell,
  Shield,
  Crown,
  Check,
  X,
  Edit3,
  Save,
  Calendar,
  AlertTriangle,
  Plus,
  History,
} from "lucide-react";
import { jwtRequest } from "../env";

// Stripe
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  useStripe,
  useElements,
  PaymentElement,
} from "@stripe/react-stripe-js";
import { SiMastercard, SiVisa } from "react-icons/si";

// ----------------- Schemas -----------------
const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional(),
  address: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zipCode: z.string().optional(),
      country: z.string().optional(),
    })
    .optional(),
});

const preferencesSchema = z.object({
  emailNotifications: z.boolean(),
  smsNotifications: z.boolean(),
  marketingEmails: z.boolean(),
});

const paymentMethodSchema = z.object({
  type: z.enum(["card", "paypal"]),
  last4: z.string().optional(),
  brand: z.string().optional(),
  expiryMonth: z.number().min(1).max(12).optional(),
  expiryYear: z.number().min(2024).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PreferencesFormData = z.infer<typeof preferencesSchema>;
type PaymentMethodFormData = z.infer<typeof paymentMethodSchema>;

// ---- Stripe publishable key (from .env) ----
// Make sure you have REACT_APP_STRIPE_PUBLISHABLE_KEY in your env (or window.STRIPE_PUBLISHABLE_KEY)
const STRIPE_PUBLISHABLE_KEY =
  "pk_test_51NtAm4SE1Cah5WcqkA27yFvZK8D5dn3sxuhdq4Y9SUrJ1gNO6OZPggDPOKKoNESvE5TOmYckacwbovV7R8jKl6m800GqTrt9iN";

const stripePromise = STRIPE_PUBLISHABLE_KEY
  ? loadStripe(STRIPE_PUBLISHABLE_KEY)
  : null;

// ---------------- PaymentElement form component (uses stripe hooks) ----------------
function PaymentElementForm({
  clientSecret,
  onSuccess,
  setError,
  disabled,
}: {
  clientSecret: string;
  onSuccess: (pmId: string) => void;
  setError: (m: string | null) => void;
  disabled: boolean;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setSubmitting(true);

    if (!stripe || !elements) {
      setError("Stripe has not loaded yet.");
      setSubmitting(false);
      return;
    }

    try {
      const result = await stripe.confirmSetup({
        elements,
        redirect: "if_required",
      });

      if (result.error) {
        setError(result.error.message ?? "Failed to confirm payment method.");
        setSubmitting(false);
        return;
      }

      const setupIntent = (result as any).setupIntent;
      const pmId =
        setupIntent?.payment_method ?? (result as any)?.paymentMethod?.id ?? null;

      if (!pmId) {
        setError("Could not read payment method from Stripe response.");
        setSubmitting(false);
        return;
      }

      // ✅ Success feedback
      setError(null);
      setSuccessMsg("Your payment method has been updated successfully!");
      onSuccess(pmId);
    } catch (err: any) {
      setError(err?.message ?? "Unexpected error during payment setup.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-3 border rounded-md">
        <PaymentElement />
      </div>

      {successMsg && (
        <p className="text-green-600 text-sm font-medium">{successMsg}</p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting || disabled}
          className="bg-gradient-to-r from-primary-600 to-primary-800 text-dark-900 px-6 py-2 rounded-lg font-medium disabled:opacity-50"
        >
          {submitting ? "Updating..." : "Update Payment Method"}
        </button>
      </div>
    </form>
  );
}

// ----------------- Account Component -----------------
const Account: React.FC = () => {
  const {
    user,
    updateProfile,
    updateSubscription,
    cancelSubscription,
    updatePaymentMethod,
    isLoading: authLoading,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<
    "profile" | "subscription" | "payment" | "preferences" | "history"
  >("profile");
  const [isEditing, setIsEditing] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const [profileSaving, setProfileSaving] = useState(false);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [subscriptionData, setSubscriptionData] = useState<any | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [defaultCardLast4, setDefaultCardLast4] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  // forms
  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: "", email: "", phone: "", address: {} },
  });

  const preferencesForm = useForm<PreferencesFormData>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      emailNotifications: true,
      smsNotifications: false,
      marketingEmails: true,
    },
  });

  const paymentForm = useForm<PaymentMethodFormData>({
    resolver: zodResolver(paymentMethodSchema),
    defaultValues: {
      type: "card",
      last4: "",
      brand: "",
      expiryMonth: 1,
      expiryYear: new Date().getFullYear(),
    },
  });

  // fetch subscription data
  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        setError(null);
        const resp = await jwtRequest("/stripe/subscription", "GET");
        console.log(resp);
        const wrapper = resp ?? null;
        setSubscriptionData(wrapper);

        const pmList =
          (wrapper?.payment_methods?.data ??
            wrapper?.stripe?.payment_methods?.data) ||
          wrapper?.payment_methods ||
          [];
        setPaymentMethods(Array.isArray(pmList) ? pmList : []);

        const last4 =
          wrapper?.default_card_last4 ??
          wrapper?.stripe?.default_card_last4 ??
          wrapper?.local?.default_card_last4 ??
          wrapper?.default_payment_method?.card?.last4 ??
          null;
        setDefaultCardLast4(last4 ?? null);

        setSuccessMessage(null);
        setError(null);
      } catch (e: any) {
        console.error("Failed to fetch subscription:", e);
        setError("Failed to load subscription information.");
      }
    };

    fetchSubscription();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // auto-dismiss notifications
  useEffect(() => {
    if (!successMessage && !error) return;
    const t = setTimeout(() => {
      setSuccessMessage(null);
      setError(null);
    }, 6000);
    return () => clearTimeout(t);
  }, [successMessage, error]);

  // create setup intent when payment tab opens
  useEffect(() => {
    const createSetupIntent = async () => {
      if (activeTab !== "payment") return;
      setError(null);
      setClientSecret(null);
      try {
        const resp = await jwtRequest("/stripe/setup-intent", "POST");
        if (resp?.client_secret) setClientSecret(resp.client_secret);
        else setError("Failed to initialize payment setup.");
      } catch (e: any) {
        console.error("Error creating setup intent:", e);
        setError("Failed to create payment setup. Try again later.");
      }
    };
    createSetupIntent();
  }, [activeTab]);

  // refresh subscription helper (returns refreshed object)
  const refreshSubscriptionData = async () => {
    try {
      const refreshed = await jwtRequest("/stripe/subscription", "GET");
      setSubscriptionData(refreshed);
      const pmList =
        (refreshed?.payment_methods?.data ??
          refreshed?.stripe?.payment_methods?.data) ||
        refreshed?.payment_methods ||
        [];
      setPaymentMethods(Array.isArray(pmList) ? pmList : []);
      const last4 =
        refreshed?.default_card_last4 ??
        refreshed?.stripe?.default_card_last4 ??
        refreshed?.local?.default_card_last4 ??
        refreshed?.default_payment_method?.card?.last4 ??
        null;
      setDefaultCardLast4(last4 ?? null);
      return refreshed;
    } catch (e: any) {
      console.error("Failed to refresh subscription:", e);
      return null;
    }
  };

  // called when PaymentElement flow succeeds and returns a PM id
  const onPaymentElementSuccess = async (payment_method_id: string) => {
    setError(null);
    setPaymentSaving(true);
    setSuccessMessage(null);
    try {
      // POST to your backend which attaches & sets default payment method
      const resp = await jwtRequest("/stripe/payment-method", "POST", {
        payment_method_id,
      });

      // refresh subscription data and use it to craft a helpful message
      const refreshed = await refreshSubscriptionData();

      const last4 =
        refreshed?.default_payment_method?.card?.last4 ??
        refreshed?.default_card_last4 ??
        payment_method_id?.slice(-4) ??
        null;

      window.location.reload()

      // If backend returned success flag, use it; otherwise infer from refreshed
      if (resp?.success) {
        setSuccessMessage(
          `Payment method updated — default card ending in ${last4 ?? "—"}.`
        );
      } else if (resp?.error) {
        setError(
          resp.error ??
            `Payment method attached but backend returned an unexpected response. Default card: ${last4 ?? "—"}`
        );
      } else {
        // generic success inference
        setSuccessMessage(
          `Payment method processed. Default card ending in ${last4 ?? "—"}.`
        );
      }
    } catch (e: any) {
      console.error("Error updating stripe payment method:", e);
      setError(e?.detail ?? e?.message ?? "Failed to update payment method.");
    } finally {
      setPaymentSaving(false);
    }
  };

  // existing submit handlers
  const onProfileSubmit = async (data: ProfileFormData) => {
    setError(null);
    setProfileSaving(true);
    try {
      const resp = await jwtRequest("/account/me", "PUT", data);
      if (updateProfile) await updateProfile(resp);
      setIsEditing(false);
      setSuccessMessage("Profile updated.");
    } catch (e: any) {
      console.error("Profile update error", e);
      setError(e?.message ?? "Failed to update profile.");
    } finally {
      setProfileSaving(false);
    }
  };

  const onPreferencesSubmit = async (data: PreferencesFormData) => {
    setError(null);
    setPrefsSaving(true);
    try {
      const payload = { preferences: data };
      const resp = await jwtRequest("/account/me", "PUT", payload);
      if (updateProfile) await updateProfile(resp);
      setSuccessMessage("Preferences saved.");
    } catch (e: any) {
      console.error("Preferences update error", e);
      setError(e?.message ?? "Failed to save preferences.");
    } finally {
      setPrefsSaving(false);
    }
  };

  const onPaymentSubmit = async (data: PaymentMethodFormData) => {
    // fallback local-only flow (kept for backwards compat)
    setError(null);
    setPaymentSaving(true);
    try {
      const payload = { paymentMethod: data };
      const resp = await jwtRequest("/account/payment", "PUT", payload);
      if (updatePaymentMethod) await updatePaymentMethod(resp);
      else if (updateProfile) await updateProfile(resp);
      setSuccessMessage("Local payment info saved.");
    } catch (e: any) {
      console.error("Payment update error", e);
      setError(e?.message ?? "Failed to update payment method.");
    } finally {
      setPaymentSaving(false);
    }
  };

  const handleSubscriptionChange = async (tier: typeof user.membershipTier) => {
    if (!user) return;
    try {
      await updateSubscription(tier);
    } catch (e) {
      console.error(e);
      setError("Failed to update subscription tier.");
    }
  };

  const handleCancelSubscription = async () => {
    try {
      await cancelSubscription();
      setShowCancelConfirm(false);
      setSuccessMessage("Subscription cancelled. You will keep access until period end.");
    } catch (e) {
      console.error(e);
      setError("Failed to cancel subscription.");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "trialing":
        return "bg-blue-100 text-blue-800";
      case "past_due":
        return "bg-red-100 text-red-800";
      case "canceled":
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // update via stripe pm id (used if you want a manual text box / select of existing PMs)
  const callUpdateStripePaymentMethod = async (payment_method_id: string) => {
    setError(null);
    setPaymentSaving(true);
    setSuccessMessage(null);

    try {
      const resp = await jwtRequest("/stripe/payment-method", "POST", {
        payment_method_id,
      });

      const refreshed = await refreshSubscriptionData();

      const last4 =
        refreshed?.default_payment_method?.card?.last4 ??
        refreshed?.default_card_last4 ??
        payment_method_id?.slice(-4) ??
        null;

      if (resp?.success) {
        setSuccessMessage(
          `Payment method updated — default card ending in ${last4 ?? "—"}.`
        );
      } else if (resp?.error) {
        setError(resp.error ?? "Failed to update payment method.");
      } else {
        setSuccessMessage(
          `Payment method processed. Default card ending in ${last4 ?? "—"}.`
        );
      }
    } catch (e: any) {
      console.error("Error updating stripe payment method:", e);
      setError(e?.detail ?? e?.message ?? "Failed to update payment method.");
    } finally {
      setPaymentSaving(false);
    }
  };

  if (!user) return null;

  const stripeObj = subscriptionData?.stripe ?? subscriptionData ?? null;
  const planItem = stripeObj?.items?.data?.[0] ?? null;
  const subscriptionStatus =
    stripeObj?.status ??
    stripeObj?.stripe?.status ??
    subscriptionData?.status ??
    "unknown";
  const startDate =
    stripeObj?.start_date ??
    subscriptionData?.start_date ??
    subscriptionData?.stripe?.start_date ??
    subscriptionData?.local?.start_date ??
    null;
  const currentPeriodEnd =
    planItem?.current_period_end ??
    stripeObj?.current_period_end ??
    subscriptionData?.current_period_end ??
    subscriptionData?.local?.subscription_current_period_end ??
    null;

  return (
    <div className="min-h-screen bg-primary-200 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-dark-900 mb-1">
            Account Settings
          </h1>
          <p className="text-base sm:text-lg text-dark-700">
            Manage your profile, subscription, and preferences
          </p>

          {/* Notification area (shows Stripe update status too) */}
          <div className="mt-3 space-y-2">
            {error && (
              <div className="inline-flex items-center justify-between w-full max-w-2xl p-2 bg-red-50 border border-red-200 text-red-800 rounded">
                <div className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="text-sm px-2 py-1"
                >
                  Dismiss
                </button>
              </div>
            )}

            {successMessage && (
              <div className="inline-flex items-center justify-between w-full max-w-2xl p-2 bg-green-50 border border-green-200 text-green-800 rounded">
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4" />
                  <span>{successMessage}</span>
                </div>
                <button
                  onClick={() => setSuccessMessage(null)}
                  className="text-sm px-2 py-1"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            {console.warn(subscriptionData)}
            <nav className="space-y-1 sm:space-y-2">
              {[
                { id: "profile", name: "Profile", icon: User },
                { id: "payment", name: "Payment", icon: CreditCard },
                { id: "history", name: "History", icon: History },
              ]
                .filter((tab) => !(tab.id === "history" && !subscriptionData?.payment_history))
                .map((tab) => {
                  const IconComponent: any = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                        activeTab === tab.id
                          ? "bg-primary-400 text-dark-900 border border-primary-500"
                          : "text-dark-700 hover:bg-primary-300"
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
          <div className="lg:col-span-3 space-y-6">
            {/* Profile Tab (unchanged) */}
            {activeTab === "profile" && (
              <div className="bg-white rounded-xl shadow-sm border border-primary-400 p-4 sm:p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg sm:text-xl font-bold text-dark-900">
                    Profile Information
                  </h2>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="flex items-center space-x-1 sm:space-x-2 text-dark-800 hover:text-dark-900 transition-colors text-sm sm:text-base"
                  >
                    {isEditing ? <X className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
                    <span>{isEditing ? "Cancel" : "Edit"}</span>
                  </button>
                </div>

                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <label className="block text-sm font-medium text-dark-800 mb-2">Full Name</label>
                      <input
                        defaultValue={user.name}
                        disabled={!isEditing}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-primary-400 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-primary-600 disabled:bg-primary-100 disabled:text-dark-600 text-sm sm:text-base"
                      />
                      {profileForm.formState.errors.name && (
                        <p className="mt-2 text-sm text-red-700">{profileForm.formState.errors.name.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-dark-800 mb-2">Email Address</label>
                      <input
                        defaultValue={user.email}
                        disabled={!isEditing}
                        type="email"
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-primary-400 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-primary-600 disabled:bg-primary-100 disabled:text-dark-600 text-sm sm:text-base"
                      />
                      {profileForm.formState.errors.email && (
                        <p className="mt-2 text-sm text-red-700">{profileForm.formState.errors.email.message}</p>
                      )}
                    </div>
                  </div>

                  {isEditing && (
                    <div className="flex justify-center sm:justify-end">
                      <button
                        type="submit"
                        disabled={profileSaving || authLoading}
                        className="bg-gradient-to-r from-primary-600 to-primary-800 text-dark-900 px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium hover:from-primary-500 hover:to-primary-700 transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center space-x-2 text-sm sm:text-base"
                      >
                        <Save className="h-4 w-4" />
                        <span>{profileSaving || authLoading ? "Saving..." : "Save Changes"}</span>
                      </button>
                    </div>
                  )}
                </form>
              </div>
            )}

            {/* Subscription Tab (unchanged) */}
            {activeTab === "subscription" && (
              <div className="bg-white rounded-xl shadow-sm border border-primary-400 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-dark-900 mb-1">Subscription</h2>
                    <p className="text-sm text-dark-700">Overview of your subscription and upcoming billing.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border border-primary-300 rounded-lg">
                    <h3 className="text-sm font-medium text-dark-900 mb-2">Plan</h3>
                    <p className="text-sm text-dark-700">
                      {planItem?.pricing?.price_details?.product ??
                        planItem?.price?.nickname ??
                        stripeObj?.plan?.nickname ??
                        stripeObj?.plan?.id ??
                        stripeObj?.items?.data?.[0]?.price?.product ??
                        "—"}
                    </p>
                  </div>

                  <div className="p-4 border border-primary-300 rounded-lg">
                    <h3 className="text-sm font-medium text-dark-900 mb-2">Status</h3>
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${getStatusColor(subscriptionStatus)}`}>
                      <span className="capitalize">{subscriptionStatus}</span>
                    </div>
                  </div>

                  <div className="p-4 border border-primary-300 rounded-lg">
                    <h3 className="text-sm font-medium text-dark-900 mb-2">Start Date</h3>
                    <p className="text-sm text-dark-700">
                      {new Date((startDate as any) ? (typeof startDate === "number" ? startDate * 1000 : startDate) : null).toLocaleString() ?? "—"}
                    </p>
                  </div>

                  <div className="p-4 border border-primary-300 rounded-lg">
                    <h3 className="text-sm font-medium text-dark-900 mb-2">Next Billing / Period End</h3>
                    <p className="text-sm text-dark-700">
                      {new Date((currentPeriodEnd as any) ? (typeof currentPeriodEnd === "number" ? currentPeriodEnd * 1000 : currentPeriodEnd) : null).toLocaleString() ?? "—"}
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <Tiers onChange={handleSubscriptionChange} onCancel={() => setShowCancelConfirm(true)} />
                </div>
              </div>
            )}

            {/* Payment Tab (with Stripe PaymentElement) */}
            {activeTab === "payment" && (
              <div className="bg-white rounded-xl shadow-sm border border-primary-400 p-6 space-y-6">
                <h2 className="text-xl font-bold text-dark-900">Payment Method</h2>

                {/* Default card summary */}
                <div>
                  <h3 className="text-sm font-medium text-dark-900 mb-2">Default Card</h3>
                  <div className="p-4 bg-primary-100 rounded-lg flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <CreditCard className="h-8 w-8 text-dark-600" />
                      <div>
                        <p className="font-medium text-dark-900">
                          {subscriptionData?.payment_methods?.data?.[0]?.card?.brand ??
                            subscriptionData?.payment_methods?.data?.[0]?.brand ??
                            "Card"}{" "}
                          ending in {defaultCardLast4 ?? "—"}
                        </p>
                        <p className="text-sm text-dark-700">
                          Expires{" "}
                          {subscriptionData?.payment_methods?.data?.[0]?.card?.exp_month ?? paymentForm.getValues("expiryMonth")}
                          /
                          {subscriptionData?.payment_methods?.data?.[0]?.card?.exp_year ?? paymentForm.getValues("expiryYear")}
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                      {subscriptionStatus}
                    </span>
                  </div>
                </div>

                {/* Saved payment methods list */}
                <div>
                  <h3 className="text-sm font-medium text-dark-900 mb-2">Saved Payment Methods</h3>
                  {paymentMethods.length === 0 ? (
                    <p className="text-sm text-dark-700">No saved payment methods found.</p>
                  ) : (
                    <div className="space-y-2">
                      {paymentMethods.map((pm) => (
                        <div key={pm.id} className="p-3 border border-primary-300 rounded-lg flex items-center justify-between">
                          <div>
                            <p className="font-medium text-dark-900 flex items-center">
                              {pm.card?.brand=="visa"&&(<SiVisa/>)}{pm.card?.brand=="mastercard"&&(<SiMastercard/>)}&nbsp;{pm.card?.brand}: ending in {pm.card?.last4 ?? pm.last4}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Stripe PaymentElement (secure) */}
                <div>
                  <h3 className="text-sm font-medium text-dark-900 mb-2">Add / Update Payment Method (secure)</h3>

                  {!clientSecret ? (
                    <p className="text-sm text-dark-700">Initializing payment setup...</p>
                  ) : !stripePromise ? (
                    <p className="text-sm text-red-700">Stripe publishable key not configured.</p>
                  ) : (
                    <Elements stripe={stripePromise as any} options={{ clientSecret }}>
                      <PaymentElementForm
                        clientSecret={clientSecret}
                        onSuccess={onPaymentElementSuccess}
                        setError={setError}
                        disabled={paymentSaving || authLoading}
                      />
                    </Elements>
                  )}
                </div>
              </div>
            )}

            {/* Preferences Tab (unchanged) */}
            {activeTab === "preferences" && (
              <div className="bg-white rounded-xl shadow-sm border border-primary-400 p-6">
                <h2 className="text-xl font-bold text-dark-900 mb-6">Notification Preferences</h2>

                <form onSubmit={preferencesForm.handleSubmit(onPreferencesSubmit)} className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-primary-400 rounded-lg">
                      <div>
                        <h3 className="font-medium text-dark-900">Email Notifications</h3>
                        <p className="text-sm text-dark-700">Receive product updates and tips</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input {...preferencesForm.register("emailNotifications")} type="checkbox" className="sr-only peer" />
                        <div className="w-11 h-6 bg-primary-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-primary-400 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-800"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 border border-primary-400 rounded-lg">
                      <div>
                        <h3 className="font-medium text-dark-900">SMS Notifications</h3>
                        <p className="text-sm text-dark-700">Get text messages for urgent alerts</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input {...preferencesForm.register("smsNotifications")} type="checkbox" className="sr-only peer" />
                        <div className="w-11 h-6 bg-primary-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-primary-400 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-800"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 border border-primary-400 rounded-lg">
                      <div>
                        <h3 className="font-medium text-dark-900">Marketing Emails</h3>
                        <p className="text-sm text-dark-700">Receive tips, articles, and product updates</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input {...preferencesForm.register("marketingEmails")} type="checkbox" className="sr-only peer" />
                        <div className="w-11 h-6 bg-primary-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-primary-400 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-800"></div>
                      </label>
                    </div>
                  </div>

                  <button type="submit" disabled={prefsSaving || authLoading} className="bg-gradient-to-r from-primary-600 to-primary-800 text-dark-900 px-6 py-3 rounded-lg font-medium hover:from-primary-500 hover:to-primary-700 transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none">
                    {prefsSaving || authLoading ? "Saving..." : "Save Preferences"}
                  </button>
                </form>
              </div>
            )}

            {activeTab === "history" && (
              <>
                {" "}
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                  {" "}
                  <h1 className="text-xl sm:text-2xl font-semibold text-dark-900 mb-4">Payment History </h1>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Invoices */}
                    <section className="bg-white rounded-lg shadow-sm border border-primary-300 p-3">
                      <h2 className="text-sm font-medium text-dark-900 mb-3">Invoices</h2>

                      {(subscriptionData?.payment_history?.invoices?.data ?? []).length === 0 ? (
                        <p className="text-xs text-dark-700">No invoices found.</p>
                      ) : (
                        <ul className="space-y-2 max-h-72 overflow-y-auto pr-2">
                          {subscriptionData?.payment_history?.invoices?.data?.map((inv) => (
                            <li key={inv.id} className="flex items-start justify-between gap-3 p-2 bg-primary-50 rounded-md">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-sm text-dark-900 truncate">{inv.number ?? inv.id}</p>
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${inv.status === "paid" ? "bg-green-100 text-green-800" : inv.status === "open" ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-800"}`}>
                                    {inv.status}
                                  </span>
                                </div>

                                <p className="text-xs text-dark-700 mt-1 truncate">{inv.description ?? inv.lines?.data?.[0]?.description ?? "Subscription invoice"}</p>

                                <div className="mt-1 text-xs text-dark-600 flex items-center gap-2">
                                  <span className="whitespace-nowrap">
                                    <strong>Amount:</strong>{" "}
                                    {typeof (inv.total ?? inv.amount_due) === "number"
                                      ? ((inv.total ?? inv.amount_due) / 100).toLocaleString(undefined, {
                                          style: "currency",
                                          currency: (inv.currency ?? "usd").toUpperCase(),
                                        })
                                      : "—"}
                                  </span>
                                  <span className="text-muted">•</span>
                                  <span className="whitespace-nowrap">
                                    <strong>Date:</strong>{" "}
                                    {inv.created ? new Date(inv.created * 1000).toLocaleString() : inv.effective_at ? new Date(inv.effective_at * 1000).toLocaleString() : "—"}
                                  </span>
                                </div>

                                {inv.lines?.data?.length > 0 && (
                                  <div className="mt-1 text-xs text-dark-700 truncate">
                                    <strong>Line:</strong> {inv.lines.data[0].description ?? `${inv.lines.data[0].quantity ?? 1} × item`}
                                  </div>
                                )}
                              </div>

                              <div className="ml-3 flex flex-col items-end gap-1 min-w-[68px]">
                                {inv.hosted_invoice_url && (
                                  <a href={inv.hosted_invoice_url} target="_blank" rel="noreferrer" className="text-xs px-2 py-1 border rounded hover:bg-primary-100">
                                    View
                                  </a>
                                )}
                                {inv.invoice_pdf && (
                                  <a href={inv.invoice_pdf} target="_blank" rel="noreferrer" className="text-xs px-2 py-1 border rounded hover:bg-primary-100">
                                    PDF
                                  </a>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>

                    {/* Charges */}
                    <section className="bg-white rounded-lg shadow-sm border border-primary-300 p-3">
                      <h2 className="text-sm font-medium text-dark-900 mb-3">Charges</h2>

                      {(subscriptionData?.payment_history?.charges?.data ?? []).length === 0 ? (
                        <p className="text-xs text-dark-700">No charges found.</p>
                      ) : (
                        <ul className="space-y-2 max-h-72 overflow-y-auto pr-2">
                          {subscriptionData?.payment_history?.charges?.data?.map((ch) => (
                            <li key={ch.id} className="flex items-start justify-between gap-3 p-2 bg-primary-50 rounded-md">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-sm text-dark-900 truncate">{ch.id}</p>
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${ch.status === "succeeded" ? "bg-green-100 text-green-800" : ch.status === "pending" ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-800"}`}>
                                    {ch.status}
                                  </span>
                                </div>

                                <p className="text-xs text-dark-700 mt-1 truncate">{ch.description ?? "Charge"}</p>

                                <div className="mt-1 text-xs text-dark-600 flex items-center gap-2">
                                  <span className="whitespace-nowrap">
                                    <strong>Amount:</strong>{" "}
                                    {typeof ch.amount === "number"
                                      ? (ch.amount / 100).toLocaleString(undefined, {
                                          style: "currency",
                                          currency: (ch.currency ?? "usd").toUpperCase(),
                                        })
                                      : "—"}
                                  </span>
                                  <span className="text-muted">•</span>
                                  <span className="whitespace-nowrap">
                                    <strong>Date:</strong> {ch.created ? new Date(ch.created * 1000).toLocaleString() : "—"}
                                  </span>
                                </div>

                                {ch.payment_method_details?.card && (
                                  <p className="text-xs text-dark-700 mt-1 truncate">
                                    <strong>Card:</strong> {ch.payment_method_details.card.brand ?? "Card"} ending in {ch.payment_method_details.card.last4 ?? "—"} • Exp {ch.payment_method_details.card.exp_month ?? "—"}/{ch.payment_method_details.card.exp_year ?? "—"}
                                  </p>
                                )}
                              </div>

                              <div className="ml-3 flex flex-col items-end gap-1 min-w-[68px]">
                                {ch.receipt_url && (
                                  <a href={ch.receipt_url} target="_blank" rel="noreferrer" className="text-xs px-2 py-1 border rounded hover:bg-primary-100">
                                    Receipt
                                  </a>
                                )}
                                <a href={`https://dashboard.stripe.com/payments/${ch.id}`} target="_blank" rel="noreferrer" className="text-xs text-primary-700 underline">
                                  Stripe
                                </a>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                  </div>
                  <div className="mt-4 p-3 border border-primary-200 rounded bg-primary-50 text-xs text-dark-700">
                    <p>
                      Showing latest{" "}
                      <span className="font-medium">
                        {Math.max((subscriptionData?.payment_history?.invoices?.data ?? []).length, (subscriptionData?.payment_history?.charges?.data ?? []).length)}
                      </span>{" "}
                      records. Click View / PDF / Receipt to open full details.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Cancel Subscription Confirmation Modal */}
        {showCancelConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center space-x-3 mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600" />
                <h3 className="text-lg font-bold text-dark-900">Cancel Subscription</h3>
              </div>
              <p className="text-dark-700 mb-6">Are you sure you want to cancel your subscription? You'll continue to have access until the end of your current billing period.</p>
              <div className="flex space-x-3">
                <button
                  onClick={handleCancelSubscription}
                  disabled={authLoading}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {authLoading ? "Cancelling..." : "Yes, Cancel"}
                </button>
                <button onClick={() => setShowCancelConfirm(false)} className="flex-1 bg-primary-400 hover:bg-primary-500 text-dark-800 px-4 py-2 rounded-lg font-medium transition-colors">
                  Keep Subscription
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Account;
