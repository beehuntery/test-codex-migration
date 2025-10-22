const listEl = document.querySelector('#task-list');
const template = document.querySelector('#task-template');
const emptyState = document.querySelector('#empty-state');
const form = document.querySelector('#task-form');
const refreshBtn = document.querySelector('#refresh');
const searchInput = document.querySelector('#search');
const dateInputWrappers = Array.from(document.querySelectorAll('.date-input-wrapper'));
const dateRangeContainers = Array.from(document.querySelectorAll('.date-range'));
const formTagSelected = document.querySelector('#form-tag-selected');
const formTagDropdown = document.querySelector('#form-tag-dropdown');
const formTagOptionsList = document.querySelector('#form-tag-options');
const formTagInputWrapper = document.querySelector('#form-tag-input');
const formTagSearchInput = document.querySelector('#form-tag-search');
const formTagLabel = document.querySelector('#form-tag-label');
const formTagContainer = formTagInputWrapper ? formTagInputWrapper.closest('.tag-select') : null;
const formTagCard = formTagInputWrapper ? formTagInputWrapper.closest('.card') : null;
const statusFilterContainer = document.querySelector('[data-filter-status]');
const statusFilterToggle = document.querySelector('[data-filter-status-toggle]');
const statusFilterPanel = document.querySelector('[data-filter-status-panel]');
const statusFilterList = document.querySelector('[data-filter-status-list]');
const statusFilterClearBtn = document.querySelector('[data-filter-status-clear]');
const tagFilterContainer = document.querySelector('[data-filter-tags]');
const tagFilterToggle = document.querySelector('[data-filter-tags-toggle]');
const tagFilterPanel = document.querySelector('[data-filter-tags-panel]');
const tagFilterList = document.querySelector('[data-filter-tags-list]');
const tagFilterClearBtn = document.querySelector('[data-filter-tags-clear]');

const STATUS_LABELS = {
  todo: '未着手',
  in_progress: '進行中',
  done: '完了'
};

const STATUS_ORDER = {
  todo: 0,
  in_progress: 1,
  done: 2
};

const STATUS_FILTER_OPTIONS = Object.keys(STATUS_LABELS)
  .sort((a, b) => {
    const orderA = STATUS_ORDER[a] ?? Number.POSITIVE_INFINITY;
    const orderB = STATUS_ORDER[b] ?? Number.POSITIVE_INFINITY;
    return orderA - orderB;
  })
  .map((value) => ({
    value,
    label: STATUS_LABELS[value] ?? value
  }));

const EMPTY_MESSAGES = {
  default: 'No tasks yet. Add your first task above.',
  search: 'No tasks match your filters.'
};

const filterControls = {
  title: document.querySelector('#filter-title'),
  dueFrom: document.querySelector('#filter-due-from'),
  dueTo: document.querySelector('#filter-due-to'),
  createdFrom: document.querySelector('#filter-created-from'),
  createdTo: document.querySelector('#filter-created-to'),
  updatedFrom: document.querySelector('#filter-updated-from'),
  updatedTo: document.querySelector('#filter-updated-to')
};
const statusFilterInputs = Array.from(document.querySelectorAll('[data-filter-status] input[type="checkbox"]'));
const statusFilterClear = document.querySelector('[data-filter-status-clear]');

const state = {
  tasks: [],
  searchQuery: '',
  filters: {
    title: '',
    statuses: [],
    tags: [],
    dueFrom: '',
    dueTo: '',
    createdFrom: '',
    createdTo: '',
    updatedFrom: '',
    updatedTo: ''
  },
  availableTags: [],
  formTags: []
};

const formTagUIState = {
  open: false,
  query: '',
  activeIndex: -1,
  options: []
};

const dragState = {
  draggingId: null
};

const statusFilterState = {
  open: false
};

const tagFilterState = {
  open: false
};

const TAG_PLACEHOLDER_TEXT = 'タグを選択してください';
const taskTagSelectors = new Map();

function normalizeTagName(name = '') {
  return name.trim().toLowerCase();
}

function sortTags(tags) {
  return tags.slice().sort((a, b) => a.localeCompare(b, 'ja'));
}

function dedupeTags(tags) {
  const seen = new Set();
  const result = [];
  tags.forEach((tag) => {
    if (!tag) {
      return;
    }
    if (seen.has(tag)) {
      return;
    }
    seen.add(tag);
    result.push(tag);
  });
  return result;
}

async function ensureTagExists(rawName) {
  const trimmed = (rawName || '').trim();
  if (!trimmed) {
    return '';
  }

  const normalized = normalizeTagName(trimmed);
  const existing = state.availableTags.find((tag) => normalizeTagName(tag) === normalized);
  if (existing) {
    return existing;
  }

  const res = await fetch('/api/tags', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: trimmed })
  });

  const payload = await parseResponseJson(res);
  if (!res.ok) {
    throw new Error(payload?.error || `Failed to create tag. (status ${res.status})`);
  }

  let createdName = payload?.name || trimmed;
  if (Array.isArray(payload?.tags)) {
    state.availableTags = payload.tags.slice();
    const match = state.availableTags.find((tag) => normalizeTagName(tag) === normalized);
    if (match) {
      createdName = match;
    }
  } else if (!state.availableTags.includes(createdName)) {
    state.availableTags = [...state.availableTags, createdName];
  }

  renderFormTags();
  return createdName;
}

async function saveTaskTags(taskId, tags) {
  const res = await fetch(`/api/tasks/${taskId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tags })
  });

  const payload = await parseResponseJson(res);
  if (!res.ok) {
    throw new Error(payload?.error || `Failed to update task tags. (status ${res.status})`);
  }

  const idx = state.tasks.findIndex((task) => task.id === taskId);
  if (idx !== -1) {
    state.tasks[idx] = payload ?? { ...state.tasks[idx], tags };
  }

  await loadTasks();
}

refreshBtn.addEventListener('click', async () => {
  await loadTags();
  await loadTasks();
});

if (searchInput) {
  const updateSearchQuery = (value = '') => {
    if (state.searchQuery === value) {
      return;
    }
    state.searchQuery = value;
    renderTasks();
  };

  searchInput.addEventListener('input', (event) => {
    updateSearchQuery(event.target.value);
  });

  searchInput.addEventListener('search', (event) => {
    updateSearchQuery(event.target.value);
  });
}

dateInputWrappers.forEach((wrapper) => {
  wrapper.addEventListener('click', (event) => {
    const input = wrapper.querySelector('input[type="date"]');
    if (!input) {
      return;
    }
    if (event.target === input) {
      return;
    }
    openDatePicker(input);
  });
});

dateRangeContainers.forEach((range) => {
  range.addEventListener('click', (event) => {
    let targetInput = event.target.closest('input[type="date"]');
    if (!targetInput) {
      const inputs = Array.from(range.querySelectorAll('input[type="date"]'));
      targetInput = inputs.find((input) => !input.value) || inputs[0] || null;
    }
    if (targetInput && event.target !== targetInput) {
      openDatePicker(targetInput);
    }
  });
});

Object.entries(filterControls).forEach(([key, element]) => {
  if (!element) {
    return;
  }

  const updateFilter = () => {
    let value = element.value || '';
    if (element.type === 'search') {
      value = value.trim();
    }
    state.filters[key] = value;
    renderTasks();
  };

  element.addEventListener('input', updateFilter);

  if (element.tagName === 'SELECT' || element.type === 'date') {
    element.addEventListener('change', updateFilter);
  }

  if (element.type === 'search') {
    element.addEventListener('search', updateFilter);
  }
});

if (statusFilterToggle && statusFilterPanel && statusFilterList && statusFilterContainer) {
  statusFilterToggle.addEventListener('click', () => {
    if (statusFilterState.open) {
      closeStatusFilterDropdown();
    } else {
      openStatusFilterDropdown();
    }
  });

  document.addEventListener('click', (event) => {
    if (!statusFilterState.open) {
      return;
    }
    if (statusFilterContainer.contains(event.target)) {
      return;
    }
    closeStatusFilterDropdown();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && statusFilterState.open) {
      event.preventDefault();
      closeStatusFilterDropdown();
      statusFilterToggle.focus({ preventScroll: true });
    }
  });
}

if (statusFilterClearBtn) {
  statusFilterClearBtn.addEventListener('click', () => {
    if (!state.filters.statuses.length) {
      closeStatusFilterDropdown();
      return;
    }
    state.filters.statuses = [];
    renderStatusFilterOptions();
    renderTasks();
  });
}

if (tagFilterToggle && tagFilterPanel && tagFilterList && tagFilterContainer) {
  tagFilterToggle.addEventListener('click', () => {
    if (tagFilterState.open) {
      closeTagFilterDropdown();
    } else {
      openTagFilterDropdown();
    }
  });

  document.addEventListener('click', (event) => {
    if (!tagFilterState.open) {
      return;
    }
    if (tagFilterContainer.contains(event.target)) {
      return;
    }
    closeTagFilterDropdown();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && tagFilterState.open) {
      event.preventDefault();
      closeTagFilterDropdown();
      tagFilterToggle.focus({ preventScroll: true });
    }
  });
}

if (tagFilterClearBtn) {
  tagFilterClearBtn.addEventListener('click', () => {
    if (!state.filters.tags.length) {
      closeTagFilterDropdown();
      return;
    }
    state.filters.tags = [];
    renderTagFilterOptions();
    renderTasks();
  });
}

renderStatusFilterOptions();
renderTagFilterOptions();

if (formTagLabel && formTagInputWrapper && formTagSearchInput) {
  const activateTagSelect = (event) => {
    event.preventDefault();
    openFormTagDropdown();
    formTagSearchInput.focus({ preventScroll: true });
  };

  formTagLabel.addEventListener('click', activateTagSelect);
  formTagLabel.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      activateTagSelect(event);
    }
  });
}

if (formTagInputWrapper && formTagSearchInput) {
  formTagInputWrapper.addEventListener('mousedown', (event) => {
    if (event.target.closest('.tag-chip-remove')) {
      return;
    }
    event.preventDefault();
    openFormTagDropdown();
    formTagSearchInput.focus({ preventScroll: true });
  });

  formTagInputWrapper.addEventListener('click', (event) => {
    if (event.target.closest('.tag-chip-remove')) {
      return;
    }
    openFormTagDropdown();
    formTagSearchInput.focus();
  });

  formTagInputWrapper.addEventListener('focus', () => {
    openFormTagDropdown();
    formTagSearchInput.focus({ preventScroll: true });
  });

  formTagInputWrapper.addEventListener('keydown', (event) => {
    if (event.key === 'Tab') {
      return;
    }

    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault();
      const lastTag = state.formTags[state.formTags.length - 1];
      if (lastTag) {
        removeFormTag(lastTag);
      }
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openFormTagDropdown();
      formTagSearchInput.focus();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      openFormTagDropdown();
      formTagSearchInput.focus();
      if (formTagUIState.activeIndex === -1) {
        moveActiveFormTagOption(1);
      } else {
        updateActiveFormTagOptionStyles();
      }
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      openFormTagDropdown();
      formTagSearchInput.focus();
      if (formTagUIState.activeIndex === -1) {
        moveActiveFormTagOption(-1);
      } else {
        updateActiveFormTagOptionStyles();
      }
      return;
    }

    // For other printable keys, shift focus to the search field and seed the query.
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      openFormTagDropdown();
      formTagSearchInput.focus();
      formTagSearchInput.value = event.key;
      formTagUIState.query = event.key;
      formTagUIState.activeIndex = -1;
      renderFormTags();
      formTagSearchInput.setSelectionRange(formTagSearchInput.value.length, formTagSearchInput.value.length);
    }
  });

  formTagSearchInput.addEventListener('focus', () => {
    openFormTagDropdown();
  });

  formTagSearchInput.addEventListener('input', (event) => {
    formTagUIState.query = event.target.value;
    formTagUIState.activeIndex = -1;
    openFormTagDropdown();
    renderFormTags();
  });

  formTagSearchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Backspace' && !formTagSearchInput.value) {
      const lastTag = state.formTags[state.formTags.length - 1];
      if (lastTag) {
        event.preventDefault();
        removeFormTag(lastTag);
        return;
      }
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      closeFormTagDropdown();
      formTagSearchInput.blur();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!formTagUIState.open) {
        openFormTagDropdown();
      }
      moveActiveFormTagOption(1);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!formTagUIState.open) {
        openFormTagDropdown();
      }
      moveActiveFormTagOption(-1);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const currentQuery = formTagSearchInput.value || '';
      const trimmedQuery = currentQuery.trim();
      const normalizedQuery = trimmedQuery.toLowerCase();
      const optionValue = getActiveFormTagOptionValue();
      if (optionValue) {
        selectFormTag(optionValue);
        return;
      }

      if (trimmedQuery) {
        const exactOption = formTagUIState.options.find(
          (tag) => tag.toLowerCase() === normalizedQuery
        );
        if (exactOption) {
          selectFormTag(exactOption);
          return;
        }
        const existing = state.availableTags.find((tag) => tag.toLowerCase() === normalizedQuery);
        if (existing) {
          selectFormTag(existing);
          return;
        }
        createTagFromQuery(trimmedQuery);
        return;
      }

      const firstOption = formTagOptionsList?.querySelector('[data-tag-option]');
      if (firstOption) {
        const value = firstOption.getAttribute('data-tag-option');
        if (value) {
          selectFormTag(value);
          return;
        }
      }
      return;
    }

    if (event.key === 'Tab' && formTagUIState.open) {
      closeFormTagDropdown();
    }
  });
}

if (formTagDropdown) {
  formTagDropdown.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      if (event.target && typeof event.target.blur === 'function') {
        event.target.blur();
      }
      closeFormTagDropdown();
    }
  });
}

document.addEventListener('mousedown', (event) => {
  if (formTagContainer && formTagDropdown && !formTagContainer.contains(event.target)) {
    closeFormTagDropdown();
  }

  taskTagSelectors.forEach((selector) => {
    selector.handleDocumentMouseDown(event);
  });
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const task = {
    title: formData.get('title').trim()
  };
  const dueDateValue = formData.get('dueDate');
  if (dueDateValue) {
    task.dueDate = dueDateValue;
  } else {
    task.dueDate = null;
  }
  task.tags = state.formTags.slice();

  if (!task.title) {
    alert('Please provide a task title.');
    return;
  }

  try {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(task)
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to create task.');
    }

    form.reset();
    state.formTags = [];
    renderFormTags();
    await loadTasks();
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
});

listEl.addEventListener('click', async (event) => {
  const dueFieldContainer = event.target.closest('.due-field');
  if (dueFieldContainer) {
    const dueInput = dueFieldContainer.querySelector('.due-date');
    if (dueInput && event.target !== dueInput) {
      openDatePicker(dueInput);
    }
    // Do not return; clicking the delete button inside the card should still work.
  }

  const button = event.target.closest('button');
  if (!button) {
    return;
  }

  const listItem = event.target.closest('.task');
  const { taskId } = listItem.dataset;

  if (!button.classList.contains('delete')) {
    return;
  }

  if (!confirm('Delete this task?')) {
    return;
  }

  try {
    const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to delete task.');
    }

    state.tasks = state.tasks.filter((task) => task.id !== taskId);
    renderTasks();
  } catch (err) {
    console.error(err);
    alert(err.message);
    await loadTasks();
  }
});

listEl.addEventListener('focusout', handleInlineEdit);

listEl.addEventListener('change', async (event) => {
  const statusSelect = event.target.closest('.status');
  if (statusSelect) {
    const listItem = statusSelect.closest('.task');
    if (!listItem) {
      return;
    }

    const { taskId } = listItem.dataset;
    const nextStatus = statusSelect.value;

    if (!(nextStatus in STATUS_LABELS)) {
      revertStatus(statusSelect);
      return;
    }

    const previous = statusSelect.dataset.prevStatus;
    if (nextStatus === previous) {
      return;
    }

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: nextStatus })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update task status.');
      }

      const updatedTask = await res.json();
      const index = state.tasks.findIndex((item) => item.id === updatedTask.id);
      if (index !== -1) {
        state.tasks[index] = updatedTask;
      }
      statusSelect.dataset.prevStatus = updatedTask.status;
      renderTasks();
    } catch (err) {
      console.error(err);
      alert(err.message);
      revertStatus(statusSelect);
    }
    return;
  }

  if (event.target.matches('.due-date')) {
    const dueInput = event.target;
    const listItem = dueInput.closest('.task');
    if (!listItem) {
      return;
    }

    const { taskId } = listItem.dataset;
    const newDueDate = dueInput.value;
    const previousDue = dueInput.dataset.prevDueDate || '';

    if (newDueDate === previousDue) {
      return;
    }

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ dueDate: newDueDate || '' })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update task due date.');
      }

      await res.json();
      dueInput.dataset.prevDueDate = newDueDate;
      await loadTasks();
    } catch (err) {
      console.error(err);
      alert(err.message);
      revertDueDate(dueInput);
    }
  }
});

listEl.addEventListener('keydown', (event) => {
  const field = event.target.closest('[data-edit-field]');
  if (!field) {
    return;
  }

  if (event.key === 'Escape') {
    event.preventDefault();
    revertField(field);
    field.blur();
    return;
  }

  if (field.dataset.editField === 'title' && event.key === 'Enter') {
    event.preventDefault();
    field.blur();
  }
});

listEl.addEventListener('dragstart', (event) => {
  const taskItem = event.target.closest('.task');
  if (!taskItem) {
    return;
  }
  dragState.draggingId = taskItem.dataset.taskId;
  taskItem.classList.add('dragging');
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', dragState.draggingId);
});

listEl.addEventListener('dragover', (event) => {
  if (!dragState.draggingId) {
    return;
  }
  event.preventDefault();
  const draggingElement = listEl.querySelector('.task.dragging');
  if (!draggingElement) {
    return;
  }
  listEl.classList.remove('dragging-end');

  const siblings = [...listEl.querySelectorAll('.task:not(.dragging)')];
  const previousRects = new Map();
  siblings.forEach((sibling) => {
    previousRects.set(sibling, sibling.getBoundingClientRect());
  });

  const afterElement = getDragAfterElement(event.clientY);
  if (!afterElement) {
    listEl.appendChild(draggingElement);
    listEl.classList.add('dragging-end');
  } else if (afterElement !== draggingElement) {
    listEl.insertBefore(draggingElement, afterElement);
  }

  animateReorder(previousRects, siblings);
});

listEl.addEventListener('drop', (event) => {
  if (!dragState.draggingId) {
    return;
  }
  event.preventDefault();
  clearDragIndicators();
});

listEl.addEventListener('dragend', async (event) => {
  const taskItem = event.target.closest('.task');
  if (taskItem) {
    taskItem.classList.remove('dragging');
  }

  if (!dragState.draggingId) {
    clearDragIndicators();
    return;
  }
  clearDragIndicators();

  const orderedIds = Array.from(listEl.querySelectorAll('.task')).map((task) => task.dataset.taskId);
  dragState.draggingId = null;

  try {
    await persistOrder(orderedIds);
    await loadTasks();
  } catch (err) {
    console.error(err);
    alert(err.message);
    await loadTasks();
  }
});

async function loadTasks() {
  try {
    const res = await fetch('/api/tasks');
    if (!res.ok) {
      throw new Error('Failed to fetch tasks.');
    }
    state.tasks = await res.json();
    renderTasks();
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
}

async function loadTags() {
  try {
    const res = await fetch('/api/tags');
    if (!res.ok) {
      throw new Error('Failed to fetch tags.');
    }
    state.availableTags = await res.json();
    renderFormTags();
    renderTasks();
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
}

function renderTasks() {
  clearTaskTagSelectors();
  listEl.innerHTML = '';

  const query = state.searchQuery.trim().toLowerCase();
  const preparedFilters = {
    title: state.filters.title.trim().toLowerCase(),
    statuses: Array.isArray(state.filters.statuses) ? state.filters.statuses : [],
    tags: Array.isArray(state.filters.tags) ? state.filters.tags : [],
    dueFrom: state.filters.dueFrom,
    dueTo: state.filters.dueTo,
    createdFrom: state.filters.createdFrom,
    createdTo: state.filters.createdTo,
    updatedFrom: state.filters.updatedFrom,
    updatedTo: state.filters.updatedTo
  };

  const filteredTasks = state.tasks
    .filter((task) => matchesSearch(task, query))
    .filter((task) => matchesFieldFilters(task, preparedFilters));

  const hasAnyTasks = state.tasks.length > 0;
  const hasActiveFilters =
    Boolean(query) ||
    Boolean(preparedFilters.title) ||
    Boolean(preparedFilters.dueFrom) ||
    Boolean(preparedFilters.dueTo) ||
    Boolean(preparedFilters.createdFrom) ||
    Boolean(preparedFilters.createdTo) ||
    Boolean(preparedFilters.updatedFrom) ||
    Boolean(preparedFilters.updatedTo) ||
    preparedFilters.statuses.length > 0 ||
    preparedFilters.tags.length > 0;

  if (!filteredTasks.length) {
    emptyState.hidden = false;
    emptyState.textContent = hasAnyTasks && hasActiveFilters ? EMPTY_MESSAGES.search : EMPTY_MESSAGES.default;
    return;
  }

  emptyState.hidden = true;
  emptyState.textContent = EMPTY_MESSAGES.default;

  const fragment = document.createDocumentFragment();
  filteredTasks.forEach((task) => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.dataset.taskId = task.id;
    node.dataset.order = Number.isFinite(task.order) ? task.order : 0;
    node.draggable = true;
    node.classList.add('draggable');

    const status = task.status || 'todo';

    const titleEl = node.querySelector('.title');
    titleEl.textContent = task.title;

    const statusSelect = node.querySelector('.status');
    if (statusSelect) {
      statusSelect.value = status;
      statusSelect.dataset.prevStatus = status;
      const statusLabel = STATUS_LABELS[status] ?? status;
      statusSelect.title = `ステータス: ${statusLabel}`;
    }

    node.classList.toggle('completed', status === 'done');

    const dueInput = node.querySelector('.due-date');
    if (dueInput) {
      const due = task.dueDate || '';
      dueInput.value = due;
      dueInput.dataset.prevDueDate = due;
      dueInput.title = due ? formatDateDisplay(due) : '期限なし';
    }

    const tagSelector = node.querySelector('[data-role="tag-selector"]');
    if (tagSelector) {
      renderTaskTagSelector(tagSelector, task);
    }

    const createdEl = node.querySelector('.created');
    if (createdEl) {
      createdEl.dateTime = task.createdAt;
      createdEl.textContent = `作成: ${formatDateTime(task.createdAt)}`;
      createdEl.title = `${formatRelativeTime(task.createdAt)}に作成`;
    }

    const updatedEl = node.querySelector('.updated');
    if (updatedEl) {
      if (task.updatedAt) {
        updatedEl.dateTime = task.updatedAt;
        updatedEl.textContent = `更新: ${formatDateTime(task.updatedAt)}`;
        updatedEl.title = `${formatRelativeTime(task.updatedAt)}に更新`;
      } else {
        updatedEl.removeAttribute('dateTime');
        updatedEl.textContent = '更新: －';
        updatedEl.title = 'まだ更新されていません';
      }
    }

    fragment.appendChild(node);
  });

  listEl.appendChild(fragment);
}

function matchesSearch(task, query) {
  if (!query) {
    return true;
  }

  const createdDatePortion = getDatePortion(task.createdAt);
  const updatedDatePortion = getDatePortion(task.updatedAt);

  const haystack = [
    task.title ?? '',
    task.status ?? '',
    STATUS_LABELS[task.status] ?? '',
    task.dueDate ?? '',
    formatDateDisplay(task.dueDate, '期限なし'),
    task.createdAt ?? '',
    task.updatedAt ?? '',
    createdDatePortion,
    updatedDatePortion,
    formatDateDisplay(createdDatePortion),
    formatDateDisplay(updatedDatePortion),
    ...(Array.isArray(task.tags) ? task.tags : [])
  ]
    .join(' ')
    .toLowerCase();

  return haystack.includes(query);
}

function matchesFieldFilters(task, filters) {
  if (filters.title && !(task.title ?? '').toLowerCase().includes(filters.title)) {
    return false;
  }

  if (Array.isArray(filters.statuses) && filters.statuses.length > 0 && !filters.statuses.includes(task.status)) {
    return false;
  }

  if (Array.isArray(filters.tags) && filters.tags.length > 0) {
    const taskTags = Array.isArray(task.tags) ? task.tags : [];
    const hasMatchingTag = filters.tags.some((tag) => taskTags.includes(tag));
    if (!hasMatchingTag) {
      return false;
    }
  }

  if (!matchesDateRange(task.dueDate, filters.dueFrom, filters.dueTo)) {
    return false;
  }

  if (!matchesDateRange(task.createdAt, filters.createdFrom, filters.createdTo)) {
    return false;
  }

  if (!matchesDateRange(task.updatedAt, filters.updatedFrom, filters.updatedTo)) {
    return false;
  }

  return true;
}

function getDatePortion(value) {
  if (!value) {
    return '';
  }
  if (typeof value === 'string') {
    return value.slice(0, 10);
  }
  try {
    return new Date(value).toISOString().slice(0, 10);
  } catch (err) {
    return '';
  }
}

function getDragAfterElement(mouseY) {
  const draggableElements = [...listEl.querySelectorAll('.task:not(.dragging)')];
  return draggableElements.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = mouseY - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child };
      }
      return closest;
    },
    { offset: Number.NEGATIVE_INFINITY, element: null }
  ).element;
}

function animateReorder(previousRects, elements) {
  elements.forEach((el) => {
    const prevRect = previousRects.get(el);
    if (!prevRect) {
      return;
    }
    const newRect = el.getBoundingClientRect();
    const deltaY = prevRect.top - newRect.top;
    if (!deltaY) {
      return;
    }

    el.style.transition = 'none';
    el.style.transform = `translateY(${deltaY}px)`;

    requestAnimationFrame(() => {
      el.style.transition = '';
      el.style.transform = '';
    });
  });
}

async function persistOrder(orderedIds) {
  for (let index = 0; index < orderedIds.length; index += 1) {
    const id = orderedIds[index];
    if (!id) {
      continue;
    }

    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ order: index })
    });

    if (!res.ok) {
      let error = {};
      try {
        error = await res.json();
      } catch (parseErr) {
        console.error('Failed to parse reorder error response', parseErr);
      }
      throw new Error(error.error || 'Failed to reorder tasks.');
    }
  }
}

function clearDragIndicators() {
  listEl.classList.remove('dragging-end');
  listEl.querySelectorAll('.task').forEach((task) => {
    task.style.transform = '';
  });
}

async function parseResponseJson(res) {
  const text = await res.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch (err) {
    console.error('Unexpected response format:', text);
    return null;
  }
}

function openFormTagDropdown() {
  if (!formTagDropdown || !formTagInputWrapper || !formTagSearchInput) {
    return;
  }
  if (!formTagUIState.open) {
    formTagUIState.open = true;
    formTagInputWrapper.classList.add('open');
    if (formTagContainer) {
      formTagContainer.classList.add('open');
    }
    if (formTagCard) {
      formTagCard.classList.add('tag-select-active');
    }
  }
  formTagInputWrapper.setAttribute('aria-expanded', 'true');
  formTagSearchInput.setAttribute('aria-expanded', 'true');
  formTagDropdown.hidden = false;
  renderFormTags();
}

function closeFormTagDropdown() {
  if (!formTagDropdown || !formTagInputWrapper || !formTagSearchInput) {
    return;
  }
  if (!formTagUIState.open && formTagDropdown.hidden) {
    return;
  }
  formTagUIState.open = false;
  formTagUIState.activeIndex = -1;
  formTagDropdown.hidden = true;
  formTagInputWrapper.classList.remove('open');
  if (formTagContainer) {
    formTagContainer.classList.remove('open');
  }
  if (formTagCard) {
    formTagCard.classList.remove('tag-select-active');
  }
  formTagInputWrapper.setAttribute('aria-expanded', 'false');
  formTagSearchInput.setAttribute('aria-expanded', 'false');
  formTagSearchInput.removeAttribute('aria-activedescendant');
}

function selectFormTag(tag) {
  if (!tag || state.formTags.includes(tag)) {
    return;
  }
  state.formTags = [...state.formTags, tag];
  formTagUIState.query = '';
  formTagUIState.activeIndex = -1;
  if (formTagSearchInput) {
    formTagSearchInput.value = '';
  }
  renderFormTags();
  if (formTagSearchInput) {
    formTagSearchInput.focus();
  }
}

async function createTagFromQuery(rawQuery) {
  const trimmed = (rawQuery || '').trim();
  if (!trimmed) {
    return;
  }

  try {
    const createdName = await ensureTagExists(trimmed);
    if (!createdName) {
      return;
    }
    selectFormTag(createdName);
    renderTasks();
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
}

function removeFormTag(tag) {
  const wasOpen = formTagUIState.open;
  state.formTags = state.formTags.filter((name) => name !== tag);
  formTagUIState.activeIndex = -1;
  renderFormTags();
  if (formTagSearchInput) {
    formTagSearchInput.focus();
  }
  if (wasOpen) {
    openFormTagDropdown();
  }
}

function renderStatusFilterOptions() {
  if (!statusFilterList || !statusFilterToggle) {
    return;
  }

  const validValues = STATUS_FILTER_OPTIONS.map((option) => option.value);
  state.filters.statuses = dedupeTags(state.filters.statuses).filter((status) => validValues.includes(status));
  const selectedSet = new Set(state.filters.statuses);

  statusFilterList.innerHTML = '';

  STATUS_FILTER_OPTIONS.forEach((option) => {
    const wrapper = document.createElement('label');
    wrapper.className = 'status-filter__option';
    wrapper.dataset.statusValue = option.value;
    if (selectedSet.has(option.value)) {
      wrapper.classList.add('is-selected');
    }

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = option.value;
    checkbox.checked = selectedSet.has(option.value);
    checkbox.id = `filter-status-${option.value}`;

    const label = document.createElement('span');
    label.className = 'status-filter__option-label';
    label.textContent = option.label;

    wrapper.append(checkbox, label);
    statusFilterList.appendChild(wrapper);

    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        if (!state.filters.statuses.includes(option.value)) {
          state.filters.statuses = dedupeTags([...state.filters.statuses, option.value]);
        }
      } else {
        state.filters.statuses = state.filters.statuses.filter((value) => value !== option.value);
      }
      renderStatusFilterOptions();
      renderTasks();
    });
  });

  updateStatusFilterToggleLabel(selectedSet);
}

function updateStatusFilterToggleLabel(selectedSet = new Set()) {
  if (!statusFilterToggle) {
    return;
  }

  const selected = Array.from(selectedSet).sort(
    (a, b) => (STATUS_ORDER[a] ?? Number.POSITIVE_INFINITY) - (STATUS_ORDER[b] ?? Number.POSITIVE_INFINITY)
  );

  let labelText = 'すべてのステータス';
  if (selected.length === 1) {
    labelText = STATUS_LABELS[selected[0]] ?? selected[0];
  } else if (selected.length === 2) {
    const [first, second] = selected;
    labelText = `${STATUS_LABELS[first] ?? first}, ${STATUS_LABELS[second] ?? second}`;
  } else if (selected.length > 2) {
    labelText = `${selected.length}件を選択`;
  }

  statusFilterToggle.textContent = labelText;
  statusFilterToggle.setAttribute('aria-label', selected.length ? `ステータスを選択 (${labelText})` : 'ステータスを選択');
}

function openStatusFilterDropdown() {
  if (!statusFilterContainer || !statusFilterPanel || !statusFilterToggle) {
    return;
  }
  statusFilterState.open = true;
  statusFilterContainer.classList.add('status-filter--open');
  statusFilterPanel.hidden = false;
  statusFilterToggle.setAttribute('aria-expanded', 'true');
  renderStatusFilterOptions();
  focusFirstStatusFilterOption();
}

function closeStatusFilterDropdown() {
  if (!statusFilterContainer || !statusFilterPanel || !statusFilterToggle) {
    return;
  }
  statusFilterState.open = false;
  statusFilterContainer.classList.remove('status-filter--open');
  statusFilterPanel.hidden = true;
  statusFilterToggle.setAttribute('aria-expanded', 'false');
}

function focusFirstStatusFilterOption() {
  const firstCheckbox = statusFilterList?.querySelector('input[type="checkbox"]');
  if (firstCheckbox) {
    firstCheckbox.focus({ preventScroll: true });
  }
}

function renderTagFilterOptions() {
  if (!tagFilterList || !tagFilterToggle) {
    return;
  }

  state.filters.tags = dedupeTags(state.filters.tags).filter((tag) => state.availableTags.includes(tag));
  const selectedSet = new Set(state.filters.tags);
  const sortedTags = sortTags(state.availableTags);

  tagFilterList.innerHTML = '';

  if (!sortedTags.length) {
    const empty = document.createElement('p');
    empty.className = 'tag-filter__empty';
    empty.textContent = '利用できるタグがありません';
    tagFilterList.appendChild(empty);
  } else {
    sortedTags.forEach((tag, index) => {
      const option = document.createElement('label');
      option.className = 'tag-filter__option';
      option.dataset.tagValue = tag;
      if (selectedSet.has(tag)) {
        option.classList.add('is-selected');
      }

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = tag;
      checkbox.checked = selectedSet.has(tag);
      checkbox.id = `filter-tag-${index}`;

      const label = document.createElement('span');
      label.className = 'tag-filter__option-label';
      label.textContent = tag;

      option.append(checkbox, label);
      tagFilterList.appendChild(option);

      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          if (!state.filters.tags.includes(tag)) {
            state.filters.tags = dedupeTags([...state.filters.tags, tag]);
          }
        } else {
          state.filters.tags = state.filters.tags.filter((value) => value !== tag);
        }
        renderTagFilterOptions();
        renderTasks();
      });
    });
  }

  updateTagFilterToggleLabel(selectedSet);
}

function updateTagFilterToggleLabel(selectedSet = new Set()) {
  if (!tagFilterToggle) {
    return;
  }

  const selected = Array.from(selectedSet).sort((a, b) => a.localeCompare(b, 'ja'));
  let labelText = 'すべてのタグ';
  if (selected.length === 1) {
    labelText = selected[0];
  } else if (selected.length === 2) {
    labelText = `${selected[0]}, ${selected[1]}`;
  } else if (selected.length > 2) {
    labelText = `${selected.length}件を選択`;
  }

  tagFilterToggle.textContent = labelText;
  tagFilterToggle.setAttribute('aria-label', selected.length ? `タグを選択 (${labelText})` : 'タグを選択');
}

function openTagFilterDropdown() {
  if (!tagFilterContainer || !tagFilterPanel || !tagFilterToggle) {
    return;
  }
  tagFilterState.open = true;
  tagFilterContainer.classList.add('tag-filter--open');
  tagFilterPanel.hidden = false;
  tagFilterToggle.setAttribute('aria-expanded', 'true');
  renderTagFilterOptions();
  focusFirstTagFilterOption();
}

function closeTagFilterDropdown() {
  if (!tagFilterContainer || !tagFilterPanel || !tagFilterToggle) {
    return;
  }
  tagFilterState.open = false;
  tagFilterContainer.classList.remove('tag-filter--open');
  tagFilterPanel.hidden = true;
  tagFilterToggle.setAttribute('aria-expanded', 'false');
}

function focusFirstTagFilterOption() {
  const firstCheckbox = tagFilterList?.querySelector('input[type="checkbox"]');
  if (firstCheckbox) {
    firstCheckbox.focus({ preventScroll: true });
  }
}

function renderFormTags() {
  if (!formTagSelected || !formTagDropdown || !formTagOptionsList) {
    return;
  }

  state.formTags = dedupeTags(state.formTags).filter((tag) => state.availableTags.includes(tag));

  const sortedSelected = sortTags(state.formTags);
  formTagSelected.innerHTML = '';

  if (sortedSelected.length) {
    formTagSelected.dataset.hasTags = 'true';
  } else {
    delete formTagSelected.dataset.hasTags;
  }

  if (!sortedSelected.length) {
    const placeholder = document.createElement('span');
    placeholder.className = 'tag-placeholder';
    placeholder.textContent = TAG_PLACEHOLDER_TEXT;
    formTagSelected.appendChild(placeholder);
  } else {
    sortedSelected.forEach((tag) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'tag-chip-wrapper form';

      const chip = document.createElement('div');
      chip.className = 'tag-chip selected form-selected';
      chip.dataset.tag = tag;

      const label = document.createElement('span');
      label.className = 'tag-chip-label';
      label.textContent = tag;
      chip.appendChild(label);

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'tag-chip-remove';
      removeBtn.title = `タグ「${tag}」を選択から外す`;
      removeBtn.setAttribute('aria-label', `タグ「${tag}」を選択から外す`);
      removeBtn.innerHTML = '<span aria-hidden="true">&times;</span>';
      removeBtn.addEventListener('mousedown', (event) => {
        event.stopPropagation();
      });
      removeBtn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        removeFormTag(tag);
      });

      chip.appendChild(removeBtn);
      wrapper.appendChild(chip);
      formTagSelected.appendChild(wrapper);
    });
  }

  const normalizedQuery = formTagUIState.query.trim().toLowerCase();
  if (formTagSearchInput && formTagSearchInput.value !== formTagUIState.query) {
    formTagSearchInput.value = formTagUIState.query;
  }

  const availableOptions = state.availableTags
    .filter((tag) => !state.formTags.includes(tag))
    .filter((tag) => {
      if (!normalizedQuery) {
        return true;
      }
      return tag.toLowerCase().includes(normalizedQuery);
    })
    .sort((a, b) => a.localeCompare(b, 'ja'));

  formTagUIState.options = availableOptions;
  if (!availableOptions.length) {
    formTagUIState.activeIndex = -1;
  } else if (formTagUIState.activeIndex >= availableOptions.length) {
    formTagUIState.activeIndex = availableOptions.length - 1;
  }

  formTagOptionsList.innerHTML = '';

  if (!state.availableTags.length) {
    const empty = document.createElement('div');
    empty.className = 'tag-empty-state';
    empty.textContent = 'タグがありません。新しく追加してください。';
    formTagOptionsList.appendChild(empty);
  } else if (!availableOptions.length) {
    const noMatch = document.createElement('div');
    noMatch.className = 'tag-empty-state';
    noMatch.textContent = normalizedQuery
      ? '一致するタグがありません。Enterキーで新しく作成できます'
      : '利用できるタグがありません。Enterキーで新しく作成できます';
    formTagOptionsList.appendChild(noMatch);
  } else {
    const hint = document.createElement('p');
    hint.className = 'tag-dropdown-hint';
    hint.textContent = 'オプションを選択するか作成します';
    formTagOptionsList.appendChild(hint);

    availableOptions.forEach((tag, index) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'tag-option-wrapper';
      wrapper.setAttribute('role', 'presentation');

      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'tag-option';
      option.setAttribute('role', 'option');
      option.setAttribute('data-tag-option', tag);
      option.id = `form-tag-option-${index}`;
      option.setAttribute('aria-selected', 'false');

      const icon = document.createElement('span');
      icon.className = 'tag-option-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = '⋮⋮';

      const label = document.createElement('span');
      label.className = 'tag-option-label';
      label.textContent = tag;

      option.append(icon, label);

      option.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        selectFormTag(tag);
      });

      const actions = document.createElement('div');
      actions.className = 'tag-option-actions';

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'tag-option-action edit';
      editBtn.title = `タグ「${tag}」を編集`;
      editBtn.setAttribute('aria-label', `タグ「${tag}」を編集`);
      editBtn.innerHTML = '<span aria-hidden="true">✎</span>';
      editBtn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        startInlineTagEdit(tag, { context: 'form', wrapper });
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'tag-option-action delete';
      deleteBtn.title = `タグ「${tag}」を削除`;
      deleteBtn.setAttribute('aria-label', `タグ「${tag}」を削除`);
      deleteBtn.innerHTML = '<span aria-hidden="true">🗑</span>';
      deleteBtn.addEventListener('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        await handleDeleteTag(tag);
      });

      actions.append(editBtn, deleteBtn);
      wrapper.append(option, actions);
      formTagOptionsList.appendChild(wrapper);
    });
  }

  if (!formTagUIState.open) {
    formTagDropdown.hidden = true;
    if (formTagInputWrapper) {
      formTagInputWrapper.classList.remove('open');
      formTagInputWrapper.setAttribute('aria-expanded', 'false');
    }
    if (formTagSearchInput) {
      formTagSearchInput.setAttribute('aria-expanded', 'false');
      formTagSearchInput.removeAttribute('aria-activedescendant');
    }
  } else {
    formTagDropdown.hidden = false;
    if (formTagInputWrapper) {
      formTagInputWrapper.classList.add('open');
      formTagInputWrapper.setAttribute('aria-expanded', 'true');
    }
    if (formTagSearchInput) {
      formTagSearchInput.setAttribute('aria-expanded', 'true');
    }
    updateActiveFormTagOptionStyles();
  }

  renderTagFilterOptions();
}

function getActiveFormTagOptionValue() {
  if (formTagUIState.activeIndex < 0) {
    return '';
  }
  return formTagUIState.options[formTagUIState.activeIndex] || '';
}

function moveActiveFormTagOption(delta) {
  if (!formTagUIState.options.length) {
    formTagUIState.activeIndex = -1;
    updateActiveFormTagOptionStyles();
    return;
  }

  const length = formTagUIState.options.length;
  const next = formTagUIState.activeIndex + delta;
  const normalized = ((next % length) + length) % length;
  formTagUIState.activeIndex = normalized;
  updateActiveFormTagOptionStyles();
}

function updateActiveFormTagOptionStyles() {
  if (!formTagOptionsList || !formTagSearchInput) {
    return;
  }

  const buttons = Array.from(formTagOptionsList.querySelectorAll('[data-tag-option]'));
  buttons.forEach((button, index) => {
    if (index === formTagUIState.activeIndex) {
      button.classList.add('active');
      button.setAttribute('aria-selected', 'true');
      button.scrollIntoView({ block: 'nearest' });
      formTagSearchInput.setAttribute('aria-activedescendant', button.id);
    } else {
      button.classList.remove('active');
      button.setAttribute('aria-selected', 'false');
    }
  });

  if (formTagUIState.activeIndex === -1 || !buttons[formTagUIState.activeIndex]) {
    formTagSearchInput.removeAttribute('aria-activedescendant');
  }
}


class TaskTagSelector {
  constructor(task, container) {
    this.task = task;
    this.taskId = task.id;
    this.container = container;
    this.selectedTags = sortTags(dedupeTags(Array.isArray(task.tags) ? task.tags.filter(Boolean) : []));
    this.state = {
      open: false,
      query: '',
      activeIndex: -1,
      options: []
    };
    this.pending = false;
    this.destroyed = false;

    this.root = null;
    this.inputWrapper = null;
    this.selectedList = null;
    this.dropdown = null;
    this.searchInput = null;
    this.optionsList = null;

    this.handleWrapperMouseDown = this.handleWrapperMouseDown.bind(this);
    this.handleWrapperClick = this.handleWrapperClick.bind(this);
    this.handleWrapperFocus = this.handleWrapperFocus.bind(this);
    this.handleWrapperKeyDown = this.handleWrapperKeyDown.bind(this);
    this.handleSearchFocus = this.handleSearchFocus.bind(this);
    this.handleSearchInput = this.handleSearchInput.bind(this);
    this.handleSearchKeyDown = this.handleSearchKeyDown.bind(this);
    this.handleDropdownKeyDown = this.handleDropdownKeyDown.bind(this);

    this.build();
    this.attachEventListeners();
    this.render();
  }

  build() {
    if (!this.container) {
      return;
    }

    this.container.innerHTML = '';

    const tagSelect = document.createElement('div');
    tagSelect.className = 'tag-select task-tag-select';
    tagSelect.dataset.tagSelectorId = `task-${this.taskId}`;

    const inputWrapper = document.createElement('div');
    inputWrapper.className = 'tag-input-wrapper';
    inputWrapper.tabIndex = 0;
    inputWrapper.setAttribute('role', 'button');
    inputWrapper.setAttribute('aria-haspopup', 'listbox');
    inputWrapper.setAttribute('aria-expanded', 'false');
    inputWrapper.setAttribute('aria-label', 'タグを選択');

    const selectedList = document.createElement('div');
    selectedList.className = 'tag-chip-list';

    inputWrapper.appendChild(selectedList);

    const dropdown = document.createElement('div');
    dropdown.className = 'tag-dropdown';
    dropdown.hidden = true;

    const searchWrapper = document.createElement('div');
    searchWrapper.className = 'tag-dropdown-search';

    const searchInput = document.createElement('input');
    searchInput.type = 'search';
    searchInput.className = 'tag-search-input';
    searchInput.placeholder = 'タグを検索';
    searchInput.autocomplete = 'off';
    searchInput.setAttribute('role', 'combobox');
    searchInput.setAttribute('aria-expanded', 'false');
    searchInput.setAttribute('aria-autocomplete', 'list');
    searchInput.setAttribute('aria-haspopup', 'listbox');
    searchInput.setAttribute('aria-label', 'タグを検索');
    searchInput.setAttribute('aria-controls', `${tagSelect.dataset.tagSelectorId}-options`);

    searchWrapper.appendChild(searchInput);

    const optionsList = document.createElement('div');
    optionsList.className = 'tag-dropdown-options';
    optionsList.id = `${tagSelect.dataset.tagSelectorId}-options`;
    optionsList.setAttribute('role', 'listbox');

    dropdown.append(searchWrapper, optionsList);
    tagSelect.append(inputWrapper, dropdown);
    this.container.appendChild(tagSelect);

    this.root = tagSelect;
    this.inputWrapper = inputWrapper;
    this.selectedList = selectedList;
    this.dropdown = dropdown;
    this.searchInput = searchInput;
    this.optionsList = optionsList;
  }

  attachEventListeners() {
    if (!this.inputWrapper || !this.searchInput) {
      return;
    }

    this.inputWrapper.addEventListener('mousedown', this.handleWrapperMouseDown);
    this.inputWrapper.addEventListener('click', this.handleWrapperClick);
    this.inputWrapper.addEventListener('focus', this.handleWrapperFocus);
    this.inputWrapper.addEventListener('keydown', this.handleWrapperKeyDown);

    this.searchInput.addEventListener('focus', this.handleSearchFocus);
    this.searchInput.addEventListener('input', this.handleSearchInput);
    this.searchInput.addEventListener('keydown', this.handleSearchKeyDown);

    if (this.dropdown) {
      this.dropdown.addEventListener('keydown', this.handleDropdownKeyDown);
    }
  }

  detachEventListeners() {
    if (!this.inputWrapper || !this.searchInput) {
      return;
    }

    this.inputWrapper.removeEventListener('mousedown', this.handleWrapperMouseDown);
    this.inputWrapper.removeEventListener('click', this.handleWrapperClick);
    this.inputWrapper.removeEventListener('focus', this.handleWrapperFocus);
    this.inputWrapper.removeEventListener('keydown', this.handleWrapperKeyDown);

    this.searchInput.removeEventListener('focus', this.handleSearchFocus);
    this.searchInput.removeEventListener('input', this.handleSearchInput);
    this.searchInput.removeEventListener('keydown', this.handleSearchKeyDown);

    if (this.dropdown) {
      this.dropdown.removeEventListener('keydown', this.handleDropdownKeyDown);
    }
  }

  destroy() {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
    this.detachEventListeners();
    if (this.container) {
      this.container.innerHTML = '';
    }
  }

  contains(node) {
    return Boolean(this.root && node && this.root.contains(node));
  }

  openDropdown() {
    if (this.destroyed || !this.dropdown || !this.inputWrapper || !this.searchInput) {
      return;
    }
    if (!this.state.open) {
      this.state.open = true;
      this.dropdown.hidden = false;
      this.inputWrapper.classList.add('open');
      this.inputWrapper.setAttribute('aria-expanded', 'true');
      this.searchInput.setAttribute('aria-expanded', 'true');
    }
    this.renderOptions();
  }

  closeDropdown() {
    if (!this.state.open || this.destroyed || !this.dropdown || !this.inputWrapper || !this.searchInput) {
      return;
    }
    this.state.open = false;
    this.dropdown.hidden = true;
    this.inputWrapper.classList.remove('open');
    this.inputWrapper.setAttribute('aria-expanded', 'false');
    this.searchInput.setAttribute('aria-expanded', 'false');
    this.searchInput.removeAttribute('aria-activedescendant');
  }

  focusSearchInput(options = { preventScroll: true }) {
    if (this.searchInput) {
      this.searchInput.focus(options);
    }
  }

  setQuery(value) {
    this.state.query = value;
    this.state.activeIndex = -1;
  }

  render() {
    if (this.destroyed) {
      return;
    }
    this.renderSelected();
    this.renderOptions();
  }

  renderSelected() {
    if (this.destroyed || !this.selectedList) {
      return;
    }

    const sortedSelected = sortTags(dedupeTags(this.selectedTags));
    this.selectedTags = sortedSelected;
    this.selectedList.innerHTML = '';

    if (!sortedSelected.length) {
      this.selectedList.removeAttribute('data-has-tags');
      const placeholder = document.createElement('span');
      placeholder.className = 'tag-placeholder';
      placeholder.textContent = TAG_PLACEHOLDER_TEXT;
      this.selectedList.appendChild(placeholder);
      return;
    }

    this.selectedList.dataset.hasTags = 'true';

    sortedSelected.forEach((tag) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'tag-chip-wrapper task';

      const chip = document.createElement('div');
      chip.className = 'tag-chip selected form-selected';
      chip.dataset.tag = tag;
      chip.setAttribute('role', 'button');
      chip.setAttribute('tabindex', '0');

      const label = document.createElement('span');
      label.className = 'tag-chip-label';
      label.textContent = tag;
      chip.appendChild(label);

      chip.addEventListener('click', (event) => {
        if (event.target.closest('.tag-chip-remove')) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        startInlineTagEdit(tag, { context: 'task', wrapper, taskId: this.taskId, selector: this });
      });

      chip.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          startInlineTagEdit(tag, { context: 'task', wrapper, taskId: this.taskId, selector: this });
          return;
        }
        if (event.key === 'Delete' || event.key === 'Backspace') {
          event.preventDefault();
          this.removeTag(tag);
        }
      });

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'tag-chip-remove';
      removeBtn.title = 'タスクからタグを削除';
      removeBtn.setAttribute('aria-label', `「${tag}」タグを削除`);
      removeBtn.innerHTML = '<span aria-hidden="true">&times;</span>';
      removeBtn.addEventListener('mousedown', (event) => event.stopPropagation());
      removeBtn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.removeTag(tag);
      });

      chip.appendChild(removeBtn);
      wrapper.appendChild(chip);
      this.selectedList.appendChild(wrapper);
    });
  }

  renderOptions() {
    if (this.destroyed || !this.optionsList) {
      return;
    }

    const normalizedQuery = normalizeTagName(this.state.query);
    if (this.searchInput && this.searchInput.value !== this.state.query) {
      this.searchInput.value = this.state.query;
    }

    const availableOptions = state.availableTags
      .filter((tag) => !this.selectedTags.includes(tag))
      .filter((tag) => {
        if (!normalizedQuery) {
          return true;
        }
        return normalizeTagName(tag).includes(normalizedQuery);
      })
      .sort((a, b) => a.localeCompare(b, 'ja'));

    this.state.options = availableOptions;
    if (!availableOptions.length) {
      this.state.activeIndex = -1;
    } else if (this.state.activeIndex >= availableOptions.length) {
      this.state.activeIndex = availableOptions.length - 1;
    }

    this.optionsList.innerHTML = '';

    if (!state.availableTags.length) {
      const empty = document.createElement('div');
      empty.className = 'tag-empty-state';
      empty.textContent = 'タグがありません。新しく追加してください。';
      this.optionsList.appendChild(empty);
    } else if (!availableOptions.length) {
      const noMatch = document.createElement('div');
      noMatch.className = 'tag-empty-state';
      noMatch.textContent = normalizedQuery
        ? '一致するタグがありません。Enterキーで新しく作成できます'
        : '利用できるタグがありません。Enterキーで新しく作成できます';
      this.optionsList.appendChild(noMatch);
    } else {
      const hint = document.createElement('p');
      hint.className = 'tag-dropdown-hint';
      hint.textContent = 'オプションを選択するか作成します';
      this.optionsList.appendChild(hint);

      const selectorId = this.root ? this.root.dataset.tagSelectorId : `task-${this.taskId}`;

      availableOptions.forEach((tag, index) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'tag-option-wrapper';
        wrapper.setAttribute('role', 'presentation');

        const option = document.createElement('button');
        option.type = 'button';
        option.className = 'tag-option';
        option.setAttribute('role', 'option');
        option.setAttribute('data-tag-option', tag);
        option.id = `${selectorId}-option-${index}`;
        option.setAttribute('aria-selected', 'false');

        const icon = document.createElement('span');
        icon.className = 'tag-option-icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = '⋮⋮';

        const label = document.createElement('span');
        label.className = 'tag-option-label';
        label.textContent = tag;

        option.append(icon, label);

        option.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          this.selectTag(tag);
        });

        const actions = document.createElement('div');
        actions.className = 'tag-option-actions';

        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'tag-option-action edit';
        editBtn.title = `タグ「${tag}」を編集`;
        editBtn.setAttribute('aria-label', `タグ「${tag}」を編集`);
        editBtn.innerHTML = '<span aria-hidden="true">✎</span>';
        editBtn.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          startInlineTagEdit(tag, { context: 'task', wrapper, taskId: this.taskId, selector: this });
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'tag-option-action delete';
        deleteBtn.title = `タグ「${tag}」を削除`;
        deleteBtn.setAttribute('aria-label', `タグ「${tag}」を削除`);
        deleteBtn.innerHTML = '<span aria-hidden="true">🗑</span>';
        deleteBtn.addEventListener('click', async (event) => {
          event.preventDefault();
          event.stopPropagation();
          this.closeDropdown();
          await handleDeleteTag(tag);
        });

        actions.append(editBtn, deleteBtn);
        wrapper.append(option, actions);
        this.optionsList.appendChild(wrapper);
      });
    }

    if (this.state.open) {
      this.updateActiveOptionStyles();
    }
  }

  updateActiveOptionStyles() {
    if (this.destroyed || !this.optionsList) {
      return;
    }

    const buttons = Array.from(this.optionsList.querySelectorAll('[data-tag-option]'));
    buttons.forEach((button, index) => {
      if (index === this.state.activeIndex) {
        button.classList.add('active');
        button.setAttribute('aria-selected', 'true');
        button.scrollIntoView({ block: 'nearest' });
        if (this.searchInput) {
          this.searchInput.setAttribute('aria-activedescendant', button.id);
        }
      } else {
        button.classList.remove('active');
        button.setAttribute('aria-selected', 'false');
      }
    });

    if (this.state.activeIndex === -1 || !buttons[this.state.activeIndex]) {
      if (this.searchInput) {
        this.searchInput.removeAttribute('aria-activedescendant');
      }
    }
  }

  moveActiveOption(delta) {
    if (!this.state.options.length) {
      this.state.activeIndex = -1;
      this.updateActiveOptionStyles();
      return;
    }

    const length = this.state.options.length;
    const next = this.state.activeIndex + delta;
    const normalized = ((next % length) + length) % length;
    this.state.activeIndex = normalized;
    this.updateActiveOptionStyles();
  }

  getActiveOptionValue() {
    if (this.state.activeIndex < 0) {
      return '';
    }
    return this.state.options[this.state.activeIndex] || '';
  }

  async selectTag(tag) {
    if (this.destroyed || this.pending) {
      return;
    }
    if (!tag || this.selectedTags.includes(tag)) {
      return;
    }

    const nextTags = dedupeTags([...this.selectedTags, tag]);
    this.pending = true;
    try {
      await saveTaskTags(this.taskId, nextTags);
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      this.pending = false;
    }

    if (this.destroyed) {
      return;
    }

    this.selectedTags = nextTags;
    this.state.query = '';
    if (this.searchInput) {
      this.searchInput.value = '';
    }
    this.render();
    this.focusSearchInput();
  }

  async removeTag(tag) {
    if (this.destroyed || this.pending) {
      return;
    }

    const nextTags = this.selectedTags.filter((name) => name !== tag);
    if (nextTags.length === this.selectedTags.length) {
      return;
    }

    this.pending = true;
    try {
      await saveTaskTags(this.taskId, nextTags);
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      this.pending = false;
    }

    if (this.destroyed) {
      return;
    }

    this.selectedTags = nextTags;
    this.render();
    this.focusSearchInput();
  }

  async removeLastTag() {
    if (!this.selectedTags.length) {
      return;
    }
    const last = this.selectedTags[this.selectedTags.length - 1];
    await this.removeTag(last);
  }

  async createTagFromQuery(raw) {
    if (this.destroyed || this.pending) {
      return;
    }
    try {
      const created = await ensureTagExists(raw);
      if (!created) {
        return;
      }
      await this.selectTag(created);
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  }

  handleDocumentMouseDown(event) {
    if (!this.state.open || this.destroyed) {
      return;
    }
    if (this.contains(event.target)) {
      return;
    }
    this.closeDropdown();
  }

  handleWrapperMouseDown(event) {
    if (event.target.closest('.tag-chip-remove')) {
      return;
    }
    event.preventDefault();
    this.openDropdown();
    this.focusSearchInput({ preventScroll: true });
  }

  handleWrapperClick(event) {
    if (event.target.closest('.tag-chip-remove')) {
      return;
    }
    this.openDropdown();
    this.focusSearchInput();
  }

  handleWrapperFocus() {
    this.openDropdown();
    this.focusSearchInput({ preventScroll: true });
  }

  async handleWrapperKeyDown(event) {
    if (event.key === 'Tab') {
      return;
    }

    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault();
      await this.removeLastTag();
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.openDropdown();
      this.focusSearchInput();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.openDropdown();
      this.focusSearchInput();
      if (this.state.activeIndex === -1) {
        this.moveActiveOption(1);
      } else {
        this.updateActiveOptionStyles();
      }
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.openDropdown();
      this.focusSearchInput();
      if (this.state.activeIndex === -1) {
        this.moveActiveOption(-1);
      } else {
        this.updateActiveOptionStyles();
      }
      return;
    }

    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      this.openDropdown();
      this.focusSearchInput();
      if (this.searchInput) {
        this.searchInput.value = event.key;
      }
      this.setQuery(event.key);
      this.renderOptions();
      if (this.searchInput) {
        const length = this.searchInput.value.length;
        this.searchInput.setSelectionRange(length, length);
      }
    }
  }

  handleSearchFocus() {
    this.openDropdown();
  }

  handleSearchInput(event) {
    this.setQuery(event.target.value);
    this.openDropdown();
    this.renderOptions();
  }

  async handleSearchKeyDown(event) {
    if (event.key === 'Backspace' && !this.searchInput.value) {
      event.preventDefault();
      await this.removeLastTag();
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeDropdown();
      this.searchInput.blur();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!this.state.open) {
        this.openDropdown();
      }
      this.moveActiveOption(1);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!this.state.open) {
        this.openDropdown();
      }
      this.moveActiveOption(-1);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const optionValue = this.getActiveOptionValue();
      if (optionValue) {
        await this.selectTag(optionValue);
        return;
      }

      const trimmed = this.searchInput.value.trim();
      if (trimmed) {
        const normalized = normalizeTagName(trimmed);
        const exactOption = this.state.options.find((tag) => normalizeTagName(tag) === normalized);
        if (exactOption) {
          await this.selectTag(exactOption);
          return;
        }
        const existing = state.availableTags.find((tag) => normalizeTagName(tag) === normalized);
        if (existing) {
          await this.selectTag(existing);
          return;
        }
        await this.createTagFromQuery(trimmed);
        return;
      }

      const firstOption = this.optionsList ? this.optionsList.querySelector('[data-tag-option]') : null;
      if (firstOption) {
        const value = firstOption.getAttribute('data-tag-option');
        await this.selectTag(value);
      }
      return;
    }

    if (event.key === 'Tab' && this.state.open) {
      this.closeDropdown();
    }
  }

  handleDropdownKeyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      if (event.target && typeof event.target.blur === 'function') {
        event.target.blur();
      }
      this.closeDropdown();
    }
  }
}

function renderTaskTagSelector(container, task) {
  if (!container || !task) {
    return;
  }

  const existing = taskTagSelectors.get(task.id);
  if (existing) {
    existing.destroy();
    taskTagSelectors.delete(task.id);
  }

  const selector = new TaskTagSelector(task, container);
  taskTagSelectors.set(task.id, selector);
}

function clearTaskTagSelectors() {
  taskTagSelectors.forEach((selector) => selector.destroy());
  taskTagSelectors.clear();
}

function startInlineTagEdit(tag, { context, wrapper, taskId, selector }) {
  if (!wrapper) {
    return;
  }

  wrapper.classList.add('editing');
  wrapper.innerHTML = '';

  if (context === 'form') {
    formTagUIState.activeIndex = -1;
    if (formTagSearchInput) {
      formTagSearchInput.removeAttribute('aria-activedescendant');
    }
  }

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'tag-edit-input';
  input.value = tag;

  const actions = document.createElement('div');
  actions.className = 'tag-edit-actions';

  const confirmBtn = document.createElement('button');
  confirmBtn.type = 'button';
  confirmBtn.className = 'tag-edit-confirm';
  confirmBtn.textContent = '保存';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'tag-edit-cancel';
  cancelBtn.textContent = 'キャンセル';

  actions.append(confirmBtn, cancelBtn);
  wrapper.append(input, actions);

  const exitEdit = () => {
    if (context === 'form') {
      renderFormTags();
    } else if (selector && !selector.destroyed) {
      selector.render();
    } else {
      renderTasks();
    }
  };

  cancelBtn.addEventListener('click', exitEdit);
  cancelBtn.addEventListener('click', (event) => event.stopPropagation());

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      confirmBtn.click();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      exitEdit();
    }
  });

  confirmBtn.addEventListener('click', async () => {
    const trimmed = input.value.trim();
    if (!trimmed) {
      alert('タグ名を入力してください。');
      input.focus();
      return;
    }
    if (trimmed === tag) {
      exitEdit();
      return;
    }

    confirmBtn.disabled = true;
    cancelBtn.disabled = true;

    try {
      await submitTagRename(tag, trimmed);
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      exitEdit();
    }
  });
  confirmBtn.addEventListener('click', (event) => event.stopPropagation());

  requestAnimationFrame(() => {
    input.focus();
    input.select();
  });
}

async function submitTagRename(oldName, newName) {
  const res = await fetch(`/api/tags/${encodeURIComponent(oldName)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: newName })
  });

  const payload = await parseResponseJson(res);
  if (!res.ok) {
    throw new Error(payload?.error || `Failed to rename tag. (status ${res.status})`);
  }

  state.formTags = state.formTags.map((name) => (name === oldName ? newName : name));
  if (Array.isArray(payload?.tags)) {
    state.availableTags = payload.tags;
  }

  renderFormTags();
  await loadTasks();
}

async function handleDeleteTag(tag) {
  const confirmed = window.confirm(`タグ「${tag}」を削除しますか？\nこのタグはすべてのタスクからも削除されます。`);
  if (!confirmed) {
    return;
  }

  try {
    const res = await fetch(`/api/tags/${encodeURIComponent(tag)}`, {
      method: 'DELETE'
    });

    const payload = await parseResponseJson(res);
    if (!res.ok) {
      throw new Error(payload?.error || `Failed to delete tag. (status ${res.status})`);
    }

    state.formTags = state.formTags.filter((name) => name !== tag);
    if (Array.isArray(payload?.tags)) {
      state.availableTags = payload.tags;
      renderFormTags();
    }
    await loadTasks();
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
}

function matchesDateRange(value, from, to) {
  if (!from && !to) {
    return true;
  }

  let start = from || '';
  let end = to || '';
  if (start && end && start > end) {
    const temp = start;
    start = end;
    end = temp;
  }

  const target = getDatePortion(value);
  if (!target) {
    return false;
  }

  if (start && target < start) {
    return false;
  }

  if (end && target > end) {
    return false;
  }

  return true;
}

function revertField(field) {
  const listItem = field.closest('.task');
  if (!listItem) {
    return;
  }

  const { taskId } = listItem.dataset;
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) {
    return;
  }

  const key = field.dataset.editField;
  if (key === 'title') {
    field.textContent = task.title;
  }
}

async function handleInlineEdit(event) {
  const field = event.target.closest('[data-edit-field]');
  if (!field) {
    return;
  }

  const listItem = field.closest('.task');
  if (!listItem) {
    return;
  }

  const { taskId } = listItem.dataset;
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) {
    return;
  }

  const key = field.dataset.editField;
  const rawValue = field.textContent.replace(/\u00a0/g, ' ');
  const trimmedValue = rawValue.trim();
  // Ensure the DOM reflects the canonical trimmed text.
  field.textContent = trimmedValue;

  if (key === 'title' && !trimmedValue) {
    alert('Title cannot be empty.');
    revertField(field);
    return;
  }

  const currentValue = (task[key] || '').trim();
  if (trimmedValue === currentValue) {
    revertField(field);
    return;
  }

  const payload = {
    [key]: trimmedValue
  };

  try {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to update task.');
    }

    const updatedTask = await res.json();
    const index = state.tasks.findIndex((item) => item.id === updatedTask.id);
    if (index !== -1) {
      state.tasks[index] = updatedTask;
    }
    renderTasks();
  } catch (err) {
    console.error(err);
    alert(err.message);
    revertField(field);
  }
}

function revertStatus(select) {
  if (select && typeof select.dataset.prevStatus === 'string') {
    select.value = select.dataset.prevStatus;
  }
}

function revertDueDate(input) {
  if (input && typeof input.dataset.prevDueDate === 'string') {
    input.value = input.dataset.prevDueDate;
  }
}

function openDatePicker(input) {
  if (!input) {
    return;
  }
  try {
    input.focus({ preventScroll: true });
  } catch (err) {
    input.focus();
  }
  if (typeof input.showPicker === 'function') {
    try {
      input.showPicker();
    } catch (err) {
      // Some browsers may throw if showPicker is not allowed; ignore.
    }
  }
}

function formatDateTime(isoString) {
  if (!isoString) {
    return '';
  }
  return new Date(isoString).toLocaleString();
}

function formatDateDisplay(dateString, fallback = '—') {
  if (!dateString) {
    return fallback;
  }

  const iso = `${dateString}T00:00:00`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

function isPastDate(dateString) {
  if (!dateString) {
    return false;
  }
  const today = new Date().toISOString().slice(0, 10);
  return dateString < today;
}

function formatRelativeTime(isoString) {
  const value = Date.now() - new Date(isoString).getTime();
  const seconds = Math.floor(value / 1000);

  if (seconds < 60) {
    return 'just now';
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }

  return new Date(isoString).toLocaleString();
}

(async function init() {
  await loadTags();
  await loadTasks();
})();
