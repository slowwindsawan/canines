import React from 'react';
import { Copy, Trash2, GripVertical, Star } from 'lucide-react';
import { FormField as FormFieldType } from './types/FormTypes';

interface FormFieldProps {
  field: FormFieldType;
  isSelected: boolean;
  onSelect: (field: FormFieldType) => void;
  onDelete: (fieldId: string) => void;
  onDuplicate: (field: FormFieldType) => void;
  onDragStart: (e: React.DragEvent) => void;
  draggable: boolean;
}

const FormField: React.FC<FormFieldProps> = ({
  field,
  isSelected,
  onSelect,
  onDelete,
  onDuplicate,
  onDragStart,
  draggable,
}) => {
  const renderField = () => {
    const baseClasses = "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
    
    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            placeholder={field.placeholder}
            rows={3}
            className={baseClasses}
            readOnly
          />
        );
      
      case 'select':
        return (
          <select className={baseClasses} disabled>
            <option>{field.placeholder || 'Select an option'}</option>
            {field.options?.map((option, index) => (
              <option key={index} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      
      case 'checkbox':
        return (
          <div className="space-y-2">
            {field.options?.map((option, index) => (
              <label key={index} className="flex items-center">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-offset-0 focus:ring-blue-200 focus:ring-opacity-50"
                  readOnly
                />
                <span className="ml-2 text-sm text-gray-700">{option.label}</span>
              </label>
            )) || (
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-offset-0 focus:ring-blue-200 focus:ring-opacity-50"
                  readOnly
                />
                <span className="ml-2 text-sm text-gray-700">{field.label}</span>
              </label>
            )}
          </div>
        );
      
      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map((option, index) => (
              <label key={index} className="flex items-center">
                <input
                  type="radio"
                  name={field.name}
                  value={option.value}
                  className="border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-offset-0 focus:ring-blue-200 focus:ring-opacity-50"
                  readOnly
                />
                <span className="ml-2 text-sm text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        );
      
      case 'range':
        return (
          <div>
            <input
              type="range"
              min={field.min || 0}
              max={field.max || 100}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              readOnly
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{field.min || 0}</span>
              <span>{field.max || 100}</span>
            </div>
          </div>
        );
      
      case 'rating':
        return (
          <div className="flex space-x-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className="w-6 h-6 text-gray-300 hover:text-yellow-400 cursor-pointer"
                fill="none"
              />
            ))}
          </div>
        );
      
      case 'toggle':
        return (
          <label className="inline-flex items-center">
            <div className="relative">
              <input type="checkbox" className="sr-only" readOnly />
              <div className="block bg-gray-300 w-14 h-8 rounded-full"></div>
              <div className="dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition"></div>
            </div>
            <span className="ml-3 text-sm text-gray-700">{field.label}</span>
          </label>
        );
      
      default:
        return (
          <input
            type={field.type}
            placeholder={field.placeholder}
            className={baseClasses}
            readOnly
          />
        );
    }
  };

  return (
    <div
      className={`group relative p-4 border-2 rounded-lg transition-all cursor-pointer ${
        isSelected
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 hover:border-gray-300 bg-white'
      }`}
      onClick={() => onSelect(field)}
      draggable={draggable}
      onDragStart={onDragStart}
    >
      {/* Drag handle and actions */}
      <div className="absolute top-2 right-2 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate(field);
          }}
          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
          title="Duplicate field"
        >
          <Copy className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(field.id);
          }}
          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
          title="Delete field"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        <div className="p-1 text-gray-400 cursor-move" title="Drag to reorder">
          <GripVertical className="w-4 h-4" />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        </div>
        
        {field.description && (
          <p className="text-xs text-gray-500">{field.description}</p>
        )}
        
        {field.aiText && (
          <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
            AI: {field.aiText}
          </div>
        )}
        
        {renderField()}
        
        {field.errorText && (
          <p className="text-xs text-red-500">{field.errorText}</p>
        )}
      </div>
    </div>
  );
};

export default FormField;