export interface ProjectTemplateSummary {
  id: string;
  name: string;
  description: string | null;
  listCount: number;
}

interface BoardTemplateApiItem {
  id: string;
  name: string;
  description: string | null;
  lists: unknown[];
  isTemplate?: boolean;
}

interface BoardTemplatesApiResponse {
  success?: boolean;
  data?: BoardTemplateApiItem[];
}

export async function fetchProjectTemplates(): Promise<ProjectTemplateSummary[]> {
  const response = await fetch('/api/boards?templates=true');
  const data = (await response.json()) as BoardTemplatesApiResponse;

  if (!data.success || !Array.isArray(data.data)) {
    return [];
  }

  return data.data
    .filter((item) => item.isTemplate)
    .map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      listCount: item.lists?.length || 0,
    }));
}
