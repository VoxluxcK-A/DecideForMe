import type {
  DecisionCategory,
  DecisionData,
  DecisionDataResult,
  DecisionHistory,
  DecisionOption,
  DecisionStatus,
} from './model';

const STORAGE_KEY = 'decide-for-me.data.v1';
const now = () => new Date().toISOString();

function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `dfm-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function seededData(): DecisionData {
  const timestamp = now();
  const categorySeeds = [
    { name: 'Food', description: 'What sounds good to eat?', options: ['Sushi', 'Pizza', 'Burger', 'Fried rice', 'Noodles'] },
    { name: 'Entertainment', description: 'Pick something fun to watch or play.', options: ['Watch a film', 'Read a book', 'Play a game'] },
    { name: 'Daily activities', description: 'Make the most of a little free time.', options: ['Go for a walk', 'Tidy one room', 'Take a break'] },
    { name: 'Study', description: 'Choose what to focus on next.', options: ['Review notes', 'Practice problems', 'Read a chapter'] },
    { name: 'Travel', description: 'Find your next little adventure.', options: ['Explore somewhere nearby', 'Visit a museum', 'Take a day trip'] },
  ];

  const categories: DecisionCategory[] = categorySeeds.map(({ name, description }) => ({
    id: makeId(),
    name,
    description,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));
  const options: DecisionOption[] = categorySeeds.flatMap((seed, index) =>
    seed.options.map((name) => ({
      id: makeId(),
      categoryId: categories[index].id,
      name,
      description: '',
      isFavorite: false,
      isExcluded: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    })),
  );
  return { version: 1, categories, options, history: [] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function isCategory(value: unknown): value is DecisionCategory {
  return isRecord(value)
    && typeof value.id === 'string'
    && value.id.length > 0
    && typeof value.name === 'string'
    && value.name.trim().length > 0
    && typeof value.description === 'string'
    && isTimestamp(value.createdAt)
    && isTimestamp(value.updatedAt);
}

function isOption(value: unknown): value is DecisionOption {
  return isRecord(value)
    && typeof value.id === 'string'
    && value.id.length > 0
    && typeof value.categoryId === 'string'
    && value.categoryId.length > 0
    && typeof value.name === 'string'
    && value.name.trim().length > 0
    && typeof value.description === 'string'
    && typeof value.isFavorite === 'boolean'
    && typeof value.isExcluded === 'boolean'
    && isTimestamp(value.createdAt)
    && isTimestamp(value.updatedAt);
}

function isHistory(value: unknown): value is DecisionHistory {
  return isRecord(value)
    && typeof value.id === 'string'
    && value.id.length > 0
    && ((typeof value.categoryId === 'string' && value.categoryId.length > 0) || value.categoryId === null)
    && typeof value.categoryName === 'string'
    && value.categoryName.trim().length > 0
    && typeof value.selectedOptionId === 'string'
    && value.selectedOptionId.length > 0
    && typeof value.selectedOptionName === 'string'
    && value.selectedOptionName.trim().length > 0
    && (value.status === 'pending' || value.status === 'completed' || value.status === 'skipped')
    && isTimestamp(value.createdAt);
}

function isDecisionData(value: unknown): value is DecisionData {
  if (!isRecord(value)
    || value.version !== 1
    || !Array.isArray(value.categories)
    || !value.categories.every(isCategory)
    || !Array.isArray(value.options)
    || !value.options.every(isOption)
    || !Array.isArray(value.history)
    || !value.history.every(isHistory)) return false;

  const categoryIds = new Set(value.categories.map((category) => category.id));
  const allIds = value.categories.map((category) => category.id);
  const optionIds = value.options.map((option) => option.id);
  const categoryNames = value.categories.map((category) => category.name.trim().toLocaleLowerCase());
  const categoryOptionPairs = value.options.map((option) => `${option.categoryId}\u0000${option.name.trim().toLocaleLowerCase()}`);
  return value.options.every((option) => categoryIds.has(option.categoryId))
    && new Set(allIds).size === allIds.length
    && new Set(categoryNames).size === categoryNames.length
    && new Set(optionIds).size === optionIds.length
    && new Set(categoryOptionPairs).size === categoryOptionPairs.length;
}

export function readDecisionData(): DecisionDataResult {
  let stored: string | null;
  try {
    stored = localStorage.getItem(STORAGE_KEY);
  } catch {
    return {
      data: seededData(),
      warning: 'Saved data could not be accessed. A fresh starter collection is shown; changes may not persist in this browser.',
    };
  }
  if (stored === null) return { data: seededData(), warning: null };

  let parsed: unknown;
  try {
    parsed = JSON.parse(stored);
  } catch {
    return {
      data: seededData(),
      warning: 'Saved data is corrupted. A fresh starter collection is shown; your stored data has not been overwritten.',
    };
  }
  if (!isDecisionData(parsed)) {
    return {
      data: seededData(),
      warning: 'Saved data is invalid. A fresh starter collection is shown; your stored data has not been overwritten.',
    };
  }
  return { data: parsed, warning: null };
}

export function writeDecisionData(data: DecisionData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Browser storage is unavailable.';
    throw new Error(`Could not save your changes. ${reason}`);
  }
}

function normalizedName(name: string): string {
  return name.trim().toLocaleLowerCase();
}

function requireName(name: string, label: string): string {
  const cleanName = name.trim();
  if (!cleanName) throw new Error(`${label} cannot be empty.`);
  return cleanName;
}

function uniqueId(): string {
  return makeId();
}

export const decisionRepository = {
  createCategory(data: DecisionData, name: string, description = ''): DecisionData {
    const cleanName = requireName(name, 'Category name');
    if (data.categories.some((category) => normalizedName(category.name) === normalizedName(cleanName))) {
      throw new Error('A category with that name already exists.');
    }
    const timestamp = now();
    const category: DecisionCategory = {
      id: uniqueId(),
      name: cleanName,
      description: description.trim(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    return { ...data, categories: [...data.categories, category] };
  },

  updateCategory(data: DecisionData, id: string, name: string, description = ''): DecisionData {
    const cleanName = requireName(name, 'Category name');
    if (data.categories.some((category) => category.id !== id && normalizedName(category.name) === normalizedName(cleanName))) {
      throw new Error('A category with that name already exists.');
    }
    if (!data.categories.some((category) => category.id === id)) throw new Error('That category no longer exists.');
    return {
      ...data,
      categories: data.categories.map((category) => category.id === id
        ? { ...category, name: cleanName, description: description.trim(), updatedAt: now() }
        : category),
    };
  },

  deleteCategory(data: DecisionData, id: string): DecisionData {
    if (!data.categories.some((category) => category.id === id)) throw new Error('That category no longer exists.');
    return {
      ...data,
      categories: data.categories.filter((category) => category.id !== id),
      options: data.options.filter((option) => option.categoryId !== id),
    };
  },

  createOption(data: DecisionData, categoryId: string, name: string, description = ''): DecisionData {
    const cleanName = requireName(name, 'Option name');
    if (!data.categories.some((category) => category.id === categoryId)) throw new Error('Choose a category first.');
    if (data.options.some((option) => option.categoryId === categoryId && normalizedName(option.name) === normalizedName(cleanName))) {
      throw new Error('That option already exists in this category.');
    }
    const timestamp = now();
    const option: DecisionOption = {
      id: uniqueId(),
      categoryId,
      name: cleanName,
      description: description.trim(),
      isFavorite: false,
      isExcluded: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    return { ...data, options: [...data.options, option] };
  },

  updateOption(data: DecisionData, id: string, categoryId: string, name: string, description = ''): DecisionData {
    const cleanName = requireName(name, 'Option name');
    if (!data.categories.some((category) => category.id === categoryId)) throw new Error('Choose a category first.');
    if (!data.options.some((option) => option.id === id)) throw new Error('That option no longer exists.');
    if (data.options.some((option) => option.id !== id && option.categoryId === categoryId && normalizedName(option.name) === normalizedName(cleanName))) {
      throw new Error('That option already exists in this category.');
    }
    return {
      ...data,
      options: data.options.map((option) => option.id === id
        ? { ...option, categoryId, name: cleanName, description: description.trim(), updatedAt: now() }
        : option),
    };
  },

  deleteOption(data: DecisionData, id: string): DecisionData {
    if (!data.options.some((option) => option.id === id)) throw new Error('That option no longer exists.');
    return { ...data, options: data.options.filter((option) => option.id !== id) };
  },

  setOptionFlag(data: DecisionData, id: string, flag: 'isFavorite' | 'isExcluded', value: boolean): DecisionData {
    if (!data.options.some((option) => option.id === id)) throw new Error('That option no longer exists.');
    return {
      ...data,
      options: data.options.map((option) => option.id === id
        ? { ...option, [flag]: value, updatedAt: now() }
        : option),
    };
  },

  addHistory(
    data: DecisionData,
    option: DecisionOption,
    category: DecisionCategory | null,
    fallbackCategoryName?: string,
  ): DecisionData {
    const entry: DecisionHistory = {
      id: uniqueId(),
      categoryId: category?.id ?? null,
      categoryName: category?.name ?? fallbackCategoryName ?? 'Uncategorized',
      selectedOptionId: option.id,
      selectedOptionName: option.name,
      status: 'pending',
      createdAt: now(),
      aiReason: null,
    };
    return { ...data, history: [entry, ...data.history] };
  },

  updateHistoryStatus(data: DecisionData, id: string, status: DecisionStatus): DecisionData {
    if (!data.history.some((entry) => entry.id === id)) throw new Error('That history entry no longer exists.');
    return {
      ...data,
      history: data.history.map((entry) => entry.id === id ? { ...entry, status } : entry),
    };
  },

  deleteHistory(data: DecisionData, id: string): DecisionData {
    if (!data.history.some((entry) => entry.id === id)) throw new Error('That history entry no longer exists.');
    return { ...data, history: data.history.filter((entry) => entry.id !== id) };
  },

  clearHistory(data: DecisionData): DecisionData {
    return { ...data, history: [] };
  },
};

export function pickRandomOption(options: DecisionOption[], previousOptionId?: string): DecisionOption | null {
  if (options.length === 0) return null;
  const alternatives = previousOptionId && options.length > 1
    ? options.filter((option) => option.id !== previousOptionId)
    : options;
  return alternatives[Math.floor(Math.random() * alternatives.length)] ?? null;
}
