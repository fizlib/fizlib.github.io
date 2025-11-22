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

        // Check for deep link
        const urlParams = new URLSearchParams(window.location.search);
        const exerciseId = urlParams.get('id');

        if (exerciseId) {
            const specificExercise = allExercises.filter(ex => ex.id === exerciseId);
            if (specificExercise.length > 0) {
                renderExercises(specificExercise);

                // Add a "Show All" button
                const showAllBtn = document.createElement('button');
                showAllBtn.className = 'btn btn-outline';
                showAllBtn.textContent = '← Rodyti visas užduotis';
                showAllBtn.style.marginBottom = '1rem';
                showAllBtn.onclick = () => {
                    window.history.pushState({}, document.title, window.location.pathname);
                    renderExercises(allExercises);
                    showAllBtn.remove();
                };
                exercisesContainer.parentElement.insertBefore(showAllBtn, exercisesContainer);

                // Auto-expand the exercise
                setTimeout(() => {
                    const expandBtn = exercisesContainer.querySelector('.expand-btn');
                    if (expandBtn) {
                        expandBtn.click();
                    }
                }, 100);
            } else {
                exercisesContainer.innerHTML = '<div class="loading">Užduotis nerasta.</div>';
            }
        } else {
            renderExercises(allExercises);
        }
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
            const isFullSimulation = (exercises.length === 1 && (ex.type === 'simulation' || ex.type === 'structural'));
            const card = document.createElement('div');
            card.className = 'exercise-card';
            if (isFullSimulation) {
                card.classList.add('simulation-mode');
                card.classList.add('expanded'); // Ensure it takes full width
            }

            card.innerHTML = buildCardHTML(ex, isFullSimulation);
            exercisesContainer.appendChild(card);

            // Add event listeners for this card
            attachCardEvents(card, ex, isFullSimulation);

            // Load GeoGebra if full simulation
            if (isFullSimulation && ex.type === 'simulation') {
                // Small delay to ensure DOM is ready
                setTimeout(() => {
                    loadGeoGebraApplet(ex.simulationFile, `ggb-element-${ex.id}`);
                }, 100);
            }
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

    function buildCardHTML(ex, isFullView = false) {
        if (ex.type === 'simulation' || ex.type === 'structural') {
            const isStructural = ex.type === 'structural';
            const badgeText = isStructural ? 'Struktūrinis' : 'Simuliacija';
            const badgeClass = isStructural ? 'structural-badge' : 'special-badge';
            const badgeStyle = isStructural
                ? 'background-color: #fef3c7; color: #92400e; border: 1px solid #fcd34d;'
                : 'background-color: #e0e7ff; color: #4338ca; border: 1px solid #c7d2fe;';

            if (!isFullView) {
                return `
                    <div class="card-header">
                        <span class="badge ${badgeClass}" style="${badgeStyle}">${badgeText}</span>
                        <span class="badge">${ex.grade} klasė</span>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <button class="share-btn" aria-label="Dalintis" title="Kopijuoti nuorodą">🔗</button>
                            <span class="badge">${ex.topic}</span>
                        </div>
                    </div>
                    <div class="card-question">${ex.question}</div>
                    <div class="card-content">
                        <div class="simulation-preview" style="text-align: center; padding: 2rem; background: #f9fafb; border-radius: 8px; border: 1px dashed #d1d5db;">
                            <p style="margin-bottom: 1rem; color: #6b7280;">${isStructural ? 'Ši užduotis yra struktūrinė.' : 'Ši užduotis turi interaktyvią simuliaciją.'}</p>
                            <button class="btn btn-primary start-simulation-btn">${isStructural ? 'Pradėti užduotį' : 'Pradėti simuliaciją'}</button>
                        </div>
                    </div>
                `;
            } else {
                // Full Simulation/Structural View
                const questionsHTML = ex.questions.map((q, index) => {
                    if (q.type === 'group') {
                        return `<div class="card-question" style="margin-top: 2rem; font-weight: bold;">${q.question}</div>`;
                    }
                    return `
                    <div class="simulation-question-block" style="margin-top: 2rem; padding-top: 2rem; border-top: 1px solid #e5e7eb;">
                        <div class="card-question">${q.question}</div>
                        <div class="card-content" data-qid="${q.id}">
                            ${buildInputArea(q)}
                            <div class="feedback"></div>
                        </div>
                        <div class="card-actions">
                            <button class="btn btn-primary submit-btn" data-qid="${q.id}">Pateikti</button>
                            <button class="btn btn-outline solution-btn" data-qid="${q.id}">Rodyti atsakymą</button>
                        </div>
                    </div>
                `}).join('');

                const mainContent = isStructural
                    ? `<img src="${ex.image}" alt="Užduoties iliustracija" style="max-width: 100%; height: auto; display: block; margin: 0 auto 2rem auto; border-radius: 8px;">`
                    : `<div id="ggb-element-${ex.id}" class="simulation-container" style="margin-bottom: 2rem; border: 1px solid #e5e7eb; border-radius: 8px;"></div>`;

                return `
                    <div class="card-header">
                        <span class="badge ${badgeClass}" style="${badgeStyle}">${badgeText}</span>
                        <span class="badge">${ex.grade} klasė</span>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <button class="share-btn" aria-label="Dalintis" title="Kopijuoti nuorodą">🔗</button>
                            <span class="badge">${ex.topic}</span>
                        </div>
                    </div>
                    <div class="card-question">${ex.question}</div>
                    
                    ${mainContent}
                    
                    <div class="simulation-questions">
                        ${questionsHTML}
                    </div>
                `;
            }
        }

        // Standard Exercise
        const inputArea = buildInputArea(ex);
        const imageHTML = ex.image ? `<img src="${ex.image}" alt="Užduoties grafikas" class="card-image">` : '';

        return `
            <div class="card-header">
                <span class="badge">${ex.grade} klasė</span>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <button class="share-btn" aria-label="Dalintis" title="Kopijuoti nuorodą">🔗</button>
                    <button class="expand-btn" aria-label="Išskleisti">⤢</button>
                    ${ex.subtopic ? `
                        <div class="topic-badge-container">
                            <span class="badge topic-badge">${ex.topic} ▾</span>
                            <div class="subtopic-dropdown">
                                <span class="badge subtopic-badge">${ex.subtopic}</span>
                            </div>
                        </div>
                    ` : `<span class="badge">${ex.topic}</span>`}
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

    function buildInputArea(ex) {
        if (ex.type === 'multiple_choice') {
            return `
                <div class="options-grid">
                    ${ex.options.map(opt => `<div class="option-btn" data-value="${opt}">${opt}</div>`).join('')}
                </div>
                <input type="hidden" class="user-answer" value="">
            `;
        } else if (ex.type === 'matching') {
            if (ex.matchItems) {
                let secondPartHTML = '';
                if (ex.secondPart) {
                    secondPartHTML = `
                        <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px dashed #e5e7eb;">
                            <div class="input-group" style="display: flex; align-items: center; gap: 0.5rem;">
                                <input type="text" class="text-input second-part-input" placeholder="Įveskite skaičių...">
                                ${ex.secondPart.unit ? `<span style="font-weight: 500; color: var(--text-secondary);">${ex.secondPart.unit}</span>` : ''}
                            </div>
                        </div>
                    `;
                }

                return `
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
                    ${secondPartHTML}
                `;
            } else {
                const keys = Object.keys(ex.pairs);
                const values = Object.values(ex.pairs).sort(() => Math.random() - 0.5);

                return `
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
            return `
                <div class="input-group" style="display: flex; align-items: center; gap: 0.5rem;">
                    <input type="text" class="text-input" placeholder="Įveskite atsakymą...">
                    ${ex.unit ? `<span style="font-weight: 500; color: var(--text-secondary);">${ex.unit}</span>` : ''}
                </div>
            `;
        }
    }

    function loadGeoGebraApplet(filename, containerId) {
        if (typeof GGBApplet === 'undefined') {
            console.error('GeoGebra script not loaded');
            document.getElementById(containerId).innerHTML = 'Nepavyko užkrauti simuliacijos.';
            return;
        }

        const params = {
            "appName": "classic",
            "width": 1200,
            "height": 670,
            "showToolBar": false,
            "showAlgebraInput": false,
            "showMenuBar": false,
            "filename": filename,
            "enableRightClick": false,
            "enableLabelDrags": false,
            "enableShiftDragZoom": false,
            "showZoomButtons": false,
            "showResetIcon": true,
            "language": "lt",
            "borderRadius": 8,
            "scaleContainerClass": "simulation-container",
            "allowUpscale": false,
        };

        const applet = new GGBApplet(params, true);
        applet.inject(containerId);
    }

    function attachCardEvents(card, ex, isFullSimulation = false) {
        // Handle Simulation/Structural Start
        if ((ex.type === 'simulation' || ex.type === 'structural') && !isFullSimulation) {
            const startBtn = card.querySelector('.start-simulation-btn');
            if (startBtn) {
                startBtn.addEventListener('click', () => {
                    // Update URL
                    const newUrl = `${window.location.pathname}?id=${ex.id}`;
                    window.history.pushState({ id: ex.id }, '', newUrl);

                    // Scroll to top
                    window.scrollTo(0, 0);

                    // Re-render only this exercise in full mode
                    renderExercises([ex]);

                    // Add "Show All" button if not present
                    if (!document.querySelector('.show-all-btn')) {
                        const showAllBtn = document.createElement('button');
                        showAllBtn.className = 'btn btn-outline show-all-btn';
                        showAllBtn.textContent = '← Rodyti visas užduotis';
                        showAllBtn.style.marginBottom = '1rem';
                        showAllBtn.onclick = () => {
                            window.history.pushState({}, document.title, window.location.pathname);
                            renderExercises(allExercises);
                            showAllBtn.remove();
                        };
                        exercisesContainer.parentElement.insertBefore(showAllBtn, exercisesContainer);
                    }
                });
            }

            // Share Button Logic for Preview
            const shareBtn = card.querySelector('.share-btn');
            if (shareBtn) {
                shareBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const url = `${window.location.origin}${window.location.pathname}?id=${ex.id}`;
                    navigator.clipboard.writeText(url).then(() => {
                        showToast('Nuoroda nukopijuota!');
                    }).catch(err => {
                        console.error('Failed to copy: ', err);
                    });
                });
            }
            return; // No other events for preview
        }

        // If Full Simulation, we have multiple questions
        if (isFullSimulation) {
            ex.questions.forEach(q => {
                if (q.type === 'group') return; // Skip group headers
                const contentDiv = card.querySelector(`.card-content[data-qid="${q.id}"]`);
                const submitBtn = card.querySelector(`.submit-btn[data-qid="${q.id}"]`);
                const solutionBtn = card.querySelector(`.solution-btn[data-qid="${q.id}"]`);
                const feedbackEl = contentDiv.querySelector('.feedback');

                attachQuestionEvents(card, q, contentDiv, submitBtn, solutionBtn, feedbackEl);
            });

            // Share Button Logic for Full View
            const shareBtn = card.querySelector('.share-btn');
            if (shareBtn) {
                shareBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const url = `${window.location.origin}${window.location.pathname}?id=${ex.id}`;
                    navigator.clipboard.writeText(url).then(() => {
                        showToast('Nuoroda nukopijuota!');
                    }).catch(err => {
                        console.error('Failed to copy: ', err);
                    });
                });
            }
            return;
        }

        // Standard Exercise Events
        const submitBtn = card.querySelector('.submit-btn');
        const solutionBtn = card.querySelector('.solution-btn');
        const feedbackEl = card.querySelector('.feedback');
        const contentDiv = card.querySelector('.card-content'); // Use main content div

        attachQuestionEvents(card, ex, contentDiv, submitBtn, solutionBtn, feedbackEl);

        // Share Button Logic
        const shareBtn = card.querySelector('.share-btn');
        shareBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const url = `${window.location.origin}${window.location.pathname}?id=${ex.id}`;
            navigator.clipboard.writeText(url).then(() => {
                showToast('Nuoroda nukopijuota!');
            }).catch(err => {
                console.error('Failed to copy: ', err);
            });
        });

        // Card Expansion Logic (Only for standard cards)
        const expandBtn = card.querySelector('.expand-btn');
        if (expandBtn) {
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
        }

        // Topic Badge Dropdown Logic
        const topicBadge = card.querySelector('.topic-badge');
        if (topicBadge) {
            topicBadge.addEventListener('click', (e) => {
                e.stopPropagation();
                const dropdown = card.querySelector('.subtopic-dropdown');
                if (dropdown) {
                    dropdown.classList.toggle('show');
                }
            });
        }
    }

    function attachQuestionEvents(card, ex, contentDiv, submitBtn, solutionBtn, feedbackEl) {
        // Handle Option Selection for Multiple Choice
        if (ex.type === 'multiple_choice') {
            const options = contentDiv.querySelectorAll('.option-btn');
            const hiddenInput = contentDiv.querySelector('.user-answer');

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
        const textInputs = contentDiv.querySelectorAll('.text-input');
        textInputs.forEach(textInput => {
            textInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    submitBtn.click();
                }
            });
        });

        submitBtn.addEventListener('click', () => {
            let isCorrect = false;
            let userAnswer = '';

            if (ex.type === 'multiple_choice') {
                userAnswer = contentDiv.querySelector('.user-answer').value;
                if (!userAnswer) return;
                isCorrect = checkAnswer(userAnswer, ex.correctAnswer);
            } else if (ex.type === 'matching') {
                const selects = contentDiv.querySelectorAll('.matching-select');
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

                // Check second part input if exists
                if (ex.secondPart) {
                    const secondInput = contentDiv.querySelector('.second-part-input');
                    if (!secondInput.value) allSelected = false;
                    if (secondInput.value.trim() !== ex.secondPart.correctAnswer) {
                        allCorrect = false;
                    }
                }

                if (!allSelected) return;
                isCorrect = allCorrect;
            } else {
                userAnswer = contentDiv.querySelector('.text-input').value.trim();
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
            // For simulation questions, we might not have a solution text for each sub-question yet, 
            // or we might want to show the answer.
            // If ex.solution is present, use it. If not, just show correct answer.

            const existingSolution = feedbackEl.querySelector('.solution-text');

            if (existingSolution) {
                // Toggle visibility
                if (existingSolution.style.display === 'none') {
                    existingSolution.style.display = 'block';
                    solutionBtn.textContent = "Slėpti atsakymą";
                    feedbackEl.style.display = 'block';
                    showCorrectAnswer(contentDiv, ex);
                } else {
                    existingSolution.style.display = 'none';
                    solutionBtn.textContent = "Rodyti atsakymą";
                    hideCorrectAnswer(contentDiv, ex);
                    if (!feedbackEl.classList.contains('correct') && !feedbackEl.classList.contains('incorrect')) {
                        feedbackEl.style.display = 'none';
                    }
                }
            } else {
                // First time showing
                const solutionDiv = document.createElement('div');
                solutionDiv.className = 'solution-text';
                // If no specific solution text, just say "Atsakymas:"
                const solText = ex.solution ? ex.solution : 'Teisingas atsakymas parodytas.';
                solutionDiv.innerHTML = `<strong>Sprendimas:</strong><br>${solText}`;
                feedbackEl.appendChild(solutionDiv);
                solutionBtn.textContent = "Slėpti atsakymą";
                feedbackEl.style.display = 'block';

                showCorrectAnswer(contentDiv, ex);

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

    function showCorrectAnswer(container, ex) {
        if (ex.type === 'multiple_choice') {
            // Highlight the correct option
            const options = container.querySelectorAll('.option-btn');
            options.forEach(opt => {
                if (opt.dataset.value === ex.correctAnswer) {
                    opt.classList.add('correct-answer');
                }
            });
        } else if (ex.type === 'matching') {
            // Fill in the correct values in dropdowns
            const selects = container.querySelectorAll('.matching-select');
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

            if (ex.secondPart) {
                const secondInput = container.querySelector('.second-part-input');
                if (secondInput) {
                    secondInput.value = ex.secondPart.correctAnswer;
                    secondInput.classList.add('showing-answer');
                }
            }
        } else {
            // Fill in the correct answer in text input
            const textInput = container.querySelector('.text-input');
            if (textInput) {
                textInput.value = ex.correctAnswer;
                textInput.classList.add('showing-answer');
            }
        }
    }

    function hideCorrectAnswer(container, ex) {
        if (ex.type === 'multiple_choice') {
            // Remove highlighting from correct option
            const options = container.querySelectorAll('.option-btn');
            options.forEach(opt => {
                opt.classList.remove('correct-answer');
            });
        } else if (ex.type === 'matching') {
            // Clear the dropdowns
            const selects = container.querySelectorAll('.matching-select');
            selects.forEach(select => {
                select.value = '';
                select.classList.remove('showing-answer');
            });

            if (ex.secondPart) {
                const secondInput = container.querySelector('.second-part-input');
                if (secondInput) {
                    secondInput.value = '';
                    secondInput.classList.remove('showing-answer');
                }
            }
        } else {
            // Clear the text input
            const textInput = container.querySelector('.text-input');
            if (textInput) {
                textInput.value = '';
                textInput.classList.remove('showing-answer');
            }
        }
    }

    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.textContent = message;
        document.body.appendChild(toast);

        // Trigger reflow
        toast.offsetHeight;

        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 2000);
    }
});
