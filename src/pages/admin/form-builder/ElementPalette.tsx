import React from 'react';
import { Type, AlignLeft, CheckSquare, Circle, Calendar, ChevronDown, Hash, Mail, Phone, Link, FileText, Star, Sliders as Slider, ToggleLeft, Upload } from 'lucide-react';

interface ElementPaletteProps {
  onDragStart: (elementType: string) => void;
}

const ElementPalette: React.FC<ElementPaletteProps> = ({ onDragStart }) => {
  const elements = [
    {
      type: 'text',
      label: 'Text Input',
      icon: Type,
      color: 'bg-blue-50 border-blue-200 text-blue-700',
      description: 'Single line text input'
    },
    {
      type: 'textarea',
      label: 'Textarea',
      icon: AlignLeft,
      color: 'bg-green-50 border-green-200 text-green-700',
      description: 'Multi-line text input'
    },
    {
      type: 'email',
      label: 'Email',
      icon: Mail,
      color: 'bg-purple-50 border-purple-200 text-purple-700',
      description: 'Email address input'
    },
    {
      type: 'number',
      label: 'Number',
      icon: Hash,
      color: 'bg-orange-50 border-orange-200 text-orange-700',
      description: 'Numeric input field'
    },
    {
      type: 'tel',
      label: 'Phone',
      icon: Phone,
      color: 'bg-teal-50 border-teal-200 text-teal-700',
      description: 'Phone number input'
    },
    {
      type: 'url',
      label: 'URL',
      icon: Link,
      color: 'bg-indigo-50 border-indigo-200 text-indigo-700',
      description: 'Website URL input'
    },
    {
      type: 'date',
      label: 'Date',
      icon: Calendar,
      color: 'bg-pink-50 border-pink-200 text-pink-700',
      description: 'Date picker input'
    },
    {
      type: 'checkbox',
      label: 'Checkbox',
      icon: CheckSquare,
      color: 'bg-cyan-50 border-cyan-200 text-cyan-700',
      description: 'Multiple choice selection'
    },
    {
      type: 'radio',
      label: 'Radio Button',
      icon: Circle,
      color: 'bg-amber-50 border-amber-200 text-amber-700',
      description: 'Single choice selection'
    },
    {
      type: 'select',
      label: 'Select Dropdown',
      icon: ChevronDown,
      color: 'bg-emerald-50 border-emerald-200 text-emerald-700',
      description: 'Dropdown selection'
    },
    {
      type: 'range',
      label: 'Range Slider',
      icon: Slider,
      color: 'bg-rose-50 border-rose-200 text-rose-700',
      description: 'Range slider input'
    }
  ];

  const handleDragStart = (e: React.DragEvent, elementType: string) => {
    e.dataTransfer.effectAllowed = 'copy';
    onDragStart(elementType);
  };

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Form Elements</h3>
      <div className="space-y-2">
        {elements.map((element) => {
          const IconComponent = element.icon;
          return (
            <div
              key={element.type}
              draggable
              onDragStart={(e) => handleDragStart(e, element.type)}
              className={`${element.color} border-2 border-dashed rounded-lg p-3 cursor-move hover:shadow-md transition-shadow group`}
            >
              <div className="flex items-center space-x-3">
                <IconComponent className="w-5 h-5" />
                <div className="flex-1">
                  <div className="font-medium text-sm">{element.label}</div>
                  <div className="text-xs opacity-75 group-hover:opacity-100 transition-opacity">
                    {element.description}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-6 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600">
          <strong>Tip:</strong> Drag any element to the canvas area to add it to your form. Click on fields to edit their properties.
        </p>
      </div>
    </div>
  );
};

export default ElementPalette;