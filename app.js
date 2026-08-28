// State Management
let allQuestions = [];
let filteredQuestions = [];
let docData = null;

let currentIndex = 0;
let currentMode = localStorage.getItem('wz_current_mode') || 'sequence'; // sequence, real_exams, category, exam, wrong, favorite, document
let currentCategory = 'all';
let currentPaper = localStorage.getItem('wz_current_paper') || 'all'; // 'all', or specific paper name

let reciteMode = localStorage.getItem('wz_recite_mode') === 'true';
let userAnswers = JSON.parse(localStorage.getItem('wz_user_answers') || '{}'); // qid -> { selected: [], isCorrect: boolean, submitted: boolean }
let wrongQuestions = new Set(JSON.parse(localStorage.getItem('wz_wrong_qs') || '[]'));
let favoriteQuestions = new Set(JSON.parse(localStorage.getItem('wz_fav_qs') || '[]'));
let modeIndices = JSON.parse(localStorage.getItem('wz_mode_indices') || '{}');

// Search & Auto Next State
let searchMatches = [];
let searchMatchIndex = 0;
let savedDocScrollY = parseInt(localStorage.getItem('wz_doc_scroll_y') || '0', 10);
let autoNextMode = localStorage.getItem('wz_auto_next') !== 'false';
let autoNextTimer = null;

// Exam Mode state
let examQuestions = [];
let examTimer = null;
let examTimeLeft = 3600; // 60 mins in seconds

// DOM Elements
const el = {
    navBtns: document.querySelectorAll('.nav-btn'),
    paperBar: document.getElementById('paper-bar'),
    paperTagsContainer: document.getElementById('paper-tags'),
    catBar: document.getElementById('category-bar'),
    catTags: document.querySelectorAll('.cat-tag'),
    
    practiceView: document.getElementById('practice-view'),
    documentView: document.getElementById('document-view'),
    
    currentCatName: document.getElementById('current-cat-name'),
    currentIndex: document.getElementById('current-index'),
    totalCount: document.getElementById('total-count'),
    
    wrongCountBadge: document.getElementById('wrong-count'),
    favCountBadge: document.getElementById('fav-count'),
    
    toggleRecite: document.getElementById('toggle-recite'),
    toggleAutoNext: document.getElementById('toggle-auto-next'),
    btnReset: document.getElementById('btn-reset'),
    btnFav: document.getElementById('btn-favorite'),
    favIcon: document.getElementById('fav-icon'),
    btnCard: document.getElementById('btn-card'),
    
    examTimerBar: document.getElementById('exam-timer-bar'),
    examTimerText: document.getElementById('exam-timer'),
    btnSubmitExam: document.getElementById('btn-submit-exam'),
    
    qPaperBadge: document.getElementById('q-paper'),
    qTypeBadge: document.getElementById('q-type'),
    qSourceBadge: document.getElementById('q-source'),
    qStem: document.getElementById('q-stem'),
    optionsList: document.getElementById('options-list'),
    multiConfirmBox: document.getElementById('multi-confirm-box'),
    btnConfirmMulti: document.getElementById('btn-confirm-multi'),
    
    explanationBox: document.getElementById('explanation-box'),
    resultStatus: document.getElementById('result-status'),
    expText: document.getElementById('exp-text'),
    
    btnPrev: document.getElementById('btn-prev'),
    btnNext: document.getElementById('btn-next'),
    
    docBody: document.getElementById('doc-body'),
    docSearchInput: document.getElementById('doc-search-input'),
    btnClearSearch: document.getElementById('btn-clear-search'),
    docSearchNav: document.getElementById('doc-search-nav'),
    searchCountText: document.getElementById('search-count-text'),
    btnSearchPrev: document.getElementById('btn-search-prev'),
    btnSearchNext: document.getElementById('btn-search-next'),
    
    drawerCard: document.getElementById('drawer-card'),
    cardGrid: document.getElementById('card-grid'),
    btnCloseCard: document.getElementById('btn-close-card'),
    
    examResultModal: document.getElementById('exam-result-modal'),
    finalScore: document.getElementById('final-score'),
    scoreCorrect: document.getElementById('score-correct'),
    scoreWrong: document.getElementById('score-wrong'),
    scoreAccuracy: document.getElementById('score-accuracy'),
    btnReviewExam: document.getElementById('btn-review-exam'),
    btnRestartExam: document.getElementById('btn-restart-exam'),

    resetModal: document.getElementById('reset-modal'),
    btnResetCurrent: document.getElementById('btn-reset-current'),
    btnResetWrong: document.getElementById('btn-reset-wrong'),
    btnResetAll: document.getElementById('btn-reset-all'),
    btnCloseReset: document.getElementById('btn-close-reset')
};

// Initialize Application
async function init() {
    try {
        const [qRes, docRes] = await Promise.all([
            fetch('questions.json'),
            fetch('doc_content.json')
        ]);
        
        allQuestions = await qRes.json();
        docData = await docRes.json();
        
        updateBadges();
        renderPaperTags();
        renderDoc();
        bindEvents();
        setMode(currentMode);
    } catch (err) {
        console.error('Failed to load data:', err);
        alert('加载题库失败，请稍后刷新重试！');
    }
}

// Update Badges & Counts
function updateBadges() {
    el.wrongCountBadge.textContent = wrongQuestions.size;
    el.favCountBadge.textContent = favoriteQuestions.size;
    localStorage.setItem('wz_wrong_qs', JSON.stringify([...wrongQuestions]));
    localStorage.setItem('wz_fav_qs', JSON.stringify([...favoriteQuestions]));
}

function saveAnswers() {
    localStorage.setItem('wz_user_answers', JSON.stringify(userAnswers));
}

// Dynamic Paper Tags Renderer
function renderPaperTags() {
    if (!el.paperTagsContainer) return;
    el.paperTagsContainer.innerHTML = '';
    
    // In "顺序刷题" mode: ONLY show scope paper tags, STRICTLY EXCLUDE real exam tags
    if (currentMode === 'sequence') {
        const scopeQuestions = allQuestions.filter(q => !q.paper || !q.paper.includes('真题'));
        const btn = document.createElement('button');
        btn.className = 'paper-tag active';
        btn.dataset.paper = '梧州市公安局招聘笔试复习范围';
        btn.innerHTML = `<i class="fa-solid fa-book-open"></i> 【复习范围】150必考点 <span class="badge-count">${scopeQuestions.length}</span>`;
        btn.addEventListener('click', () => filterByPaper('梧州市公安局招聘笔试复习范围'));
        el.paperTagsContainer.appendChild(btn);
        return;
    }

    // In "历年真题" mode or category, strictly filter paper tags to show ONLY real exam papers
    if (currentMode === 'real_exams' || (currentMode === 'category' && currentCategory === '历年真题')) {
        const realQuestions = allQuestions.filter(q => q.paper && q.paper.includes('真题'));
        const paperCounts = {};
        realQuestions.forEach(q => {
            const p = q.paper;
            paperCounts[p] = (paperCounts[p] || 0) + 1;
        });

        const paperKeys = Object.keys(paperCounts);

        // If there are multiple real exam papers, add "全部历年真题" tag
        if (paperKeys.length > 1) {
            const allRealBtn = document.createElement('button');
            allRealBtn.className = `paper-tag ${currentPaper === 'all_real' ? 'active' : ''}`;
            allRealBtn.dataset.paper = 'all_real';
            allRealBtn.innerHTML = `<i class="fa-solid fa-certificate"></i> 全部历年真题 <span class="badge-count">${realQuestions.length}</span>`;
            allRealBtn.addEventListener('click', () => filterByPaper('all_real'));
            el.paperTagsContainer.appendChild(allRealBtn);
        }

        // Add tag for each real exam paper
        paperKeys.forEach(pName => {
            const btn = document.createElement('button');
            const isActive = currentPaper === pName || (paperKeys.length === 1 && currentPaper === 'all_real');
            btn.className = `paper-tag ${isActive ? 'active' : ''}`;
            btn.dataset.paper = pName;
            const shortName = pName;
            btn.innerHTML = `<i class="fa-solid fa-certificate"></i> ${shortName} <span class="badge-count">${paperCounts[pName]}</span>`;
            btn.addEventListener('click', () => filterByPaper(pName));
            el.paperTagsContainer.appendChild(btn);
        });

        return;
    }

    // Default modes (category, exam, wrong, favorite):
    // Extract unique papers and count
    const paperCounts = { 'all': allQuestions.length };
    allQuestions.forEach(q => {
        const p = q.paper || '梧州市公安局招聘笔试复习范围';
        paperCounts[p] = (paperCounts[p] || 0) + 1;
    });

    // "全部题库" Tag
    const allBtn = document.createElement('button');
    allBtn.className = `paper-tag ${currentPaper === 'all' ? 'active' : ''}`;
    allBtn.dataset.paper = 'all';
    allBtn.innerHTML = `<i class="fa-solid fa-cubes"></i> 全部试卷/题库 <span class="badge-count">${allQuestions.length}</span>`;
    allBtn.addEventListener('click', () => filterByPaper('all'));
    el.paperTagsContainer.appendChild(allBtn);

    // Individual Paper Tags
    Object.keys(paperCounts).forEach(pName => {
        if (pName === 'all') return;
        const btn = document.createElement('button');
        btn.className = `paper-tag ${currentPaper === pName ? 'active' : ''}`;
        btn.dataset.paper = pName;
        
        let icon = 'fa-file-contract';
        let shortName = pName;
        if (pName.includes('真题')) {
            icon = 'fa-certificate';
            shortName = pName;
        } else if (pName.includes('复习范围')) {
            icon = 'fa-book-open';
            shortName = `【复习范围】150必考点`;
        }

        btn.innerHTML = `<i class="fa-solid ${icon}"></i> ${shortName} <span class="badge-count">${paperCounts[pName]}</span>`;
        btn.addEventListener('click', () => filterByPaper(pName));
        el.paperTagsContainer.appendChild(btn);
    });
}

// Paper Filter Handler
function filterByPaper(paper) {
    saveCurrentIndex();
    currentPaper = paper;
    localStorage.setItem('wz_current_paper', paper);
    
    // Update active UI state on paper tags
    if (el.paperTagsContainer) {
        const paperBtns = el.paperTagsContainer.querySelectorAll('.paper-tag');
        paperBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.paper === paper);
        });
    }

    applyFiltersAndRender();
}

// Unified Filter & Render Application
function applyFiltersAndRender() {
    let dataset = [...allQuestions];

    if (currentMode === 'sequence') {
        // Strictly ONLY include official review scope questions (exclude real exams)
        filteredQuestions = allQuestions.filter(q => !q.paper || !q.paper.includes('真题'));
        el.currentCatName.textContent = '顺序刷题';
    } else if (currentMode === 'real_exams') {
        if (currentPaper === 'all_real' || currentPaper === 'all' || !currentPaper.includes('真题')) {
            dataset = dataset.filter(q => q.paper && q.paper.includes('真题'));
        } else {
            dataset = dataset.filter(q => q.paper === currentPaper);
        }
        filteredQuestions = dataset;
        el.currentCatName.textContent = '历年真题';
    } else {
        // Filter by paper first if specific paper selected
        if (currentPaper !== 'all' && currentPaper !== 'all_real') {
            dataset = dataset.filter(q => (q.paper || '梧州市公安局招聘笔试复习范围') === currentPaper);
        }

        if (currentMode === 'category') {
            const scopeQuestions = allQuestions.filter(q => !q.paper || !q.paper.includes('真题'));
            if (currentCategory === 'all') {
                filteredQuestions = scopeQuestions;
                el.currentCatName.textContent = '模块练习（全部考点）';
            } else {
                filteredQuestions = scopeQuestions.filter(q => q.category === currentCategory);
                el.currentCatName.textContent = `模块：${currentCategory}`;
            }
        } else if (currentMode === 'wrong') {
            filteredQuestions = dataset.filter(q => wrongQuestions.has(q.id));
            el.currentCatName.textContent = '错题本精炼';
        } else if (currentMode === 'favorite') {
            filteredQuestions = dataset.filter(q => favoriteQuestions.has(q.id));
            el.currentCatName.textContent = '收藏夹特训';
        }
    }

    const key = `${currentMode}_${currentPaper}_${currentCategory}`;
    const savedIdx = modeIndices[key] || 0;
    currentIndex = Math.min(Math.max(0, savedIdx), Math.max(0, filteredQuestions.length - 1));
    renderQuestion();
}

// Save Current Question Position
function saveCurrentIndex() {
    if (currentMode && currentMode !== 'document' && currentMode !== 'exam') {
        const key = `${currentMode}_${currentPaper}_${currentCategory}`;
        modeIndices[key] = currentIndex;
        localStorage.setItem('wz_mode_indices', JSON.stringify(modeIndices));
    }
}

// Mode Switcher
function setMode(mode) {
    if (currentMode === 'document') {
        savedDocScrollY = window.scrollY;
        localStorage.setItem('wz_doc_scroll_y', savedDocScrollY);
    }

    saveCurrentIndex();
    
    currentMode = mode;
    localStorage.setItem('wz_current_mode', mode);
    
    if (mode !== 'exam' && examTimer) {
        clearInterval(examTimer);
        examTimer = null;
        el.examTimerBar.classList.add('hidden');
    }
    
    el.navBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    
    if (mode === 'document') {
        el.practiceView.classList.add('hidden');
        el.documentView.classList.remove('hidden');
        el.paperBar.classList.add('hidden');
        el.catBar.classList.add('hidden');
        
        if (el.docSearchInput && el.docSearchInput.value.trim()) {
            handleDocSearch(el.docSearchInput.value);
        } else {
            renderDoc();
        }
        
        setTimeout(() => {
            window.scrollTo({ top: savedDocScrollY, behavior: 'instant' });
        }, 20);
        return;
    }
    
    el.practiceView.classList.remove('hidden');
    el.documentView.classList.add('hidden');
    
    // Only show paperBar in "历年真题" mode; hide in all other modes
    if (mode === 'real_exams') {
        el.paperBar.classList.remove('hidden');
    } else {
        el.paperBar.classList.add('hidden');
    }

    if (mode === 'category') {
        el.catBar.classList.remove('hidden');
    } else {
        el.catBar.classList.add('hidden');
    }

    if (mode === 'sequence') {
        currentPaper = '梧州市公安局招聘笔试复习范围';
        localStorage.setItem('wz_current_paper', currentPaper);
    } else if (mode === 'real_exams') {
        if (currentPaper === 'all' || !currentPaper.includes('真题')) {
            currentPaper = '2024梧州市长洲区笔试真题';
            localStorage.setItem('wz_current_paper', currentPaper);
        }
    }

    renderPaperTags();

    if (mode === 'exam') {
        startExam();
        return;
    }

    applyFiltersAndRender();
}

// Category Filter
function filterByCategory(cat) {
    saveCurrentIndex();
    currentCategory = cat;
    el.catTags.forEach(tag => {
        tag.classList.toggle('active', tag.dataset.cat === cat);
    });
    
    renderPaperTags();
    applyFiltersAndRender();
}

// Start Full Mock Exam
function startExam() {
    let pool = [...allQuestions];
    if (currentPaper !== 'all') {
        pool = pool.filter(q => (q.paper || '梧州市公安局招聘笔试复习范围') === currentPaper);
    }
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    filteredQuestions = shuffled.slice(0, Math.min(50, pool.length));
    el.currentCatName.textContent = currentPaper === 'all' ? '全真模拟考试（50题）' : `模拟考试（${currentPaper}）`;
    
    currentIndex = 0;
    userAnswers = {};
    
    el.examTimerBar.classList.remove('hidden');
    examTimeLeft = 3600;
    updateTimerDisplay();
    
    if (examTimer) clearInterval(examTimer);
    examTimer = setInterval(() => {
        examTimeLeft--;
        updateTimerDisplay();
        if (examTimeLeft <= 0) {
            clearInterval(examTimer);
            submitExam();
        }
    }, 1000);
    
    renderQuestion();
}

function updateTimerDisplay() {
    const mins = Math.floor(examTimeLeft / 60);
    const secs = examTimeLeft % 60;
    el.examTimerText.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    
    if (examTimeLeft <= 120) {
        el.examTimerBar.classList.add('warning-time');
    } else {
        el.examTimerBar.classList.remove('warning-time');
    }
}

// Render Question
function renderQuestion() {
    saveCurrentIndex();
    
    if (filteredQuestions.length === 0) {
        el.qStem.textContent = '该模式下暂无题目！';
        el.optionsList.innerHTML = '';
        el.explanationBox.classList.add('hidden');
        el.multiConfirmBox.classList.add('hidden');
        el.totalCount.textContent = '0';
        el.currentIndex.textContent = '0';
        return;
    }
    
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
        document.activeElement.blur();
    }

    const q = filteredQuestions[currentIndex];
    const ansState = userAnswers[q.id] || { selected: [], isCorrect: false, submitted: false };
    
    el.currentIndex.textContent = currentIndex + 1;
    el.totalCount.textContent = filteredQuestions.length;
    
    el.qTypeBadge.textContent = q.type === 'single' ? '单选题' : (q.type === 'multiple' ? '多选题' : '判断题');
    const cleanStem = q.question.replace(/^\d+[\.、\s]*/, '');
    el.qStem.textContent = `${currentIndex + 1}. ${cleanStem}`;
    
    // Toggle Favorite Button State
    if (favoriteQuestions.has(q.id)) {
        el.favIcon.className = 'fa-solid fa-star';
        el.btnFav.classList.add('active');
    } else {
        el.favIcon.className = 'fa-regular fa-star';
        el.btnFav.classList.remove('active');
    }

    // Render Options
    el.optionsList.innerHTML = '';
    el.multiConfirmBox.classList.add('hidden');
    
    q.options.forEach(optText => {
        const optionItem = document.createElement('div');
        optionItem.className = 'option-item';
        
        const match = optText.match(/^([A-D])[\.、\s]*(.*)/);
        let optLetter = '';
        let displayKey = '';
        let displayVal = optText;
        
        if (match) {
            optLetter = match[1];
            displayKey = match[1];
            displayVal = match[2];
        } else {
            optLetter = optText;
            displayKey = '';
        }
        
        const isSelected = ansState.selected.includes(optLetter);
        if (isSelected) optionItem.classList.add('selected');
        
        if (ansState.submitted || reciteMode) {
            const isCorrectOption = q.answer.includes(optLetter);
            if (isCorrectOption) optionItem.classList.add('correct');
            else if (isSelected && !isCorrectOption) optionItem.classList.add('wrong');
        }
        
        optionItem.innerHTML = `
            ${displayKey ? `<span class="opt-key">${displayKey}</span>` : ''}
            <span class="opt-val">${displayVal}</span>
        `;
        
        optionItem.addEventListener('click', () => handleOptionClick(q, optLetter));
        el.optionsList.appendChild(optionItem);
    });
    
    if (q.type === 'multiple' && !ansState.submitted && !reciteMode) {
        el.multiConfirmBox.classList.remove('hidden');
        if (ansState.selected && ansState.selected.length > 0) {
            el.btnConfirmMulti.classList.add('has-selection');
        } else {
            el.btnConfirmMulti.classList.remove('has-selection');
        }
    }
    
    if (ansState.submitted || reciteMode) {
        showExplanation(q, ansState);
    } else {
        el.explanationBox.classList.add('hidden');
    }
}

// Option Click Handler
function handleOptionClick(q, optLetter) {
    const ansState = userAnswers[q.id] || { selected: [], submitted: false };
    if (ansState.submitted || reciteMode) return;
    
    if (q.type === 'single' || q.type === 'judge') {
        ansState.selected = [optLetter];
        validateAnswer(q, ansState);
    } else if (q.type === 'multiple') {
        if (ansState.selected.includes(optLetter)) {
            ansState.selected = ansState.selected.filter(l => l !== optLetter);
        } else {
            ansState.selected.push(optLetter);
        }
        userAnswers[q.id] = ansState;
        saveAnswers();
        renderQuestion();
    }
}

// Validate Answer
function validateAnswer(q, ansState) {
    ansState.submitted = true;
    
    const userSorted = [...ansState.selected].sort().join('');
    const correctSorted = [...q.answer].sort().join('');
    ansState.isCorrect = (userSorted === correctSorted);
    
    if (!ansState.isCorrect) {
        wrongQuestions.add(q.id);
    } else {
        if (currentMode === 'wrong') {
            wrongQuestions.delete(q.id);
        }
    }
    
    userAnswers[q.id] = ansState;
    saveAnswers();
    updateBadges();
    renderQuestion();

    if (autoNextMode && !reciteMode && currentMode !== 'exam') {
        if (autoNextTimer) clearTimeout(autoNextTimer);
        const delay = ansState.isCorrect ? 600 : 1200;
        autoNextTimer = setTimeout(() => {
            if (currentIndex < filteredQuestions.length - 1) {
                currentIndex++;
                renderQuestion();
            }
        }, delay);
    }
}

// Show Explanation
function showExplanation(q, ansState) {
    el.explanationBox.classList.remove('hidden');
    
    if (reciteMode) {
        el.resultStatus.innerHTML = `<span class="result-badge correct">正解：${q.answer.join(', ')}</span>`;
    } else if (ansState.submitted) {
        if (ansState.isCorrect) {
            el.resultStatus.innerHTML = `<span class="result-badge correct"><i class="fa-solid fa-circle-check"></i> 回答正确！</span>`;
        } else {
            el.resultStatus.innerHTML = `<span class="result-badge wrong"><i class="fa-solid fa-circle-xmark"></i> 回答错误！正确答案：${q.answer.join(', ')}</span>`;
        }
    }
    
    el.expText.textContent = q.explanation;
}

// Render Document Reader (Markdown Styled)
function renderDoc() {
    if (!docData) return;
    el.docBody.innerHTML = docData.html || '';
    bindTocClickEvents();
    updateStickyHeaderOffset();
}

function updateStickyHeaderOffset() {
    const appHeader = document.querySelector('.app-header');
    const docHeader = document.querySelector('.doc-header');
    if (appHeader && docHeader) {
        const headerHeight = appHeader.offsetHeight;
        docHeader.style.top = (headerHeight + 12) + 'px';
    }
}
window.addEventListener('resize', updateStickyHeaderOffset);
window.addEventListener('scroll', () => {
    updateStickyHeaderOffset();
    if (currentMode === 'document') {
        savedDocScrollY = window.scrollY;
        localStorage.setItem('wz_doc_scroll_y', savedDocScrollY);
    }
});

// Bind TOC Item Click Navigation
function bindTocClickEvents() {
    const items = el.docBody.querySelectorAll('.doc-toc-item');
    items.forEach(item => {
        item.style.cursor = 'pointer';
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = item.getAttribute('data-target');
            if (targetId) {
                const targetElem = document.getElementById(targetId);
                if (targetElem) {
                    targetElem.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    targetElem.classList.add('flash-highlight');
                    setTimeout(() => targetElem.classList.remove('flash-highlight'), 2000);
                }
            }
        });
    });
}

// Document Keyword Search & Navigation
function handleDocSearch(query) {
    const val = query.trim();
    if (!val) {
        renderDoc();
        el.btnClearSearch.classList.add('hidden');
        el.docSearchNav.classList.add('hidden');
        searchMatches = [];
        searchMatchIndex = 0;
        return;
    }
    
    el.btnClearSearch.classList.remove('hidden');
    const regex = new RegExp(`(${val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = docData.html || '';
    
    const targets = tempDiv.querySelectorAll('.doc-p, .doc-chapter-title, .doc-sec-title, .doc-toc-item');
    targets.forEach(elem => {
        if (elem.textContent.includes(val)) {
            elem.innerHTML = elem.textContent.replace(regex, '<mark class="highlight">$1</mark>');
        }
    });
    
    el.docBody.innerHTML = tempDiv.innerHTML;
    bindTocClickEvents();
    updateStickyHeaderOffset();
    
    // Find all matching elements
    searchMatches = Array.from(el.docBody.querySelectorAll('mark.highlight'));
    
    if (searchMatches.length > 0) {
        el.docSearchNav.classList.remove('hidden');
        searchMatchIndex = 0;
        updateSearchNavDisplay();
    } else {
        el.docSearchNav.classList.remove('hidden');
        el.searchCountText.textContent = '0 个结果';
    }
}

function updateSearchNavDisplay() {
    if (searchMatches.length === 0) return;
    
    searchMatches.forEach(m => m.classList.remove('active-match'));
    
    const current = searchMatches[searchMatchIndex];
    if (current) {
        current.classList.add('active-match');
        current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    el.searchCountText.textContent = `${searchMatchIndex + 1} / ${searchMatches.length}`;
}

function navigateSearch(dir) {
    if (searchMatches.length === 0) return;
    if (dir === 'prev') {
        searchMatchIndex = (searchMatchIndex - 1 + searchMatches.length) % searchMatches.length;
    } else {
        searchMatchIndex = (searchMatchIndex + 1) % searchMatches.length;
    }
    updateSearchNavDisplay();
}

// Submit Mock Exam
function submitExam() {
    if (examTimer) clearInterval(examTimer);
    
    let correctCount = 0;
    filteredQuestions.forEach(q => {
        const state = userAnswers[q.id];
        if (state && state.isCorrect) {
            correctCount++;
        }
    });
    
    const score = Math.round((correctCount / filteredQuestions.length) * 100);
    
    el.finalScore.textContent = score;
    el.scoreCorrect.textContent = correctCount;
    el.scoreWrong.textContent = filteredQuestions.length - correctCount;
    el.scoreAccuracy.textContent = `${score}%`;
    
    el.examResultModal.classList.remove('hidden');
}

// Render Answer Drawer Grid
function renderAnswerGrid() {
    el.cardGrid.innerHTML = '';
    filteredQuestions.forEach((q, i) => {
        const item = document.createElement('div');
        item.className = 'grid-item';
        item.textContent = i + 1;
        
        if (i === currentIndex) item.classList.add('current');
        
        const state = userAnswers[q.id];
        if (state && state.submitted) {
            if (state.isCorrect) item.classList.add('correct');
            else item.classList.add('wrong');
        }
        
        item.addEventListener('click', () => {
            currentIndex = i;
            renderQuestion();
            el.drawerCard.classList.add('hidden');
        });
        
        el.cardGrid.appendChild(item);
    });
}

// Bind UI Event Listeners
function bindEvents() {
    el.navBtns.forEach(btn => {
        btn.addEventListener('click', () => setMode(btn.dataset.mode));
    });
    
    el.catTags.forEach(tag => {
        tag.addEventListener('click', () => filterByCategory(tag.dataset.cat));
    });
    
    el.toggleRecite.checked = reciteMode;
    el.toggleRecite.addEventListener('change', (e) => {
        reciteMode = e.target.checked;
        localStorage.setItem('wz_recite_mode', reciteMode);
        renderQuestion();
    });
    
    el.toggleAutoNext.checked = autoNextMode;
    el.toggleAutoNext.addEventListener('change', (e) => {
        autoNextMode = e.target.checked;
        localStorage.setItem('wz_auto_next', autoNextMode);
        if (autoNextTimer) {
            clearTimeout(autoNextTimer);
            autoNextTimer = null;
        }
    });

    // Reset Modal Controls
    if (el.btnReset) {
        el.btnReset.addEventListener('click', () => {
            el.resetModal.classList.remove('hidden');
        });
    }

    if (el.btnCloseReset) {
        el.btnCloseReset.addEventListener('click', () => {
            el.resetModal.classList.add('hidden');
        });
    }

    if (el.btnResetCurrent) {
        el.btnResetCurrent.addEventListener('click', () => {
            filteredQuestions.forEach(q => {
                delete userAnswers[q.id];
            });
            saveAnswers();
            currentIndex = 0;
            saveCurrentIndex();
            renderQuestion();
            el.resetModal.classList.add('hidden');
        });
    }

    if (el.btnResetWrong) {
        el.btnResetWrong.addEventListener('click', () => {
            wrongQuestions.clear();
            updateBadges();
            if (currentMode === 'wrong') {
                applyFiltersAndRender();
            }
            el.resetModal.classList.add('hidden');
        });
    }

    if (el.btnResetAll) {
        el.btnResetAll.addEventListener('click', () => {
            userAnswers = {};
            wrongQuestions.clear();
            favoriteQuestions.clear();
            modeIndices = {};
            localStorage.removeItem('wz_user_answers');
            localStorage.removeItem('wz_wrong_qs');
            localStorage.removeItem('wz_fav_qs');
            localStorage.removeItem('wz_mode_indices');
            currentIndex = 0;
            updateBadges();
            applyFiltersAndRender();
            el.resetModal.classList.add('hidden');
        });
    }
    
    el.btnFav.addEventListener('click', () => {
        if (filteredQuestions.length === 0) return;
        const q = filteredQuestions[currentIndex];
        if (favoriteQuestions.has(q.id)) {
            favoriteQuestions.delete(q.id);
        } else {
            favoriteQuestions.add(q.id);
        }
        updateBadges();
        renderQuestion();
    });
    
    el.btnConfirmMulti.addEventListener('click', () => {
        if (filteredQuestions.length === 0) return;
        const q = filteredQuestions[currentIndex];
        const ansState = userAnswers[q.id] || { selected: [], submitted: false };
        if (ansState.selected.length === 0) {
            alert('请至少选择一个选项！');
            return;
        }
        validateAnswer(q, ansState);
    });

    el.btnPrev.addEventListener('click', () => {
        if (currentIndex > 0) {
            currentIndex--;
            renderQuestion();
        }
    });
    
    el.btnNext.addEventListener('click', () => {
        if (currentIndex < filteredQuestions.length - 1) {
            currentIndex++;
            renderQuestion();
        }
    });
    
    el.btnCard.addEventListener('click', () => {
        renderAnswerGrid();
        el.drawerCard.classList.remove('hidden');
    });
    
    el.btnCloseCard.addEventListener('click', () => {
        el.drawerCard.classList.add('hidden');
    });
    
    el.btnSubmitExam.addEventListener('click', () => {
        if (confirm('确定现在交卷并生成成绩单吗？')) {
            submitExam();
        }
    });
    
    el.btnReviewExam.addEventListener('click', () => {
        el.examResultModal.classList.add('hidden');
        renderQuestion();
    });
    
    el.btnRestartExam.addEventListener('click', () => {
        el.examResultModal.classList.add('hidden');
        startExam();
    });
    
    el.docSearchInput.addEventListener('input', (e) => {
        handleDocSearch(e.target.value);
    });
    
    el.btnClearSearch.addEventListener('click', () => {
        el.docSearchInput.value = '';
        renderDoc();
        el.btnClearSearch.classList.add('hidden');
        el.docSearchNav.classList.add('hidden');
        searchMatches = [];
        searchMatchIndex = 0;
    });

    el.btnSearchPrev.addEventListener('click', () => navigateSearch('prev'));
    el.btnSearchNext.addEventListener('click', () => navigateSearch('next'));
}

document.addEventListener('DOMContentLoaded', init);
