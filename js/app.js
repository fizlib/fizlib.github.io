document.addEventListener('DOMContentLoaded', () => {
    const exercisesContainer = document.getElementById('exercises-list');
    const gradeFiltersContainer = document.getElementById('grade-filters');
    const topicFiltersContainer = document.getElementById('topic-filters');
    const navButtons = document.querySelectorAll('.nav-btn[data-filter]');
    const activeFiltersContainer = document.getElementById('active-filters-container');

    let allExercises = [];
    let activeFilters = {
        category: 'all',
        grade: 'all',
        topic: 'all'
    };

    // Fetch Data
    fetch('data/manifest.json')
        .then(response => response.json())
        .then(files => {
            const promises = files.map(file => fetch(`data/exercises/${file}`).then(res => res.json()));
            return Promise.all(promises);
        })
        .then(data => {
            allExercises = data;
            initApp();
        })
        .catch(err => {
            console.error('Error loading exercises:', err);
            exercisesContainer.innerHTML = '<div class="loading">Nepavyko užkrauti užduočių.</div>';
        });

    function initApp() {
        setupFilters();
        renderExercises(allExercises);
    }

    function setupFilters() {
        // Extract unique grades and topics
        const grades = [...new Set(allExercises.map(ex => ex.grade))].sort((a, b) => a - b);
        const topics = [...new Set(allExercises.map(ex => ex.topic))].sort();

        // Render Grade Filters
        gradeFiltersContainer.innerHTML = grades.map(grade =>
            `<div class="dropdown-item" data-type="grade" data-value="${grade}">${grade} klasė</div>`
        ).join('');

        // Render Topic Filters
        topicFiltersContainer.innerHTML = topics.map(topic =>
            `<div class="dropdown-item" data-type="topic" data-value="${topic}">${topic}</div>`
        ).join('');

        // Add Event Listeners to Dropdown Items
        document.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const type = e.target.dataset.type;
                const value = e.target.dataset.value;
                applyFilter(type, value);
            });
        });

        // Add Event Listeners to Category Buttons
        document.querySelectorAll('.nav-btn[data-filter="category"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const value = e.target.dataset.value;
                applyFilter('category', value);
            });
        });
    }

    function applyFilter(type, value) {
        activeFilters[type] = value;

        // Update UI Active States for Categories
        if (type === 'category') {
            document.querySelectorAll('.nav-btn[data-filter="category"]').forEach(btn => {
                if (btn.dataset.value === value) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }

        renderActiveFilters();

        // Filter Data
        let filtered = allExercises;

        if (activeFilters.category !== 'all') {
            filtered = filtered.filter(ex => ex.category === activeFilters.category);
        }
        if (activeFilters.grade !== 'all') {
            filtered = filtered.filter(ex => ex.grade == activeFilters.grade);
        }
        if (activeFilters.topic !== 'all') {
            filtered = filtered.filter(ex => ex.topic === activeFilters.topic);
        }

        renderExercises(filtered);
    }

    function renderActiveFilters() {
        activeFiltersContainer.innerHTML = '';

        const filterLabels = {
            category: 'Kategorija',
            grade: 'Klasė',
            topic: 'Tema'
        };

        let activeCount = 0;
        Object.values(activeFilters).forEach(val => {
            if (val !== 'all') activeCount++;
        });

        Object.entries(activeFilters).forEach(([type, value]) => {
            if (value !== 'all') {
                let displayValue = value;
                if (type === 'grade') displayValue = `${value} klasė`;

                const tag = document.createElement('div');
                tag.className = 'active-filter-tag';
                tag.innerHTML = `
                    <span>${displayValue}</span>
                    <button class="remove-filter-btn" aria-label="Pašalinti filtrą">×</button>
                `;

                tag.querySelector('.remove-filter-btn').addEventListener('click', () => {
                    applyFilter(type, 'all');
                });

                activeFiltersContainer.appendChild(tag);
            }
        });

        if (activeCount >= 2) {
            const clearAllBtn = document.createElement('button');
            clearAllBtn.className = 'clear-all-filters-btn';
            clearAllBtn.textContent = 'Valyti visus';
            clearAllBtn.addEventListener('click', () => {
                Object.keys(activeFilters).forEach(key => activeFilters[key] = 'all');
                // Reset UI states
                document.querySelectorAll('.nav-btn[data-filter="category"]').forEach(btn => {
                    if (btn.dataset.value === 'all') btn.classList.add('active');
                    else btn.classList.remove('active');
                });
                applyFilter('category', 'all'); // Re-trigger render with all reset (or just call renderExercises and renderActiveFilters)
                // Actually, applyFilter only updates one. We need to reset all and then render.
                // Let's fix the logic below.
            });

            // Better logic for clear all:
            clearAllBtn.onclick = () => {
                activeFilters = {
                    category: 'all',
                    grade: 'all',
                    topic: 'all'
                };

                // Reset Category Buttons UI
                document.querySelectorAll('.nav-btn[data-filter="category"]').forEach(btn => {
                    if (btn.dataset.value === 'all') btn.classList.add('active');
                    else btn.classList.remove('active');
                });

                renderActiveFilters();
                renderExercises(allExercises);
            };

            activeFiltersContainer.appendChild(clearAllBtn);
        }
    }

    function renderExercises(exercises) {
        exercisesContainer.innerHTML = '';

        if (exercises.length === 0) {
            exercisesContainer.innerHTML = '<div class="loading">Užduočių nerasta.</div>';
            return;
        }

        exercises.forEach(ex => {
            const card = document.createElement('div');
            card.className = 'exercise-card';
            card.innerHTML = buildCardHTML(ex);
            exercisesContainer.appendChild(card);

            // Add event listeners for this card
            attachCardEvents(card, ex);
        });

        // Render Math
        if (window.renderMathInElement) {
            renderMathInElement(exercisesContainer, {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '$', right: '$', display: false },
                    { left: '\\(', right: '\\)', display: false },
                    { left: '\\[', right: '\\]', display: true }
                ]
            });
        }
    }

    function buildCardHTML(ex) {
        let inputArea = '';

        if (ex.type === 'multiple_choice') {
            inputArea = `
                <div class="options-grid">
                    ${ex.options.map(opt => `<div class="option-btn" data-value="${opt}">${opt}</div>`).join('')}
                </div>
                <input type="hidden" class="user-answer" value="">
            `;
        } else if (ex.type === 'matching') {
            if (ex.matchItems) {
                // New structure with specific options
                inputArea = `
                    <div class="matching-container">
                        ${ex.matchItems.map((item, index) => `
                            <div class="matching-row" style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.5rem;">
                                <div style="flex: 1; font-weight: 500;">${item.question}</div>
                                <select class="matching-select text-input" data-index="${index}" style="flex: 1;">
                                    <option value="">Pasirinkite...</option>
                                    ${item.options.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
                                </select>
                            </div>
                        `).join('')}
                    </div>
                `;
            } else {
                // Legacy structure (pairs)
                // Shuffle values for dropdowns
                const keys = Object.keys(ex.pairs);
                const values = Object.values(ex.pairs).sort(() => Math.random() - 0.5);

                inputArea = `
                    <div class="matching-container">
                        ${keys.map((key, index) => `
                            <div class="matching-row" style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.5rem;">
                                <div style="flex: 1; font-weight: 500;">${key}</div>
                                <select class="matching-select text-input" data-key="${key}" style="flex: 1;">
                                    <option value="">Pasirinkite...</option>
                                    ${values.map(val => `<option value="${val}">${val}</option>`).join('')}
                                </select>
                            </div>
                        `).join('')}
                    </div>
                `;
            }
        } else {
            inputArea = `
                <div class="input-group" style="display: flex; align-items: center; gap: 0.5rem;">
                    <input type="text" class="text-input" placeholder="Įveskite atsakymą...">
                    ${ex.unit ? `<span style="font-weight: 500; color: var(--text-secondary);">${ex.unit}</span>` : ''}
                </div>
            `;
        }

        const imageHTML = ex.image ? `<img src="${ex.image}" alt="Užduoties grafikas" class="card-image">` : '';

        return `
            <div class="card-header">
                <span class="badge">${ex.grade} klasė</span>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <button class="expand-btn" aria-label="Išskleisti">⤢</button>
                    <span class="badge">${ex.topic}</span>
                    ${ex.subtopic ? `<span class="badge">${ex.subtopic}</span>` : ''}
                </div>
            </div>
            <div class="card-question">${ex.question}</div>
            ${imageHTML}
            <div class="card-content">
                ${inputArea}
                <div class="feedback"></div>
            </div>
            <div class="card-actions">
                <button class="btn btn-primary submit-btn">Pateikti</button>
                <button class="btn btn-outline solution-btn">Rodyti sprendimą</button>
            </div>
        `;
    }

    function attachCardEvents(card, ex) {
        const submitBtn = card.querySelector('.submit-btn');
        const solutionBtn = card.querySelector('.solution-btn');
        const feedbackEl = card.querySelector('.feedback');

        // Card Expansion Logic
        const expandBtn = card.querySelector('.expand-btn');
        expandBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent bubbling if needed

            const isExpanded = card.classList.contains('expanded');
            const allCards = document.querySelectorAll('.exercise-card');

            if (isExpanded) {
                // Collapse
                card.classList.remove('expanded');
                expandBtn.innerHTML = '⤢';
                expandBtn.setAttribute('aria-label', 'Išskleisti');
                allCards.forEach(c => c.classList.remove('hidden-card'));
                // Remove any existing zoom overlay
                const existingOverlay = document.querySelector('.image-zoom-overlay');
                if (existingOverlay) {
                    existingOverlay.remove();
                }
            } else {
                // Expand
                allCards.forEach(c => {
                    if (c !== card) {
                        c.classList.add('hidden-card');
                    }
                });
                card.classList.add('expanded');
                expandBtn.innerHTML = '✕';
                expandBtn.setAttribute('aria-label', 'Suskleisti');
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });

                // Add image zoom functionality
                const cardImage = card.querySelector('.card-image');
                if (cardImage && !cardImage.dataset.zoomListener) {
                    cardImage.dataset.zoomListener = 'true';
                    cardImage.addEventListener('click', () => {
                        // Create zoom overlay
                        const overlay = document.createElement('div');
                        overlay.className = 'image-zoom-overlay';

                        const zoomedImg = document.createElement('img');
                        zoomedImg.src = cardImage.src;
                        zoomedImg.alt = cardImage.alt;

                        overlay.appendChild(zoomedImg);
                        document.body.appendChild(overlay);

                        // Close on click
                        overlay.addEventListener('click', () => {
                            overlay.remove();
                        });
                    });
                }
            }
        });

        // Handle Option Selection for Multiple Choice
        if (ex.type === 'multiple_choice') {
            const options = card.querySelectorAll('.option-btn');
            const hiddenInput = card.querySelector('.user-answer');

            options.forEach(opt => {
                opt.addEventListener('click', () => {
                    // Remove selected from all
                    options.forEach(o => o.classList.remove('selected'));
                    // Add to clicked
                    opt.classList.add('selected');
                    hiddenInput.value = opt.dataset.value;
                });

                // Add ENTER key support for multiple choice options
                opt.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        // Remove selected from all
                        options.forEach(o => o.classList.remove('selected'));
                        // Add to clicked
                        opt.classList.add('selected');
                        hiddenInput.value = opt.dataset.value;
                        // Trigger submit
                        submitBtn.click();
                    }
                });

                // Make options focusable
                opt.setAttribute('tabindex', '0');
            });
        }

        // Add ENTER key support for text inputs (for all text-based exercises)
        const textInput = card.querySelector('.text-input');
        if (textInput) {
            textInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    submitBtn.click();
                }
            });
        }

        // Add ENTER key support for matching dropdowns
        if (ex.type === 'matching') {
            const selects = card.querySelectorAll('.matching-select');
            selects.forEach(select => {
                select.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        submitBtn.click();
                    }
                });
            });
        }

        submitBtn.addEventListener('click', () => {
            let isCorrect = false;
            let userAnswer = '';

            if (ex.type === 'multiple_choice') {
                userAnswer = card.querySelector('.user-answer').value;
                if (!userAnswer) return;
                isCorrect = checkAnswer(userAnswer, ex.correctAnswer);
            } else if (ex.type === 'matching') {
                const selects = card.querySelectorAll('.matching-select');
                let allCorrect = true;
                let allSelected = true;

                selects.forEach(select => {
                    if (!select.value) allSelected = false;

                    if (ex.matchItems) {
                        const index = parseInt(select.dataset.index);
                        if (ex.matchItems[index].correctAnswer !== select.value) {
                            allCorrect = false;
                        }
                    } else {
                        if (ex.pairs[select.dataset.key] !== select.value) {
                            allCorrect = false;
                        }
                    }
                });

                if (!allSelected) return;
                isCorrect = allCorrect;
            } else {
                userAnswer = card.querySelector('.text-input').value.trim();
                if (!userAnswer) return;
                isCorrect = checkAnswer(userAnswer, ex.correctAnswer);
            }

            if (isCorrect) {
                feedbackEl.className = 'feedback correct';
                feedbackEl.innerHTML = '<strong>Teisingai!</strong>';
            } else {
                feedbackEl.className = 'feedback incorrect';
                feedbackEl.innerHTML = '<strong>Neteisingai.</strong> Bandykite dar kartą.';
            }
        });

        solutionBtn.addEventListener('click', () => {
            const existingSolution = feedbackEl.querySelector('.solution-text');

            if (existingSolution) {
                // Toggle visibility
                if (existingSolution.style.display === 'none') {
                    existingSolution.style.display = 'block';
                    solutionBtn.textContent = "Slėpti sprendimą";
                    feedbackEl.style.display = 'block';
                    // Re-show correct answer
                    showCorrectAnswer(card, ex);
                } else {
                    existingSolution.style.display = 'none';
                    solutionBtn.textContent = "Rodyti sprendimą";
                    // Hide correct answer highlighting
                    hideCorrectAnswer(card, ex);
                    // If not submitted (no correct/incorrect class), hide the empty feedback box
                    if (!feedbackEl.classList.contains('correct') && !feedbackEl.classList.contains('incorrect')) {
                        feedbackEl.style.display = 'none';
                    }
                }
            } else {
                // First time showing
                const solutionDiv = document.createElement('div');
                solutionDiv.className = 'solution-text';
                solutionDiv.innerHTML = `<strong>Sprendimas:</strong><br>${ex.solution}`;
                feedbackEl.appendChild(solutionDiv);
                solutionBtn.textContent = "Slėpti sprendimą";
                feedbackEl.style.display = 'block';

                // Show correct answer
                showCorrectAnswer(card, ex);

                if (window.renderMathInElement) {
                    renderMathInElement(solutionDiv, {
                        delimiters: [
                            { left: '$$', right: '$$', display: true },
                            { left: '$', right: '$', display: false },
                            { left: '\\(', right: '\\)', display: false },
                            { left: '\\[', right: '\\]', display: true }
                        ]
                    });
                }
            }
        });
    }

    function checkAnswer(user, correct) {
        // Simple string comparison for now. 
        // For numerical, we might want to handle commas/dots if needed, but let's stick to simple.
        return user.toLowerCase() === correct.toLowerCase();
    }

    function showCorrectAnswer(card, ex) {
        if (ex.type === 'multiple_choice') {
            // Highlight the correct option
            const options = card.querySelectorAll('.option-btn');
            options.forEach(opt => {
                if (opt.dataset.value === ex.correctAnswer) {
                    opt.classList.add('correct-answer');
                }
            });
        } else if (ex.type === 'matching') {
            // Fill in the correct values in dropdowns
            const selects = card.querySelectorAll('.matching-select');
            selects.forEach(select => {
                let correctValue;
                if (ex.matchItems) {
                    const index = parseInt(select.dataset.index);
                    correctValue = ex.matchItems[index].correctAnswer;
                } else {
                    correctValue = ex.pairs[select.dataset.key];
                }
                select.value = correctValue;
                select.classList.add('showing-answer');
            });
        } else {
            // Fill in the correct answer in text input
            const textInput = card.querySelector('.text-input');
            if (textInput) {
                textInput.value = ex.correctAnswer;
                textInput.classList.add('showing-answer');
            }
        }
    }

    function hideCorrectAnswer(card, ex) {
        if (ex.type === 'multiple_choice') {
            // Remove highlighting from correct option
            const options = card.querySelectorAll('.option-btn');
            options.forEach(opt => {
                opt.classList.remove('correct-answer');
            });
        } else if (ex.type === 'matching') {
            // Clear the dropdowns
            const selects = card.querySelectorAll('.matching-select');
            selects.forEach(select => {
                select.value = '';
                select.classList.remove('showing-answer');
            });
        } else {
            // Clear the text input
            const textInput = card.querySelector('.text-input');
            if (textInput) {
                textInput.value = '';
                textInput.classList.remove('showing-answer');
            }
        }
    }
});
