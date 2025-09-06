import { Paperclip } from "lucide-react";
import React from "react";

type ID = string | number;

interface Item {
  id?: ID;
  title?: any;
  description?: any;
}

interface CustomSection {
  id: ID;
  section_name: string;
  items?: Item[];
}

interface ProtocolData {
  daily_meal_plan?: Item[];
  protocol?: {
    supplements?: Item[];
    lifestyle_recommendations?: Item[];
    next_steps?: Item[];
    custom_sections?: CustomSection[];
  };
}

/**
 * renderProtocol
 * - Pure function: pass data and it returns JSX
 * - Minimal, modern, great typography
 *
 * NOTE: defensive against unexpected shapes in `data` and `dog`.
 */
export function renderProtocol(data: ProtocolData, dog: any) {
  const meals = Array.isArray(data?.daily_meal_plan) ? data.daily_meal_plan : [];
  const protocol = data?.protocol ?? {};

  // subtle palette (used only for tiny accents)
  const accents = {
    meals: "bg-amber-300",
    supplements: "bg-emerald-300",
    lifestyle: "bg-teal-300",
    next: "bg-violet-300",
    custom: "bg-indigo-300",
    neutral: "bg-gray-300",
    progress: "bg-pink-300",
  } as const;

  /* Utility: safely convert a value to a React child.
     - If string/number/boolean -> return as-is
     - If object -> try common fields (.name, .title), else stringify lightly
     - If array -> join with commas (short)
  */
  const renderSafe = (v: any): React.ReactNode => {
    if (v == null) return null;
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
    if (Array.isArray(v)) {
      // if array of primitives, join; if array of objects, attempt to map names
      const parts = v
        .map((x) => {
          if (x == null) return null;
          if (typeof x === "string" || typeof x === "number") return String(x);
          if (typeof x === "object") return x.name ?? x.title ?? JSON.stringify(x);
          return String(x);
        })
        .filter(Boolean);
      return parts.join(", ");
    }
    if (typeof v === "object") {
      // Try the most useful small fields
      if ("name" in v && (typeof v.name === "string" || typeof v.name === "number")) return String(v.name);
      if ("title" in v && (typeof v.title === "string" || typeof v.title === "number")) return String(v.title);
      // If it's a full dog object, try to show name/breed quickly
      if ("breed" in v || "sex" in v || "weight_kg" in v) {
        const bits: string[] = [];
        if (v.name) bits.push(String(v.name));
        if (v.breed) bits.push(String(v.breed));
        return bits.length > 0 ? bits.join(" · ") : "Dog object";
      }
      // fallback: short JSON
      try {
        const s = JSON.stringify(v);
        return s.length > 120 ? s.slice(0, 120) + "…" : s;
      } catch {
        return "[object]";
      }
    }
    return String(v);
  };

  const SectionTitle = ({ title, accent }: { title: any; accent?: string }) => (
    <div className="flex items-center gap-3">
      <span className={`w-1.5 h-6 rounded-full ${accent ?? accents.neutral}`} aria-hidden />
      <h3 className="text-lg md:text-xl font-semibold tracking-tight text-gray-900">
        {renderSafe(title)}
      </h3>
    </div>
  );

  const Card = ({ item }: { item: Item }) => {
    const key = item?.id ?? (item?.title ? (typeof item.title === "string" ? item.title : String(renderSafe(item.title))) : Math.random().toString(36).slice(2, 9));
    return (
      <article
        key={String(key)}
        className="relative rounded-2xl p-4 bg-white border border-gray-100 shadow-sm min-h-[72px] flex flex-col justify-start"
        aria-labelledby={`title-${String(key)}`}
      >
        <h4 id={`title-${String(key)}`} className="text-sm font-medium text-gray-600 tracking-tight">
          {renderSafe(item?.title) ?? "Untitled"}
        </h4>

        {item?.description ? (
          <p className="mt-2 text-sm text-gray-600 leading-relaxed">{renderSafe(item.description)}</p>
        ) : null}
      </article>
    );
  };

  const Section = ({
    title,
    accent,
    children,
    cols = 1,
  }: {
    title: any;
    accent?: string;
    children: React.ReactNode;
    cols?: number | string;
  }) => (
    <section className="space-y-3">
      <SectionTitle title={title} accent={accent} />
      <div
        className={`grid gap-3 ${
          typeof cols === "number"
            ? `grid-cols-1 md:grid-cols-${cols}`
            : // allow custom grid string like "grid-cols-1 md:grid-cols-3"
              cols
        }`}
      >
        {children}
      </div>
    </section>
  );

  /**
   * Progress UI
   * - Defensive: normalize mixed inputs (someone might have accidentally passed the whole dog object, an array-of-dogs, or nested progress arrays)
   */
  const isProgressEntry = (e: any) => {
    if (!e || typeof e !== "object") return false;
    // progress entry expected fields: date | timestamp | symptoms (array)
    return "date" in e || "timestamp" in e || "symptoms" in e;
  };

  const normalizeProgressList = (list: any): any[] => {
    if (!list) return [];
    // If someone accidentally passed the dog object itself
    if (isProgressEntry(list)) return [list];
    if (Array.isArray(list)) {
      const out: any[] = [];
      list.forEach((elem) => {
        if (!elem) return;
        // if elem is a progress entry -> push
        if (isProgressEntry(elem)) out.push(elem);
        // if elem looks like a container with .progress array (eg: mistakenly passed [dog])
        else if (elem && Array.isArray(elem.progress)) {
          elem.progress.forEach((p: any) => {
            if (isProgressEntry(p)) out.push(p);
          });
        }
        // if elem is itself an array -> flatten inner entries
        else if (Array.isArray(elem)) {
          elem.forEach((p) => isProgressEntry(p) && out.push(p));
        } else {
          // unknown object: try to see if it *is* a dog-like object and has progress
          if (elem && typeof elem === "object" && Array.isArray((elem as any).progress)) {
            (elem as any).progress.forEach((p: any) => isProgressEntry(p) && out.push(p));
          }
        }
      });
      return out;
    }
    // unknown single object - if it has progress array, return that
    if (list && typeof list === "object" && Array.isArray(list.progress)) {
      return list.progress.filter(isProgressEntry);
    }
    return [];
  };

  // Create a conic gradient ring style for score (0-10).
  // Arc length uses current score; the *color* (green/red) is decided by comparing nextScore to current score.
  const scoreRingStyle = (score: number | null, nextScore: number | null): React.CSSProperties => {
    if (score == null || Number.isNaN(score)) {
      // neutral light gray ring
      return {
        background: "conic-gradient(#9CA3AF 0deg, #E5E7EB 360deg)",
      };
    }
    // clamp to 0..10
    const s = Math.max(0, Math.min(10, Math.round(Number(score))));
    const deg = Math.round((s / 10) * 360);

    // choose primary color:
    // - if nextScore exists: green when nextScore > currentScore, else red
    // - if nextScore missing: default green
    const GREEN = "#10B981";
    const RED = "#EF4444";
    const primary = nextScore == null ? GREEN : (nextScore < score ? GREEN : RED);

    // remainder color (background of ring)
    const remainder = "#e9e9e9";

    return {
      background: `conic-gradient(${primary} 0deg ${deg}deg, ${remainder} ${deg}deg 360deg)`,
    };
  };

  const ProgressItem = ({ entry, nextScore }: { entry: any; nextScore?: number | null }) => {
    const id = entry?.id ?? entry?.timestamp ?? Math.random().toString(36).slice(2, 9);
    const dateLabel = entry?.date ?? (entry?.timestamp ? new Date(entry.timestamp).toISOString().slice(0, 10) : "Unknown date");
    const timeLabel = entry?.timestamp ? new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : undefined;
    const symptoms: string[] = Array.isArray(entry?.symptoms) ? entry.symptoms : [];
    const notes: string | null = (entry?.notes === "" ? null : entry?.notes) ?? null;
    const score = typeof entry?.improvement_score === "number" ? entry.improvement_score : null;

    return (
      <li key={String(id)} className="relative bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium text-gray-700">{renderSafe(dateLabel)}</span>
                {timeLabel ? <span className="text-xs text-gray-400">{renderSafe(timeLabel)}</span> : null}
              </div>

              <div className="flex items-center gap-2 ml-2">
                {/* little dog/clinic friendly icon placeholder (paperclip used lightly) */}
                <span className="rounded-full p-1 bg-gray-100 border border-gray-200">
                  <Paperclip size={14} />
                </span>
                <span className="text-xs text-gray-500">Entry ID: {String(id).slice(-6)}</span>
              </div>
            </div>

            {/* Symptoms */}
            <div className="mt-3">
              {symptoms.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                  {symptoms.map((s: any) => {
                    const label = typeof s === "string" ? s.replaceAll("_", " ") : renderSafe(s);
                    return (
                      <span
                        key={typeof s === "string" ? s : JSON.stringify(s).slice(0, 12)}
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-50 border border-gray-100 text-gray-700"
                        title={String(label)}
                      >
                        {label}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm text-gray-400">No symptoms reported</div>
              )}
            </div>

            {/* Notes */}
            {notes ? (
              <div className="mt-3 text-sm text-gray-600 leading-relaxed">
                {renderSafe(notes)}
              </div>
            ) : null}
          </div>

          {/* Improvement score visual (red->green gradient ring based on next score comparison) */}
          <div className="flex-shrink-0 ml-3 flex flex-col items-end">
            {score !== null ? (
              <div className="flex flex-col items-center">
                {/* Outer ring: conic gradient representing score */}
                <div
                  aria-hidden
                  className="w-12 h-12 rounded-full flex items-center justify-center border border-gray-100 shadow-sm"
                  style={scoreRingStyle(score, nextScore ?? null)}
                >
                  {/* Inner white circle with the numeric score */}
                  <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center">
                    <span
                      className="text-sm font-semibold"
                      style={{
                        // color based on chosen primary (if nextScore > score -> green else red; default green)
                        color:
                          nextScore == null
                            ? "#065F46"
                            : nextScore > score
                            ? "#065F46"
                            : "#7F1D1D",
                      }}
                    >
                      {Math.round(score)}
                    </span>
                  </div>
                </div>
                <span className="mt-2 text-xs text-gray-400">Score</span>
              </div>
            ) : (
              <div className="text-xs text-gray-400">No score</div>
            )}
          </div>
        </div>
      </li>
    );
  };

  const ProgressList = ({ list }: { list: any[] }) => {
    const normalized = normalizeProgressList(list);
    // sort by timestamp desc (newest first) if possible
    const sorted = Array.from(normalized).sort((a, b) => {
      const ta = a?.timestamp ? new Date(a.timestamp).getTime() : 0;
      const tb = b?.timestamp ? new Date(b.timestamp).getTime() : 0;
      return tb - ta;
    });

    if (sorted.length === 0) {
      return <div className="text-sm text-gray-500">No progress entries available.</div>;
    }

    return (
      <ul className="flex flex-col divide-y divide-gray-100 space-y-3">
        {sorted.map((entry, idx) => {
          // next entry in the sorted (newest-first) array is at idx+1 (older)
          const nextEntry = sorted[idx + 1];
          const nextScore = typeof nextEntry?.improvement_score === "number" ? nextEntry.improvement_score : null;
          return <ProgressItem key={entry?.id ?? entry?.timestamp ?? idx} entry={entry} nextScore={nextScore} />;
        })}
      </ul>
    );
  };

  return (
    <div className="font-sans text-base leading-6 text-gray-800 space-y-6">
      {/* Page heading — remove if you only want inner content */}
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">AI Diagnosis</h1>
        </div>
      </header>

      {/* Daily Meal Plan — denser grid on larger screens */}
      {meals.length > 0 && (
        <Section title="Daily Meal Plan" accent={accents.meals} cols={"grid-cols-1 md:grid-cols-3"}>
          {meals.map((m, idx) => (
            <Card key={m?.id ?? m?.title ?? idx} item={m} />
          ))}
        </Section>
      )}

      {/* Supplements */}
      {Array.isArray(protocol?.supplements) && protocol.supplements.length > 0 && (
        <Section title="Supplements" accent={accents.supplements} cols={2}>
          {protocol.supplements.map((s, idx) => (
            <Card key={s?.id ?? s?.title ?? idx} item={s} />
          ))}
        </Section>
      )}

      {/* Lifestyle Recommendations */}
      {Array.isArray(protocol?.lifestyle_recommendations) && protocol.lifestyle_recommendations.length > 0 && (
        <Section title="Lifestyle Recommendations" accent={accents.lifestyle} cols={2}>
          {protocol.lifestyle_recommendations.map((r, idx) => (
            <Card key={r?.id ?? r?.title ?? idx} item={r} />
          ))}
        </Section>
      )}

      {/* Next Steps */}
      {Array.isArray(protocol?.next_steps) && protocol.next_steps.length > 0 && (
        <Section title="Next Steps" accent={accents.next} cols={2}>
          {protocol.next_steps.map((n, idx) => (
            <Card key={n?.id ?? n?.title ?? idx} item={n} />
          ))}
        </Section>
      )}

      {/* Progress Report (new) */}
      {(dog && (Array.isArray(dog.progress) || (dog.progress && typeof dog.progress === "object"))) && (
        <Section title="Progress Report" accent={accents.progress} cols={1}>
          <div className="rounded-2xl p-4 bg-white border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-700">Recent updates</h4>
                <p className="text-xs text-gray-400">Timeline of symptom updates, notes and improvement scores</p>
              </div>
              <div className="text-xs text-gray-500">
                {(() => {
                  const normalized = normalizeProgressList(dog.progress);
                  return `${normalized.length} ${normalized.length === 1 ? "entry" : "entries"}`;
                })()}
              </div>
            </div>

            <ProgressList list={dog.progress} />
          </div>
        </Section>
      )}

      {/* Custom Sections */}
      {Array.isArray(protocol.custom_sections) &&
        protocol.custom_sections.length > 0 &&
        protocol.custom_sections.map((cs) => (
          <Section key={cs.id} title={cs.section_name} accent={accents.custom} cols={2}>
            {(cs.items || []).map((it) => (
              <Card key={it?.id ?? it?.title ?? Math.random().toString(36).slice(2, 9)} item={it} />
            ))}
          </Section>
        ))}
    </div>
  );
}
