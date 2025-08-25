import React, { useState } from 'react';
import { Copy, Check, Download, Code } from 'lucide-react';
import { FormField } from './types/FormTypes';

interface JSONOutputProps {
  formFields: FormField[];
}

const JSONOutput: React.FC<JSONOutputProps> = ({ formFields }) => {
  const [copied, setCopied] = useState(false);

  const formConfig = {
    fields: formFields.map(field => ({
      id: field.id,
      name: field.name,
      label: field.label,
      type: field.type,
      value: field.value,
      description: field.description,
      errorText: field.errorText,
      aiText: field.aiText,
      required: field.required,
      placeholder: field.placeholder,
      ...(field.options && { options: field.options }),
      ...(field.min !== undefined && { min: field.min }),
      ...(field.max !== undefined && { max: field.max }),
      ...(field.maxLength !== undefined && { maxLength: field.maxLength }),
    })),
    metadata: {
      createdAt: new Date().toISOString(),
      version: '1.0.0',
      totalFields: formFields.length,
    }
  };

  const jsonString = JSON.stringify(formConfig, null, 2);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `form-config-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getFieldTypeCounts = () => {
    const counts: Record<string, number> = {};
    formFields.forEach(field => {
      counts[field.type] = (counts[field.type] || 0) + 1;
    });
    return counts;
  };

  const fieldCounts = getFieldTypeCounts();

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="border-b border-gray-100 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center">
              <Code className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Form Configuration</h3>
              <p className="text-sm text-gray-600">JSON output for form fields</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2 text-green-600" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy JSON
                </>
              )}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </button>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{formFields.length}</div>
            <div className="text-sm text-gray-600">Total Fields</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {formFields.filter(f => f.required).length}
            </div>
            <div className="text-sm text-gray-600">Required Fields</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {Object.keys(fieldCounts).length}
            </div>
            <div className="text-sm text-gray-600">Field Types</div>
          </div>
        </div>

        {Object.keys(fieldCounts).length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Field Distribution:</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(fieldCounts).map(([type, count]) => (
                <span
                  key={type}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {type}: {count}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-6">
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono leading-relaxed">
          <code>{jsonString}</code>
        </pre>
      </div>
    </div>
  );
};

export default JSONOutput;