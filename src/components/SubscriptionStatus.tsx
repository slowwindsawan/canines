import React, { useEffect, useState } from "react";
import { jwtRequest } from "../env"; // adjust path
import { useAuth } from "../context/AuthContext";

type PlanKey = "foundation" | "therapeutic" | "comprehensive";

interface PriceIds {
  foundation: string;
  therapeutic: string;
  comprehensive: string;
}

interface Props {
  priceIds: PriceIds;
  onCreated?: (sessionId: string, plan: PlanKey) => void;
  currentStatus?: string | null;
  className?: string;
  currentPlan?: PlanKey | null;
}

const PLANS: Record<
  PlanKey,
  {
    title: string;
    priceLabel: string;
    subtitle: string;
    bullets: string[];
    cta: string;
    accent?: string;
    ribbon?: string | null;
    emoji?: string;
    description?: string;
  }
> = {
  foundation: {
    title: "Foundation",
    priceLabel: "$29",
    subtitle: "/ month / per dog",
    bullets: ["AI gut plan", "Tips", "Library", "Guides"],
    cta: "Choose Foundation",
    emoji: "🌱",
    description: "Perfect for day-to-day maintenance and prevention.",
  },
  therapeutic: {
    title: "Therapeutic",
    priceLabel: "$69",
    subtitle: "/ month / per dog",
    bullets: [
      "Foundations +",
      "Weekly meal plans",
      "Symptom tracker charts",
      "Supplement cycling",
      "Phase upgrade request",
    ],
    cta: "Choose Therapeutic",
    accent: "ring-2 ring-indigo-400/30",
    ribbon: "🎯 Most Popular",
    emoji: "🎯",
    description: "Advanced care workflows and in-depth plans.",
  },
  comprehensive: {
    title: "Comprehensive",
    priceLabel: "$149",
    subtitle: "/ month / per dog",
    bullets: [
      "Therapeutic +",
      "Live group calls",
      "Personalised AI-human reviews",
      "Discount on 1:1 consult",
    ],
    cta: "Choose Comprehensive",
    emoji: "👑",
    description: "Full support, live calls and priority reviews.",
  },
};

const PLAN_RANK: Record<PlanKey, number> = {
  foundation: 0,
  therapeutic: 1,
  comprehensive: 2,
};

export default function SubscriptionCenterPage({
  priceIds,
  onCreated,
  currentStatus = null,
  className = "",
  currentPlan = null,
}: Props) {
  const [status, setStatus] = useState<string | null>(currentStatus);
  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);
  const {user}=useAuth()

  // local optimistic plan and pending change state
  const [localPlan, setLocalPlan] = useState<PlanKey | null>(
    currentPlan ?? null
  );
  const [pendingChange, setPendingChange] = useState<{
    plan: PlanKey;
    type: "upgrade" | "downgrade" | "purchase";
    message?: string;
  } | null>(null);

  // modal state for downgrade confirmation
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [modalPlan, setModalPlan] = useState<PlanKey | null>(null);
  const [modalLoses, setModalLoses] = useState<string[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCancelClick = () => {
    setShowConfirm(true);
  };

  const confirmCancel = async () => {
    setLoading(true);
    try {
      const res = await jwtRequest(
        "/stripe/cancel-subscription",
        "POST",
        { immediate: false } // change to true if you want instant cancellation
      );

      if (res?.subscription) {
        alert("Subscription canceled successfully ✅");
        window.location.reload(); // refresh to update UI
      } else {
        alert("Failed to cancel subscription ❌");
      }
    } catch (err: any) {
      alert(err?.message || "Error canceling subscription");
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    // sync incoming prop to local state (parent may update after webhook)
    setLocalPlan(currentPlan ?? null);
    if (currentStatus) {
      setStatus(currentStatus);
      setFetched(true);
      return;
    }
    (async () => {
      try {
        const res = await jwtRequest("/stripe/subscription", "GET", null);
        if (!mounted) return;
        setStatus(res?.local?.subscription_status ?? null);
      } catch (err: any) {
        setError(
          err?.message || err?.detail || "Failed to fetch subscription status"
        );
      } finally {
        if (mounted) setFetched(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [currentStatus, currentPlan]);

  const analyzeLosses = (from: PlanKey | null, to: PlanKey) => {
    if (!from) return PLANS[to].bullets.map((b) => `Gain: ${b}`); // no current plan => show gains
    const fromBullets = PLANS[from].bullets;
    const toBullets = PLANS[to].bullets;
    // losses = things in from that are not present in to
    return fromBullets.filter((b) => !toBullets.includes(b));
  };

  const openDowngradeConfirm = (target: PlanKey) => {
    const loses = analyzeLosses(localPlan ?? null, target);
    setModalLoses(loses);
    setModalPlan(target);
    setConfirmOpen(true);
  };

  const confirmDowngrade = async () => {
    if (!modalPlan) return;
    setConfirmOpen(false);
    await createCheckoutFor(modalPlan);
  };

  // new centralized handler that understands backend response shapes
  const createCheckoutFor = async (plan: PlanKey) => {
    setError(null);
    setLoadingPlan(plan);
    try {
      const path = `/stripe/create-checkout-session?plan=${encodeURIComponent(
        plan
      )}&mode=subscription`;
      const resp = await jwtRequest(path, "POST", null);
      if (!resp) throw new Error("No response from server.");

      // Case: backend returns a redirect URL (Checkout OR dashboard)
      if (resp.url) {
        // If backend returned a message (e.g., downgrade applied locally), show it then redirect
        if (resp.message) alert(resp.message);
        if (resp.id && typeof onCreated === "function") {
          try {
            onCreated(resp.id, plan);
          } catch {}
        }
        // If backend intentionally returned dashboard_url (no checkout), navigate there
        window.location.href = resp.url;
        return;
      }

      // Case: backend signalled a downgrade was applied (may be local apply or Stripe modify)
      if (resp.downgrade) {
        // If Stripe subscription object returned, change is recorded with Stripe (pending)
        if (resp.stripe_subscription) {
          alert(
            resp.message ??
              "Downgrade requested — pending webhook confirmation."
          );
          setPendingChange({ plan, type: "downgrade", message: resp.message });
        } else {
          // fallback local apply (no Stripe)
          alert(resp.message ?? "Downgrade applied.");
          setLocalPlan(plan);
          setPendingChange(null);
        }
        return;
      }

      // Case: backend signalled an in-place upgrade request (proration created)
      if (resp.upgrade) {
        if (resp.stripe_subscription) {
          alert(
            resp.message ?? "Upgrade requested — will finalize after payment."
          );
          setPendingChange({ plan, type: "upgrade", message: resp.message });
        } else {
          // no stripe_subscription -> possible local fallback
          alert(resp.message ?? "Upgrade applied locally.");
          setLocalPlan(plan);
          setPendingChange(null);
        }
        return;
      }

      // Case: backend created Checkout session but did not return url (rare)
      if (resp.id && !resp.url && resp.message) {
        alert(resp.message);
        if (resp.id && typeof onCreated === "function") {
          try {
            onCreated(resp.id, plan);
          } catch {}
        }
        // do not redirect; user needs to follow link from server or UI
        return;
      }

      // If server returned an explicit error structure
      if (resp.error || resp.detail || resp.stripe_error) {
        const msg = resp.error || resp.detail || resp.stripe_error;
        throw new Error(msg);
      }

      // default fallback
      throw new Error("Unexpected server response.");
    } catch (err: any) {
      setError(err?.message || String(err));
      alert(
        "Failed to start/change subscription: " + (err?.message || String(err))
      );
    } finally {
      setLoadingPlan(null);
    }
  };

  const openBillingPortal = async () => {
    setError(null);
    setLoadingPortal(true);
    try {
      const resp = await jwtRequest(
        "/stripe/create-portal-session",
        "POST",
        null
      );
      if (resp?.url) {
        window.location.href = resp.url;
        return;
      }
      throw new Error(resp?.detail || "Unable to open billing portal");
    } catch (err: any) {
      setError(err?.message || String(err));
      alert("Failed to open billing portal: " + (err?.message || String(err)));
    } finally {
      setLoadingPortal(false);
    }
  };

  // modal helper
  const renderBadge = (plan: PlanKey) => {
    const p = PLANS[plan];
    if (!p.ribbon) return null;
    return (
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
        <div className="px-4 py-1 rounded-full bg-amber-500 text-white text-sm font-semibold shadow transform -rotate-6">
          {p.ribbon}
        </div>
      </div>
    );
  };

  const statusText =
    status === "active"
      ? "You have an active subscription — thanks! Manage or upgrade below."
      : status === "trialing"
      ? "You're on a trial. Upgrade anytime to keep access."
      : status === "incomplete"
      ? "It looks like your subscription is incomplete — finish checkout to activate."
      : status === "incomplete_expired"
      ? "Your checkout expired. Retry below to subscribe."
      : status === "past_due"
      ? "Payment issue detected — update billing to avoid interruption."
      : status === "canceled"
      ? "You cancelled your subscription. Resubscribe anytime."
      : "No active subscription found. Pick a plan to get started.";

  // Treat a plan as "current" only when the user has an active subscription and localPlan is set
  const hasActiveSubscription = status === "active" && localPlan !== null;
  const currentRank = hasActiveSubscription
    ? PLAN_RANK[localPlan as PlanKey]
    : -1;

  return (
    <main className={`min-h-screen bg-slate-50 py-12 ${className}`}>
      <div className="max-w-7xl mx-auto px-6">
        <header className="text-center mb-4">
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900">
            Choose the right plan for your dog
          </h1>
          <p className="mt-4 text-slate-600 max-w-3xl mx-auto">
            Bigger plans with more support. Pick per-dog subscription that grows
            with your pet. Secure payments via Stripe.
          </p>

          {/* pending change banner */}
          {pendingChange ? (
            <div className="mt-4 inline-flex items-center gap-3 rounded-full bg-amber-50 px-5 py-3 shadow">
              <div className="text-sm text-amber-800 font-semibold">
                {pendingChange.type === "upgrade"
                  ? "Upgrade pending"
                  : pendingChange.type === "downgrade"
                  ? "Downgrade pending"
                  : "Change pending"}
              </div>
              <div className="text-xs text-amber-700">•</div>
              <div className="text-xs text-amber-700">
                {pendingChange.message ??
                  `Switching to ${
                    PLANS[pendingChange.plan].title
                  } — will finalize after Stripe confirms payment.`}
              </div>
            </div>
          ) : (
            <div className="mt-4 inline-flex items-center gap-3 rounded-full bg-white px-5 py-3 shadow">
              <div className="text-sm text-slate-700 font-semibold">
                {status ? status.toUpperCase() : "NO SUBSCRIPTION"}
              </div>
              <div className="text-xs text-slate-500">•</div>
              <div className="text-xs text-slate-500">{statusText}</div>
            </div>
          )}
        </header>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {(Object.keys(PLANS) as PlanKey[]).map((key) => {
            const plan = PLANS[key];
            const rank = PLAN_RANK[key];
            const isCurrent = hasActiveSubscription && key === localPlan;
            const isLower = currentRank > -1 && rank < currentRank;
            const isHigher = currentRank > -1 && rank > currentRank;
            const btnLoading = loadingPlan === key;

            // Button text & behavior
            let buttonText = plan.cta;
            let buttonHandler: () => void = () => createCheckoutFor(key);
            let btnDisabled = false;
            let btnClass =
              "flex-1 px-6 py-4 rounded-2xl text-sm font-semibold shadow-md text-white bg-brand-charcoal";

            if (isCurrent) {
              buttonText = "Current plan";
              btnDisabled = true;
              btnClass =
                "flex-1 px-6 py-4 rounded-2xl text-sm font-semibold shadow-md text-brand-midgrey bg-brand-offwhite cursor-not-allowed";
            } else if (isLower) {
              buttonText = `Downgrade to ${plan.title}`;
              buttonHandler = () => openDowngradeConfirm(key);
              btnClass =
                "flex-1 px-6 py-4 rounded-2xl text-sm font-semibold shadow-md text-white bg-rose-600";
            } else if (isHigher) {
              buttonText = `Upgrade to ${plan.title}`;
              buttonHandler = () => createCheckoutFor(key);
              btnClass = isPopular(key)
                ? "flex-1 px-6 py-4 rounded-2xl text-sm font-semibold shadow-md text-white bg-gradient-to-r from-indigo-600 to-indigo-500"
                : "flex-1 px-6 py-4 rounded-2xl text-sm font-semibold shadow-md text-white bg-brand-charcoal";
            } else {
              // no current active subscription: keep choose button active
              buttonText = plan.cta;
              buttonHandler = () => createCheckoutFor(key);
            }

            return (
              <article
                key={key}
                className={`relative bg-white rounded-3xl p-8 md:p-10 shadow-xl flex flex-col justify-between ${
                  plan.accent ?? ""
                }`}
                aria-label={`${plan.title} plan`}
              >
                {plan.ribbon ? renderBadge(key) : null}

                <div>
                  <div className="flex items-center gap-4">
                    <div className="text-4xl md:text-5xl">{plan.emoji}</div>
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900">
                        {plan.title}
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">
                        {plan.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex items-end gap-4">
                    <div className="text-5xl md:text-6xl font-extrabold text-slate-900">
                      {plan.priceLabel}
                    </div>
                    <div className="text-sm text-slate-500">
                      {plan.subtitle}
                    </div>
                  </div>

                  <ul className="mt-6 space-y-3 text-sm text-slate-600">
                    {plan.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-3">
                        <div className="mt-1 text-emerald-500 font-bold">•</div>
                        <div>{b}</div>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6 text-sm text-slate-500">
                    Need help? Reply to the email on your account.
                  </div>
                </div>

                <div className="mt-8">
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        if (btnDisabled) return;
                        buttonHandler();
                      }}
                      disabled={btnDisabled || btnLoading || loadingPortal}
                      className={btnClass}
                      aria-pressed="false"
                    >
                      {btnLoading ? "Processing…" : buttonText}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        <section className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl p-8 shadow">
            <h4 className="text-lg font-semibold">Billing & terms</h4>
            <p className="mt-3 text-sm text-slate-600">
              All subscriptions are billed monthly per dog. Cancel anytime from
              the billing portal. Taxes and local fees may apply.
            </p>
            <div className="mt-4 text-sm text-slate-500">
              {error ? <span className="text-rose-600">{error}</span> : null}
            </div>
            <hr />
            {user?.subscription_status == "active" ? (
              <>
                <div className="p-4">
                  <button
                    onClick={handleCancelClick}
                    className="bg-red-500 text-white px-4 py-2 rounded-xl shadow hover:bg-red-600"
                  >
                    Cancel Subscription
                  </button>

                  {/* Confirmation Popup */}
                  {showConfirm && (
                    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
                      <div className="bg-white rounded-xl p-6 w-80 shadow-lg">
                        <h2 className="text-lg font-semibold text-gray-800">
                          Are you sure?
                        </h2>
                        <p className="text-sm text-gray-600 mt-2">
                          Do you really want to cancel your subscription?
                        </p>

                        <div className="mt-4 flex justify-end gap-2">
                          <button
                            onClick={() => setShowConfirm(false)}
                            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                            disabled={loading}
                          >
                            No
                          </button>
                          <button
                            onClick={confirmCancel}
                            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
                            disabled={loading}
                          >
                            {loading ? "Cancelling..." : "Yes, Cancel"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <></>
            )}
          </div>

          <div className="bg-white rounded-2xl p-8 shadow">
            <h4 className="text-lg font-semibold">FAQs</h4>
            <dl className="mt-4 space-y-4 text-sm text-slate-600">
              <div>
                <dt className="font-semibold">Can I change plans?</dt>
                <dd className="mt-1">
                  Yes — upgrade or downgrade anytime. Upgrades take effect
                  immediately in the billing portal.
                </dd>
              </div>
              <div>
                <dt className="font-semibold">Is there a trial?</dt>
                <dd className="mt-1">We do not offer a trial.</dd>
              </div>
              <div>
                <dt className="font-semibold">How many dogs can I add?</dt>
                <dd className="mt-1">You can add as many dogs as you want.</dd>
              </div>
            </dl>
          </div>
        </section>

        <footer className="mt-12 text-center text-sm text-slate-500">
          Need a custom plan or team discount? Contact support via the email on
          your account.
        </footer>
      </div>

      {/* Confirmation Modal for Downgrade */}
      {confirmOpen && modalPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-w-xl w-full bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-xl font-semibold">
              Confirm downgrade to {PLANS[modalPlan].title}
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Downgrading may remove features from your current plan. You'll be
              moved to the {PLANS[modalPlan].title} plan.
            </p>

            <div className="mt-4">
              <h4 className="font-semibold">You'll lose:</h4>
              <ul className="mt-2 list-disc ml-5 text-sm text-slate-700">
                {modalLoses.length ? (
                  modalLoses.map((l) => <li key={l}>{l}</li>)
                ) : (
                  <li>
                    No major features will be removed — just some perks may be
                    unavailable.
                  </li>
                )}
              </ul>
            </div>

            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => setConfirmOpen(false)}
                className="px-4 py-2 rounded-md border text-sm text-slate-700 bg-white"
              >
                Cancel
              </button>
              <button
                onClick={confirmDowngrade}
                className="px-4 py-2 rounded-md bg-rose-600 text-white text-sm"
              >
                Yes, downgrade
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// small helper used in component (kept at bottom to keep code tidy)
function isPopular(k: PlanKey) {
  return k === "therapeutic";
}
