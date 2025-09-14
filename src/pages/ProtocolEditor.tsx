import React, { useEffect, useState } from "react";
import {
  X,
  Plus,
  Trash2,
  GripVertical,
  ArrowBigLeftIcon,
  Save,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { jwtRequest } from "../env";
import { v4 as uuid } from "uuid";

/**
 * ProtocolEditor
 *
 * - protected sections still enforced (min 4 items)
 * - custom sections are stored inside protocol.custom_sections (single source of truth)
 * - custom sections shape: [{ id, section_name, items: [] }]
 */

type Item = {
  id: string;
  title: string;
  description?: string;
};

type Section = {
  id: string;
  section_name: string;
  items: Item[];
};

type ProtocolJSON = {
  daily_meal_plan: Item[];
  supplements: Item[];
  lifestyle_recommendations: Item[];
  next_steps: Item[];
  // custom sections bundled here
  custom_sections?: Section[];
  [key: string]: any;
};

interface ProtocolEditorProps {
  initialData?: Partial<ProtocolJSON> | null;
  onSave: (data: ProtocolJSON) => void;
  onClose?: () => void;
}

const defaultFour = (prefix: string, labels: string[]) =>
  labels.map((label, idx) => ({
    id: `${prefix}-${Date.now()}-${idx}-${Math.floor(Math.random() * 10000)}`,
    title: label,
    description: "",
  }));

const DEFAULTS = {
  daily_meal_plan: defaultFour("meal", [
    "Breakfast",
    "Lunch",
    "Snack",
    "Dinner",
  ]),
  supplements: defaultFour("supp", [
    "Probiotic supplement to improve gut health and firm stool consistency",
    "Multivitamin appropriate for small breeds to ensure essential nutrients are met",
    "Omega-3 supplement for coat & gut health",
    "Fiber supplement to support stool formation",
  ]),
  lifestyle_recommendations: defaultFour("life", [
    "Increase hydration by ensuring constant access to fresh water",
    "Implement a balanced diet appropriate for small breeds to support energy levels",
    "Engage in moderate exercise to boost energy levels and prevent lethargy",
    "Monitor bowel movements and energy levels daily",
  ]),
  next_steps: defaultFour("next", [
    "Schedule a veterinary appointment to assess for underlying health issues causing lethargy and persistent loose stool",
    "Collect a fresh stool sample before the vet visit (if possible)",
    "Start probiotic trial for 7-14 days and monitor changes",
    "Note feeding times, treats, medications to share with the vet",
  ]),
};

const ensureArray = (maybe: any, fallback: Item[]) => {
  if (!Array.isArray(maybe) || maybe.length === 0) return [...fallback];
  return maybe.map((it: any, idx: number) => ({
    id:
      (it && it.id) ||
      `${Date.now()}-${idx}-${Math.floor(Math.random() * 10000)}`,
    title: it?.title ?? "",
    description: it?.description ?? "",
  }));
};

function normalizeProtocol(raw: any): ProtocolJSON {
  // Map API keys → normalized keys
  const protectedMap: Record<string, keyof ProtocolJSON> = {
    daily_meal_plan: "daily_meal_plan",
    supplements: "supplements",
    lifestyle_recommendations: "lifestyle_recommendations",
    next_steps: "next_steps",
  };

  // Initialize normalized object with defaults
  const normalized: ProtocolJSON = {
    daily_meal_plan: [],
    supplements: [],
    lifestyle_recommendations: [],
    next_steps: [],
  };

  // Fill protected sections
  if (raw?.daily_meal_plan) {
    normalized.daily_meal_plan = raw.daily_meal_plan.map(
      (m: any, idx: number) => ({
        id: m.id ?? `meal-${idx + 1}`,
        title: m.title ?? "",
        description: m.description ?? "",
      })
    );
  }

  if (raw?.supplements) {
    normalized.supplements = raw.supplements.map((s: any, idx: number) => ({
      id: s.id ?? `supp-${idx + 1}`,
      title: s.title ?? "",
      description: s.description ?? "",
    }));
  }

  if (raw?.lifestyle_recommendations) {
    normalized.lifestyle_recommendations = raw.lifestyle_recommendations.map(
      (l: any, idx: number) => ({
        id: l.id ?? `life-${idx + 1}`,
        title: l.title ?? "",
        description: l.description ?? "",
      })
    );
  }

  if (raw?.next_steps) {
    normalized.next_steps = raw.next_steps.map((n: any, idx: number) => ({
      id: n.id ?? `next-${idx + 1}`,
      title: n.title ?? "",
      description: n.description ?? "",
    }));
  }

  // Collect extras as custom_sections array with { id, section_name, items }
  const extras: Section[] = [];
  if (raw && typeof raw === "object") {
    for (const key of Object.keys(raw)) {
      // skip known / aliased keys
      if (key!=="custom_sections") continue;
      raw[key].forEach((value) => {
        if (Array.isArray(value)) {
          // Treat as a custom section (array of items)
          extras.push({
            id: value?.id,
            section_name: value?.section_name,
            items: ensureArray(value, []).map((it: any, idx: number) => ({
              id:
                it?.id ||
                `${key}-${Date.now()}-${idx}-${Math.floor(
                  Math.random() * 10000
                )}`,
              title: it?.title ?? "",
              description: it?.description ?? "",
            })),
          });
        } else if (typeof value === "object" && value !== null) {
          // support object with .items or named section_name/title
          if (Array.isArray(value.items)) {
            extras.push({
              id: value.id,
              section_name:
                (value.section_name as string) ||
                value.title ||
                key.replace(/[_-]/g, " "),
              items: ensureArray(value.items, []),
            });
          }
        }
      });
    }
  }

  if (extras.length > 0) normalized.custom_sections = extras;

  return normalized;
}

const ProtocolEditor: React.FC<ProtocolEditorProps> = ({
  initialData = null,
  onClose,
}) => {
  const { id } = useParams<{ id: string }>();
  const [dog, setDog] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const onSave = async (data: ProtocolJSON) => {
    setSaving(true);
    // Handle save logic here
    let new_data = {
      ...dog,
      protocol: data,
      admin: true,
      overview: {
        ...dog.overview, // keep other properties of overview
        daily_meal_plan: data.daily_meal_plan, // override this one
      },
    };
    setDog(new_data);
    // Call your FastAPI PUT endpoint
    const response = await jwtRequest(`/dogs/update/${id}`, "PUT", new_data);

    if (response?.success) {
      alert("Dog updated successfully!");
      // Optionally navigate or refresh the data
      navigate("/protocol"); // or wherever you want
    } else {
      alert(response?.message || "Failed to update dog.");
    }
    setSaving(false);
  };

  const [protocol, setProtocol] = useState<ProtocolJSON>({
    daily_meal_plan: [...DEFAULTS.daily_meal_plan],
    supplements: [...DEFAULTS.supplements],
    lifestyle_recommendations: [...DEFAULTS.lifestyle_recommendations],
    next_steps: [...DEFAULTS.next_steps],
    custom_sections: [],
  });

  // fetch server protocol (if you still do inside component)
  useEffect(() => {
    (async () => {
      try {
        const res = await jwtRequest("/dogs/get/" + id, "POST");
        if (res?.success && res?.dog?.protocol) {
          setDog(res.dog);
          const mergedRaw = {
            ...res.dog.protocol,
            daily_meal_plan: res.dog.overview?.daily_meal_plan,
          };
          const normalized = normalizeProtocol(mergedRaw);

          // ensure protected arrays have at least defaults
          normalized.daily_meal_plan = ensureArray(
            normalized.daily_meal_plan,
            DEFAULTS.daily_meal_plan
          );
          normalized.supplements = ensureArray(
            normalized.supplements,
            DEFAULTS.supplements
          );
          normalized.lifestyle_recommendations = ensureArray(
            normalized.lifestyle_recommendations,
            DEFAULTS.lifestyle_recommendations
          );
          normalized.next_steps = ensureArray(
            normalized.next_steps,
            DEFAULTS.next_steps
          );

          // set into single protocol state (includes custom_sections)
          setProtocol((prev) => ({ ...prev, ...normalized }));
        }
      } catch (err) {
        console.error("fetch protocol error", err);
      }
    })();
  }, [id]);

  // merge initialData prop when provided (keeps format same)
  useEffect(() => {
    if (!initialData) return;
    const merged: ProtocolJSON = {
      daily_meal_plan: ensureArray(
        initialData?.daily_meal_plan,
        DEFAULTS.daily_meal_plan
      ),
      supplements: ensureArray(initialData?.supplements, DEFAULTS.supplements),
      lifestyle_recommendations: ensureArray(
        initialData?.lifestyle_recommendations,
        DEFAULTS.lifestyle_recommendations
      ),
      next_steps: ensureArray(initialData?.next_steps, DEFAULTS.next_steps),
      custom_sections: [],
    };

    const extras: Section[] = [];
    for (const key of Object.keys(initialData)) {
      if (
        [
          "daily_meal_plan",
          "supplements",
          "lifestyle_recommendations",
          "next_steps",
          "custom_sections",
        ].includes(key)
      )
        continue;
      const value = (initialData as any)[key];
      if (Array.isArray(value)) {
        extras.push({
          id: key,
          section_name: key.replace(/[_-]/g, " "),
          items: ensureArray(value, []).map((it: any, idx: number) => ({
            id:
              it?.id ||
              `${key}-${Date.now()}-${idx}-${Math.floor(
                Math.random() * 10000
              )}`,
            title: it?.title ?? "",
            description: it?.description ?? "",
          })),
        });
      } else if (typeof value === "object" && value !== null) {
        if (Array.isArray(value.items)) {
          extras.push({
            id: key,
            section_name:
              value.section_name || value.title || key.replace(/[_-]/g, " "),
            items: ensureArray(value.items, []),
          });
        }
      }
    }
    setProtocol((prev) => ({ ...prev, ...merged, custom_sections: extras }));
  }, [initialData]);

  // helpers for custom sections stored inside protocol.custom_sections
  const getCustomSections = () => {
    return protocol.custom_sections || [];
  };

  const updateItem = (
    sectionKey: string,
    itemId: string,
    field: "title" | "description",
    value: string,
    isCustom = false
  ) => {
    if (isCustom) {
      setProtocol((prev) => ({
        ...prev,
        custom_sections: (prev.custom_sections || []).map((sec) =>
          sec.id === sectionKey
            ? {
                ...sec,
                items: (sec.items || []).map((it) =>
                  it.id === itemId ? { ...it, [field]: value } : it
                ),
              }
            : sec
        ),
      }));
      return;
    }

    setProtocol((prev) => ({
      ...prev,
      [sectionKey]: (prev[sectionKey] || []).map((it: Item) =>
        it.id === itemId ? { ...it, [field]: value } : it
      ),
    }));
  };

  const addItem = (sectionKey: string, isCustom = false) => {
    const newItem: Item = {
      id: `${sectionKey}-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      title: "",
      description: "",
    };
    if (isCustom) {
      // add item to specific custom section
      setProtocol((prev) => ({
        ...prev,
        custom_sections: (prev.custom_sections || []).map((sec) =>
          sec.id === sectionKey
            ? { ...sec, items: [...sec.items, newItem] }
            : sec
        ),
      }));
    } else {
      setProtocol((prev) => ({
        ...prev,
        [sectionKey]: [...prev[sectionKey], newItem],
      }));
    }
  };

  const removeItem = (sectionKey: string, itemId: string, isCustom = false) => {
    if (isCustom) {
      setProtocol((prev) => ({
        ...prev,
        custom_sections: (prev.custom_sections || []).map((sec) =>
          sec.id === sectionKey
            ? { ...sec, items: sec.items.filter((it) => it.id !== itemId) }
            : sec
        ),
      }));
      return;
    }

    // For protected sections and regular sections: just remove the item.
    setProtocol((prev) => ({
      ...prev,
      [sectionKey]: (prev[sectionKey] || []).filter((it) => it.id !== itemId),
    }));
  };

  const addCustomSection = () => {
    const id = `custom-${Date.now()}`;
    const newSec: Section = {
      id,
      section_name: "New Section",
      items: [
        { id: `${id}-1`, title: "", description: "" },
        { id: `${id}-2`, title: "", description: "" },
      ],
    };
    setProtocol((prev) => ({
      ...prev,
      custom_sections: [...(prev.custom_sections || []), newSec],
    }));
  };

  const removeCustomSection = (id: string) => {
    setProtocol((prev) => ({
      ...prev,
      custom_sections: (prev.custom_sections || []).filter((s) => s.id !== id),
    }));
  };

  const updateCustomSectionTitle = (id: string, value: string) => {
    setProtocol((prev) => ({
      ...prev,
      custom_sections: (prev.custom_sections || []).map((s) =>
        s.id === id ? { ...s, section_name: value } : s
      ),
    }));
  };

  const isEmptyItem = (it: Item) => {
    const t = (it.title || "").toString().trim();
    const d = (it.description || "").toString().trim();
    return t.length === 0 && d.length === 0;
  };

  const handleSave = () => {
    // Build final JSON: include protected arrays and custom_sections as array
    const final: ProtocolJSON = {
      daily_meal_plan: (protocol.daily_meal_plan || []).filter(
        (it) => !isEmptyItem(it)
      ),
      supplements: (protocol.supplements || []).filter(
        (it) => !isEmptyItem(it)
      ),
      lifestyle_recommendations: (
        protocol.lifestyle_recommendations || []
      ).filter((it) => !isEmptyItem(it)),
      next_steps: (protocol.next_steps || []).filter((it) => !isEmptyItem(it)),
    };

    const customOut: Section[] = getCustomSections()
      .map((sec) => {
        const filtered = (sec.items || []).filter((it) => !isEmptyItem(it));
        if (filtered.length === 0) return null;
        return {
          id: sec.id,
          section_name: sec.section_name,
          items: filtered,
        } as Section;
      })
      .filter(Boolean) as Section[];

    if (customOut.length > 0) {
      final.custom_sections = customOut;
    }

    // call parent onSave with final JSON
    onSave(final);
  };

  const protectedKeys = [
    { key: "daily_meal_plan", title: "Daily Meal Plan" },
    { key: "supplements", title: "Supplement Protocol" },
    { key: "lifestyle_recommendations", title: "Lifestyle Recommendations" },
    { key: "next_steps", title: "Next Steps" },
  ];

  return (
    <div className="p-6 space-y-8">
      <div className="border-b border-gray-200 pb-6">
        <h3 className="text-lg font-medium mb-4 flex items-center">
          <Link to="/admin/submissions">
            <ArrowBigLeftIcon className="mr-2" size={18} />
          </Link>
          Protocol and plan editor
        </h3>

        <div className="space-y-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 items-start">
          {/* Render protected sections */}
          {protectedKeys.map((sec) => (
            <div
              key={sec.key}
              className="border border-brand-charcoal bg-brand-offwhite p-4 rounded-lg shadow-md m-auto"
              style={{ overflowY: "auto", maxHeight: 520 }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={sec.title}
                    readOnly
                    className="w-full p-2 border border-gray-300 outline-none font-medium bg-white/80"
                  />
                  <p className="text-sm text-gray-600">
                    {sec.key === "next_steps"
                      ? "Next steps (these are displayed as a section card). Edit titles/descriptions as needed."
                      : "Edit items below. This section cannot be deleted — you can remove items as needed."}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">Items:</h4>
                {protocol[sec.key].map((item: Item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-2 bg-gray-50 p-3 hover:bg-gray-100 transition-colors"
                  >
                    <GripVertical className="w-4 h-4 text-gray-400 mt-1" />
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) =>
                          updateItem(sec.key, item.id, "title", e.target.value)
                        }
                        className="w-full p-2 border border-gray-300 focus:border-black outline-none font-medium"
                        placeholder="Item title"
                      />
                      <textarea
                        value={item.description}
                        onChange={(e) =>
                          updateItem(
                            sec.key,
                            item.id,
                            "description",
                            e.target.value
                          )
                        }
                        className="w-full p-2 border border-gray-300 focus:border-black outline-none text-sm resize-none"
                        rows={2}
                        placeholder="Item description"
                      />
                    </div>
                    <button
                      onClick={() => removeItem(sec.key, item.id, false)}
                      className="p-2 border border-gray-300 hover:border-black transition-colors mt-1"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => addItem(sec.key)}
                    className="flex items-center gap-2 p-2 border border-gray-300 hover:border-black transition-colors w-full justify-center text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add Item
                  </button>
                </div>
              </div>
            </div>
          ))}
          {/* Custom sections - now read from protocol.custom_sections */}
          {getCustomSections().map((section) => (
            <div
              key={section.id}
              className="border border-gray-200 bg-white p-4 rounded-lg shadow-sm m-auto"
              style={{ overflowY: "auto", maxHeight: 520 }}
            >
              <h1>{section.id}</h1>
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={section.section_name}
                    onChange={(e) =>
                      updateCustomSectionTitle(section.id, e.target.value)
                    }
                    className="w-full p-2 border border-gray-300 focus:border-black outline-none font-medium"
                    placeholder="Section name"
                  />
                </div>
                <button
                  onClick={() => removeCustomSection(section.id)}
                  className="p-2 border border-gray-300 hover:border-black transition-colors ml-2"
                  title="Remove section"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">Items:</h4>
                {section.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-2 bg-gray-50 p-3 hover:bg-gray-100 transition-colors"
                  >
                    <GripVertical className="w-4 h-4 text-gray-400 mt-1" />
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) =>
                          updateItem(
                            section.id,
                            item.id,
                            "title",
                            e.target.value,
                            true
                          )
                        }
                        className="w-full p-2 border border-gray-300 focus:border-black outline-none font-medium"
                        placeholder="Item title"
                      />
                      <textarea
                        value={item.description}
                        onChange={(e) =>
                          updateItem(
                            section.id,
                            item.id,
                            "description",
                            e.target.value,
                            true
                          )
                        }
                        className="w-full p-2 border border-gray-300 focus:border-black outline-none text-sm resize-none"
                        rows={2}
                        placeholder="Item description"
                      />
                    </div>
                    <button
                      onClick={() => removeItem(section.id, item.id, true)}
                      className="p-2 border border-gray-300 hover:border-black transition-colors mt-1"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                <button
                  onClick={() => addItem(section.id, true)}
                  className="flex items-center gap-2 p-2 border border-gray-300 hover:border-black transition-colors w-full justify-center text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Item
                </button>
              </div>
            </div>
          ))}

          {/* Add custom section button */}
          <div className="flex items-center justify-center p-3 border border-gray-300 rounded-lg">
            <button
              onClick={addCustomSection}
              className="flex items-center gap-2 p-3 w-full justify-center"
            >
              <Plus className="w-4 h-4" />
              Add Custom Section
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => {
            handleSave();
          }}
          className={saving?"p-3 rounded-lg bg-gray-300 text-black flex items-center gap-2":"p-3 rounded-lg bg-brand-charcoal text-brand-offwhite flex items-center gap-2"}
          disabled={saving}
        >
          <Save />
          {saving ? "Saving..." : "Save and notify"}
        </button>

        <button
          onClick={() => {
            if (onClose) onClose();
          }}
          className="p-3 rounded-lg border border-gray-300"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default ProtocolEditor;
