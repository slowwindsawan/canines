import { Paperclip } from "lucide-react";
import React from "react";

type ID = string | number;

interface Item {
  id?: ID;
  title: string;
  description?: string;
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
 */
export function renderProtocol(data: ProtocolData) {
  const meals = data?.daily_meal_plan ?? [];
  const protocol = data?.protocol ?? {};

  // subtle palette (used only for tiny accents)
  const accents = {
    meals: "bg-amber-300",
    supplements: "bg-emerald-300",
    lifestyle: "bg-teal-300",
    next: "bg-violet-300",
    custom: "bg-indigo-300",
    neutral: "bg-gray-300",
  } as const;

  const SectionTitle = ({ title, accent }: { title: string; accent?: string }) => (
    <div className="flex items-center gap-3">
      <span className={`w-1.5 h-6 rounded-full ${accent ?? accents.neutral}`} aria-hidden />
      <h3 className="text-lg md:text-xl font-semibold tracking-tight text-gray-900">{title}</h3>
    </div>
  );

  const Card = ({ item }: { item: Item }) => {
    const key = item.id ?? item.title;
    return (
      <article
        key={String(key)}
        className="relative rounded-2xl p-4 bg-white border border-gray-100 shadow-sm min-h-[72px] flex flex-col justify-start"
        aria-labelledby={`title-${String(key)}`}
      >
        <h4 id={`title-${String(key)}`} className="text-sm font-medium text-gray-600 tracking-tight">
          {item.title}
        </h4>

        {item.description ? (
          <p className="mt-2 text-sm text-gray-600 leading-relaxed">{item.description}</p>
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
    title: string;
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
          {meals.map((m) => (
            <Card key={String(m.id ?? m.title)} item={m} />
          ))}
        </Section>
      )}

      {/* Supplements */}
      {protocol.supplements?.length > 0 && (
        <Section title="Supplements" accent={accents.supplements} cols={2}>
          {protocol.supplements.map((s) => (
            <Card key={String(s.id ?? s.title)} item={s} />
          ))}
        </Section>
      )}

      {/* Lifestyle Recommendations */}
      {protocol.lifestyle_recommendations?.length > 0 && (
        <Section title="Lifestyle Recommendations" accent={accents.lifestyle} cols={2}>
          {protocol.lifestyle_recommendations.map((r) => (
            <Card key={String(r.id ?? r.title)} item={r} />
          ))}
        </Section>
      )}

      {/* Next Steps */}
      {protocol.next_steps?.length > 0 && (
        <Section title="Next Steps" accent={accents.next} cols={2}>
          {protocol.next_steps.map((n) => (
            <Card key={String(n.id ?? n.title)} item={n} />
          ))}
        </Section>
      )}

      {/* Custom Sections */}
      {protocol.custom_sections?.length > 0 &&
        protocol.custom_sections.map((cs) => (
          <Section key={cs.id} title={cs.section_name} accent={accents.custom} cols={2}>
            {(cs.items || []).map((it) => (
              <Card key={String(it.id ?? it.title)} item={it} />
            ))}
          </Section>
        ))}
    </div>
  );
}
