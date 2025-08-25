import React from 'react';
import { Settings, Plus, Trash2 } from 'lucide-react';
import { FormField } from './types/FormTypes';

interface PropertiesPanelProps {
  selectedField: FormField | null;
  onFieldUpdate: (field: FormField) => void;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedField,
  onFieldUpdate,
}) => {
  if (!selectedField) {
    return (
      <div className="h-full flex items-center justify-center text-center">
        <div>
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <Settings className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Field Selected
          </h3>
          <p className="text-gray-600 text-sm">
            Click on a form field to edit its properties and settings.
          </p>
        </div>
      </div>
    );
  }

  const handleFieldChange = (updates: Partial<FormField>) => {
    onFieldUpdate({ ...selectedField, ...updates });
  };

  const addOption = () => {
    const currentOptions = selectedField.options || [];
    const newOption = {
      value: `option${currentOptions.length + 1}`,
      label: `Option ${currentOptions.length + 1}`
    };
    handleFieldChange({
      options: [...currentOptions, newOption]
    });
  };

  const updateOption = (index: number, key: 'value' | 'label', value: string) => {
    const updatedOptions = [...(selectedField.options || [])];
    updatedOptions[index] = { ...updatedOptions[index], [key]: value };
    handleFieldChange({ options: updatedOptions });
  };

  const removeOption = (index: number) => {
    const updatedOptions = [...(selectedField.options || [])];
    updatedOptions.splice(index, 1);
    handleFieldChange({ options: updatedOptions });
  };

  const needsOptions = ['select', 'radio', 'checkbox'].includes(selectedField.type);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Field Properties</h3>
        <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
          Editing: <span className="font-medium">{selectedField.type}</span> field
        </div>
      </div>

      <div className="space-y-6">
        {/* Basic Properties */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Basic Settings</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Field Name
              </label>
              <input
                type="text"
                value={selectedField.name}
                onChange={(e) => handleFieldChange({ name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="field_name"
              />
              <p className="text-xs text-gray-500 mt-1">Used for form submission data</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Label
              </label>
              <input
                type="text"
                value={selectedField.label}
                onChange={(e) => handleFieldChange({ label: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="Field Label"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Placeholder
              </label>
              <input
                type="text"
                value={selectedField.placeholder || ''}
                onChange={(e) => handleFieldChange({ placeholder: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="Enter placeholder text..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={selectedField.description}
                onChange={(e) => handleFieldChange({ description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                rows={2}
                placeholder="Optional field description..."
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="required"
                checked={selectedField.required}
                onChange={(e) => handleFieldChange({ required: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-offset-0 focus:ring-blue-200 focus:ring-opacity-50"
              />
              <label htmlFor="required" className="ml-2 text-sm text-gray-700">
                Required field
              </label>
            </div>
          </div>
        </div>

        {/* Field-specific properties */}
        {(selectedField.type === 'number' || selectedField.type === 'range') && (
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Number Settings</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min Value
                </label>
                <input
                  type="number"
                  value={selectedField.min || ''}
                  onChange={(e) => handleFieldChange({ min: parseFloat(e.target.value) || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Value
                </label>
                <input
                  type="number"
                  value={selectedField.max || ''}
                  onChange={(e) => handleFieldChange({ max: parseFloat(e.target.value) || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {(selectedField.type === 'text' || selectedField.type === 'textarea') && (
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Text Settings</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Length
              </label>
              <input
                type="number"
                value={selectedField.maxLength || ''}
                onChange={(e) => handleFieldChange({ maxLength: parseInt(e.target.value) || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="No limit"
              />
            </div>
          </div>
        )}

        {/* Options for select, radio, checkbox */}
        {needsOptions && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">Options</h4>
              <button
                onClick={addOption}
                className="flex items-center px-2 py-1 text-sm text-blue-600 hover:text-blue-700"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Option
              </button>
            </div>
            <div className="space-y-2">
              {(selectedField.options || []).map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={option.value}
                    onChange={(e) => updateOption(index, 'value', e.target.value)}
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Value"
                  />
                  <input
                    type="text"
                    value={option.label}
                    onChange={(e) => updateOption(index, 'label', e.target.value)}
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Label"
                  />
                  <button
                    onClick={() => removeOption(index)}
                    className="p-1 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI and Error Messages */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Messages</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                AI Helper Text
              </label>
              <textarea
                value={selectedField.aiText}
                onChange={(e) => handleFieldChange({ aiText: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                rows={2}
                placeholder="AI-generated help text..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Error Message
              </label>
              <input
                type="text"
                value={selectedField.errorText}
                onChange={(e) => handleFieldChange({ errorText: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="Error message for validation..."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertiesPanel;