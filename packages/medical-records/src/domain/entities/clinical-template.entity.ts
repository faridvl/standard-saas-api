export interface ClinicalFieldDefinition {
  id: string;
  label: string;
  fieldType: 'text' | 'textarea' | 'number' | 'boolean' | 'date' | 'select';
  required: boolean;
  options?: string[];
  order: number;
  section?: string;
  detailLabel?: string;
}

export interface ClinicalTemplateEntity {
  uuid: string;
  tenantUuid: string;
  name: string;
  speciality: string;
  fields: ClinicalFieldDefinition[];
  createdAt: Date;
  updatedAt: Date;
}
