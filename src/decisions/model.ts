export type DecisionStatus = 'pending' | 'completed' | 'skipped';

export interface DecisionCategory {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface DecisionOption {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  isFavorite: boolean;
  isExcluded: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DecisionHistory {
  id: string;
  categoryId: string | null;
  categoryName: string;
  selectedOptionId: string;
  selectedOptionName: string;
  status: DecisionStatus;
  createdAt: string;
  aiReason: string | null;
}

export interface DecisionData {
  version: 1;
  categories: DecisionCategory[];
  options: DecisionOption[];
  history: DecisionHistory[];
}

export interface DecisionDataResult {
  data: DecisionData;
  warning: string | null;
}

export type DecisionView = 'overview' | 'decide' | 'categories' | 'options' | 'favorites' | 'history' | 'admin';
