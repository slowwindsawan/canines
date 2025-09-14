import React, { useEffect, useMemo, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Confetti from "react-confetti";

// --- Simple placeholder icons (replace with your icon components) ---
const CheckCircle = ({ className = "h-4 w-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path
      d="M9 12l2 2 4-4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const ArrowRight = ({ className = "h-6 w-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path
      d="M5 12h14M13 5l7 7-7 7"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const Clock = ({ className = "h-3 w-3" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path
      d="M12 7v5l3 3"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

// -------------------------------
// Gamification configuration
// -------------------------------
const XP_PER_STEP = 50; // xp gained per step completed
const XP_FOR_LEVEL = (level) => 100 + level * 50; // simple scaling

const BADGES = [
  {
    id: "first-step",
    title: "First Step",
    desc: "Completed your first action item",
    condition: (state) => state.totalCompleted >= 1,
  },
  {
    id: "completionist",
    title: "Completionist",
    desc: "Completed all current action items",
    condition: (state) =>
      state.totalCompleted > 0 && state.totalCompleted === state.totalSteps,
  },
  {
    id: "high-priority-slayer",
    title: "Priority Slayer",
    desc: "Completed a high priority item",
    condition: (state) => state.highPriorityCompleted >= 1,
  },
  {
    id: "streak-3",
    title: "3-Day Streak",
    desc: "Completed at least one item for 3 consecutive days",
    condition: (state) => state.streak >= 3,
  },
];

// -------------------------------
// Helpers
// -------------------------------
function getLevelFromXP(xp) {
  let level = 0;
  let needed = XP_FOR_LEVEL(level);
  let remaining = xp;
  while (remaining >= needed) {
    remaining -= needed;
    level += 1;
    needed = XP_FOR_LEVEL(level);
  }
  return { level, remaining, needed };
}

function storageKeyForDog(dogId) {
  return `gamify:${dogId}`;
}

function formatCategoryTitle(cat) {
  switch (cat) {
    case "stool_quality":
      return "Stool Quality";
    case "energy_level":
      return "Energy Level";
    case "overall_health":
      return "Overall Health";
    default:
      return cat.replace(/_/g, " ") || "General";
  }
}

export default function GamifiedGoals({
  selectedDog,
  toggleStepCompletion,
  stoolIcon,
  energyIcon,
  healthIcon,
}) {
  const dogId = selectedDog?.id || "global";

  const initialState = useMemo(() => {
    const raw = localStorage.getItem(storageKeyForDog(dogId));
    if (!raw) {
      return {
        xp: 0,
        badges: [],
        lastCompletedDate: null,
        streak: 0,
      };
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      return { xp: 0, badges: [], lastCompletedDate: null, streak: 0 };
    }
  }, [dogId]);

  const [state, setState] = useState(initialState);
  const [showConfetti, setShowConfetti] = useState(false);
  const [recentBadge, setRecentBadge] = useState(null);
  const [showBadgeSuccessPopup, setShowBadgeSuccessPopup] = useState(false);
  const viewBadgesRef = useRef(null); // focus target inside the popup
  const [badgeName,setBadgeName]=useState("Care Pro")

  const [recentCategory, setRecentCategory] = useState(null); // used to animate category when milestone achieved

  // keep a ref to badges for closures (avoids stale checks)
  const badgesRef = useRef(state.badges);
  useEffect(() => {
    badgesRef.current = state.badges;
  }, [state.badges]);

  const steps = selectedDog?.overview?.what_to_do_goals || [];
  const totalSteps = steps.length;
  const totalCompleted = steps.filter((s) => s.completed).length;
  const highPriorityCompleted = steps.filter(
    (s) => s.completed && s.priority === "high"
  ).length;
  const pendingSteps = steps.filter((s) => !s.completed);
  const completedCount = totalCompleted;

  // category summary
  const categories = useMemo(() => {
    const map = {};
    steps.forEach((s) => {
      if (!map[s.category]) map[s.category] = [];
      map[s.category].push(s);
    });
    return map;
  }, [steps]);

  // map of icons
  const iconMap = {
    stool_quality: stoolIcon,
    energy_level: energyIcon,
    overall_health: healthIcon,
  };

  // persist to localStorage
  useEffect(() => {
    localStorage.setItem(storageKeyForDog(dogId), JSON.stringify(state));
  }, [state, dogId]);

  // awardBadge helper: safely updates badges and triggers UI for the badge
  const awardBadge = (id, title, desc, opts = {}) => {
    // ensure single award via functional update
    setState((prev) => {
      if (prev.badges.includes(id)) return prev;
      return { ...prev, badges: [...prev.badges, id] };
    });

    // show the recent badge UI (separate state so the modal / confetti reliably shows)
    setRecentBadge({ title, desc });
    setShowConfetti(true);
    setShowBadgeSuccessPopup(true);

    // optional recentCategory animation
    if (opts.category) {
      setRecentCategory(opts.category);
      setTimeout(() => setRecentCategory(null), 2200);
    }

    // stop confetti after a while
    setTimeout(() => setShowConfetti(false), 3500);
  };

  // Award badges based on derived stats and category completion (run whenever relevant derived metrics change)
  useEffect(() => {
    const badgeContext = {
      totalSteps,
      totalCompleted,
      highPriorityCompleted,
      streak: state.streak,
    };

    // static BADGES
    BADGES.forEach((b) => {
      if (!badgesRef.current.includes(b.id) && b.condition(badgeContext)) {
        awardBadge(b.id, b.title, b.desc);
      }
    });

    // category badges (one per category)
    Object.keys(categories).forEach((cat) => {
      const allDone =
        categories[cat].length > 0 &&
        categories[cat].every((st) => st.completed);
      const badgeId = `cat-${cat}`;
      if (allDone && !badgesRef.current.includes(badgeId)) {
        const title = `${formatCategoryTitle(cat)} Milestone`;
        const desc = `Completed all goals for ${formatCategoryTitle(cat)}.`;
        awardBadge(badgeId, title, desc, { category: cat });
      }
    });
    // only depend on the derived metrics — avoid including state.badges directly to prevent loops
  }, [
    totalSteps,
    totalCompleted,
    highPriorityCompleted,
    state.streak,
    categories,
  ]);

  // Call this when a step is completed (wraps user's toggleStepCompletion)
  const onCompleteStep = async (step) => {
    // call parent handler (assume it toggles in upstream state)
    await toggleStepCompletion(step.id || "");

    // if step wasn't completed previously we award xp and update streak optimistically
    if (!step.completed) {
      setState((prev) => {
        // xp
        const newXP = prev.xp + XP_PER_STEP;

        // streak: check prev.lastCompletedDate
        const today = new Date().toISOString().slice(0, 10);
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10);
        let nextStreak = prev.streak || 0;
        if (prev.lastCompletedDate === today) {
          // already completed something today -> streak unchanged
        } else if (prev.lastCompletedDate === yesterday) {
          nextStreak += 1;
        } else {
          nextStreak = 1;
        }

        return {
          ...prev,
          xp: newXP,
          lastCompletedDate: today,
          streak: nextStreak,
        };
      });

      // small confetti animation
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);

      // optimistic category completion detection
      const otherPendingInCategory = steps.some(
        (s) => s.category === step.category && !s.completed && s.id !== step.id
      );
      if (!otherPendingInCategory) {
        setBadgeName(step.category)
        setShowBadgeSuccessPopup(true)
        // this was the last item in the category -> award a category badge immediately
        const badgeId = `cat-${step.category}`;
        if (!badgesRef.current.includes(badgeId)) {
          const title = `${formatCategoryTitle(step.category)} Milestone`;
          const desc = `Completed all goals for ${formatCategoryTitle(
            step.category
          )}.`;
          awardBadge(badgeId, title, desc, { category: step.category });
        }
      }
    }
  };

  // Keep modal focus + Escape handler
  useEffect(() => {
    if (!showBadgeSuccessPopup) return;
    function onKey(e) {
      if (e.key === "Escape") setShowBadgeSuccessPopup(false);
    }
    window.addEventListener("keydown", onKey);

    // focus the View Badges button for accessibility
    const t = setTimeout(() => {
      try {
        viewBadgesRef.current?.focus();
      } catch (e) {}
    }, 120);

    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [showBadgeSuccessPopup]);

  const { level, remaining, needed } = getLevelFromXP(state.xp);
  const progressPercent = Math.round(
    (completedCount / (totalSteps || 1)) * 100
  );

  // Framer motion variants for the popup (made explicit so the popup shows clear motion)
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  };

  const modalVariants = {
    hidden: { scale: 0.88, opacity: 0, y: 10 },
    visible: {
      scale: 1,
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 360,
        damping: 24,
        when: "beforeChildren",
        staggerChildren: 0.04,
      },
    },
    exit: { scale: 0.94, opacity: 0, y: 10, transition: { duration: 0.18 } },
  };

  const childVariants = {
    hidden: { y: 8, opacity: 0 },
    visible: { y: 0, opacity: 1 },
    exit: { y: 8, opacity: 0 },
  };

  return (
    <div>
      {/* Confetti */}
      <AnimatePresence>
        {showConfetti && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed inset-0 z-40"
          >
            <Confetti recycle={false} numberOfPieces={200} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Quick Wins Card (category-driven) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Quick Wins Tracker
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.keys(categories).length === 0
            ? // fallback to the three main indicators when no steps present
              ["stool_quality", "energy_level", "overall_health"].map((cat) => {
                const icon = iconMap[cat] || null;
                const allDone =
                  categories[cat] && categories[cat].every((s) => s.completed);
                const isRecent = recentCategory === cat;
                return (
                  <div key={cat} className="text-center">
                    <motion.div
                      animate={
                        isRecent || allDone
                          ? { scale: [1, 1.12, 1], rotate: [0, 6, -6, 0] }
                          : { scale: 1 }
                      }
                      transition={{ duration: 0.9, ease: "easeOut" }}
                      className="w-16 h-16 bg-brand-offwhite rounded-full flex items-center justify-center mx-auto mb-2 relative"
                    >
                      {icon ? (
                        <img src={icon} alt={cat} />
                      ) : (
                        <div className="w-8 h-8 bg-gray-200 rounded-full" />
                      )}
                      {(allDone || isRecent) && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{
                            type: "spring",
                            stiffness: 500,
                            damping: 20,
                          }}
                          className="absolute -bottom-1 -right-1 bg-green-600 text-white rounded-full p-1 w-6 h-6 flex items-center justify-center"
                        >
                          <svg
                            className="w-3 h-3"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <path
                              d="M9 12l2 2 4-4"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </motion.div>
                      )}
                    </motion.div>
                    <h4 className="font-medium text-gray-900">
                      {formatCategoryTitle(cat)}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {categories[cat]
                        ? `${
                            categories[cat].filter((s) => s.completed).length
                          }/${categories[cat].length} done`
                        : "No data"}
                    </p>
                  </div>
                );
              })
            : Object.keys(categories).map((cat) => {
                const icon = iconMap[cat] || null;
                const allDone = categories[cat].every((s) => s.completed);
                const isRecent = recentCategory === cat;
                return (
                  <div key={cat} className="text-center">
                    <motion.div
                      animate={
                        isRecent || allDone
                          ? { scale: [1, 1.12, 1], rotate: [0, 6, -6, 0] }
                          : { scale: 1 }
                      }
                      transition={{ duration: 0.9, ease: "easeOut" }}
                      className="w-16 h-16 bg-brand-offwhite rounded-full flex items-center justify-center mx-auto mb-2 relative"
                    >
                      {icon ? (
                        <img src={icon} alt={cat} />
                      ) : (
                        <div className="w-8 h-8 bg-gray-200 rounded-full" />
                      )}
                      {(allDone || isRecent) && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{
                            type: "spring",
                            stiffness: 500,
                            damping: 20,
                          }}
                          className="absolute -bottom-1 -right-1 bg-green-600 text-white rounded-full p-1 w-6 h-6 flex items-center justify-center"
                        >
                          <svg
                            className="w-3 h-3"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <path
                              d="M9 12l2 2 4-4"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </motion.div>
                      )}
                    </motion.div>
                    <h4 className="font-medium text-gray-900">
                      {formatCategoryTitle(cat)}
                    </h4>
                    <p className="text-sm text-gray-600">{`${
                      categories[cat].filter((s) => s.completed).length
                    }/${categories[cat].length} done`}</p>
                  </div>
                );
              })}
        </div>
      </div>

      {/* Goals card (reworked) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <ArrowRight className="h-6 w-6 text-blue-600 mr-2" />
            What to do now (Goals)
          </h2>
          <div className="text-sm text-gray-600">
            {completedCount}/{totalSteps} completed
          </div>
        </div>

        {/* Animated Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <motion.div
              className="h-2 rounded-full bg-gradient-to-r from-lime-600 to-green-500"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.6 }}
            />
          </div>
        </div>

        {/* Steps List */}
        <div className="space-y-4">
          {steps.map((step) => {
            const isOverdue =
              step.due_date &&
              new Date(step.due_date) < new Date() &&
              !step.completed;

            return (
              <div
                key={step.id}
                className={`border-l-4 rounded-lg p-4 transition-all duration-200 ${
                  step.completed
                    ? "border-l-green-500 bg-green-50 opacity-90"
                    : getPriorityColor(step.priority)
                } ${isOverdue ? "ring-2 ring-red-200" : ""}`}
              >
                <div className="flex items-start space-x-4">
                  <button
                    onClick={() => onCompleteStep(step)}
                    className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      step.completed
                        ? "bg-green-600 border-green-600 text-white"
                        : "border-gray-300 hover:border-green-500"
                    }`}
                  >
                    {step.completed && <CheckCircle className="h-4 w-4" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3
                        className={`font-medium ${
                          step.completed
                            ? "text-green-800 line-through"
                            : "text-gray-900"
                        }`}
                      >
                        {step.title}
                      </h3>
                      {step.priority === "high" && !step.completed && (
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
                        step.completed ? "text-green-700" : "text-gray-600"
                      }`}
                    >
                      {step.description}
                    </p>

                    {step.due_date && !step.completed && (
                      <div className="flex items-center space-x-1 mt-2 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        <span>
                          Due: {new Date(step.due_date).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Encouragement & Badge area */}
        {pendingSteps.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Keep it up!</strong> You're doing great with{" "}
              {selectedDog?.name}'s health journey.
              {pendingSteps.length === 1
                ? " Just one more step to complete!"
                : ` ${pendingSteps.length} steps remaining.`}
            </p>
          </div>
        )}

        {/* All Complete Message */}
        {pendingSteps.length === 0 && totalSteps > 0 && (
          <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <p className="text-sm text-green-800">
                <strong>Excellent work!</strong> You've completed all current
                action items for {selectedDog?.name}.
              </p>
            </div>
          </div>
        )}

        {/* Badges panel */}
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Badges</h4>
          <div className="flex items-center space-x-2 flex-wrap">
            {state.badges.map((id) => {
              // map display name for category badges
              if (id.startsWith("cat-")) {
                const cat = id.replace("cat-", "");
                return (
                  <div
                    key={id}
                    className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-900"
                  >
                    {formatCategoryTitle(cat)}
                  </div>
                );
              }

              const b = BADGES.find((bb) => bb.id === id);
              return (
                <div
                  key={id}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    b
                      ? "bg-yellow-100 text-yellow-900"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {b ? b.title : id}
                </div>
              );
            })}

            {/* show locked badges as placeholders */}
            {BADGES.filter((bb) => !state.badges.includes(bb.id)).map((bb) => (
              <div
                key={bb.id}
                className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500"
              >
                {bb.title}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent badge popup */}
      <AnimatePresence>
        {recentBadge && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="fixed right-6 bottom-6 z-50"
          >
            <div className="p-4 bg-white rounded-lg shadow-lg border border-gray-200 flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full bg-yellow-50 flex items-center justify-center">
                ✨
              </div>
              <div>
                <div className="font-medium">{recentBadge.title}</div>
                <div className="text-xs text-gray-500">{recentBadge.desc}</div>
              </div>
              <button
                className="ml-3 text-xs text-gray-400"
                onClick={() => setRecentBadge(null)}
              >
                Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Badge success modal (large) */}
      <AnimatePresence>
        {showBadgeSuccessPopup && recentBadge && (
          <motion.div
            // overlay -- fades in/out using framer-motion
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.25 }}
            onClick={() => setShowBadgeSuccessPopup(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              // modal card -- scales and pops with a spring
              key={recentBadge ? recentBadge.title : "badge-modal"}
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()} // prevent overlay click from closing when clicking inside
              className="relative flex flex-col items-center justify-center p-8 rounded-2xl shadow-2xl border border-gray-200 w-full max-w-sm overflow-hidden bg-white"
            >
              {/* Sun Glow BEHIND the card */}
              <motion.div
                variants={childVariants}
                className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
              >
                <div className="w-[300px] h-[300px] rounded-full bg-gradient-to-br blur-3xl opacity-40 animate-pulse"></div>
              </motion.div>

              {/* Looping Confetti (kept as background) */}
              <motion.div
                variants={childVariants}
                className="absolute inset-0 pointer-events-none animate-[confettiLoop_2s_linear_infinite]"
              >
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
              </motion.div>

              {/* Badge Icon */}
              <motion.div
                variants={childVariants}
                initial={{ y: -12, scale: 0.8, rotate: -6 }}
                animate={{ y: 0, scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 18 }}
                className="relative z-10 bg-gradient-to-r from-amber-400 to-yellow-500 p-6 rounded-full shadow-lg"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-12 w-12 text-white"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2l2.09 6.26h6.57l-5.33 3.87 2.04 6.3L12 14.77l-5.37 3.66 2.04-6.3-5.33-3.87h6.57L12 2z" />
                </svg>
              </motion.div>

              {/* Text */}
              <motion.h2
                variants={childVariants}
                className="mt-6 text-2xl font-bold text-gray-800 relative z-10"
              >
                {recentBadge ? recentBadge.title : "Badge Unlocked!"}
              </motion.h2>
              <motion.p
                variants={childVariants}
                className="text-sm text-gray-600 mt-1 relative z-10"
              >
                {recentBadge
                  ? recentBadge.desc
                  : "You’ve earned a new badge 🎉"}
              </motion.p>

              {/* CTA */}
              <motion.button
                ref={viewBadgesRef}
                variants={childVariants}
                className="mt-6 px-5 py-2 bg-brand-midgrey text-white rounded-lg text-sm font-medium shadow relative z-10"
                onClick={() => setShowBadgeSuccessPopup(false)}
              >
                Go Back
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                You’ve earned the “{badgeName.replace("_"," ")}” badge 🎉
              </p>

              {/* CTA */}
              <button
                className="mt-6 px-5 py-2 bg-brand-midgrey text-white rounded-lg text-sm font-medium shadow relative z-10"
                onClick={() => setShowBadgeSuccessPopup(false)}
              >
                Go Back
              </button>
            </div>
          </div>
        </>
      ) : (
        <></>
      )}
    </div>
  );
}

// small helper to get a Tailwind color variant for priority
function getPriorityColor(priority) {
  switch (priority) {
    case "high":
      return "border-l-red-500 bg-red-50";
    case "medium":
      return "border-l-yellow-400 bg-yellow-50";
    default:
      return "border-l-gray-300 bg-white";
  }
}
