import React from 'react';
import { Plus, MousePointer, Sparkles } from 'lucide-react';
import FormField from './FormField';
import { FormField as FormFieldType } from '../types/FormTypes';

interface FormCanvasProps {
  formFields: FormFieldType[];
  selectedField: FormFieldType | null;
  onFieldSelect: (field: FormFieldType) => void;
  onFieldDelete: (fieldId: string) => void;
  onFieldDuplicate: (field: FormFieldType) => void;
  onDrop: (e: React.DragEvent, index?: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnter: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onMoveField: (fromIndex: number, toIndex: number) => void;
}

const FormCanvas: React.FC<FormCanvasProps> = ({
  formFields,
  selectedField,
  onFieldSelect,
  onFieldDelete,
  onFieldDuplicate,
  onDrop,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onMoveField,
}) => {
  const handleFieldDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleFieldDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'));
    if (!isNaN(draggedIndex) && draggedIndex !== targetIndex) {
      onMoveField(draggedIndex, targetIndex);
    } else {
      onDrop(e, targetIndex);
    }
  };

  if (formFields.length === 0) {
    return (
      <div
        className="flex-1 flex items-center justify-center bg-white rounded-xl border-2 border-dashed border-gray-300 min-h-96"
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
      >
        <div className="text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Start Building Your Form
          </h3>
          <p className="text-gray-600 mb-4 max-w-sm">
            Drag form elements from the sidebar to create your custom form. 
            Click on any field to customize its properties.
          </p>
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
            <MousePointer className="w-4 h-4" />
            <span>Drag & drop elements here</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="border-b border-gray-100 px-6 py-4">
        <h3 className="text-lg font-semibold text-gray-900">Form Preview</h3>
        <p className="text-sm text-gray-600">Click on fields to edit properties</p>
      </div>
      
      <div className="p-6">
        <div className="space-y-4">
          {formFields.map((field, index) => (
            <div key={field.id}>
              {/* Drop zone before each field */}
              <div
                className="h-2 opacity-0 hover:opacity-100 transition-opacity"
                onDrop={(e) => handleFieldDrop(e, index)}
                onDragOver={onDragOver}
                onDragEnter={onDragEnter}
                onDragLeave={onDragLeave}
              >
                <div className="h-full bg-blue-400 rounded-full mx-auto w-32" />
              </div>
              
              <FormField
                field={field}
                isSelected={selectedField?.id === field.id}
                onSelect={onFieldSelect}
                onDelete={onFieldDelete}
                onDuplicate={onFieldDuplicate}
                onDragStart={(e) => handleFieldDragStart(e, index)}
                draggable
              />
            </div>
          ))}
          
          {/* Drop zone after last field */}
          <div
            className="h-8 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center opacity-50 hover:opacity-100 hover:border-blue-400 transition-all"
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragEnter={onDragEnter}
            onDragLeave={onDragLeave}
          >
            <Plus className="w-4 h-4 text-gray-400" />
            <span className="ml-2 text-sm text-gray-400">Drop here to add</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormCanvas;