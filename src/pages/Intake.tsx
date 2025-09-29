import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useDog } from "../context/DogContext";
import { ArrowRight } from "lucide-react";
import heartIcon from "../assets/heart.png";
import { isSubscriptionActive, jwtRequest } from "../env";
import PlansComparison from "../components/PlansComparision";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Note: the zod schema you had is kept elsewhere if you need strict validation.
 * This component works with dynamic form fields returned from the server,
 * and guarantees presence of a set of required fields before submit.
 *
 * Changes made here per request:
 * - Removed min/max for `age` and `weight` fields in templates
 * - Added a weight unit toggle (kg / lb). Default is kg
 * - The stored canonical weight value inside `formFields` is always in kilograms
 * - When user switches/edits units the UI shows the converted value and we save
 *   the canonical kg value. On submit both kg and lb are included in payload.
 */

type DynamicField = {
  id?: string | number;
  name: string;
  label?: string;
  description?: string;
  type?: string;
  required?: boolean;
  value?: any;
  placeholder?: string;
  options?: any[];
  errorText?: string;
  maxLength?: number;
  min?: number;
  max?: number;
  aiText?: string;
};

const requiredFieldTemplates: DynamicField[] = [
  {
    name: "name",
    label: "Dog's Name",
    type: "text",
    required: true,
    placeholder: "Enter your dog's name",
    value: "",
  },
  {
    name: "breed",
    label: "Breed",
    type: "text",
    required: true,
    placeholder: "e.g. Labrador",
    value: "",
  },
  {
    name: "age",
    label: "Age (years)",
    type: "number",
    required: true,
    placeholder: "e.g. 3",
    value: "",
    // min/max removed as requested
  },
  {
    name: "weight",
    label: "Weight",
    type: "number",
    required: true,
    placeholder: "e.g. 12.5",
    value: "", // canonical: stored as KG number
    // min/max removed as requested
  },
  {
    name: "stoolType",
    label: "Stool Type",
    type: "select",
    required: true,
    options: [
      { value: "normal", label: "Normal" },
      { value: "loose", label: "Loose" },
      { value: "watery", label: "Watery" },
      { value: "hard", label: "Hard" },
      { value: "mucousy", label: "Mucousy" },
    ],
    placeholder: "Select stool type",
    value: "",
  },
  {
    name: "symptoms",
    label: "Symptoms",
    type: "checkbox",
    required: false,
    // default to an empty array (multiple choice)
    options: [
      { value: "vomiting", label: "Vomiting" },
      { value: "diarrhea", label: "Diarrhea" },
      { value: "lethargy", label: "Lethargy" },
      { value: "itching", label: "Itching" },
      { value: "none", label: "None" },
    ],
    value: [],
  },
  {
    name: "behaviorNotes",
    label: "Behavior",
    type: "textarea",
    required: false,
    placeholder: "Anything we should know about behaviour (up to 500 chars)",
    value: "",
    maxLength: 500,
  },
  // optional: server can provide a weightUnit field. default handled in component state
];

const kgToLbs = (kg: number) => Math.round(kg * 2.2046226218 * 100) / 100;
const lbsToKg = (lb: number) => Math.round((lb / 2.2046226218) * 100) / 100;

const Intake: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addDog } = useDog();
  const location = useLocation();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingForm, setFormLoading] = useState(false);
  const [formFields, setFormFields] = useState<DynamicField[]>([]);
  const [searchParams] = useSearchParams();
  const [id, setId] = useState<string | null>(null);

  // --- New image-related state (standalone, optional) ---
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [otherSymptoms, setOtherSymptoms] = useState<string>("");

  // Weight unit state. Default kg. If server provides a `weightUnit` field we'll respect it.
  const [weightUnit, setWeightUnit] = useState<"kg" | "lb">("kg");

  useEffect(() => {
    setId(searchParams.get("id"));
  }, [searchParams]);

  // Helper: find a field by name
  function getFieldByName(name: string) {
    return formFields.find((f) => f.name === name);
  }

  // Return typed value or fallback sensible default
  function getFieldValueByName(name: string) {
    const field = getFieldByName(name);
    if (!field) {
      // fallback to defaults from templates if missing entirely
      const tpl = requiredFieldTemplates.find((t) => t.name === name);
      return tpl ? tpl.value : null;
    }
    // If checkbox with options -> should be an array
    if (field.type === "checkbox" && Array.isArray(field.options)) {
      return Array.isArray(field.value) ? field.value : [];
    }
    // number fields
    if (field.type === "number") {
      // if empty string treat as 0
      if (
        field.value === "" ||
        field.value === null ||
        field.value === undefined
      )
        return 0;
      // handle string numbers too
      const n = Number(field.value);
      return isNaN(n) ? 0 : n;
    }
    return field.value ?? "";
  }

  function mergeWithRequiredFields(serverFields: DynamicField[]) {
    const serverByName = new Map<string, DynamicField>();
    (serverFields || []).forEach((f) => serverByName.set(f.name, f));

    // Start with required templates first (static fields)
    const merged: DynamicField[] = requiredFieldTemplates.map((req) => {
      const serverField = serverByName.get(req.name);
      if (serverField) {
        // Merge server-provided field into the required template.
        const combined: DynamicField = { ...req, ...serverField };
        // Ensure sensible defaults for value when missing
        if (combined.value === undefined) combined.value = req.value;
        if (req.type === "checkbox" && Array.isArray(req.options)) {
          if (!Array.isArray(combined.value)) combined.value = [];
        }
        return combined;
      } else {
        // Not provided by server — use static template
        return { ...req };
      }
    });

    // Append any server fields that are NOT part of requiredFieldTemplates
    (serverFields || []).forEach((f) => {
      const isRequired = requiredFieldTemplates.some((r) => r.name === f.name);
      if (!isRequired) {
        // Ensure value defaults are sane
        const copy = { ...f };
        if (copy.value === undefined) {
          // default array checkboxes to [] if options exist
          if (copy.type === "checkbox" && Array.isArray(copy.options))
            copy.value = [];
          else copy.value = "";
        }
        merged.push(copy);
      }
    });

    return merged;
  }

  const fetchDog = async (existingMerged?: DynamicField[]) => {
    setFormLoading(true);
    try {
      const data = await jwtRequest("/dogs/get/" + id, "POST");
      if (data?.success) {
        const serverFields =
          data?.dog?.form_data?.fullFormFields &&
          Array.isArray(data.dog.form_data.fullFormFields)
            ? data.dog.form_data.fullFormFields
            : [];

        const merged = mergeWithRequiredFields(serverFields);

        if (formFields.length > 0) {
          const existingByName = new Map<string, DynamicField>();
          formFields.forEach((f) => existingByName.set(f.name, f));
          const mergedNames = new Set(merged.map((m) => m.name));
          existingByName.forEach((f, name) => {
            if (!mergedNames.has(name)) {
              merged.push({ ...f });
            }
          });
        }

        setFormFields(merged);

        // Set initial weight unit from server if provided
        const serverUnitField = merged.find((f) => f.name === "weightUnit");
        if (
          serverUnitField &&
          (serverUnitField.value === "lb" || serverUnitField.value === "kg")
        ) {
          setWeightUnit(serverUnitField.value === "lb" ? "lb" : "kg");
        }

        // ===== If server included an 'otherSymptoms' field, populate local state =====
        const serverOther = merged.find((f) => f.name === "otherSymptoms");
        if (serverOther && typeof serverOther.value === "string") {
          setOtherSymptoms(serverOther.value);
        }

        const imageUrl =
          data?.dog?.image_url ||
          data?.dog?.photoUrl ||
          data?.dog?.image ||
          null;
        if (imageUrl) setImagePreview(String(imageUrl));
      } else {
        console.warn(
          "Dog fetch returned success=false, leaving current form fields."
        );
      }
    } catch (error) {
      console.error("fetchDog error", error);
    } finally {
      setFormLoading(false);
    }
  };

  useEffect(() => {
    const fetchForm = async () => {
      setFormLoading(true);
      try {
        const response = await jwtRequest("/get-onboarding-form", "GET");
        let merged: DynamicField[] = [];
        if (response && Array.isArray(response.form)) {
          merged = mergeWithRequiredFields(response.form);
        } else {
          merged = requiredFieldTemplates.map((t) => ({ ...t }));
        }
        setFormFields(merged);

        // set weightUnit from server if present in merged
        const unitField = merged.find((f) => f.name === "weightUnit");
        if (
          unitField &&
          (unitField.value === "lb" || unitField.value === "kg")
        ) {
          setWeightUnit(unitField.value === "lb" ? "lb" : "kg");
        }

        // 👉 Only fetch dog after form structure is ready
        if (id) {
          await fetchDog(merged);
        }
      } catch (err: any) {
        setFormFields(requiredFieldTemplates.map((t) => ({ ...t })));
      } finally {
        setFormLoading(false);
      }
    };

    fetchForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Check required fields for emptiness
  const hasErrors = formFields.some((field) => {
    if (!field.required) return false;
    const val = field.value;
    if (field.type === "checkbox" && Array.isArray(field.options)) {
      return !Array.isArray(val) || val.length === 0;
    }
    if (field.type === "number") {
      // treat empty or NaN as error
      return (
        val === "" || val === null || val === undefined || isNaN(Number(val))
      );
    }
    return val === "" || val === null || val === undefined;
  });

  // generic field updater
  const updateFieldAtIndex = (idx: number, newVal: any) => {
    setFormFields((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], value: newVal };
      return copy;
    });
  };

  const handleUpdateDog = async () => {
    if (!id) {
      alert("No dog selected to update.");
      return;
    }

    try {
      setIsSubmitting(true);
      const weightKg = Number(getFieldValueByName("weight") || 0);
      const weightLbs = kgToLbs(Number(weightKg || 0));

      // prepare symptoms list and append otherSymptoms if present
      const existingSymptoms =
        formFields.find((f) => f.name === "symptoms")?.value || [];
      const symptomsArray = Array.isArray(existingSymptoms)
        ? [...existingSymptoms]
        : [];
      if (otherSymptoms && otherSymptoms.trim().length > 0) {
        // append as a single "other: ..." entry (you can change format if you like)
        symptomsArray.push(`other: ${otherSymptoms.trim()}`);
      }

      const payload = {
        name: formFields.find((f) => f.name === "name")?.value || "Unknown",
        breed: formFields.find((f) => f.name === "breed")?.value || "Unknown",
        weight_kg: weightKg || undefined,
        weight_lbs: weightLbs || undefined,
        notes:
          formFields.find((f) => f.name === "behaviorNotes")?.value ||
          undefined,
        form_data: {
          fullFormFields: formFields,
          age: Number(formFields.find((f) => f.name === "age")?.value) || 0,
          stoolType:
            formFields.find((f) => f.name === "stoolType")?.value || "",
          symptoms: formFields.find((f) => f.name === "symptoms")?.value || [],
          otherSymptoms: otherSymptoms || "",
          behaviorNotes:
            formFields.find((f) => f.name === "behaviorNotes")?.value || "",
        },
      };

      const response = await jwtRequest(`/dogs/update/${id}`, "PUT", payload);

      if (response?.success) {
        alert("Dog updated successfully!");
        window.location.href = "/dashboard?dog_id=" + id;
      } else {
        alert(response?.message || "Failed to update dog.");
      }
    } catch (err) {
      alert("An error occurred while updating the dog.");
    }
    setIsSubmitting(false);
  };

  const [showWaitingAnimation, setShowWaitingAnimation] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasErrors) {
      alert("Please fill all required fields.");
      return;
    }

    setIsSubmitting(true);
    setShowWaitingAnimation(true);

    try {
      const weightKg = Number(getFieldValueByName("weight") || 0);
      const weightLbs = kgToLbs(Number(weightKg || 0));

      // build symptoms array and include otherSymptoms if present
      const existingSymptoms =
        formFields.find((f) => f.name === "symptoms")?.value || [];
      const symptomsArray = Array.isArray(existingSymptoms)
        ? [...existingSymptoms]
        : [];
      if (otherSymptoms && otherSymptoms.trim().length > 0) {
        symptomsArray.push(`other: ${otherSymptoms.trim()}`);
      }

      const dogPayload = {
        name: String(getFieldValueByName("name") || "Unknown"),
        breed: String(getFieldValueByName("breed") || "Unknown"),
        age: Number(getFieldValueByName("age") || 0),
        weight: weightKg,
        weightUnit: weightUnit, // keep track of user's chosen unit
        weight_lbs: weightLbs,
        stoolType: String(getFieldValueByName("stoolType") || "Unknown"),
        symptoms: getFieldValueByName("symptoms") || [],
        behaviorNotes: String(getFieldValueByName("behaviorNotes") || ""),
        id: id,
      };

      await new Promise((resolve) => setTimeout(resolve, 800));

      const apiPayload = {
        name: dogPayload.name,
        breed: dogPayload.breed,
        weight_kg: dogPayload.weight > 0 ? dogPayload.weight : undefined,
        weight_lbs:
          dogPayload.weight_lbs > 0 ? dogPayload.weight_lbs : undefined,
        weight_unit: weightUnit,
        notes: dogPayload.behaviorNotes || undefined,
        id: dogPayload.id,
        image_url: imagePreview || undefined,
        form_data: {
          age: dogPayload.age,
          stoolType: dogPayload.stoolType,
          symptoms: dogPayload.symptoms,
          otherSymptoms: otherSymptoms || "",
          behaviorNotes: dogPayload.behaviorNotes,
          fullFormFields: formFields,
        },
      };

      const response = await jwtRequest("/dogs/create-dog", "POST", apiPayload);
      console.warn(response);

      if (response && response.success) {
        window.location.href = "/dashboard";
        return;
      }

      const serverMsg = response?.message || response?.detail || "";
      if (
        serverMsg.toLowerCase().includes("already exists") ||
        serverMsg.toLowerCase().includes("exists")
      ) {
        alert(
          "A dog with that name already exists for your account. Please use a different name."
        );
      } else {
        alert(serverMsg || "Failed to create dog. Please try again.");
      }
    } catch (err) {
      alert("Failed to submit. Please try again.");
    } finally {
      setIsSubmitting(false);
      setShowWaitingAnimation(false);
    }
  };

  // --- Image upload handlers (standalone) ---
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => setImagePreview(String(reader.result));
    reader.readAsDataURL(file);

    setUploadingImage(true);
    try {
      const formData = new FormData();
      if (id) formData.append("id", String(id));
      formData.append("image", file);

      const res = await jwtRequest("/dogs/image", "POST", formData, true);

      if (res?.success) {
        const url = res?.url || res?.image_url || res?.photoUrl;
        if (url) setImagePreview(String(url));
      } else {
        alert(res?.message || "Image upload failed.");
      }
    } catch (err) {
      console.error("Image upload error", err);
      alert("Image upload failed.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleClearImage = async () => {
    setImagePreview(null);
  };

  // Render helpers (same as your original logic, adapted to typed state)
  const renderInputForField = (field: DynamicField, idx: number) => {
    // Special handling for weight field to support kg/lb toggle
    if (field.name === "weight") {
      // canonical stored value inside field.value is KG
      const kgVal =
        field.value === "" || field.value === null || field.value === undefined
          ? 0
          : Number(field.value);
      const displayVal = weightUnit === "kg" ? kgVal : kgToLbs(kgVal);

      const onChangeWeight = (nextDisplay: number | "") => {
        // when user edits, nextDisplay is in the currently selected unit
        if (nextDisplay === "") {
          updateFieldAtIndex(idx, "");
          return;
        }
        const nextKg =
          weightUnit === "kg"
            ? Number(nextDisplay)
            : lbsToKg(Number(nextDisplay));
        updateFieldAtIndex(idx, nextKg);
      };

      return (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2 items-center">
            <input
              type="number"
              step="any"
              value={
                displayVal === 0
                  ? field.value === ""
                    ? ""
                    : displayVal
                  : displayVal
              }
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === "") return onChangeWeight("");
                const n = Number(raw);
                if (isNaN(n)) return;
                onChangeWeight(n);
              }}
              placeholder={field.placeholder ?? "Enter weight"}
              className={`w-full px-4 py-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500`}
            />

            <div className="relative">
              <label htmlFor="weight-unit" className="sr-only">
                Weight unit
              </label>
              <select
                id="weight-unit"
                value={weightUnit}
                onChange={(e) => setWeightUnit(e.target.value as "kg" | "lb")}
                className="w-28 px-3 py-2 rounded-lg border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="kg">kg</option>
                <option value="lb">lb</option>
              </select>
            </div>
          </div>

          <div className="text-xs text-gray-600">
            {weightUnit === "kg" ? (
              <>≈ {kgToLbs(Number(kgVal || 0))} lb</>
            ) : (
              <>≈ {lbsToKg(Number(kgVal || 0))} kg</>
            )}
          </div>
        </div>
      );
    }

    const rawValue = field.value;
    const value =
      rawValue === null || rawValue === undefined
        ? field.type === "checkbox" && Array.isArray(field.options)
          ? []
          : ""
        : rawValue;

    const isEmpty =
      value === "" ||
      value === null ||
      value === undefined ||
      (Array.isArray(value) && value.length === 0);
    const hasError = Boolean(field.required && isEmpty);

    const handlePrimitiveChange = (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >
    ) => {
      let newVal: any;
      if (field.type === "checkbox" && !Array.isArray(field.options)) {
        newVal = (e.target as HTMLInputElement).checked;
      } else if (field.type === "number") {
        newVal = e.target.value === "" ? "" : Number(e.target.value);
      } else {
        newVal = e.target.value;
      }
      updateFieldAtIndex(idx, newVal);
    };

    const handleCheckboxOptionChange = (optionValue: any, checked: boolean) => {
      const arr = Array.isArray(value) ? [...value] : [];
      const exists = arr.includes(optionValue);
      if (checked && !exists) arr.push(optionValue);
      if (!checked && exists) arr.splice(arr.indexOf(optionValue), 1);
      updateFieldAtIndex(idx, arr);
    };

    // textarea
    if (field.type === "textarea") {
      return (
        <textarea
          rows={4}
          value={value}
          onChange={handlePrimitiveChange}
          placeholder={field.placeholder ?? ""}
          className={`w-full px-4 py-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
            hasError ? "border-red-300" : "border-gray-300"
          }`}
        />
      );
    }

    // select
    if (field.type === "select" && Array.isArray(field.options)) {
      return (
        <select
          value={value}
          onChange={handlePrimitiveChange}
          className={`w-full px-4 py-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
            hasError ? "border-red-300" : "border-gray-300"
          }`}
        >
          <option value="">{field.placeholder ?? "Select"}</option>
          {field.options.map((opt: any, i: number) => {
            const optVal = opt?.value ?? opt;
            const optLabel = opt?.label ?? opt;
            return (
              <option key={i} value={optVal}>
                {optLabel}
              </option>
            );
          })}
        </select>
      );
    }

    // checkbox options (multiple)
    if (field.type === "checkbox" && Array.isArray(field.options)) {
      return (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            {field.options.map((opt: any, i: number) => {
              const optVal = opt?.value ?? opt;
              const optLabel = opt?.label ?? opt;
              const checked = Array.isArray(value) && value.includes(optVal);
              return (
                <label key={i} className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) =>
                      handleCheckboxOptionChange(optVal, e.target.checked)
                    }
                    className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                    name={field.name}
                  />
                  <span className="text-sm text-gray-700">{optLabel}</span>
                </label>
              );
            })}
          </div>
          <div className="mt-2">
            <textarea
              rows={3}
              value={otherSymptoms}
              onChange={(e) => setOtherSymptoms(e.target.value)}
              placeholder="Describe other symptoms not listed above"
              className="w-full px-4 py-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 border-gray-300"
            />
            <p className="text-xs text-gray-500 mt-1">
              Optional — this will be included with the symptoms.
            </p>
          </div>
        </div>
      );
    }

    // single boolean checkbox
    if (field.type === "checkbox") {
      return (
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => handlePrimitiveChange(e as any)}
            className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
            name={field.name}
          />
          <span className="text-sm text-gray-700">
            {field.placeholder ?? field.label ?? "Checked"}
          </span>
        </label>
      );
    }

    // radio group
    if (field.type === "radio" && Array.isArray(field.options)) {
      return (
        <div className="flex flex-col gap-2">
          {field.options.map((opt: any, i: number) => {
            const optVal = opt?.value ?? opt;
            const optLabel = opt?.label ?? opt;
            return (
              <label key={i} className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name={field.name}
                  value={optVal}
                  checked={value === optVal}
                  onChange={() => updateFieldAtIndex(idx, optVal)}
                  className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                />
                <span className="text-sm text-gray-700">{optLabel}</span>
              </label>
            );
          })}
        </div>
      );
    }

    // range
    if (field.type === "range") {
      const min = typeof field.min === "number" ? field.min : 0;
      const max = typeof field.max === "number" ? field.max : 100;
      const current = value === "" ? min : value;
      return (
        <div>
          <input
            type="range"
            min={min}
            max={max}
            value={current}
            onChange={(e) => updateFieldAtIndex(idx, Number(e.target.value))}
            className={`w-full h-2 rounded-lg ${
              hasError ? "border-red-300" : "border-gray-300"
            }`}
          />
          <div className="mt-2 text-sm text-gray-700">{current}</div>
        </div>
      );
    }

    // default input
    const inputType = [
      "text",
      "password",
      "email",
      "number",
      "tel",
      "url",
      "date",
    ].includes(field.type ?? "")
      ? field.type
      : "text";

    return (
      <input
        type={inputType}
        value={value}
        onChange={handlePrimitiveChange}
        placeholder={field.placeholder ?? ""}
        name={field.name}
        className={`w-full px-4 py-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
          hasError ? "border-red-300" : "border-gray-300"
        }`}
      />
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img src={heartIcon} style={{ height: "84px" }} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Tell Us About Your Dog
          </h1>
          <p className="text-lg text-gray-600">
            This information helps us create a personalised health protocol
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 space-y-6">
          {/* --- Standalone Image Upload (optional) --- */}
          <div className="border-b pb-6">
            <h3 className="text-xl font-semibold mb-3 text-gray-800">
              Photo (optional)
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Upload a photo of your dog. This uploads immediately and does not
              affect the rest of the form — no need to press Submit.
            </p>

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              {/* Image Preview */}
              <div className="w-40 h-40 sm:w-28 sm:h-28 bg-gray-100 rounded-2xl overflow-hidden flex items-center justify-center border border-gray-200 shadow-sm">
                {imagePreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imagePreview}
                    alt="dog preview"
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                  />
                ) : (
                  <div className="text-center text-gray-400 text-sm px-2">
                    No photo
                  </div>
                )}
              </div>

              {/* Upload & Actions */}
              <div className="flex-1 flex flex-col gap-3 w-full sm:max-w-xs">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    aria-label="Upload dog photo"
                  />
                  <div className="w-full px-4 py-3 bg-gradient-to-r from-brand-charcoal to-brand-midgrey text-white text-center rounded-xl shadow hover:from-brand-midgrey hover:to-brand-charcoal transition cursor-pointer font-medium">
                    Choose Photo
                  </div>
                </label>

                <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleClearImage}
                    disabled={uploadingImage}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition disabled:opacity-50 w-full sm:w-auto"
                  >
                    Clear
                  </button>

                  <div className="text-gray-500 text-sm flex-1 text-center sm:text-left">
                    {uploadingImage
                      ? "Uploading…"
                      : "Changes upload automatically"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {isSubscriptionActive(user?.subscription_current_period_end) ? (
            <>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (id) {
                    handleUpdateDog();
                  } else {
                    handleSubmit(e);
                  }
                }}
                className="space-y-8"
              >
                <h3 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200 text-center">
                  Let's Get to Know Them
                </h3>
                <p className="text-gray-600 mb-2 text-center">
                  First things first, let's meet your dog.
                </p>

                {loadingForm ? (
                  <p className="text-center text-gray-600 py-8">
                    Please be patient while we load your dogs information...
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {formFields.map((field, idx) => (
                      <div
                        key={field.id ?? `${field.name}-${idx}`}
                        className="bg-white rounded-xl p-2 py-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between">
                          <div className="pr-4 w-3/4">
                            <label className="block text-sm font-medium text-gray-900">
                              {field.label || field.name || "Untitled field"}
                              {field.required && (
                                <span className="text-red-500">&nbsp;*</span>
                              )}
                            </label>

                            {field.description ? (
                              <p className="mt-3 text-sm text-gray-600">
                                {field.description}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        <div className="mt-4">
                          {renderInputForField(field, idx)}
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                          {typeof field.maxLength === "number" && (
                            <span className="text-gray-600 bg-gray-50 px-2 py-1 rounded">
                              maxLength: {field.maxLength}
                            </span>
                          )}
                          {field.min !== null && field.min !== undefined && (
                            <span className="text-gray-600 bg-gray-50 px-2 py-1 rounded">
                              min: {field.min}
                            </span>
                          )}
                          {field.max !== null && field.max !== undefined && (
                            <span className="text-gray-600 bg-gray-50 px-2 py-1 rounded">
                              max: {field.max}
                            </span>
                          )}
                        </div>

                        {field.description ? (
                          <p className="mt-3 text-sm text-indigo-700">
                            {field.description}
                          </p>
                        ) : null}

                        <div className="mt-3">
                          {field.required &&
                          (field.value === "" ||
                            field.value === null ||
                            (Array.isArray(field.value) &&
                              field.value.length === 0)) ? (
                            <p className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded">
                              {field.errorText || "This field is required."}
                            </p>
                          ) : field.errorText ? (
                            <p className="text-sm text-gray-500">
                              {field.errorText}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Submit Button */}
                <div className="flex justify-center">
                  <button
                    type="submit"
                    disabled={isSubmitting || hasErrors}
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-8 py-4 rounded-lg font-medium hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center space-x-2 text-lg"
                  >
                    <span>
                      {isSubmitting
                        ? id
                          ? "Updating Plan..."
                          : "Adding Dog..."
                        : id
                        ? "Update Plan"
                        : "Add Dog & Get Plan"}
                    </span>
                    {!isSubmitting && <ArrowRight className="h-5 w-5" />}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="w-full max-w-3xl mx-auto p-8 bg-gradient-to-r from-brand-charcoal to-brand-midgrey rounded-2xl shadow-lg text-white flex flex-col md:flex-row items-start md:items-center gap-6">
              {/* Left Section: Explanation */}
              <div className="flex-1">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">
                  ⚠️ No Active Plan Found
                </h2>
                <p className="text-sm md:text-base opacity-90 mb-4">
                  It looks like you don’t currently have an active plan. Without
                  a plan, you won’t be able to track your dog’s progress, unlock
                  Gut Checks, or get personalised meal plans and guidance.
                </p>

                <p className="text-sm md:text-base opacity-90 mb-4">
                  By activating a plan, you’ll get:
                </p>
                <ul className="list-disc list-inside mb-4 space-y-1 text-sm md:text-base opacity-90">
                  <li>Daily Gut Checks to monitor your dog’s health</li>
                  <li>Personalised meal plans tailored to their gut</li>
                  <li>Supplement guidance and adherence tracking</li>
                  <li>Phase recommendations and progress insights</li>
                  <li>
                    Assessment form to determine your dog’s starting phase
                  </li>
                </ul>

                {/* Compare Plans Hover Link */}
                <div className="relative inline-block group mt-4 font-bold text-white cursor-pointer text-lg">
                  Compare plans »
                  <PlansComparison position="top" />
                </div>
              </div>

              {/* Right Section: CTA */}
              <div className="flex-1 flex flex-col items-center md:items-end mt-4 md:mt-0">
                <p className="text-white font-semibold mb-4 text-center md:text-right">
                  Activate a plan today and start tracking your dog’s gut
                  health! Complete the assessment form to get a personalised
                  starting phase.
                </p>
                <button
                  className="px-6 py-3 bg-white text-brand-charcoal font-semibold rounded-xl shadow hover:bg-gray-100 transition text-sm md:text-base mb-2"
                  onClick={() => (window.location.href = "/subscription")}
                >
                  Activate My Plan
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {showWaitingAnimation && (
        <AnimatePresence>
          {showWaitingAnimation && (
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
                  Generating Health Plan
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-700 mb-4 px-2">
                  One moment — we’re carefully checking your dog’s data and will return a clear diagnosis and recommended next steps soon.
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

export default Intake;
