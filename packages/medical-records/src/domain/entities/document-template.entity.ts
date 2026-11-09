export interface DocumentTemplateSummary {
  uuid: string;
  name: string;
  description: string | null;
  updatedAt: string;
}

export interface DocumentTemplateEntity extends DocumentTemplateSummary {
  content: string;
  createdAt: string;
}

export interface DocumentTemplateWriteData {
  name: string;
  description: string | null;
  content: string;
}
