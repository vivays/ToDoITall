const STORAGE_KEY = 'admission-dashboard-v3';
const SUBJECTS = ['국어', '수학', '영어', '탐구', '논술', '면접', '자율'];
const IMPORTANCE_OPTIONS = [
  { value: 'normal', label: '보통', points: 10 },
  { value: 'important', label: '중요', points: 20 },
  { value: 'critical', label: '매우 중요', points: 30 },
];

const DEFAULT_TARGET_SCORES = [1200, 1100, 1000, 900, 800];

const state = {
  app: loadState(),
  selectedDate: todayKey(),
  adminUnlocked: false,
  editingTaskId: null,
  setupNames: ['', '', ''],
  viewMode: 'day',
};

function defaultState() {
  return {
    universities: [],
    studyTasks: [],
    adminConfig: { pinCode: '1234' },
    universitySetupLocked: false,
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
      || localStorage.getItem('admission-dashboard-v2')
      || localStorage.getItem('admission-dashboard-v1');
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    const universities = (parsed.universities ?? []).map((uni, index) => ({
      ...uni,
      targetScore: Number(uni.targetScore || DEFAULT_TARGET_SCORES[index] || 900),
    }));
    return {
      universities,
      studyTasks: (parsed.studyTasks ?? []).map((task) => ({ ...task, linkedUniversityId: task.linkedUniversityId || '' })),
      adminConfig: parsed.adminConfig ?? { pinCode: '1234' },
      universitySetupLocked: parsed.universitySetupLocked ?? false,
    };
  } catch {
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.app));
}

function todayKey() {
  return formatDateKey(new Date());
}

function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDateKey(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDateLabel(dateKey) {
  if (!dateKey) return '';
  const [y, m, d] = dateKey.split('-');
  return `${y}. ${m}. ${d}`;
}

function getWeekStart(dateKey) {
  const date = parseDateKey(dateKey);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return formatDateKey(date);
}

function getWeekEnd(dateKey) {
  const date = parseDateKey(getWeekStart(dateKey));
  date.setDate(date.getDate() + 6);
  return formatDateKey(date);
}

function getMonthStart(dateKey) {
  const date = parseDateKey(dateKey);
  return formatDateKey(new Date(date.getFullYear(), date.getMonth(), 1));
}

function getMonthEnd(dateKey) {
  const date = parseDateKey(dateKey);
  return formatDateKey(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

function getTasksForDate(dateKey) {
  return state.app.studyTasks
    .filter((task) => task.dateKey === dateKey)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function getCalendarWeekKeys(dateKey) {
  const start = parseDateKey(getWeekStart(dateKey));
  return Array.from({ length: 7 }, (_, index) => {
    const next = new Date(start);
    next.setDate(start.getDate() + index);
    return formatDateKey(next);
  });
}

function getCalendarMonthCells(dateKey) {
  const selected = parseDateKey(dateKey);
  const monthStart = new Date(selected.getFullYear(), selected.getMonth(), 1);
  const offset = monthStart.getDay() === 0 ? 6 : monthStart.getDay() - 1;
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - offset);
  return Array.from({ length: 42 }, (_, index) => {
    const next = new Date(gridStart);
    next.setDate(gridStart.getDate() + index);
    return {
      dateKey: formatDateKey(next),
      inCurrentMonth: next.getMonth() === selected.getMonth(),
    };
  });
}

function getRangeTasks() {
  return getVisibleTasks();
}

function getDetailTasks() {
  return getTasksForDate(state.selectedDate);
}

function createId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

function getPointsByImportance(value) {
  return IMPORTANCE_OPTIONS.find((item) => item.value === value)?.points ?? 10;
}

function getImportanceLabel(value) {
  return IMPORTANCE_OPTIONS.find((item) => item.value === value)?.label ?? '보통';
}

function getRankedUniversities() {
  const totalPoints = state.app.studyTasks
    .filter((task) => task.completed)
    .reduce((sum, task) => sum + task.pointsAwarded, 0);

  return state.app.universities
    .map((uni, index) => {
      const targetScore = Number(uni.targetScore || DEFAULT_TARGET_SCORES[index] || 900);
      const progress = targetScore > 0 ? Math.min(100, Math.round((totalPoints / targetScore) * 100)) : 0;
      const remaining = Math.max(0, targetScore - totalPoints);
      return { ...uni, targetScore, totalPoints, progress, remaining };
    })
    .sort((a, b) => b.progress - a.progress || a.targetScore - b.targetScore || a.createdAt.localeCompare(b.createdAt));
}

function isTaskInCurrentRange(task) {
  if (state.viewMode === 'day') return task.dateKey === state.selectedDate;
  if (state.viewMode === 'week') {
    return task.dateKey >= getWeekStart(state.selectedDate) && task.dateKey <= getWeekEnd(state.selectedDate);
  }
  return task.dateKey >= getMonthStart(state.selectedDate) && task.dateKey <= getMonthEnd(state.selectedDate);
}

function getVisibleTasks() {
  return state.app.studyTasks
    .filter((task) => isTaskInCurrentRange(task))
    .sort((a, b) => {
      if (a.dateKey !== b.dateKey) return a.dateKey < b.dateKey ? 1 : -1;
      return b.createdAt.localeCompare(a.createdAt);
    });
}

function getWeeklyStats() {
  const end = new Date(state.selectedDate);
  const start = new Date(end);
  start.setDate(end.getDate() - 6);
  const startKey = formatDateKey(start);
  const relevant = state.app.studyTasks.filter((task) => task.dateKey >= startKey && task.dateKey <= state.selectedDate);
  return {
    completedCount: relevant.filter((task) => task.completed).length,
    points: relevant.filter((task) => task.completed).reduce((sum, task) => sum + task.pointsAwarded, 0),
    minutes: relevant.reduce((sum, task) => sum + Number(task.estimatedMinutes || 0), 0),
  };
}

function getRecentLogs() {
  return state.app.studyTasks
    .filter((task) => task.completed && task.completedAt)
    .sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''))
    .slice(0, 5)
    .map((task) => `${task.title} 완료 · +${task.pointsAwarded}점`);
}

function getTaskFormValues() {
  return {
    title: document.getElementById('taskTitleInput')?.value.trim() || '',
    subject: document.getElementById('taskSubjectInput')?.value || '수학',
    importance: document.getElementById('taskImportanceInput')?.value || 'important',
    estimatedMinutes: document.getElementById('taskMinutesInput')?.value || '60',
    dateKey: document.getElementById('taskDateInput')?.value || state.selectedDate,
  };
}

function populateTaskForm(task) {
  document.getElementById('taskTitleInput').value = task?.title || '';
  document.getElementById('taskSubjectInput').value = task?.subject || '수학';
  document.getElementById('taskImportanceInput').value = task?.importance || 'important';
  document.getElementById('taskMinutesInput').value = task?.estimatedMinutes || '60';
  document.getElementById('taskDateInput').value = task?.dateKey || state.selectedDate;
  updateExpectedPointsLabel();
}

function resetTaskForm() {
  state.editingTaskId = null;
  populateTaskForm(null);
  document.getElementById('saveTaskBtn').textContent = '공부 추가';
  document.getElementById('cancelEditBtn').classList.add('hidden');
  updateEditHint();
}

function updateEditHint() {
  const box = document.getElementById('editHintBox');
  const task = state.editingTaskId ? state.app.studyTasks.find((item) => item.id === state.editingTaskId) : null;
  if (!task) {
    box.classList.add('hidden');
    box.textContent = '';
    return;
  }

  const base = `현재 '${task.title}' 항목을 편집 중입니다.`;
  const suffix = state.adminUnlocked
    ? ' 엄마 모드이므로 과목까지 수정할 수 있습니다.'
    : ' 기본 모드에서는 과목 변경이 잠겨 있습니다.';
  box.textContent = base + suffix;
  box.classList.remove('hidden');
}

function updateExpectedPointsLabel() {
  const importance = document.getElementById('taskImportanceInput')?.value || 'important';
  document.getElementById('expectedPointsLabel').textContent = `예상 점수 · ${getPointsByImportance(importance)}점`;
}

function getViewMeta() {
  if (state.viewMode === 'day') {
    return {
      title: '일별 공부 리스트',
      subtitle: '선택한 하루의 공부 항목을 확인하고 관리합니다.',
      label: formatDateLabel(state.selectedDate),
    };
  }
  if (state.viewMode === 'week') {
    return {
      title: '주간 공부 리스트',
      subtitle: '선택한 날짜가 포함된 주간 범위의 항목을 확인합니다.',
      label: `${formatDateLabel(getWeekStart(state.selectedDate))} ~ ${formatDateLabel(getWeekEnd(state.selectedDate))}`,
    };
  }
  return {
    title: '월간 공부 리스트',
    subtitle: '선택한 날짜가 포함된 월간 범위의 항목을 확인합니다.',
    label: `${state.selectedDate.slice(0, 7).replace('-', '. ')}`,
  };
}

function renderViewControls() {
  const chips = Array.from(document.querySelectorAll('[data-view-mode]'));
  chips.forEach((chip) => {
    const mode = chip.dataset.viewMode;
    chip.classList.toggle('active', mode === state.viewMode);
    chip.onclick = () => {
      if (!mode || mode === state.viewMode) return;
      state.viewMode = mode;
      render();
    };
  });
}

function renderSetup() {
  const root = document.getElementById('appRoot');
  root.innerHTML = document.getElementById('setupTemplate').innerHTML;
  const inputsWrap = document.getElementById('setupInputs');
  inputsWrap.innerHTML = '';

  state.setupNames.forEach((value, index) => {
    const row = document.createElement('div');
    row.innerHTML = `
      <div class="input-label">목표 대학 ${index + 1}</div>
      <input class="text-input" data-setup-index="${index}" placeholder="${index === 0 ? '예: 서울대학교' : '목표 대학을 입력하세요'}" value="${escapeHtml(value)}" />
    `;
    inputsWrap.appendChild(row);
  });

  inputsWrap.querySelectorAll('input[data-setup-index]').forEach((input) => {
    input.addEventListener('input', (e) => {
      const index = Number(e.target.dataset.setupIndex);
      state.setupNames[index] = e.target.value;
    });
  });

  document.getElementById('addSetupSlotBtn').classList.toggle('hidden', state.setupNames.length >= 5);
  document.getElementById('addSetupSlotBtn').onclick = () => {
    if (state.setupNames.length < 5) {
      state.setupNames.push('');
      render();
    }
  };

  document.getElementById('confirmSetupBtn').onclick = () => {
    const names = state.setupNames.map((name) => name.trim()).filter(Boolean);
    if (names.length < 3 || names.length > 5) {
      alert('목표 대학은 최소 3개, 최대 5개까지 입력할 수 있습니다.');
      return;
    }
    state.app.universities = names.map((name, index) => ({
      id: createId('uni'),
      name,
      targetScore: DEFAULT_TARGET_SCORES[index] || 900,
      createdAt: new Date().toISOString(),
    }));
    state.app.universitySetupLocked = true;
    saveState();
    render();
  };
}

function renderDashboard() {
  const root = document.getElementById('appRoot');
  root.innerHTML = document.getElementById('dashboardTemplate').innerHTML;

  const ranked = getRankedUniversities();
  const rangeTasks = getRangeTasks();
  const detailTasks = getDetailTasks();
  const completed = rangeTasks.filter((task) => task.completed);
  const visiblePoints = completed.reduce((sum, task) => sum + task.pointsAwarded, 0);
  const visibleMinutes = rangeTasks.reduce((sum, task) => sum + Number(task.estimatedMinutes || 0), 0);
  const completionRate = rangeTasks.length ? Math.round((completed.length / rangeTasks.length) * 100) : 0;
  const weekly = getWeeklyStats();
  const logs = getRecentLogs();
  const viewMeta = getViewMeta();

  document.getElementById('leaderBadge').textContent = ranked[0] ? `현재 1위 · ${ranked[0].name} (${ranked[0].progress}%)` : '현재 1위 · -';
  document.getElementById('todayLabel').textContent = viewMeta.label;
  document.getElementById('universityCountLabel').textContent = `목표 대학 ${state.app.universities.length}개`;
  document.getElementById('adminToggleBtn').textContent = state.adminUnlocked ? '엄마 모드 종료' : '엄마 모드';

  const heroStats = [
    ['공통 점수', `${visiblePoints}`, `${state.viewMode === 'day' ? '선택한 하루' : state.viewMode === 'week' ? '선택한 주간' : '선택한 월간'} 완료 항목 기준`],
    ['완료 수', `${completed.length}`, `${state.viewMode === 'day' ? '하루' : state.viewMode === 'week' ? '주간' : '월간'} 완료한 공부 항목 수`],
    ['예상 공부량', `${visibleMinutes}분`, '현재 보기 기준 전체 공부 시간'],
  ];
  document.getElementById('heroStats').innerHTML = heroStats.map(([label, value, desc]) => `
    <article class="stat-card glass">
      <div class="stat-label">${label}</div>
      <div class="stat-value">${value}</div>
      <div class="stat-desc">${desc}</div>
    </article>
  `).join('');

  renderPodium(ranked);
  renderAdminPanel();
  renderLeaderDetail(ranked[0]);
  renderTaskInputs();
  renderCalendarBoard();
  renderTaskList(detailTasks);
  renderRecentLogs(logs);
  renderWeeklyStats(weekly);
  renderViewControls();

  document.getElementById('taskListTitle').textContent = state.viewMode === 'day' ? viewMeta.title : `${viewMeta.title} 캘린더`;
  document.getElementById('taskSectionSubtitle').textContent = '입력한 항목은 완료 시 공통 점수로 바뀌고 대학 도달률 보드에 반영됩니다.';
  document.getElementById('calendarSectionSubtitle').textContent = state.viewMode === 'day'
    ? '날짜를 선택해 그날의 공부를 관리하세요.'
    : '날짜 칸을 클릭하면 해당 날짜의 상세 공부 항목을 아래에서 볼 수 있습니다.';
  const detailHead = document.getElementById('detailHead');
  if (state.viewMode === 'day') {
    detailHead.classList.add('hidden');
    detailHead.textContent = '';
  } else {
    detailHead.classList.remove('hidden');
    detailHead.textContent = `${formatDateLabel(state.selectedDate)} 상세 항목`; 
  }

  document.getElementById('selectedDateInput').value = state.selectedDate;
  document.getElementById('selectedDateInput').addEventListener('change', (e) => {
    state.selectedDate = e.target.value;
    render();
  });

  document.getElementById('completionRateLabel').textContent = `${completionRate}%`;
  document.getElementById('completionRateFill').style.width = `${completionRate}%`;
}

function getMedal(rank) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  return '🥉';
}

function renderPodium(ranked) {
  const leaderRoot = document.getElementById('leaderPodium');
  const restRoot = document.getElementById('podiumRest');
  const leader = ranked[0];
  const rest = ranked.slice(1);

  leaderRoot.innerHTML = leader ? `
    <article class="leader-rank-card glass-soft">
      <div class="leader-rank-top">
        <div>
          <div class="leader-rank-label">1위 대학</div>
          <div class="leader-rank-name"><span class="medal-inline">🥇</span>${escapeHtml(leader.name)}</div>
          <div class="leader-rank-desc">공통 누적 점수 대비 목표 점수 도달률이 가장 높습니다.</div>
        </div>
        <div class="leader-rank-badge">🥇 ${leader.progress}%</div>
      </div>
      <div class="leader-rank-stats">
        <div>
          <div class="leader-rank-stat-label">공통 누적 점수</div>
          <div class="leader-rank-stat-value">${leader.totalPoints.toLocaleString()}</div>
        </div>
        <div>
          <div class="leader-rank-stat-label">목표 점수 / 남은 점수</div>
          <div class="leader-rank-stat-value small">${leader.targetScore.toLocaleString()} / ${leader.remaining.toLocaleString()}</div>
        </div>
      </div>
    </article>
  ` : '<div class="hint-card">목표 대학 정보가 없습니다.</div>';

  restRoot.innerHTML = rest.map((uni, idx) => {
    const rank = idx + 2;
    return `
      <article class="rest-card rank-card-wide">
        <div>
          <div class="rest-rank">${rank}위</div>
          <div class="rest-name"><span class="medal-inline">${getMedal(rank)}</span>${escapeHtml(uni.name)}</div>
        </div>
        <div>
          <div class="rest-score">${uni.progress}%</div>
          <div class="rest-score-sub">목표 ${uni.targetScore.toLocaleString()}점</div>
        </div>
      </article>
    `;
  }).join('');
}

function renderAdminPanel() {
  const panel = document.getElementById('adminPanel');
  panel.classList.toggle('hidden', !state.adminUnlocked);
  if (!state.adminUnlocked) return;

  panel.innerHTML = `
    <div class="section-head">
      <div>
        <div class="section-title">엄마 모드</div>
        <div class="section-subtitle">목표 대학 이름, 목표 점수, 엄마 모드 PIN 변경은 이 모드에서만 진행합니다.</div>
      </div>
    </div>
    <div class="admin-grid">
      ${state.app.universities.map((uni, idx) => `
        <div class="admin-row admin-row-wide">
          <div>
            <div class="input-label">목표 대학 ${idx + 1}</div>
            <input class="text-input admin-uni-input" data-id="${uni.id}" value="${escapeHtml(uni.name)}" />
          </div>
          <div>
            <div class="input-label">목표 점수</div>
            <input class="text-input admin-target-input" type="number" min="100" step="10" data-id="${uni.id}" value="${Number(uni.targetScore || DEFAULT_TARGET_SCORES[idx] || 900)}" />
          </div>
          <button class="ghost-btn admin-delete-btn" data-id="${uni.id}" ${state.app.universities.length <= 3 ? 'disabled' : ''}>삭제</button>
        </div>
      `).join('')}
      <div class="admin-actions-row">
        ${state.app.universities.length < 5 ? '<button class="ghost-btn" id="addUniversityBtn">+ 대학 추가</button>' : ''}
        <button class="primary-btn" id="saveUniversityBtn">학교 / 목표 점수 저장</button>
      </div>
      <div class="admin-pin-wrap">
        <div>
          <div class="input-label">엄마 모드 PIN 변경</div>
          <div class="admin-inline-help">현재 엄마 모드에 들어와 있으므로 새 PIN을 입력하고 저장할 수 있습니다.</div>
        </div>
        <div class="admin-pin-grid">
          <input class="text-input" id="adminPinChangeInput" type="password" value="${escapeHtml(state.app.adminConfig.pinCode)}" placeholder="새 PIN 입력" />
          <button class="primary-btn" id="saveAdminPinBtn">PIN 저장</button>
        </div>
      </div>
    </div>
  `;

  panel.querySelectorAll('.admin-delete-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      if (state.app.universities.length <= 3) return;
      const id = e.currentTarget.dataset.id;
      state.app.universities = state.app.universities.filter((item) => item.id !== id);
      saveState();
      render();
    });
  });

  const addBtn = document.getElementById('addUniversityBtn');
  if (addBtn) {
    addBtn.onclick = () => {
      if (state.app.universities.length >= 5) return;
      state.app.universities.push({ id: createId('uni'), name: '새 목표 대학', targetScore: DEFAULT_TARGET_SCORES[state.app.universities.length] || 900, createdAt: new Date().toISOString() });
      saveState();
      render();
    };
  }

  document.getElementById('saveUniversityBtn').onclick = () => {
    panel.querySelectorAll('.admin-uni-input').forEach((input) => {
      const uni = state.app.universities.find((item) => item.id === input.dataset.id);
      if (uni) uni.name = input.value.trim() || uni.name;
    });
    panel.querySelectorAll('.admin-target-input').forEach((input) => {
      const uni = state.app.universities.find((item) => item.id === input.dataset.id);
      if (uni) uni.targetScore = Math.max(100, Number(input.value || uni.targetScore || 900));
    });
    saveState();
    render();
  };

  document.getElementById('saveAdminPinBtn').onclick = () => {
    const nextPin = document.getElementById('adminPinChangeInput').value.trim();
    if (nextPin.length < 4) {
      alert('엄마 모드 PIN은 4자리 이상으로 입력하세요.');
      return;
    }
    state.app.adminConfig.pinCode = nextPin;
    saveState();
    alert('엄마 모드 PIN이 변경되었습니다.');
  };
}

function renderLeaderDetail(leader) {
  const box = document.getElementById('leaderDetail');
  if (!leader) {
    box.innerHTML = '<div class="hint-card">아직 목표 대학이 없습니다.</div>';
    return;
  }
  const progress = leader.progress || 0;
  box.innerHTML = `
    <div class="leader-card">
      <div class="leader-top">
        <div>
          <div class="leader-label">현재 1위 도달률</div>
          <div class="leader-name">${escapeHtml(leader.name)}</div>
        </div>
        <div class="top-badge">${progress}%</div>
      </div>
      <div style="margin-top: 16px;" class="progress-wrap">
        <div class="progress-meta"><span>목표 점수 대비 도달률</span><strong>${progress}%</strong></div>
        <div class="progress-bar"><div class="progress-fill" style="width:${progress}%"></div></div>
      </div>
      <div class="leader-desc">현재 공통 누적 점수는 <strong>${leader.totalPoints.toLocaleString()}점</strong>이며, ${escapeHtml(leader.name)}의 목표 점수 <strong>${leader.targetScore.toLocaleString()}점</strong> 대비 남은 점수는 <strong>${leader.remaining.toLocaleString()}점</strong>입니다.</div>
    </div>
  `;
}

function renderTaskInputs() {
  const subjectInput = document.getElementById('taskSubjectInput');
  const importanceInput = document.getElementById('taskImportanceInput');
  const dateInput = document.getElementById('taskDateInput');

  subjectInput.innerHTML = SUBJECTS.map((subject) => `<option value="${subject}">${subject}</option>`).join('');
  importanceInput.innerHTML = IMPORTANCE_OPTIONS.map((option) => `<option value="${option.value}">${option.label} · ${option.points}점</option>`).join('');
  dateInput.value = state.selectedDate;

  populateCurrentEditOrBlank();

  const editingExisting = Boolean(state.editingTaskId);
  subjectInput.disabled = editingExisting && !state.adminUnlocked;
  subjectInput.classList.toggle('locked-input', editingExisting && !state.adminUnlocked);

  importanceInput.addEventListener('change', updateExpectedPointsLabel);
  document.getElementById('saveTaskBtn').onclick = submitTask;
  document.getElementById('cancelEditBtn').onclick = resetTaskForm;
  updateEditHint();
}

function populateCurrentEditOrBlank() {
  if (state.editingTaskId) {
    const task = state.app.studyTasks.find((item) => item.id === state.editingTaskId);
    if (task) {
      populateTaskForm(task);
      document.getElementById('saveTaskBtn').textContent = '공부 수정 저장';
      document.getElementById('cancelEditBtn').classList.remove('hidden');
      return;
    }
  }
  resetTaskForm();
}

function submitTask() {
  const form = getTaskFormValues();
  if (!form.title) {
    alert('공부 제목을 입력하세요.');
    return;
  }
  const points = getPointsByImportance(form.importance);
  const existing = state.editingTaskId ? state.app.studyTasks.find((item) => item.id === state.editingTaskId) : null;

  const subjectValue = existing && !state.adminUnlocked ? existing.subject : form.subject;

  const task = {
    id: state.editingTaskId || createId('task'),
    title: form.title,
    subject: subjectValue,
    importance: form.importance,
    estimatedMinutes: Math.max(1, Number(form.estimatedMinutes || 0)),
    dateKey: form.dateKey,
    completed: existing?.completed || false,
    pointsAwarded: points,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: existing?.completed ? existing.completedAt : undefined,
  };

  if (state.editingTaskId) {
    state.app.studyTasks = state.app.studyTasks.map((item) => item.id === state.editingTaskId ? task : item);
  } else {
    state.app.studyTasks.unshift(task);
  }

  saveState();
  resetTaskForm();
  render();
}


function renderCalendarBoard() {
  const wrap = document.getElementById('calendarBoardWrap');
  const root = document.getElementById('calendarBoard');
  if (state.viewMode === 'day') {
    wrap.classList.add('hidden');
    root.innerHTML = '';
    return;
  }

  wrap.classList.remove('hidden');
  const weekdayLabels = ['월', '화', '수', '목', '금', '토', '일'];
  let cells = [];
  let monthView = false;

  if (state.viewMode === 'week') {
    cells = getCalendarWeekKeys(state.selectedDate).map((dateKey) => ({ dateKey, inCurrentMonth: true }));
  } else {
    monthView = true;
    cells = getCalendarMonthCells(state.selectedDate);
  }

  const headerHtml = weekdayLabels.map((label) => `<div class="calendar-weekday">${label}</div>`).join('');
  const cellHtml = cells.map(({ dateKey, inCurrentMonth }) => {
    const dayTasks = getTasksForDate(dateKey);
    const indices = dayTasks.slice(0, 3).map((task, index) => `<div class="calendar-index-item">${index + 1}. ${escapeHtml(task.title)}</div>`).join('');
    const more = dayTasks.length > 3 ? `<div class="calendar-more">+${dayTasks.length - 3}개 더보기</div>` : '';
    const dayNum = Number(dateKey.slice(-2));
    return `
      <button class="calendar-cell ${dateKey === state.selectedDate ? 'active' : ''} ${inCurrentMonth ? '' : 'muted'}" data-calendar-date="${dateKey}" type="button">
        <div class="calendar-date-row">
          <div class="calendar-date-number">${dayNum}</div>
          ${dayTasks.length ? `<div class="calendar-count-badge">${dayTasks.length}</div>` : ''}
        </div>
        <div class="calendar-index-list">${indices || '<div class="calendar-index-item">일정 없음</div>'}${more}</div>
      </button>
    `;
  }).join('');

  root.innerHTML = `<div class="calendar-table ${monthView ? 'month-view' : 'week-view'}">${headerHtml}${cellHtml}</div>`;
  root.querySelectorAll('[data-calendar-date]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      state.selectedDate = e.currentTarget.dataset.calendarDate;
      render();
    });
  });
}

function renderTaskList(tasks) {
  const list = document.getElementById('taskList');
  if (!tasks.length) {
    list.innerHTML = '<div class="empty-card">선택한 날짜에 공부 항목이 없습니다. 작은 한 항목도 목표 점수에 가까워지는 발걸음입니다.</div>';
    return;
  }

  list.innerHTML = tasks.map((task) => {
    const editLabel = state.adminUnlocked ? '편집(상단)' : '엄마 모드 전용';
    return `
      <article class="task-item ${task.completed ? 'completed' : ''}">
        <div class="task-main">
          <button class="task-check" data-action="toggle" data-id="${task.id}">✓</button>
          <div>
            <div class="task-item-topline">
              <div class="task-date-chip">${escapeHtml(formatDateLabel(task.dateKey))}</div>
            </div>
            <div class="task-title">${escapeHtml(task.title)}</div>
            <div class="task-tags">
              <span class="tag">${escapeHtml(task.subject)}</span>
              <span class="tag importance-${task.importance}">${getImportanceLabel(task.importance)}</span>
              <span class="tag">${task.estimatedMinutes}분</span>
            </div>
          </div>
        </div>
        <div class="task-actions">
          <div class="points-chip">+${task.pointsAwarded}점</div>
          <button class="ghost-btn ${state.adminUnlocked ? '' : 'disabled-like'}" data-action="edit" data-id="${task.id}" ${state.adminUnlocked ? '' : 'disabled'}>${editLabel}</button>
          <button class="ghost-btn" data-action="delete" data-id="${task.id}">삭제</button>
        </div>
      </article>
    `;
  }).join('');

  list.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const action = e.currentTarget.dataset.action;
      const id = e.currentTarget.dataset.id;
      if (action === 'toggle') toggleTask(id);
      if (action === 'edit') startTaskEdit(id);
      if (action === 'delete') deleteTask(id);
    });
  });
}

function toggleTask(id) {
  state.app.studyTasks = state.app.studyTasks.map((task) => {
    if (task.id !== id) return task;
    const completed = !task.completed;
    return {
      ...task,
      completed,
      completedAt: completed ? new Date().toISOString() : undefined,
      updatedAt: new Date().toISOString(),
    };
  });
  saveState();
  render();
}

function startTaskEdit(id) {
  if (!state.adminUnlocked) {
    alert('편집은 엄마 모드에서만 가능합니다.');
    return;
  }
  const task = state.app.studyTasks.find((item) => item.id === id);
  if (!task) return;
  state.editingTaskId = id;
  state.selectedDate = task.dateKey;
  render();
  const formPanel = document.querySelector('.task-panel');
  formPanel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const titleInput = document.getElementById('taskTitleInput');
  titleInput?.focus();
  titleInput?.select();
}

function deleteTask(id) {
  state.app.studyTasks = state.app.studyTasks.filter((task) => task.id !== id);
  if (state.editingTaskId === id) state.editingTaskId = null;
  saveState();
  render();
}

function renderRecentLogs(logs) {
  const root = document.getElementById('recentLogs');
  if (!logs.length) {
    root.innerHTML = '<div class="hint-card">아직 완료한 공부가 없습니다. 첫 완료 항목부터 점수가 쌓이기 시작합니다.</div>';
    return;
  }
  root.innerHTML = logs.map((log) => `
    <div class="log-card">
      <div class="log-icon">🏅</div>
      <div class="log-text">${escapeHtml(log)}</div>
    </div>
  `).join('');
}

function renderWeeklyStats(weekly) {
  document.getElementById('weeklyStats').innerHTML = `
    <article class="weekly-card">
      <div class="weekly-label">완료 항목</div>
      <div class="weekly-value">${weekly.completedCount}</div>
    </article>
    <article class="weekly-card">
      <div class="weekly-label">누적 점수</div>
      <div class="weekly-value">${weekly.points}</div>
    </article>
    <article class="weekly-card">
      <div class="weekly-label">예상 공부량</div>
      <div class="weekly-value">${weekly.minutes}분</div>
    </article>
  `;
}

function wireGlobalControls() {
  document.getElementById('adminToggleBtn').addEventListener('click', () => {
    if (state.adminUnlocked) {
      state.adminUnlocked = false;
      render();
      return;
    }
    document.getElementById('adminModalBackdrop').classList.remove('hidden');
  });

  document.getElementById('adminModalCloseBtn').addEventListener('click', closeAdminModal);
  document.getElementById('adminModalBackdrop').addEventListener('click', (e) => {
    if (e.target.id === 'adminModalBackdrop') closeAdminModal();
  });
  document.getElementById('adminUnlockBtn').addEventListener('click', unlockAdminMode);
}

function unlockAdminMode() {
  const input = document.getElementById('adminPinInput');
  const error = document.getElementById('pinError');
  if (input.value === state.app.adminConfig.pinCode) {
    state.adminUnlocked = true;
    input.value = '';
    error.textContent = '';
    closeAdminModal();
    render();
    return;
  }
  error.textContent = '엄마 모드 PIN이 올바르지 않습니다.';
}

function closeAdminModal() {
  document.getElementById('adminModalBackdrop').classList.add('hidden');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function render() {
  if (!state.app.universitySetupLocked || state.app.universities.length < 3) {
    renderSetup();
  } else {
    renderDashboard();
  }
}

wireGlobalControls();
render();
