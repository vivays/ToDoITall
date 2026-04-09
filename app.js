const STORAGE_KEY = 'parallel-universe-todo-v1';

const UNIVERSE_META = {
  A: {
    title: 'Plan A · Focus Universe',
    shortLabel: '집중 잘 되는 날',
    description: '에너지가 충분한 날. 깊게 몰입해야 하는 핵심 작업을 배치하세요.',
  },
  B: {
    title: 'Plan B · Normal Universe',
    shortLabel: '평범한 날',
    description: '무리하지 않는 보통의 하루. 현실적으로 끝낼 수 있는 작업을 담으세요.',
  },
  C: {
    title: 'Plan C · Low Energy Universe',
    shortLabel: '체력이 낮은 날',
    description: '지치거나 일정이 꼬인 날. 가벼운 일과 유지 작업 위주로 준비하세요.',
  },
};

const dom = {
  dateInput: document.getElementById('dateInput'),
  dateDisplay: document.getElementById('dateDisplay'),
  prevDateBtn: document.getElementById('prevDateBtn'),
  todayBtn: document.getElementById('todayBtn'),
  nextDateBtn: document.getElementById('nextDateBtn'),
  universeSummary: document.getElementById('universeSummary'),
  tabButtons: document.querySelectorAll('.tab-btn'),
  activeUniverseTitle: document.getElementById('activeUniverseTitle'),
  activeUniverseDescription: document.getElementById('activeUniverseDescription'),
  currentUniverseLabel: document.getElementById('currentUniverseLabel'),
  completionRate: document.getElementById('completionRate'),
  progressFill: document.getElementById('progressFill'),
  progressText: document.getElementById('progressText'),
  taskCountBadge: document.getElementById('taskCountBadge'),
  todoForm: document.getElementById('todoForm'),
  todoInput: document.getElementById('todoInput'),
  todoList: document.getElementById('todoList'),
  emptyState: document.getElementById('emptyState'),
  todoItemTemplate: document.getElementById('todoItemTemplate'),
};

const appState = loadState();
let selectedDate = getTodayKey();

initialize();

function initialize() {
  ensureDayPlan(selectedDate);
  bindEvents();
  render();
}

function bindEvents() {
  dom.dateInput.addEventListener('change', (event) => {
    selectedDate = event.target.value || getTodayKey();
    ensureDayPlan(selectedDate);
    render();
  });

  dom.prevDateBtn.addEventListener('click', () => {
    selectedDate = shiftDate(selectedDate, -1);
    ensureDayPlan(selectedDate);
    render();
  });

  dom.todayBtn.addEventListener('click', () => {
    selectedDate = getTodayKey();
    ensureDayPlan(selectedDate);
    render();
  });

  dom.nextDateBtn.addEventListener('click', () => {
    selectedDate = shiftDate(selectedDate, 1);
    ensureDayPlan(selectedDate);
    render();
  });

  dom.tabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const universeKey = button.dataset.universe;
      setSelectedUniverse(selectedDate, universeKey);
    });
  });

  dom.todoForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = dom.todoInput.value.trim();
    if (!text) {
      return;
    }

    addTodo(selectedDate, getCurrentUniverseKey(), text);
    dom.todoInput.value = '';
    dom.todoInput.focus();
  });
}

function render() {
  const dayPlan = ensureDayPlan(selectedDate);
  const currentUniverse = dayPlan.selectedUniverse;
  const todos = dayPlan.universes[currentUniverse];
  const meta = UNIVERSE_META[currentUniverse];

  dom.dateInput.value = selectedDate;
  dom.dateDisplay.textContent = formatDateLabel(selectedDate);
  dom.activeUniverseTitle.textContent = meta.title;
  dom.activeUniverseDescription.textContent = meta.description;
  dom.currentUniverseLabel.textContent = currentUniverse;
  dom.taskCountBadge.textContent = `${todos.length}개`;

  dom.tabButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.universe === currentUniverse);
    button.setAttribute('aria-selected', String(button.dataset.universe === currentUniverse));
  });

  renderUniverseSummary(dayPlan);
  renderTodoList(todos);
  renderProgress(todos);
}

function renderUniverseSummary(dayPlan) {
  dom.universeSummary.innerHTML = '';

  Object.keys(UNIVERSE_META).forEach((key) => {
    const todos = dayPlan.universes[key];
    const completedCount = todos.filter((todo) => todo.completed).length;
    const totalCount = todos.length;
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = `summary-tile ${dayPlan.selectedUniverse === key ? 'active' : ''}`;
    tile.innerHTML = `
      <div class="summary-head">
        <div>
          <h3 class="summary-title">${key} · ${UNIVERSE_META[key].shortLabel}</h3>
        </div>
        <span class="badge">${totalCount}개</span>
      </div>
      <p class="summary-desc">${UNIVERSE_META[key].description}</p>
      <div class="summary-foot">
        <span>완료 ${completedCount}</span>
        <span>${getCompletionPercentage(completedCount, totalCount)}%</span>
      </div>
    `;
    tile.addEventListener('click', () => setSelectedUniverse(selectedDate, key));
    dom.universeSummary.appendChild(tile);
  });
}

function renderTodoList(todos) {
  dom.todoList.innerHTML = '';

  if (todos.length === 0) {
    dom.emptyState.classList.remove('hidden');
  } else {
    dom.emptyState.classList.add('hidden');
  }

  todos.forEach((todo) => {
    const fragment = dom.todoItemTemplate.content.cloneNode(true);
    const item = fragment.querySelector('.todo-item');
    const checkbox = fragment.querySelector('input[type="checkbox"]');
    const textNode = fragment.querySelector('.todo-text');
    const createdAtNode = fragment.querySelector('.todo-created-at');
    const editButton = fragment.querySelector('.edit-btn');
    const deleteButton = fragment.querySelector('.delete-btn');

    item.dataset.id = todo.id;
    item.classList.toggle('completed', todo.completed);
    checkbox.checked = todo.completed;
    checkbox.setAttribute('aria-label', `${todo.text} 완료 상태 변경`);
    textNode.textContent = todo.text;
    createdAtNode.textContent = `추가: ${formatTime(todo.createdAt)}`;

    checkbox.addEventListener('change', () => {
      toggleTodo(selectedDate, getCurrentUniverseKey(), todo.id);
    });

    editButton.addEventListener('click', () => {
      const nextText = window.prompt('할 일을 수정하세요', todo.text);
      if (nextText === null) {
        return;
      }
      const trimmed = nextText.trim();
      if (!trimmed) {
        window.alert('빈 내용으로는 수정할 수 없어요.');
        return;
      }
      editTodo(selectedDate, getCurrentUniverseKey(), todo.id, trimmed);
    });

    deleteButton.addEventListener('click', () => {
      deleteTodo(selectedDate, getCurrentUniverseKey(), todo.id);
    });

    dom.todoList.appendChild(fragment);
  });
}

function renderProgress(todos) {
  const completedCount = todos.filter((todo) => todo.completed).length;
  const percentage = getCompletionPercentage(completedCount, todos.length);
  dom.progressFill.style.width = `${percentage}%`;
  dom.progressText.textContent = `${completedCount} / ${todos.length} 완료`;
  dom.completionRate.textContent = `${percentage}%`;
}

function addTodo(dateKey, universeKey, text) {
  const dayPlan = ensureDayPlan(dateKey);
  dayPlan.universes[universeKey].unshift({
    id: createId(),
    text,
    completed: false,
    createdAt: new Date().toISOString(),
  });
  persistAndRender();
}

function toggleTodo(dateKey, universeKey, todoId) {
  const todos = ensureDayPlan(dateKey).universes[universeKey];
  const target = todos.find((todo) => todo.id === todoId);
  if (!target) {
    return;
  }
  target.completed = !target.completed;
  persistAndRender();
}

function editTodo(dateKey, universeKey, todoId, nextText) {
  const todos = ensureDayPlan(dateKey).universes[universeKey];
  const target = todos.find((todo) => todo.id === todoId);
  if (!target) {
    return;
  }
  target.text = nextText;
  persistAndRender();
}

function deleteTodo(dateKey, universeKey, todoId) {
  const dayPlan = ensureDayPlan(dateKey);
  dayPlan.universes[universeKey] = dayPlan.universes[universeKey].filter((todo) => todo.id !== todoId);
  persistAndRender();
}

function setSelectedUniverse(dateKey, universeKey) {
  const dayPlan = ensureDayPlan(dateKey);
  dayPlan.selectedUniverse = universeKey;
  persistAndRender();
}

function getCurrentUniverseKey() {
  return ensureDayPlan(selectedDate).selectedUniverse;
}

function ensureDayPlan(dateKey) {
  if (!appState.days[dateKey]) {
    appState.days[dateKey] = createEmptyDayPlan();
  }
  return appState.days[dateKey];
}

function createEmptyDayPlan() {
  return {
    selectedUniverse: 'A',
    universes: {
      A: [],
      B: [],
      C: [],
    },
  };
}

function loadState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { days: {} };
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !parsed.days) {
      return { days: {} };
    }
    return parsed;
  } catch (error) {
    console.warn('스토리지 데이터를 불러오는 중 문제가 발생했습니다.', error);
    return { days: {} };
  }
}

function persistAndRender() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  } catch (error) {
    console.warn('스토리지 저장에 실패했습니다.', error);
  }
  render();
}

function getTodayKey() {
  const now = new Date();
  return formatDateKey(now);
}

function shiftDate(dateKey, offsetDays) {
  const target = new Date(`${dateKey}T12:00:00`);
  target.setDate(target.getDate() + offsetDays);
  return formatDateKey(target);
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateLabel(dateKey) {
  const date = new Date(`${dateKey}T12:00:00`);
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(date);
}

function formatTime(isoString) {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('ko-KR', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function createId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `todo-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getCompletionPercentage(completedCount, totalCount) {
  if (totalCount === 0) {
    return 0;
  }
  return Math.round((completedCount / totalCount) * 100);
}
