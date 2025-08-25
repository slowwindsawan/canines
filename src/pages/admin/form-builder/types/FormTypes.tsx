export interface FormOption {
  value: string;
  label: string;
}

export interface FormField {
  id: string;
  name: string;
  label: string;
  type: string;
  value: any;
  description: string;
  errorText: string;
  aiText: string;
  required: boolean;
  placeholder?: string;
  options?: FormOption[];
  min?: number;
  max?: number;
  maxLength?: number;
}

export interface FormConfig {
  fields: FormField[];
  metadata: {
    createdAt: string;
    version: string;
    totalFields: number;
  };
}