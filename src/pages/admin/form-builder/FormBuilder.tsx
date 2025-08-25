import React, { useState, useRef, useEffect } from "react";
import {
  Plus,
  Trash2,
  Copy,
  Settings,
  Code,
  Eye,
  ArrowLeft,
  ArrowLeftCircle,
  SaveAllIcon,
  SaveIcon,
} from "lucide-react";
import ElementPalette from "./ElementPalette";
import FormCanvas from "./FormCanvas";
import PropertiesPanel from "./PropertiesPanel";
import JSONOutput from "./JSONOutput";
import { FormField } from "./types/FormTypes";
import { set } from "zod";
import { jwtRequest } from "../../../env";

const FormBuilder: React.FC = ({ closeBuilder }) => {
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [selectedField, setSelectedField] = useState<FormField | null>(null);
  const [showJSON, setShowJSON] = useState(false);
  const [draggedElement, setDraggedElement] = useState<string | null>(null);
  const dragCounter = useRef(0);
  const [isLoading, setLoading] = useState(false);

  useEffect(() => {
    const fetchForm = async () => {
      setLoading(true);
      try {
        const response = await jwtRequest("/get-onboarding-form", "GET");
        if (response && response.form) {
          setFormFields(response.form);
        } else {
          setFormFields([]); // fallback to empty array
        }
      } catch (err: any) {
        console.error("Failed to fetch onboarding form:", err);
        alert(
          "Something went wrong! Please try refreshing your page or call the admin."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchForm();
  }, []);

  const generateId = () =>
    `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const handleDragStart = (elementType: string) => {
    setDraggedElement(elementType);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
  };

  const handleDragLeave = (e: React.DragEvent) => {
    dragCounter.current--;
  };

  const handleDrop = (e: React.DragEvent, index?: number) => {
    e.preventDefault();
    dragCounter.current = 0;

    if (!draggedElement) return;

    const newField: FormField = {
      id: generateId(),
      name: `${draggedElement}_${formFields.length + 1}`,
      label: `${
        draggedElement.charAt(0).toUpperCase() + draggedElement.slice(1)
      } Field`,
      type: draggedElement,
      value: getDefaultValue(draggedElement),
      description: "",
      errorText: "",
      aiText: "",
      required: false,
      placeholder: "",
      options:
        draggedElement === "select" ||
        draggedElement === "radio" ||
        draggedElement === "checkbox"
          ? [{ value: "option1", label: "Option 1" }]
          : undefined,
      min:
        draggedElement === "number" || draggedElement === "date"
          ? undefined
          : undefined,
      max:
        draggedElement === "number" || draggedElement === "date"
          ? undefined
          : undefined,
      maxLength:
        draggedElement === "text" || draggedElement === "textarea"
          ? undefined
          : undefined,
    };

    const newFields = [...formFields];
    if (typeof index === "number") {
      newFields.splice(index, 0, newField);
    } else {
      newFields.push(newField);
    }

    setFormFields(newFields);
    setDraggedElement(null);
    setSelectedField(newField);
  };

  const getDefaultValue = (type: string) => {
    switch (type) {
      case "checkbox":
        return false;
      case "number":
        return 0;
      case "date":
        return new Date().toISOString().split("T")[0];
      default:
        return "";
    }
  };

  const handleFieldSelect = (field: FormField) => {
    setSelectedField(field);
  };

  const handleFieldUpdate = (updatedField: FormField) => {
    setFormFields(
      formFields.map((field) =>
        field.id === updatedField.id ? updatedField : field
      )
    );
    setSelectedField(updatedField);
  };

  const handleFieldDelete = (fieldId: string) => {
    setFormFields(formFields.filter((field) => field.id !== fieldId));
    if (selectedField?.id === fieldId) {
      setSelectedField(null);
    }
  };

  const handleFieldDuplicate = (field: FormField) => {
    const duplicatedField: FormField = {
      ...field,
      id: generateId(),
      name: `${field.name}_copy`,
      label: `${field.label} (Copy)`,
    };

    const fieldIndex = formFields.findIndex((f) => f.id === field.id);
    const newFields = [...formFields];
    newFields.splice(fieldIndex + 1, 0, duplicatedField);
    setFormFields(newFields);
  };

  const moveField = (fromIndex: number, toIndex: number) => {
    const newFields = [...formFields];
    const [movedField] = newFields.splice(fromIndex, 1);
    newFields.splice(toIndex, 0, movedField);
    setFormFields(newFields);
  };

  const saveOnboardingForm = async () => {
    try {
      const payload = { json_data: formFields };
      const response = await jwtRequest(
        "/update-onboarding-form",
        "POST",
        payload
      );

      if (response && response.success) {
        console.log("Form saved successfully!");
        return true;
      } else {
        console.error("Failed to save form:", response);
        return false;
      }
    } catch (err) {
      console.error("Error saving onboarding form:", err);
      return false;
    }
  };

  return (
    <div className="bg-gray-50" style={{ height: "100%" }}>
      <header className="bg-white border-b border-gray-200 px-6 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <ArrowLeftCircle
              onClick={() => {
                closeBuilder();
              }}
              className="cursor-pointer text-bold"
              size={28}
            />
            &nbsp;
            <p className="text-sm text-gray-600">
              Create dynamic forms with drag and drop for pet's gut's
              description
            </p>{isLoading?<><small className="ml-4 text-green-700">Please wait, Processing...</small></>:<></>}
          </div>
          <div className="flex items-center space-x-3">
            {/* <button
              onClick={() => setShowJSON(!showJSON)}
              className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                showJSON
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
              }`}
            >
              {showJSON ? <Eye className="w-4 h-4 mr-2" /> : <Code className="w-4 h-4 mr-2" />}
              {showJSON ? 'Preview' : 'View JSON'}
            </button> */}
            <button
              disabled={isLoading}
              onClick={async () => {
                setLoading(true);
                const success = await saveOnboardingForm(); // formData is your state
                if (success) {
                  alert("Form saved successfully!");
                } else {
                  alert("Failed to save form.");
                }
                setLoading(false);
              }}
              className={`px-4 py-1 rounded-lg font-medium transition-colors flex items-center bg-green-100 text-green-700 border-green-200 hover:bg-green-800 hover:text-white border-0`}
            >
              <SaveIcon size={18} />
              &nbsp;Save
            </button>
            <span className="text-sm text-gray-500">
              {formFields.length} field{formFields.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Element Palette */}
        <div className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto">
          <ElementPalette onDragStart={handleDragStart} />
        </div>

        {/* Form Canvas */}
        <div className="flex-1 p-6 overflow-y-auto">
          {showJSON ? (
            <JSONOutput formFields={formFields} />
          ) : (
            <FormCanvas
              formFields={formFields}
              selectedField={selectedField}
              onFieldSelect={handleFieldSelect}
              onFieldDelete={handleFieldDelete}
              onFieldDuplicate={handleFieldDuplicate}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onMoveField={moveField}
            />
          )}
        </div>

        {/* Properties Panel */}
        {!showJSON && (
          <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
            <PropertiesPanel
              selectedField={selectedField}
              onFieldUpdate={handleFieldUpdate}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default FormBuilder;
