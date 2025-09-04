import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useDog } from "../context/DogContext";
import { ArrowRight } from "lucide-react";
import heartIcon from "../assets/heart.png";
import { jwtRequest } from "../env";
import { set } from "zod";

/**
 * Note: the zod schema you had is kept elsewhere if you need strict validation.
 * This component works with dynamic form fields returned from the server,
 * and guarantees presence of a set of required fields before submit.
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
    min: 0,
    max: 25,
  },
  {
    name: "weight",
    label: "Weight (kg)",
    type: "number",
    required: true,
    placeholder: "e.g. 12.5",
    value: "",
    min: 0,
    max: 300,
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
    required: true,
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
    label: "Behavior Notes",
    type: "textarea",
    required: true,
    placeholder: "Anything we should know about behaviour (up to 500 chars)",
    value: "",
    maxLength: 500,
  },
];

const Intake: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addDog } = useDog();
  const location = useLocation();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingForm, setFormLoading] = useState(false);
  const [formFields, setFormFields] = useState<DynamicField[]>([]);
  const [searchParams] = useSearchParams();
  const [id, setId] = useState(null);

  useEffect(() => {
    setId(searchParams.get("id"));
  }, []);

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
        // Server can override label/description/options/value etc.
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

  const fetchDog = async () => {
    setFormLoading(true);
    try {
      const data = await jwtRequest("/dogs/get/" + id, "POST");
      if (data?.success) {
        // get server-provided fields (if any) and merge with required templates
        const serverFields =
          data?.dog?.form_data?.fullFormFields &&
          Array.isArray(data.dog.form_data.fullFormFields)
            ? data.dog.form_data.fullFormFields
            : [];

        // Merge server fields into our required templates so required fields are always present
        const merged = mergeWithRequiredFields(serverFields);

        // Additionally, if there are existing formFields (from onboarding fetch),
        // preserve any non-required fields that were fetched earlier but missing in serverFields.
        // This keeps the latest structure while prioritizing server prefill.
        // (If formFields is empty, merged already contains required templates.)
        if (formFields.length > 0) {
          // Build a map for existing non-required fields by name
          const existingByName = new Map<string, DynamicField>();
          formFields.forEach((f) => existingByName.set(f.name, f));
          // Append any fields that exist in existing formFields but are not present in merged
          const mergedNames = new Set(merged.map((m) => m.name));
          existingByName.forEach((f, name) => {
            if (!mergedNames.has(name)) {
              merged.push({ ...f });
            }
          });
        }

        setFormFields(merged);
      } else {
        // no success: leave whatever formFields currently are (or templates)
        console.warn(
          "Dog fetch returned success=false, leaving current form fields."
        );
      }
    } catch (error) {
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
      // Build payload from formFields
      const payload = {
        name: formFields.find((f) => f.name === "name")?.value || "Unknown",
        breed: formFields.find((f) => f.name === "breed")?.value || "Unknown",
        weight_kg:
          Number(formFields.find((f) => f.name === "weight")?.value) ||
          undefined,
        notes:
          formFields.find((f) => f.name === "behaviorNotes")?.value ||
          undefined,
        form_data: {
          fullFormFields: formFields,
          age: Number(formFields.find((f) => f.name === "age")?.value) || 0,
          stoolType:
            formFields.find((f) => f.name === "stoolType")?.value || "",
          symptoms: formFields.find((f) => f.name === "symptoms")?.value || [],
          behaviorNotes:
            formFields.find((f) => f.name === "behaviorNotes")?.value || "",
        },
      };

      // Call your FastAPI PUT endpoint
      const response = await jwtRequest(`/dogs/update/${id}`, "PUT", payload);

      if (response?.success) {
        alert("Dog updated successfully!");
        // Optionally navigate or refresh the data
        navigate("/protocol"); // or wherever you want
      } else {
        alert(response?.message || "Failed to update dog.");
      }
    } catch (err) {
      alert("An error occurred while updating the dog.");
    }
    setIsSubmitting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasErrors) {
      // extra guard
      alert("Please fill all required fields.");
      return;
    }

    setIsSubmitting(true);

    try {
      // build dog payload using guaranteed fields
      const dogPayload = {
        name: String(getFieldValueByName("name") || "Unknown"),
        breed: String(getFieldValueByName("breed") || "Unknown"),
        age: Number(getFieldValueByName("age") || 0),
        weight: Number(getFieldValueByName("weight") || 0),
        stoolType: String(getFieldValueByName("stoolType") || "Unknown"),
        symptoms: getFieldValueByName("symptoms") || [],
        behaviorNotes: String(getFieldValueByName("behaviorNotes") || ""),
        id: id
      };

      // You can replace this simulated delay with a real API call if needed
      await new Promise((resolve) => setTimeout(resolve, 800));

      const apiPayload = {
        name: dogPayload.name,
        breed: dogPayload.breed,
        weight_kg: dogPayload.weight > 0 ? dogPayload.weight : undefined,
        notes: dogPayload.behaviorNotes || undefined,
        id: dogPayload.id,
        form_data: {
          age: dogPayload.age,
          stoolType: dogPayload.stoolType,
          symptoms: dogPayload.symptoms,
          behaviorNotes: dogPayload.behaviorNotes,
          fullFormFields: formFields,
        },
      };

      // assume jwtRequest(path, method, body)
      const response = await jwtRequest("/dogs/create-dog", "POST", apiPayload);
      console.warn(response)

      if (response && response.success) {
        // success path
        navigate("/protocol");
        return;
      }

      // If backend returned success=false (some helpers do this)
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
    }
  };

  // Render helpers (same as your original logic, adapted to typed state)
  const renderInputForField = (field: DynamicField, idx: number) => {
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
            This information helps us create a personalized health protocol
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <form
            onSubmit={(e) => {
              e.preventDefault(); // prevent default form submission
              if (id) {
                handleUpdateDog(); // update existing dog
              } else {
                handleSubmit(e); // create new dog
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
              <p className="text-center text-gray-600 py-8">Loading form…</p>
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

                    {field.aiText ? (
                      <p className="mt-3 text-sm text-indigo-700">
                        {field.aiText}
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
        </div>
      </div>
    </div>
  );
};

export default Intake;
