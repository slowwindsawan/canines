import React from "react";
import { useAuth } from "../context/AuthContext";

type User = {
  email?: string;
  id?: string;
  name?: string;
  subscription_current_period_end?: string;
  subscription_status?: string;
  subscription_tier?: string;
  tips?: string;
  username?: string;
};

const PLANS = [
  {
    key: "foundation",
    emoji: "🌱",
    title: "Foundation",
    price: 29,
    subtitle: "Perfect for day-to-day maintenance and prevention.",
    features: ["AI gut plan", "Tips", "Library", "Guides"],
    ctaDowngradeLabel: "Downgrade to Foundation",
  },
  {
    key: "therapeutic",
    emoji: "🎯",
    title: "Therapeutic",
    price: 69,
    subtitle: "Advanced care workflows and in-depth plans.",
    features: [
      "Foundations +",
      "Weekly meal plans",
      "Symptom tracker charts",
      "Supplement cycling",
      "Phase upgrade request",
    ],
    badge: "Most Popular",
    recommended: true,
  },
  {
    key: "comprehensive",
    emoji: "👑",
    title: "Comprehensive",
    price: 149,
    subtitle: "Full support, live calls and priority reviews.",
    features: [
      "Therapeutic +",
      "Live group calls",
      "Personalised AI-human reviews",
      "Discount on 1:1 consult",
    ],
    ctaUpgradeLabel: "Upgrade to Comprehensive",
  },
];

export default function PlansComparison({position="bottom"}) {
  const togglePosition = position === "bottom" ? "top" : "bottom";
  const { user } = useAuth();
  const u = (user || {}) as User;

  const currentTier = (u.subscription_tier || "").toLowerCase();

  function goToSubscriptions() {
    // safe redirect that works in electron, CRA, Next, etc.
    if (typeof window !== "undefined") window.location.href = "/subscription";
  }

  function isCurrent(planKey: string) {
    return planKey === currentTier;
  }

  function formatDate(iso?: string) {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      return d.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return iso;
    }
  }

  // simple tier ordering for upgrade/downgrade label decisions
  const order: Record<string, number> = {
    foundation: 0,
    therapeutic: 1,
    comprehensive: 2,
  };

  return (
    <div
      className={`absolute ${togglePosition}-full text-left -left-60 bg-white shadow-lg rounded-lg border border-gray-200 p-4 text-sm z-50 w-96
        opacity-0 scale-95 invisible group-hover:opacity-100 group-hover:scale-100 group-hover:visible
        transition-all duration-300 ease-out origin-top`}
      aria-label="Plan comparison panel" style={{maxWidth:"90vw"}}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-800">Compare plans & features</h3>
          <p className="text-xs text-gray-500">
            {u.name ? u.name : u.email ? u.email : "Guest"}
            {u.subscription_status ? ` • ${u.subscription_status}` : ""}
          </p>
        </div>
        <div className="text-right text-xs text-gray-500">
          <div>Ends: {formatDate(u.subscription_current_period_end)}</div>
          <div className="mt-1">Need help? Reply to the email on your account.</div>
        </div>
      </div>

      <div className="space-y-3">
        {PLANS.map((plan) => {
          const current = isCurrent(plan.key);
          const isRecommended = !!plan.recommended;
          const priceLabel = `$${plan.price}/mo`;

          // determine action label
          let actionLabel = "Choose plan";
          const currentOrder = order[currentTier] ?? -1;
          const planOrder = order[plan.key] ?? 0;
          if (current) actionLabel = "Current plan";
          else if (planOrder > currentOrder) actionLabel = `Upgrade to ${plan.title}`;
          else if (planOrder < currentOrder) actionLabel = `Downgrade to ${plan.title}`;

          return (
            <div
              key={plan.key}
              role="button"
              tabIndex={0}
              onClick={() => goToSubscriptions()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") goToSubscriptions();
              }}
              className={`border rounded-lg p-3 hover:shadow-md transition-shadow duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-200
                ${current ? "border-indigo-500 bg-indigo-50" : "bg-white"}
                ${isRecommended && !current ? "border-green-500 bg-green-50" : ""}`}
              aria-pressed={current}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{plan.emoji}</span>
                  <div>
                    <div className="font-medium text-gray-800">{plan.title}</div>
                    <div className="text-xs text-gray-500">{plan.subtitle}</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className={`font-semibold ${current ? "text-indigo-700" : "text-gray-700"}`}>
                    {priceLabel}
                  </div>
                  {plan.badge ? (
                    <div className="mt-1 text-[10px] uppercase tracking-wide text-green-700">{plan.badge}</div>
                  ) : null}
                </div>
              </div>

              <ul className="list-disc list-inside text-gray-600 text-xs space-y-1 mb-3">
                {plan.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>

              <div className="flex justify-between items-center">
                <div className="text-xs text-gray-500">Need help? Reply to the email on your account.</div>
                <div>
                  <button
                    type="button"
                    className={`px-3 py-1 text-xs rounded-md font-medium shadow-sm focus:outline-none
                      ${current ? "bg-gray-200 text-gray-700 cursor-default" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}
                    onClick={(e) => {
                      // prevent double-handler bubbling to parent so user lands on /subscriptions only once
                      e.stopPropagation();
                      if (!current) goToSubscriptions();
                    }}
                    aria-label={`${actionLabel} for ${plan.title}`}
                    disabled={current}
                  >
                    {current ? "Current plan" : actionLabel}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Small footer with user's tips if present */}
      {u.tips ? (
        <div className="mt-3 text-xs text-gray-600 border-t pt-3">Tip: {u.tips}</div>
      ) : null}
    </div>
  );
}
