/**
 * Shared practice problem engine for MGMT 408 Finance Practice Tool.
 *
 * Each page must define these globals before loading this script:
 *   - window.defined problems  (array of problem objects)
 *   - window.pageConfig = { topicKey: 'tvm', title: '...', subtitle: '...' }
 *
 * This script handles:
 *   - Calculator (toggle, keyboard, expression evaluation)
 *   - Problem display, navigation, hints, and solutions
 *   - Answer checking with per-unit tolerance
 *   - localStorage persistence (completed + missed problems)
 *   - KaTeX rendering for formulas
 */

// ─── Calculator ──────────────────────────────────────────────────────────────

let calcCurrentExpression = '';
let calcCurrentResult = '0';
let calculatorOpen = false;

function toggleCalculator() {
    calculatorOpen = !calculatorOpen;
    const container = document.getElementById('calculatorContainer');
    if (calculatorOpen) {
        container.classList.add('active');
    } else {
        container.classList.remove('active');
    }
}

function closeCalculator() {
    if (calculatorOpen) {
        calculatorOpen = false;
        document.getElementById('calculatorContainer').classList.remove('active');
    }
}

document.addEventListener('click', (e) => {
    const toolbar = document.querySelector('.calculator-toolbar');
    if (calculatorOpen && !toolbar.contains(e.target)) {
        closeCalculator();
    }
});

function calcAppend(value) {
    calcCurrentExpression += value;
    updateCalcDisplay();
}

function calcClear() {
    calcCurrentExpression = '';
    calcCurrentResult = '0';
    updateCalcDisplay();
}

function calcBackspace() {
    calcCurrentExpression = calcCurrentExpression.slice(0, -1);
    updateCalcDisplay();
}

function calcEquals() {
    if (!calcCurrentExpression) return;
    try {
        let expression = calcCurrentExpression.replace(/\^/g, '**');
        let result = Function('"use strict"; return (' + expression + ')')();
        if (typeof result === 'number') {
            calcCurrentResult = Number(result.toFixed(4)).toString();
        } else {
            calcCurrentResult = result.toString();
        }
    } catch (error) {
        calcCurrentResult = 'Error';
    }
    updateCalcDisplay();
}

function updateCalcDisplay() {
    document.getElementById('calcExpression').textContent = calcCurrentExpression || '\u00A0';
    document.getElementById('calcResult').textContent = calcCurrentResult;
}

document.addEventListener('keydown', (e) => {
    if (document.activeElement.id === 'answerInput') return;
    if (!calculatorOpen) return;

    if (e.key >= '0' && e.key <= '9') {
        calcAppend(e.key);
    } else if (e.key === '.') {
        calcAppend('.');
    } else if (['+', '-', '*', '/'].includes(e.key)) {
        calcAppend(e.key);
    } else if (e.key === '^') {
        calcAppend('^');
    } else if (e.key === 'Enter' && calcCurrentExpression) {
        calcEquals();
    } else if (e.key === 'Backspace' && calcCurrentExpression) {
        e.preventDefault();
        calcBackspace();
    } else if (e.key === 'Escape') {
        calcClear();
    } else if (e.key === '(' || e.key === ')') {
        calcAppend(e.key);
    }
});

// ─── Problem Engine ──────────────────────────────────────────────────────────

let currentProblemIndex = 0;
let attemptCount = 0;
let completedProblems = new Set();
let missedProblems = {};

// Load any previously saved state from localStorage
function loadProgress() {
    const config = window.pageConfig;
    if (!config || !config.topicKey) return;

    const completedKey = 'finance_completed_' + config.topicKey;
    const missedKey = 'finance_missed_' + config.topicKey;

    try {
        const savedCompleted = localStorage.getItem(completedKey);
        if (savedCompleted) {
            JSON.parse(savedCompleted).forEach(i => completedProblems.add(i));
        }
        const savedMissed = localStorage.getItem(missedKey);
        if (savedMissed) {
            missedProblems = JSON.parse(savedMissed);
        }
    } catch (e) {
        // Ignore corrupt localStorage data
    }
}

function saveProgress() {
    const config = window.pageConfig;
    if (!config || !config.topicKey) return;

    const completedKey = 'finance_completed_' + config.topicKey;
    const missedKey = 'finance_missed_' + config.topicKey;

    try {
        localStorage.setItem(completedKey, JSON.stringify([...completedProblems]));
        localStorage.setItem(missedKey, JSON.stringify(missedProblems));
    } catch (e) {
        // localStorage full or unavailable
    }
}

function loadProblems() {
    loadProgress();
    displayProblem();
}

function displayProblem() {
    if (problems.length === 0) return;

    const problem = problems[currentProblemIndex];
    attemptCount = 0;

    // Update progress
    const progress = ((currentProblemIndex) / problems.length) * 100;
    document.getElementById('progressBar').style.width = progress + '%';
    document.getElementById('progressText').textContent =
        'Problem ' + (currentProblemIndex + 1) + ' of ' + problems.length;

    // Update difficulty badge
    const difficultyBadge = document.getElementById('difficultyBadge');
    difficultyBadge.textContent = problem.difficulty.charAt(0).toUpperCase() + problem.difficulty.slice(1);
    difficultyBadge.className = 'badge badge-' + problem.difficulty;

    // Update topic badge
    document.getElementById('topicBadge').textContent = problem.topic;

    // Update problem text
    document.getElementById('problemText').textContent = problem.problem_text;

    // Update formula (hidden initially)
    document.getElementById('formulaText').innerHTML = '\\(' + problem.formula + '\\)';
    document.getElementById('formulaBox').classList.add('hidden');

    // Clear answer input and feedback
    document.getElementById('answerInput').value = '';
    document.getElementById('feedbackBox').className = 'hidden';
    document.getElementById('submitBtn').disabled = false;

    // Render math
    renderMath();

    // Update navigation buttons
    document.getElementById('prevBtn').disabled = currentProblemIndex === 0;
    document.getElementById('nextBtn').textContent =
        currentProblemIndex === problems.length - 1 ? 'Finish' : 'Next Problem';
}

function checkAnswer() {
    const problem = problems[currentProblemIndex];
    const userAnswer = parseFloat(document.getElementById('answerInput').value);

    if (isNaN(userAnswer)) {
        // Just show a simple incorrect feedback for invalid input
        const feedbackBox = document.getElementById('feedbackBox');
        feedbackBox.className = 'feedback-box feedback-incorrect';
        feedbackBox.innerHTML = '<div class="feedback-title">Please enter a valid number</div>';
        return;
    }

    // Determine tolerance based on unit type and problem-specific override
    let tolerance;
    if (problem.tolerance !== undefined) {
        tolerance = problem.tolerance;
    } else {
        const percentTolerance = Math.abs(problem.correct_answer) * 0.005; // 0.5%
        let minTolerance;
        if (problem.unit === 'percent') {
            minTolerance = 0.1;
        } else if (problem.unit === 'bps') {
            minTolerance = 5;
        } else if (Math.abs(problem.correct_answer) < 10) {
            minTolerance = 0.05;
        } else {
            minTolerance = 1;
        }
        tolerance = Math.max(percentTolerance, minTolerance);
    }

    const isCorrect = Math.abs(userAnswer - problem.correct_answer) <= tolerance;

    attemptCount++;

    if (isCorrect) {
        completedProblems.add(currentProblemIndex);
        // If they got it right, remove from missed
        delete missedProblems[problem.id];
        saveProgress();
        showCorrectFeedback();
    } else {
        // Track missed problems
        missedProblems[problem.id] = {
            topic: problem.topic,
            difficulty: problem.difficulty,
            attempts: (missedProblems[problem.id]?.attempts || 0) + 1
        };
        saveProgress();
        showIncorrectFeedback();
    }
}

function formatAnswer(problem) {
    if (problem.unit === 'percent') {
        return problem.correct_answer.toFixed(2) + '%';
    } else if (problem.unit === 'bps') {
        return problem.correct_answer.toFixed(0) + ' basis points';
    } else if (Math.abs(problem.correct_answer) >= 1000000) {
        return '$' + (problem.correct_answer / 1000000).toFixed(2) + ' million';
    } else if (Math.abs(problem.correct_answer) >= 1000) {
        return '$' + problem.correct_answer.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
    } else {
        return '$' + problem.correct_answer.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
    }
}

function showCorrectFeedback() {
    const problem = problems[currentProblemIndex];
    const feedbackBox = document.getElementById('feedbackBox');

    feedbackBox.className = 'feedback-box feedback-correct';
    feedbackBox.innerHTML =
        '<div class="feedback-title">Correct!</div>' +
        '<div class="feedback-content">Great job! The correct answer is ' + formatAnswer(problem) + '.</div>';

    document.getElementById('submitBtn').disabled = true;
}

function showIncorrectFeedback() {
    const problem = problems[currentProblemIndex];
    const feedbackBox = document.getElementById('feedbackBox');

    let html = '<div class="feedback-title">Not quite right</div>';

    if (attemptCount === 1) {
        html += '<div class="hint-box"><strong>Hint:</strong> ' + problem.hints.level_1 + '</div>';
    } else if (attemptCount === 2) {
        document.getElementById('formulaBox').classList.remove('hidden');
        renderMath();
        html += '<div class="hint-box"><strong>Formula revealed above.</strong> ' + problem.hints.level_2 + '</div>';
    } else if (attemptCount === 3) {
        document.getElementById('formulaBox').classList.remove('hidden');
        renderMath();
        html +=
            '<div class="hint-box"><strong>Detailed hint:</strong> ' + problem.hints.level_3 + '</div>' +
            '<div style="margin-top: 1rem;"><button class="btn-secondary" onclick="showFullSolution()">Show Full Solution</button></div>';
    } else {
        showFullSolution();
        return;
    }

    feedbackBox.className = 'feedback-box feedback-incorrect';
    feedbackBox.innerHTML = html;
}

function showFullSolution() {
    const problem = problems[currentProblemIndex];
    const feedbackBox = document.getElementById('feedbackBox');

    let html = '<div class="feedback-title">Solution</div><div class="solution-steps">';

    problem.solution_steps.forEach(function(step) {
        html += '<div class="solution-step">' + step + '</div>';
    });

    html += '</div>' +
        '<div class="feedback-content" style="margin-top: 1rem; padding-top: 1rem; border-top: 2px solid #E2E8F0;">' +
        '<strong>Final Answer:</strong> ' + formatAnswer(problem) +
        '</div>';

    feedbackBox.className = 'feedback-box feedback-correct';
    feedbackBox.innerHTML = html;

    document.getElementById('submitBtn').disabled = true;
    renderMath();
}

function nextProblem() {
    if (currentProblemIndex < problems.length - 1) {
        currentProblemIndex++;
        displayProblem();
    } else {
        showSummary();
    }
}

function previousProblem() {
    if (currentProblemIndex > 0) {
        currentProblemIndex--;
        displayProblem();
    }
}

function showSummary() {
    const problemCard = document.getElementById('problemCard');
    const completed = completedProblems.size;
    const total = problems.length;
    const percentage = Math.round((completed / total) * 100);

    // Update progress bar to 100%
    document.getElementById('progressBar').style.width = '100%';

    problemCard.innerHTML =
        '<div style="text-align: center; padding: 3rem;">' +
            '<h2 style="font-size: 2rem; margin-bottom: 1rem;">Practice Session Complete!</h2>' +
            '<div style="font-size: 3rem; font-weight: bold; color: #2C5282; margin: 2rem 0;">' +
                completed + ' / ' + total +
            '</div>' +
            '<div style="font-size: 1.25rem; color: #4A5568; margin-bottom: 2rem;">' +
                'You got ' + percentage + '% of problems correct on the first try!' +
            '</div>' +
            '<div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">' +
                '<button class="btn-primary" onclick="location.reload()">Practice Again</button>' +
                '<a href="index.html" class="btn-secondary" style="text-decoration: none; display: inline-block;">Back to Topics</a>' +
            '</div>' +
        '</div>';
}

// ─── KaTeX Rendering ─────────────────────────────────────────────────────────

function renderMath() {
    if (typeof renderMathInElement === 'function') {
        renderMathInElement(document.body, {
            delimiters: [
                { left: '$$', right: '$$', display: true },
                { left: '\\(', right: '\\)', display: false },
                { left: '\\[', right: '\\]', display: true }
            ],
            throwOnError: false
        });
    }
}

// ─── Initialization ──────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('answerInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !document.getElementById('submitBtn').disabled) {
            checkAnswer();
        }
    });
    loadProblems();
});
