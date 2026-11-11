import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Ban,
  BookmarkCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  FolderPlus,
  Heart,
  History,
  LayoutDashboard,
  ListChecks,
  Plus,
  Search,
  Shapes,
  Shuffle,
  Sparkles,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import type { DecisionCategory, DecisionData, DecisionOption, DecisionView, DecisionStatus } from './decisions/model';
import { ApiError, decisionApi, getApiErrorMessage, type AdminUser, type ApiDashboard, type AuthUser } from './decisions/api';

type SortOrder = 'recent' | 'alphabetical';
type EditorState = { type: 'category' | 'option'; id?: string; categoryId?: string } | null;
type Notice = { kind: 'success' | 'error' | 'info'; message: string } | null;

const navigation: { id: DecisionView; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'decide', label: 'Make a decision', icon: CircleHelp },
  { id: 'categories', label: 'Categories', icon: Shapes },
  { id: 'options', label: 'All options', icon: ListChecks },
  { id: 'favorites', label: 'Favorites', icon: Heart },
  { id: 'history', label: 'History', icon: History },
  { id: 'admin', label: 'User management', icon: Users },
];

function Brand() {
  return <a className="dfm-brand" href="/home" aria-label="Decide For Me home">Decide For Me<span>.</span><i aria-hidden="true">✳</i></a>;
}

function formatDate(value: string, includeTime = false): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return new Intl.DateTimeFormat(undefined, includeTime
    ? { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }
    : { month: 'short', day: 'numeric' }).format(date);
}

function sortOptions(options: DecisionOption[], order: SortOrder): DecisionOption[] {
  return [...options].sort((a, b) => order === 'alphabetical'
    ? a.name.localeCompare(b.name)
    : b.createdAt.localeCompare(a.createdAt));
}

function EditorDialog({
  editor,
  data,
  onClose,
  onSubmit,
}: {
  editor: NonNullable<EditorState>;
  data: DecisionData;
  onClose: () => void;
  onSubmit: (name: string, description: string, categoryId: string) => Promise<string | null>;
}) {
  const category = editor.type === 'category' ? data.categories.find((item) => item.id === editor.id) : null;
  const option = editor.type === 'option' ? data.options.find((item) => item.id === editor.id) : null;
  const [name, setName] = useState(category?.name ?? option?.name ?? '');
  const [description, setDescription] = useState(category?.description ?? option?.description ?? '');
  const [categoryId, setCategoryId] = useState(option?.categoryId ?? editor.categoryId ?? data.categories[0]?.id ?? '');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const isCategory = editor.type === 'category';
  const title = `${editor.id ? 'Edit' : 'Create'} ${isCategory ? 'category' : 'option'}`;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) {
      setFormError(`${isCategory ? 'Category' : 'Option'} name is required.`);
      return;
    }
    if (!isCategory && !categoryId) {
      setFormError('Choose a category for this option.');
      return;
    }
    setSaving(true);
    void onSubmit(name, description, categoryId).then((error) => {
      if (error) setFormError(error);
      else onClose();
    }).finally(() => setSaving(false));
  };

  return (
    <div className="dfm-dash-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="dfm-dash-modal" role="dialog" aria-modal="true" aria-labelledby="dfm-editor-title">
        <div className="dfm-dash-modal-top">
          <div>
            <span className="dfm-dash-eyebrow">{isCategory ? 'KEEP IT ORGANIZED' : 'GIVE YOURSELF OPTIONS'}</span>
            <h2 id="dfm-editor-title">{title}</h2>
          </div>
          <button type="button" className="dfm-icon-button" onClick={onClose} aria-label="Close dialog"><X size={18} /></button>
        </div>
        <form className="dfm-dash-form" onSubmit={submit}>
          <label htmlFor="dfm-editor-name">{isCategory ? 'Category name' : 'Option name'}</label>
          <input
            id="dfm-editor-name"
            autoFocus
            maxLength={isCategory ? 48 : 64}
            value={name}
            onChange={(event) => { setName(event.target.value); setFormError(''); }}
            placeholder={isCategory ? 'e.g. Weekend plans' : 'e.g. Go for a walk'}
          />
          <label htmlFor="dfm-editor-description">A little detail <span>OPTIONAL</span></label>
          <textarea
            id="dfm-editor-description"
            rows={3}
            maxLength={160}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Add a note to help you remember…"
          />
          {!isCategory && (
            <>
              <label htmlFor="dfm-editor-category">Category</label>
              <div className="dfm-dash-select-wrap">
                <select id="dfm-editor-category" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
                  <option value="">Choose a category</option>
                  {data.categories.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
                </select>
                <ChevronDown size={16} aria-hidden="true" />
              </div>
            </>
          )}
          {formError && <p className="dfm-dash-form-error" role="alert">{formError}</p>}
          <div className="dfm-dash-modal-actions">
            <button type="button" className="dfm-dash-button dfm-dash-button-quiet" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="dfm-dash-button dfm-dash-button-dark" disabled={saving}>{saving ? 'Saving…' : editor.id ? 'Save changes' : `Create ${isCategory ? 'category' : 'option'}`} {!saving && <ArrowUpRight size={15} />}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function OptionRow({
  option,
  categoryName,
  onEdit,
  onDelete,
  onFavorite,
  onExclude,
  showCategory = true,
}: {
  option: DecisionOption;
  categoryName: string;
  onEdit: () => void;
  onDelete: () => void;
  onFavorite: () => void;
  onExclude?: () => void;
  showCategory?: boolean;
}) {
  return (
    <article className={`dfm-dash-option-row${option.isExcluded ? ' is-excluded' : ''}`}>
      <span className="dfm-dash-option-symbol"><span>{option.name.slice(0, 1).toUpperCase()}</span></span>
      <div className="dfm-dash-option-copy">
        <strong>{option.name}</strong>
        <span>{showCategory ? categoryName : option.description || 'No note added'}</span>
      </div>
      <div className="dfm-dash-option-actions">
        {onExclude && (
          <button type="button" className={`dfm-icon-button${option.isExcluded ? ' is-active' : ''}`} onClick={onExclude} aria-label={option.isExcluded ? `Include ${option.name} in decisions` : `Exclude ${option.name} from decisions`} title={option.isExcluded ? 'Include in decisions' : 'Exclude from decisions'}>
            <Ban size={16} />
          </button>
        )}
        <button type="button" className={`dfm-icon-button${option.isFavorite ? ' is-favorite' : ''}`} onClick={onFavorite} aria-label={option.isFavorite ? `Remove ${option.name} from favorites` : `Add ${option.name} to favorites`} title={option.isFavorite ? 'Remove from favorites' : 'Add to favorites'}>
          <Heart size={16} fill={option.isFavorite ? 'currentColor' : 'none'} />
        </button>
        <button type="button" className="dfm-icon-button" onClick={onEdit} aria-label={`Edit ${option.name}`} title="Edit option"><span className="dfm-edit-glyph">↗</span></button>
        <button type="button" className="dfm-icon-button dfm-danger-icon" onClick={onDelete} aria-label={`Delete ${option.name}`} title="Delete option"><Trash2 size={15} /></button>
      </div>
    </article>
  );
}

function EmptyState({ title, copy, action, onAction }: { title: string; copy: string; action?: string; onAction?: () => void }) {
  return (
    <div className="dfm-dash-empty">
      <span><Sparkles size={19} /></span>
      <h3>{title}</h3>
      <p>{copy}</p>
      {action && onAction && <button type="button" className="dfm-dash-button dfm-dash-button-dark" onClick={onAction}>{action} <ArrowUpRight size={15} /></button>}
    </div>
  );
}

export default function DecisionDashboard({ initialView = 'overview' }: { initialView?: DecisionView }) {
  const [data, setData] = useState<DecisionData>({ version: 1, categories: [], options: [], history: [] });
  const dataRef = useRef(data);
  dataRef.current = data;
  const [stats, setStats] = useState<ApiDashboard['stats']>({ categories: 0, options: 0, decisions: 0, favorites: 0 });
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLastPage, setHistoryLastPage] = useState(1);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [view, setView] = useState<DecisionView>(initialView);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [adminUsersLoading, setAdminUsersLoading] = useState(false);
  const [adminUsersError, setAdminUsersError] = useState('');
  const [adminRetryKey, setAdminRetryKey] = useState(0);
  const [adminSearchInput, setAdminSearchInput] = useState('');
  const [adminSearch, setAdminSearch] = useState('');
  const [adminPage, setAdminPage] = useState(1);
  const [adminLastPage, setAdminLastPage] = useState(1);
  const [updatingAdminUserId, setUpdatingAdminUserId] = useState<number | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [editor, setEditor] = useState<EditorState>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('recent');
  const [spinning, setSpinning] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [resultOption, setResultOption] = useState<DecisionOption | null>(null);
  const [resultHistoryId, setResultHistoryId] = useState('');
  const [choosingAnother, setChoosingAnother] = useState(false);
  const [replacingDecision, setReplacingDecision] = useState(false);
  const [updatingHistory, setUpdatingHistory] = useState<{ id: string; status: DecisionStatus } | null>(null);
  const [lastDecisionMessage, setLastDecisionMessage] = useState('');
  const [situation, setSituation] = useState('');
  const [reasonLoadingId, setReasonLoadingId] = useState('');
  const [reasonError, setReasonError] = useState<{ id: string; message: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    document.title = user?.isAdmin ? 'User management — Decide For Me' : 'Your decision space — Decide For Me';
  }, [user?.isAdmin]);

  useEffect(() => {
    let active = true;
    decisionApi.currentUser()
      .then(async (currentUser) => {
        if (!active) return;
        setUser(currentUser);
        if (currentUser.isAdmin) {
          setView('admin');
          setLoadFailed(false);
          return;
        }

        const dashboard = await decisionApi.dashboard();
        if (!active) return;
        const { stats: dashboardStats, ...decisionData } = dashboard;
        dataRef.current = decisionData;
        setData(decisionData);
        setStats(dashboardStats);
        setHistoryLastPage(Math.max(1, Math.ceil(dashboardStats.decisions / 100)));
        setSelectedCategoryId(dashboard.categories[0]?.id ?? '');
        setLoadFailed(false);
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof Error && 'status' in error && error.status === 401) {
          window.location.assign('/login');
          return;
        }
        setLoadFailed(true);
        setNotice({ kind: 'error', message: getApiErrorMessage(error) });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
  }, []);

  const categoryMap = useMemo(() => new Map(data.categories.map((item) => [item.id, item])), [data.categories]);
  const selectedCategory = categoryMap.get(selectedCategoryId) ?? data.categories[0] ?? null;
  const matchingOptions = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return sortOptions(data.options.filter((option) => {
      const category = categoryMap.get(option.categoryId);
      if (categoryFilter !== 'all' && option.categoryId !== categoryFilter) return false;
      if (!term) return true;
      return option.name.toLocaleLowerCase().includes(term)
        || option.description.toLocaleLowerCase().includes(term)
        || (category?.name.toLocaleLowerCase().includes(term) ?? false);
    }), sortOrder);
  }, [categoryFilter, categoryMap, data.options, search, sortOrder]);
  const matchingFavorites = matchingOptions.filter((option) => option.isFavorite);

  const announce = (message: string, kind: NonNullable<Notice>['kind'] = 'success') => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    setNotice({ kind, message });
    noticeTimer.current = setTimeout(() => setNotice(null), 3600);
  };

  useEffect(() => {
    setHistoryLastPage(Math.max(1, Math.ceil(stats.decisions / 100)));
  }, [stats.decisions]);

  useEffect(() => {
    if (view !== 'admin' || !user) return;
    if (!user.isAdmin) {
      window.location.replace('/decide');
      return;
    }

    let active = true;
    setAdminUsersLoading(true);
    setAdminUsersError('');
    decisionApi.adminUsers(adminSearch, adminPage)
      .then((page) => {
        if (!active) return;
        setAdminUsers(page.data);
        setAdminLastPage(page.meta.lastPage);
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof ApiError && error.status === 403) {
          window.location.replace('/decide');
          return;
        }
        setAdminUsersError(getApiErrorMessage(error));
      })
      .finally(() => {
        if (active) setAdminUsersLoading(false);
      });

    return () => {
      active = false;
    };
  }, [adminPage, adminSearch, adminRetryKey, user, view]);

  const updateData = (update: (current: DecisionData) => DecisionData) => {
    const next = update(dataRef.current);
    dataRef.current = next;
    setData(next);
  };

  const retryLoad = async () => {
    setLoading(true);
    setNotice(null);
    try {
      const currentUser = await decisionApi.currentUser();
      setUser(currentUser);
      if (currentUser.isAdmin) {
        setView('admin');
        setLoadFailed(false);
        setNotice(null);
        return;
      }

      const dashboard = await decisionApi.dashboard();
      const { stats: dashboardStats, ...decisionData } = dashboard;
      dataRef.current = decisionData;
      setData(decisionData);
      setStats(dashboardStats);
      setHistoryLastPage(Math.max(1, Math.ceil(dashboardStats.decisions / 100)));
      setSelectedCategoryId((current) => current || dashboard.categories[0]?.id || '');
      setLoadFailed(false);
    } catch (error) {
      if (error instanceof Error && 'status' in error && error.status === 401) {
        window.location.assign('/login');
        return;
      }
      setLoadFailed(true);
      setNotice({ kind: 'error', message: getApiErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  };

  const submitEditor = async (name: string, description: string, categoryId: string): Promise<string | null> => {
    try {
      if (editor?.type === 'category') {
        const saved = editor.id
          ? await decisionApi.updateCategory(editor.id, name.trim(), description.trim())
          : await decisionApi.createCategory(name.trim(), description.trim());
        updateData((current) => ({
          ...current,
          categories: editor.id
            ? current.categories.map((item) => item.id === saved.id ? saved : item)
            : [...current.categories, saved],
        }));
        setStats((current) => ({ ...current, categories: editor.id ? current.categories : current.categories + 1 }));
        setSelectedCategoryId(saved.id);
        announce(editor.id ? 'Category updated.' : 'Category created.');
      } else {
        const saved = editor?.id
          ? await decisionApi.updateOption(editor.id, categoryId, name.trim(), description.trim())
          : await decisionApi.createOption(categoryId, name.trim(), description.trim());
        updateData((current) => ({
          ...current,
          options: editor?.id
            ? current.options.map((item) => item.id === saved.id ? saved : item)
            : [saved, ...current.options],
        }));
        setStats((current) => ({ ...current, options: editor?.id ? current.options : current.options + 1 }));
        announce(editor?.id ? 'Option updated.' : 'Option added.');
      }
      return null;
    } catch (error) {
      return getApiErrorMessage(error);
    }
  };

  const deleteCategory = async (category: DecisionCategory) => {
    const categoryOptions = data.options.filter((option) => option.categoryId === category.id);
    const optionCount = categoryOptions.length;
    const favoriteCount = categoryOptions.filter((option) => option.isFavorite).length;
    if (!window.confirm(`Delete “${category.name}” and its ${optionCount} ${optionCount === 1 ? 'option' : 'options'}? This cannot be undone.`)) return;
    try {
      await decisionApi.deleteCategory(category.id);
      updateData((current) => ({
        ...current,
        categories: current.categories.filter((item) => item.id !== category.id),
        options: current.options.filter((item) => item.categoryId !== category.id),
      }));
      setStats((current) => ({
        ...current,
        categories: Math.max(0, current.categories - 1),
        options: Math.max(0, current.options - optionCount),
        favorites: Math.max(0, current.favorites - favoriteCount),
      }));
      if (selectedCategoryId === category.id) setSelectedCategoryId(data.categories.find((item) => item.id !== category.id)?.id ?? '');
      announce(`“${category.name}” was deleted.`);
    } catch (error) {
      announce(getApiErrorMessage(error), 'error');
    }
  };

  const deleteOption = async (option: DecisionOption) => {
    if (!window.confirm(`Delete “${option.name}”? This cannot be undone.`)) return;
    try {
      await decisionApi.deleteOption(option.id);
      updateData((current) => ({ ...current, options: current.options.filter((item) => item.id !== option.id) }));
      setStats((current) => ({
        ...current,
        options: Math.max(0, current.options - 1),
        favorites: Math.max(0, current.favorites - Number(option.isFavorite)),
      }));
      if (resultOption?.id === option.id) {
        setResultOption(null);
        setResultHistoryId('');
      }
      announce(`“${option.name}” was deleted.`);
    } catch (error) {
      announce(getApiErrorMessage(error), 'error');
    }
  };

  const toggleOptionFlag = async (option: DecisionOption, flag: 'isFavorite' | 'isExcluded') => {
    const currentValue = option[flag];
    try {
      const saved = await decisionApi.setOptionFlag(option.id, flag, !currentValue);
      updateData((current) => ({ ...current, options: current.options.map((item) => item.id === saved.id ? saved : item) }));
      if (flag === 'isFavorite') {
        setStats((current) => ({ ...current, favorites: current.favorites + (currentValue ? -1 : 1) }));
      }
      announce(flag === 'isFavorite'
        ? currentValue ? 'Removed from favorites.' : 'Added to favorites.'
        : currentValue ? 'Option included in future decisions.' : 'Option excluded from future decisions.');
    } catch (error) {
      announce(getApiErrorMessage(error), 'error');
    }
  };

  const requestAiReason = async (historyId: string, context: string) => {
    setReasonLoadingId(historyId);
    setReasonError(null);
    try {
      const saved = await decisionApi.explainDecision(historyId, context);
      updateData((current) => ({
        ...current,
        history: current.history.map((entry) => entry.id === saved.id ? saved : entry),
      }));
    } catch (error) {
      const message = error instanceof ApiError && error.status >= 500
        ? error.message
        : getApiErrorMessage(error);
      setReasonError({ id: historyId, message });
    } finally {
      setReasonLoadingId((current) => current === historyId ? '' : current);
    }
  };

  const startDecision = (sourceOptions: DecisionOption[], category: DecisionCategory | null, onlyFavorites = false) => {
    if (spinning) return;
    const eligible = sourceOptions.filter((option) => !option.isExcluded && (!onlyFavorites || option.isFavorite));
    if (!eligible.length) {
      announce(onlyFavorites
        ? 'No available favorites yet. Add options to your favorites first.'
        : 'No options are available. Add options or include an excluded option to continue.', 'info');
      return;
    }
    setView('decide');
    setFavoritesOnly(onlyFavorites);
    setResultOption(null);
    setResultHistoryId('');
    setChoosingAnother(false);
    setReasonLoadingId('');
    setReasonError(null);
    setSpinning(true);
    setLastDecisionMessage('');
    timer.current = setTimeout(() => {
      void decisionApi.randomDecision(category?.id ?? null, onlyFavorites)
        .then(({ option, history }) => {
          updateData((current) => ({
            ...current,
            options: current.options.map((item) => item.id === option.id ? option : item),
            history: [history, ...current.history],
          }));
          setStats((current) => ({ ...current, decisions: current.decisions + 1 }));
          setHistoryLastPage(Math.max(1, Math.ceil((stats.decisions + 1) / 100)));
          setResultOption(option);
          setResultHistoryId(history.id);
          setSpinning(false);
          setLastDecisionMessage(onlyFavorites ? 'Picked from your favorites.' : `Picked from ${category?.name ?? 'your options'}.`);
          void requestAiReason(history.id, situation.trim());
        })
        .catch((error: unknown) => {
          setSpinning(false);
          const message = error instanceof Error && 'status' in error && error.status === 422
            ? onlyFavorites ? 'No available favorites right now.' : 'No options are available for this category.'
            : getApiErrorMessage(error);
          announce(message, 'info');
        });
    }, 850);
  };

  const chooseAlternative = async (option: DecisionOption) => {
    if (!resultHistoryId || replacingDecision) return;
    setReplacingDecision(true);
    try {
      const { option: savedOption, history, replacedHistory } = await decisionApi.replaceDecision(
        resultHistoryId,
        option.id,
        favoritesOnly,
      );
      updateData((current) => ({
        ...current,
        options: current.options.map((item) => item.id === savedOption.id ? savedOption : item),
        history: [history, ...current.history.map((item) => item.id === replacedHistory.id ? replacedHistory : item)],
      }));
      setStats((current) => ({ ...current, decisions: current.decisions + 1 }));
      setResultOption(savedOption);
      setResultHistoryId(history.id);
      setChoosingAnother(false);
      setLastDecisionMessage('You chose another option.');
      setReasonError(null);
      void requestAiReason(history.id, situation.trim());
    } catch (error) {
      announce(getApiErrorMessage(error), 'error');
    } finally {
      setReplacingDecision(false);
    }
  };

  const setHistoryStatus = async (id: string, status: DecisionStatus) => {
    if (updatingHistory?.id === id) return;
    setUpdatingHistory({ id, status });
    try {
      const saved = await decisionApi.updateHistoryStatus(id, status);
      updateData((current) => ({ ...current, history: current.history.map((item) => item.id === id ? saved : item) }));
      if (resultHistoryId === id) announce(status === 'completed' ? 'Decision marked as completed.' : 'Decision marked as skipped.');
    } catch (error) {
      announce(getApiErrorMessage(error), 'error');
    } finally {
      setUpdatingHistory((current) => current?.id === id ? null : current);
    }
  };

  const setAdminUserActive = async (target: AdminUser) => {
    const nextActive = !target.isActive;
    const action = nextActive ? 'reactivate' : 'deactivate';
    if (!window.confirm(`Are you sure you want to ${action} ${target.name}'s account?`)) return;

    setUpdatingAdminUserId(target.id);
    try {
      const saved = await decisionApi.setAdminUserActive(target.id, nextActive);
      setAdminUsers((current) => current.map((item) => item.id === saved.id ? saved : item));
      announce(`${saved.name}'s account was ${nextActive ? 'reactivated' : 'deactivated'}.`);
    } catch (error) {
      announce(getApiErrorMessage(error), 'error');
    } finally {
      setUpdatingAdminUserId((current) => current === target.id ? null : current);
    }
  };

  const removeHistoryEntry = async (id: string) => {
    try {
      await decisionApi.deleteHistory(id);
      updateData((current) => ({ ...current, history: current.history.filter((item) => item.id !== id) }));
      if (resultHistoryId === id) {
        setResultHistoryId('');
        setResultOption(null);
      }
      setStats((current) => ({ ...current, decisions: Math.max(0, current.decisions - 1) }));
      setHistoryLastPage(Math.max(1, Math.ceil((stats.decisions - 1) / 100)));
      announce('History entry removed.');
    } catch (error) {
      announce(getApiErrorMessage(error), 'error');
    }
  };

  const clearHistory = async () => {
    try {
      await decisionApi.clearHistory();
      updateData((current) => ({ ...current, history: [] }));
      setStats((current) => ({ ...current, decisions: 0 }));
      setHistoryPage(1);
      setHistoryLastPage(1);
      setResultHistoryId('');
      setResultOption(null);
      announce('Decision history cleared.');
    } catch (error) {
      announce(getApiErrorMessage(error), 'error');
    }
  };

  const loadMoreHistory = async () => {
    if (loadingHistory || historyPage >= historyLastPage) return;
    setLoadingHistory(true);
    try {
      const page = await decisionApi.historyPage(historyPage + 1);
      updateData((current) => {
        const knownIds = new Set(current.history.map((entry) => entry.id));
        return { ...current, history: [...current.history, ...page.data.filter((entry) => !knownIds.has(entry.id))] };
      });
      setHistoryPage(page.meta.currentPage);
      setHistoryLastPage(page.meta.lastPage);
      setStats((current) => ({ ...current, decisions: page.meta.total }));
    } catch (error) {
      announce(getApiErrorMessage(error), 'error');
    } finally {
      setLoadingHistory(false);
    }
  };

  const logout = async () => {
    try {
      await decisionApi.logout();
      window.location.assign('/login');
    } catch (error) {
      announce(getApiErrorMessage(error), 'error');
    }
  };

  const activeOptions = selectedCategory
    ? sortOptions(data.options.filter((option) => option.categoryId === selectedCategory.id), sortOrder)
    : [];
  const eligibleActiveOptions = activeOptions.filter((option) => !option.isExcluded);
  const title = navigation.find((item) => item.id === view)?.label ?? 'Overview';
  const searchPlaceholder = view === 'categories' ? 'Search categories…' : view === 'favorites' ? 'Search favorites…' : 'Search options…';

  const goToDecision = () => {
    setView('decide');
    setFavoritesOnly(false);
    setResultOption(null);
    setResultHistoryId('');
  };

  const renderSearchTools = (categorySelect = true) => (
    <div className="dfm-dash-toolbar">
      <label className="dfm-dash-search">
        <Search size={16} />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={searchPlaceholder} />
        {search && <button type="button" aria-label="Clear search" onClick={() => setSearch('')}><X size={15} /></button>}
      </label>
      {categorySelect && (
        <label className="dfm-dash-filter">
          <span className="dfm-sr-only">Filter by category</span>
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            <option value="all">All categories</option>
            {data.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
          <ChevronDown size={15} />
        </label>
      )}
      <label className="dfm-dash-filter">
        <span className="dfm-sr-only">Sort options</span>
        <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as SortOrder)}>
          <option value="recent">Recently added</option>
          <option value="alphabetical">Alphabetical</option>
        </select>
        <ChevronDown size={15} />
      </label>
    </div>
  );

  const renderOptionRows = (options: DecisionOption[], showCategory = true) => options.map((option) => (
    <OptionRow
      key={option.id}
      option={option}
      categoryName={categoryMap.get(option.categoryId)?.name ?? 'Uncategorized'}
      showCategory={showCategory}
      onEdit={() => setEditor({ type: 'option', id: option.id, categoryId: option.categoryId })}
      onDelete={() => deleteOption(option)}
      onFavorite={() => toggleOptionFlag(option, 'isFavorite')}
      onExclude={view === 'decide' ? () => toggleOptionFlag(option, 'isExcluded') : undefined}
    />
  ));

  const renderHistoryRows = data.history.slice(0, 6).map((entry) => (
    <article className="dfm-dash-history-row" key={entry.id}>
      <span className="dfm-dash-history-icon"><Clock3 size={15} /></span>
      <div className="dfm-dash-history-copy"><strong>{entry.selectedOptionName}</strong><span>{entry.categoryName} · {formatDate(entry.createdAt, true)}</span>{entry.aiReason && <span className="dfm-dash-history-reason">{entry.aiReason}</span>}</div>
      <span className={`dfm-status dfm-status-${entry.status}`}>{entry.status}</span>
      {entry.status === 'pending' && (
        <div className="dfm-dash-history-actions">
          <button type="button" onClick={() => setHistoryStatus(entry.id, 'completed')} aria-label={`Mark ${entry.selectedOptionName} completed`} title="Mark completed"><Check size={15} /></button>
          <button type="button" onClick={() => setHistoryStatus(entry.id, 'skipped')} aria-label={`Mark ${entry.selectedOptionName} skipped`} title="Mark skipped"><ArrowDownRight size={15} /></button>
        </div>
      )}
    </article>
  ));

  return (
    <main className="dfm-dashboard">
      <aside className="dfm-dashboard-sidebar">
        <div className="dfm-dashboard-brand"><Brand /><span>{user?.isAdmin ? 'ACCOUNT ADMINISTRATION' : 'YOUR DECISION SPACE'}</span></div>
        <nav className="dfm-dashboard-nav" aria-label="Application navigation">
          <span className="dfm-dashboard-nav-label">{user?.isAdmin ? 'ADMINISTRATION' : 'WORKSPACE'}</span>
          {navigation.filter(({ id }) => user?.isAdmin ? id === 'admin' : id !== 'admin').map(({ id, label, icon: Icon }) => (
            <button type="button" key={id} className={view === id ? 'is-active' : ''} onClick={() => setView(id)} aria-current={view === id ? 'page' : undefined}>
              <Icon size={17} strokeWidth={1.7} /><span>{label}</span>
              {id === 'favorites' && stats.favorites > 0 && <i>{stats.favorites}</i>}
            </button>
          ))}
        </nav>
        <div className="dfm-dashboard-sidebar-bottom">
          <div className="dfm-storage-note"><span><CheckCircle2 size={14} /></span><p>{user?.isAdmin ? 'Manage account access while keeping users’ decision data private.' : 'Your choices are saved to your private account and ready on your next visit.'}</p></div>
          <a href="/home" className="dfm-dashboard-back"><ArrowLeft size={15} /> Back to the site</a>
          <button type="button" className="dfm-dashboard-back dfm-dashboard-logout" onClick={logout}>Sign out</button>
        </div>
      </aside>

      <section className="dfm-dashboard-main">
        <header className="dfm-dashboard-header">
          <div className="dfm-dashboard-breadcrumb"><span>DECIDE FOR ME</span><span>/</span><strong>{title.toUpperCase()}</strong></div>
          <div className="dfm-dashboard-header-right"><span className="dfm-dash-ready"><i /> SYNCED TO ACCOUNT</span><span className="dfm-dashboard-user">{user?.name}</span><Brand /></div>
        </header>
        <div className="dfm-dashboard-content">
          {notice && (
            <div className={`dfm-dash-notice dfm-dash-notice-${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}>
              {notice.kind === 'success' ? <CheckCircle2 size={16} /> : notice.kind === 'error' ? <Ban size={16} /> : <Sparkles size={16} />}
              <span>{notice.message}</span>
              <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss notification"><X size={15} /></button>
            </div>
          )}

          {loading && <div className="dfm-dash-loading" role="status"><span /> Loading your decision space…</div>}
          {!loading && loadFailed && (
            <div className="dfm-dash-load-error" role="alert">
              <span>We couldn’t load your account. Your data is still safe.</span>
              <button type="button" className="dfm-dash-button dfm-dash-button-dark" onClick={() => void retryLoad()}>Try again</button>
            </div>
          )}

          {!loading && view === 'overview' && (
            <>
              <div className="dfm-dashboard-welcome">
                <div><div className="dfm-kicker"><i /> A LITTLE LESS OVERTHINKING</div><h1>Your decision<br />space.</h1><p>Keep your options close. Pick something and get on with your day.</p></div>
                <button type="button" className="dfm-dash-button dfm-dash-button-dark" onClick={goToDecision}>Make a decision <ArrowUpRight size={16} /></button>
              </div>
              <div className="dfm-dash-stats">
                <article><span>CATEGORIES</span><strong>{stats.categories.toString().padStart(2, '0')}</strong><i><Shapes size={15} /></i></article>
                <article><span>TOTAL OPTIONS</span><strong>{stats.options.toString().padStart(2, '0')}</strong><i><ListChecks size={15} /></i></article>
                <article><span>DECISIONS MADE</span><strong>{stats.decisions.toString().padStart(2, '0')}</strong><i><History size={15} /></i></article>
                <article><span>FAVORITES</span><strong>{stats.favorites.toString().padStart(2, '0')}</strong><i><Heart size={15} /></i></article>
              </div>
              <div className="dfm-dashboard-overview-grid">
                <section className="dfm-dash-panel">
                  <div className="dfm-dash-panel-head"><div><span className="dfm-dash-eyebrow">YOUR COLLECTION</span><h2>Categories</h2></div><button type="button" className="dfm-dash-link" onClick={() => setView('categories')}>View all <ArrowRight size={15} /></button></div>
                  {data.categories.length ? (
                    <div className="dfm-dash-category-list">
                      {data.categories.slice(0, 5).map((category, index) => {
                        const count = data.options.filter((option) => option.categoryId === category.id).length;
                        return <button type="button" className="dfm-dash-category-line" key={category.id} onClick={() => { setSelectedCategoryId(category.id); setView('decide'); }}>
                          <span className={`dfm-dash-category-mark mark-${index % 4}`}><Shapes size={16} /></span>
                          <span className="dfm-dash-category-copy"><strong>{category.name}</strong><small>{category.description || 'A little room for choices'}</small></span>
                          <span className="dfm-dash-category-count">{count.toString().padStart(2, '0')} <ArrowUpRight size={13} /></span>
                        </button>;
                      })}
                    </div>
                  ) : <EmptyState title="A fresh start" copy="Create a category to start gathering choices." action="Create category" onAction={() => setEditor({ type: 'category' })} />}
                </section>
                <section className="dfm-dash-panel dfm-dash-recent-panel">
                  <div className="dfm-dash-panel-head"><div><span className="dfm-dash-eyebrow">A LOOK BACK</span><h2>Recent decisions</h2></div><button type="button" className="dfm-dash-link" onClick={() => setView('history')}>History <ArrowRight size={15} /></button></div>
                  {renderHistoryRows.length ? <div className="dfm-dash-history-list">{renderHistoryRows.slice(0, 4)}</div> : <EmptyState title="Nothing picked yet" copy="Your decisions will find a home here when you start choosing." action="Make a decision" onAction={goToDecision} />}
                </section>
              </div>
              <section className="dfm-dash-quick-actions">
                <span className="dfm-dash-eyebrow">A QUICK NEXT STEP</span>
                <button type="button" onClick={() => setEditor({ type: 'category' })}><FolderPlus size={17} /> Create category <ArrowUpRight size={14} /></button>
                <button type="button" onClick={() => data.categories.length ? setEditor({ type: 'option', categoryId: selectedCategory?.id }) : announce('Create a category before adding options.', 'info')}><Plus size={17} /> Add an option <ArrowUpRight size={14} /></button>
                <button type="button" onClick={goToDecision}><Shuffle size={17} /> Start choosing <ArrowUpRight size={14} /></button>
              </section>
            </>
          )}

          {!loading && view === 'admin' && user?.isAdmin && (
            <section className="dfm-dash-page">
              <div className="dfm-dash-page-heading">
                <div><div className="dfm-kicker"><i /> ADMINISTRATION</div><h1>User accounts<span>.</span></h1><p>View accounts and control access. Personal decision data is not shown here.</p></div>
              </div>
              <section className="dfm-dash-panel dfm-admin-users-panel">
                <div className="dfm-dash-panel-head">
                  <div><span className="dfm-dash-eyebrow">ACCOUNT ACCESS</span><h2>Registered users</h2></div>
                  <span className="dfm-admin-users-count">{adminUsersLoading ? 'Loading…' : `${adminUsers.length} shown`}</span>
                </div>
                <form className="dfm-dash-toolbar dfm-admin-search" onSubmit={(event) => {
                  event.preventDefault();
                  setAdminPage(1);
                  setAdminSearch(adminSearchInput.trim());
                }}>
                  <label className="dfm-dash-search">
                    <Search size={16} />
                    <input value={adminSearchInput} onChange={(event) => setAdminSearchInput(event.target.value)} placeholder="Search name or email…" />
                  </label>
                  <button type="submit" className="dfm-dash-button dfm-dash-button-dark">Search</button>
                </form>
                {adminUsersLoading ? (
                  <div className="dfm-dash-loading" role="status"><span /> Loading user accounts…</div>
                ) : adminUsersError ? (
                  <div className="dfm-dash-load-error" role="alert">
                    <span>{adminUsersError}</span>
                    <button type="button" className="dfm-dash-button dfm-dash-button-dark" onClick={() => setAdminRetryKey((current) => current + 1)}>Try again</button>
                  </div>
                ) : adminUsers.length ? (
                  <>
                    <div className="dfm-admin-user-list" aria-label="Registered user accounts">
                      {adminUsers.map((target) => (
                        <article className="dfm-admin-user-row" key={target.id}>
                          <div className="dfm-admin-user-identity"><strong>{target.name}</strong><span>{target.email}</span></div>
                          <span className={`dfm-admin-role dfm-admin-role-${target.role}`}>{target.role}</span>
                          <span className={`dfm-admin-account-status${target.isActive ? ' is-active' : ''}`}>{target.isActive ? 'Active' : 'Deactivated'}</span>
                          <span className="dfm-admin-user-date">Joined {formatDate(target.createdAt)}</span>
                          {target.role === 'user' ? (
                            <button
                              type="button"
                              className={`dfm-dash-button ${target.isActive ? 'dfm-dash-button-quiet' : 'dfm-dash-button-dark'}`}
                              disabled={updatingAdminUserId === target.id}
                              onClick={() => void setAdminUserActive(target)}
                            >{updatingAdminUserId === target.id ? 'Saving…' : target.isActive ? 'Deactivate' : 'Reactivate'}</button>
                          ) : <span className="dfm-admin-protected-note">Protected</span>}
                        </article>
                      ))}
                    </div>
                    <div className="dfm-admin-pagination">
                      <span>Page {adminPage} of {adminLastPage}</span>
                      <div>
                        <button type="button" className="dfm-dash-button dfm-dash-button-quiet" disabled={adminPage <= 1 || adminUsersLoading} onClick={() => setAdminPage((page) => Math.max(1, page - 1))}>Previous</button>
                        <button type="button" className="dfm-dash-button dfm-dash-button-quiet" disabled={adminPage >= adminLastPage || adminUsersLoading} onClick={() => setAdminPage((page) => Math.min(adminLastPage, page + 1))}>Next</button>
                      </div>
                    </div>
                  </>
                ) : (
                  <EmptyState title="No accounts found" copy={adminSearch ? 'Try another name or email address.' : 'No user accounts have been registered yet.'} />
                )}
              </section>
            </section>
          )}

          {!loading && view === 'categories' && (
            <section className="dfm-dash-page">
              <div className="dfm-dash-page-heading"><div><div className="dfm-kicker"><i /> YOUR CHOICES, IN ORDER</div><h1>Categories<span>.</span></h1><p>Group your options around the choices you make most.</p></div><button type="button" className="dfm-dash-button dfm-dash-button-dark" onClick={() => setEditor({ type: 'category' })}><Plus size={16} /> New category</button></div>
              {renderSearchTools(false)}
              {data.categories.length ? (
                <div className="dfm-dash-category-grid">
                  {data.categories.filter((category) => category.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()) || category.description.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
                    .sort((a, b) => sortOrder === 'alphabetical' ? a.name.localeCompare(b.name) : b.createdAt.localeCompare(a.createdAt))
                    .map((category, index) => {
                      const count = data.options.filter((option) => option.categoryId === category.id).length;
                      return <article className="dfm-dash-category-card" key={category.id}>
                        <div className="dfm-dash-category-card-top"><span className={`dfm-dash-category-mark mark-${index % 4}`}><Shapes size={17} /></span><div><button type="button" className="dfm-icon-button" onClick={() => setEditor({ type: 'category', id: category.id })} aria-label={`Edit ${category.name}`}><span className="dfm-edit-glyph">↗</span></button><button type="button" className="dfm-icon-button dfm-danger-icon" onClick={() => deleteCategory(category)} aria-label={`Delete ${category.name}`}><Trash2 size={15} /></button></div></div>
                        <h2>{category.name}</h2><p>{category.description || 'A place for your options.'}</p>
                        <div className="dfm-dash-category-card-bottom"><span>{count} {count === 1 ? 'option' : 'options'}</span><button type="button" onClick={() => { setSelectedCategoryId(category.id); setView('decide'); }}>Choose from these <ArrowRight size={14} /></button></div>
                      </article>;
                    })}
                </div>
              ) : <EmptyState title="No categories found" copy={search ? 'Try another search or clear the filter.' : 'Create your first category to start collecting options.'} action={search ? undefined : 'Create category'} onAction={search ? undefined : () => setEditor({ type: 'category' })} />}
              {data.categories.length > 0 && !data.categories.some((category) => category.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()) || category.description.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())) && <EmptyState title="No matching categories" copy="Try a different search." />}
            </section>
          )}

          {!loading && view === 'options' && (
            <section className="dfm-dash-page">
              <div className="dfm-dash-page-heading"><div><div className="dfm-kicker"><i /> EVERY POSSIBILITY, AT A GLANCE</div><h1>All options<span>.</span></h1><p>{data.options.length} options across {data.categories.length} categories.</p></div><button type="button" className="dfm-dash-button dfm-dash-button-dark" onClick={() => data.categories.length ? setEditor({ type: 'option', categoryId: selectedCategory?.id }) : setEditor({ type: 'category' })}><Plus size={16} /> Add option</button></div>
              {renderSearchTools()}
              {matchingOptions.length ? <div className="dfm-dash-option-list">{renderOptionRows(matchingOptions)}</div> : <EmptyState title={search || categoryFilter !== 'all' ? 'No matching options' : 'No options yet'} copy={search || categoryFilter !== 'all' ? 'Try a different search or category.' : 'Add your first option to get started.'} action={search || categoryFilter !== 'all' ? undefined : 'Add an option'} onAction={search || categoryFilter !== 'all' ? undefined : () => setEditor({ type: 'option', categoryId: selectedCategory?.id })} />}
            </section>
          )}

          {!loading && view === 'favorites' && (
            <section className="dfm-dash-page">
              <div className="dfm-dash-page-heading"><div><div className="dfm-kicker"><i /> THE ONES YOU LOVE</div><h1>Favorites<span>.</span></h1><p>Your go-to options, ready whenever you need a nudge.</p></div><button type="button" className="dfm-dash-button dfm-dash-button-lime" onClick={() => startDecision(data.options, null, true)} disabled={!data.options.some((option) => option.isFavorite && !option.isExcluded)}><Shuffle size={16} /> Pick a favorite</button></div>
              {renderSearchTools()}
              {matchingFavorites.length ? <div className="dfm-dash-option-list">{renderOptionRows(matchingFavorites)}</div> : <EmptyState title={search || categoryFilter !== 'all' ? 'No matching favorites' : 'Nothing saved just yet'} copy={search || categoryFilter !== 'all' ? 'Try a different search or category.' : 'Tap the heart on any option to keep it close.'} action={search || categoryFilter !== 'all' ? undefined : 'Browse options'} onAction={search || categoryFilter !== 'all' ? undefined : () => setView('options')} />}
            </section>
          )}

          {!loading && view === 'history' && (
            <section className="dfm-dash-page">
              <div className="dfm-dash-page-heading"><div><div className="dfm-kicker"><i /> ALL THE LITTLE CALLS</div><h1>History<span>.</span></h1><p>Every choice you’ve made along the way.</p></div>{data.history.length > 0 && <button type="button" className="dfm-dash-button dfm-dash-button-quiet dfm-clear-history" onClick={() => {
                if (!window.confirm('Clear your entire decision history? This cannot be undone.')) return;
                void clearHistory();
              }}><Trash2 size={15} /> Clear history</button>}</div>
              {data.history.length ? <div className="dfm-dash-panel dfm-dash-history-page"><div className="dfm-dash-panel-head"><div><span className="dfm-dash-eyebrow">YOUR DECISIONS</span><h2>{stats.decisions} {stats.decisions === 1 ? 'decision' : 'decisions'}</h2></div><span className="dfm-dash-history-sort">Newest first <ChevronDown size={14} /></span></div>
                <div className="dfm-dash-history-list">{data.history.map((entry) => (
                  <article className="dfm-dash-history-row" key={entry.id}>
                    <span className="dfm-dash-history-icon"><Clock3 size={15} /></span>
                    <div className="dfm-dash-history-copy"><strong>{entry.selectedOptionName}</strong><span>{entry.categoryName} · {formatDate(entry.createdAt, true)}</span>{entry.aiReason && <span className="dfm-dash-history-reason">{entry.aiReason}</span>}</div>
                    <span className={`dfm-status dfm-status-${entry.status}`}>{entry.status}</span>
                    {entry.status === 'pending' && <div className="dfm-dash-history-actions"><button type="button" onClick={() => setHistoryStatus(entry.id, 'completed')} aria-label={`Mark ${entry.selectedOptionName} completed`} title="Mark completed"><Check size={15} /></button><button type="button" onClick={() => setHistoryStatus(entry.id, 'skipped')} aria-label={`Mark ${entry.selectedOptionName} skipped`} title="Mark skipped"><ArrowDownRight size={15} /></button></div>}
                    <button type="button" className="dfm-icon-button dfm-danger-icon" onClick={() => {
                      if (!window.confirm(`Remove the decision “${entry.selectedOptionName}” from history?`)) return;
                      void removeHistoryEntry(entry.id);
                    }} aria-label={`Delete history entry ${entry.selectedOptionName}`} title="Remove from history"><Trash2 size={15} /></button>
                  </article>
                ))}</div>
                {historyPage < historyLastPage && <button type="button" className="dfm-dash-button dfm-dash-button-quiet" onClick={() => void loadMoreHistory()} disabled={loadingHistory}>{loadingHistory ? 'Loading…' : 'Load older decisions'} <ArrowDownRight size={15} /></button>}
              </div> : <EmptyState title="A clean slate" copy="Once you make a decision, you’ll find it here." action="Make a decision" onAction={goToDecision} />}
            </section>
          )}

          {!loading && view === 'decide' && (
            <section className="dfm-dash-page dfm-decide-page">
              <div className="dfm-dash-page-heading"><div><div className="dfm-kicker"><i /> TAKE THE NEXT STEP</div><h1>Let’s decide<span>.</span></h1><p>Pick a category, set aside anything that doesn’t fit, and we’ll make the call.</p></div></div>
              <div className="dfm-decision-workspace">
                <div className="dfm-decision-workspace-top">
                  <div><span className="dfm-dash-eyebrow">YOUR OPTIONS</span><h2>What are we choosing?</h2></div>
                  <button type="button" className={`dfm-favorite-mode${favoritesOnly ? ' is-active' : ''}`} onClick={() => {
                    if (!data.options.some((option) => option.isFavorite && !option.isExcluded)) {
                      announce('No available favorites yet. Add options to your favorites first.', 'info');
                      return;
                    }
                    startDecision(data.options, null, true);
                  }} disabled={spinning}><Heart size={14} fill={favoritesOnly ? 'currentColor' : 'none'} /> Pick from favorites</button>
                </div>
                <label className="dfm-dash-eyebrow dfm-decision-category-label" htmlFor="dfm-decision-category">CATEGORY</label>
                <div className="dfm-dash-select-wrap dfm-decision-category-select">
                  <select id="dfm-decision-category" value={selectedCategory?.id ?? ''} disabled={spinning} onChange={(event) => {
                    setSelectedCategoryId(event.target.value);
                    setFavoritesOnly(false);
                    setResultOption(null);
                    setResultHistoryId('');
                  }}>
                    {data.categories.length ? data.categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>) : <option value="">No categories yet</option>}
                  </select><ChevronDown size={16} />
                </div>
                {favoritesOnly && <div className="dfm-dash-favorites-banner"><Heart size={15} fill="currentColor" /> Choosing from all available favorites, across categories.</div>}
                {!favoritesOnly && selectedCategory && (
                  <div className="dfm-dash-decision-list">
                    <div className="dfm-dash-decision-list-head"><span>{activeOptions.length} {activeOptions.length === 1 ? 'option' : 'options'}</span><span><Ban size={13} /> Tap the ban to exclude</span></div>
                    {activeOptions.length ? activeOptions.map((option, index) => (
                      <div className={`dfm-dash-decision-option${option.isExcluded ? ' is-excluded' : ''}`} key={option.id}>
                        <span className={`dfm-choice-number dfm-choice-number-${(index % 3) + 1}`}>0{index + 1}</span><span className="dfm-dash-decision-option-name">{option.name}</span>
                        {option.isFavorite && <Heart size={14} className="dfm-inline-favorite" fill="currentColor" />}
                        {option.isExcluded && <span className="dfm-excluded-label">EXCLUDED</span>}
                        <button type="button" className={`dfm-icon-button${option.isExcluded ? ' is-active' : ''}`} disabled={spinning} onClick={() => toggleOptionFlag(option, 'isExcluded')} aria-label={option.isExcluded ? `Include ${option.name}` : `Exclude ${option.name}`} title={option.isExcluded ? 'Include option' : 'Exclude option'}><Ban size={15} /></button>
                      </div>
                    )) : <EmptyState title="This category is empty" copy="Add a few options to give your decision somewhere to start." action="Add an option" onAction={() => setEditor({ type: 'option', categoryId: selectedCategory.id })} />}
                    {activeOptions.length > 0 && eligibleActiveOptions.length === 0 && <p className="dfm-dash-empty-inline">Everything is excluded. Include at least one option to make a decision.</p>}
                  </div>
                )}
                <div className="dfm-dash-situation-field">
                  <label htmlFor="dfm-decision-situation">A little context <span>OPTIONAL</span></label>
                  <textarea
                    id="dfm-decision-situation"
                    rows={2}
                    maxLength={300}
                    value={situation}
                    onChange={(event) => setSituation(event.target.value)}
                    placeholder="e.g. I want something easy after a long day"
                  />
                  <small>Pick for me draws randomly. You can also choose a different option yourself. Gemini uses this context to write a short perspective; it is sent to Google and not stored.</small>
                </div>
                {!data.categories.length && <EmptyState title="Start with a category" copy="Create a category before adding options and making your first decision." action="Create category" onAction={() => setEditor({ type: 'category' })} />}
                {spinning ? <div className="dfm-app-thinking dfm-dashboard-thinking" role="status"><span /><span /><span /> We’re giving it a little thought…</div> : (
                  <button type="button" className="dfm-dash-run-button" disabled={!favoritesOnly && (!selectedCategory || eligibleActiveOptions.length === 0)} onClick={() => startDecision(favoritesOnly ? data.options : activeOptions, selectedCategory, favoritesOnly)}><Shuffle size={17} /> Pick for me <ArrowRight size={17} /></button>
                )}
                {resultOption && (
                  <>
                    <div className="dfm-dash-picked-result" aria-live="polite">
                      <span className="dfm-dash-picked-spark"><Sparkles size={18} /></span>
                      <div className="dfm-dash-picked-copy"><small>{favoritesOnly ? 'YOUR FAVORITES HAD THE ANSWER' : `THE PICK FROM ${selectedCategory?.name?.toUpperCase() ?? 'YOUR OPTIONS'}`}</small><strong>{resultOption.name}</strong><span>{lastDecisionMessage} {resultHistoryId ? `Status: ${({ pending: 'Pending', completed: 'Done', skipped: 'Skipped' } as const)[data.history.find((entry) => entry.id === resultHistoryId)?.status ?? 'pending']}.` : 'Could not save this decision.'}</span></div>
                      {resultHistoryId && (
                        <div className="dfm-dash-picked-actions">
                          <button
                            type="button"
                            className={data.history.find((entry) => entry.id === resultHistoryId)?.status === 'completed' ? 'is-active' : ''}
                            aria-pressed={data.history.find((entry) => entry.id === resultHistoryId)?.status === 'completed'}
                            disabled={updatingHistory?.id === resultHistoryId}
                            onClick={() => void setHistoryStatus(resultHistoryId, 'completed')}
                          ><CheckCircle2 size={15} /> {updatingHistory?.id === resultHistoryId && updatingHistory.status === 'completed' ? 'Saving…' : 'Done'}</button>
                          <button
                            type="button"
                            className={data.history.find((entry) => entry.id === resultHistoryId)?.status === 'skipped' ? 'is-active' : ''}
                            aria-pressed={data.history.find((entry) => entry.id === resultHistoryId)?.status === 'skipped'}
                            disabled={updatingHistory?.id === resultHistoryId}
                            onClick={() => void setHistoryStatus(resultHistoryId, 'skipped')}
                          ><ArrowDownRight size={15} /> {updatingHistory?.id === resultHistoryId && updatingHistory.status === 'skipped' ? 'Saving…' : 'Skip'}</button>
                          <button
                            type="button"
                            disabled={spinning || replacingDecision || updatingHistory?.id === resultHistoryId}
                            aria-expanded={choosingAnother}
                            onClick={() => setChoosingAnother((current) => !current)}
                          >{choosingAnother ? 'Cancel' : 'Choose another'}</button>
                        </div>
                      )}
                    </div>
                    {choosingAnother && resultHistoryId && (
                      <div className="dfm-dash-alternatives" aria-label="Choose a different option">
                        <strong>Choose a different option</strong>
                        {(favoritesOnly ? data.options.filter((option) => option.isFavorite && !option.isExcluded) : eligibleActiveOptions)
                          .filter((option) => option.id !== resultOption.id)
                          .map((option) => (
                            <button
                              type="button"
                              key={option.id}
                              disabled={replacingDecision}
                              onClick={() => void chooseAlternative(option)}
                            >
                              {option.name}<ArrowRight size={14} />
                            </button>
                          ))}
                        {(favoritesOnly ? data.options.filter((option) => option.isFavorite && !option.isExcluded) : eligibleActiveOptions)
                          .filter((option) => option.id !== resultOption.id).length === 0 && (
                          <span>No other available options.</span>
                        )}
                        {replacingDecision && <span role="status">Saving your choice…</span>}
                      </div>
                    )}
                    <div className="dfm-dash-ai-reason" aria-live="polite">
                      <div><Sparkles size={15} /><strong>A thought on this choice</strong></div>
                      {reasonLoadingId === resultHistoryId && <p role="status">Asking Gemini for a short perspective…</p>}
                      {resultHistoryId && data.history.find((entry) => entry.id === resultHistoryId)?.aiReason && <p>{data.history.find((entry) => entry.id === resultHistoryId)?.aiReason}</p>}
                      {reasonError?.id === resultHistoryId && (
                        <div className="dfm-dash-ai-error" role="alert">
                          <span>{reasonError.message}</span>
                          <button type="button" onClick={() => void requestAiReason(resultHistoryId, situation.trim())}>Try again</button>
                        </div>
                      )}
                      <small>{lastDecisionMessage === 'You chose another option.' ? 'You chose this option yourself. AI only adds a perspective and does not decide for you.' : 'The option was chosen randomly; AI only adds a perspective and does not decide for you.'}</small>
                    </div>
                  </>
                )}
                {!favoritesOnly && selectedCategory && activeOptions.length > 0 && <button type="button" className="dfm-dash-add-inline" onClick={() => setEditor({ type: 'option', categoryId: selectedCategory.id })}><Plus size={15} /> Add an option to {selectedCategory.name}</button>}
              </div>
            </section>
          )}
        </div>
        <footer className="dfm-dashboard-footer"><span>© {new Date().getFullYear()} Decide For Me</span><span><BookmarkCheck size={13} /> Private to your account</span></footer>
      </section>

      {editor && <EditorDialog editor={editor} data={data} onClose={() => setEditor(null)} onSubmit={submitEditor} />}
    </main>
  );
}
