document.addEventListener('DOMContentLoaded', () => {
    const exercisesContainer = document.getElementById('exercises-list');
    const gradeFiltersContainer = document.getElementById('grade-filters');
    const topicFiltersContainer = document.getElementById('topic-filters');
    const activeFiltersContainer = document.getElementById('active-filters-container');
    const searchInput = document.getElementById('search-input');
    const clearAllBtn = document.getElementById('clear-all-filters');

    // Mobile Sidebar Elements
    const mobileFilterToggle = document.getElementById('mobile-filter-toggle');
    const closeSidebarBtn = document.getElementById('close-sidebar');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    let allExercises = [];

    // Filter State
    let activeFilters = {
        search: '',
        grades: [], // Array of numbers/strings
        topics: [], // Array of strings (child topics)
        types: []   // Array of strings
    };

    // Topic Hierarchy Definition
    const topicHierarchy = {
        11: {
            "Fizikos mokslo kalba ir pažinimo metodai": {
                "Fizikos mokslo raida.": ["Fizikos istorija ir asmenybės", "Fizika ir visuomenė"],
                "Pažinimo metodai ir kalba.": ["Mokslinis tyrimas ir modeliai", "Fizikiniai dydžiai ir matavimai", "Grafinė analizė"],
                "Matavimai ir skaičiavimai fizikoje.": ["SI sistema", "Vektoriai", "Paklaidos"]
            },
            "Judėjimas ir jėgos": {
                "Judėjimas.": ["Kinematikos pagrindai", "Tolygiai kintamas judėjimas", "Judėjimas plokštumoje (metimas)", "Reliatyvumas"],
                "Jėgos.": ["Jėgos ir jų rūšys", "Niutono dėsniai", "Visuotinė trauka", "Kūno svoris", "Trintis ir pasipriešinimas"],
                "Judesio kiekis ir jėgos impulsas.": ["Judesio kiekis ir impulsas", "Tvermės dėsnis", "Smūgiai", "Reaktyvusis judėjimas"]
            },
            "Energija": {
                "Energija, darbas, galia.": ["Mechaninis darbas ir galia", "Mechaninė energija", "Energijos tvermės dėsnis", "Naudingumo koeficientas"]
            },
            "Šiluminiai reiškiniai": {
                "Ryšys tarp mikro ir makro pasaulio.": ["MKT pagrindai", "Idealiosios dujos", "Dujų dėsniai (izoprocesai)"],
                "Termodinamika.": ["Vidinė energija ir šiluma", "Termodinamikos dėsniai", "Šiluminiai procesai"]
            },
            "Elektra ir magnetizmas": {
                "Elektrostatinis laukas.": ["Elektros krūviai ir sąveika", "Elektrinis laukas", "Potencialas ir įtampa", "Kondensatoriai"],
                "Elektros srovė metaluose.": ["Srovė ir varža", "Grandinės dėsniai"],
                "Elektros srovės šaltiniai.": ["Elektrovara ir vidinė varža", "Omo dėsnis uždarai grandinei"],
                "Magnetinis laukas.": ["Magnetinis laukas ir srovė", "Magnetinės jėgos", "Medžiagų magnetinės savybės"],
                "Elektromagnetinė indukcija.": ["Indukcijos reiškinys", "Saviindukcija"],
                "Energijos šaltiniai.": ["Elektrinės ir kuro rūšys", "Energetika ir ekologija"]
            },
            "Bendra": {
                "Bendra": ["Bendra"]
            }
        },
        9: {},
        10: {},
        12: {}
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
        setupMobileSidebar();

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

                // Auto-expand
                setTimeout(() => {
                    const expandBtn = exercisesContainer.querySelector('.expand-btn');
                    if (expandBtn) expandBtn.click();
                }, 100);
            } else {
                exercisesContainer.innerHTML = '<div class="loading">Užduotis nerasta.</div>';
            }
        } else {
            renderExercises(allExercises);
        }
    }

    function setupFilters() {
        // 1. Search
        searchInput.addEventListener('input', (e) => {
            activeFilters.search = e.target.value.toLowerCase();
            applyFilters();
        });

        // 2. Grades (Fixed list: 9, 10, 11, 12)
        const grades = [9, 10, 11, 12];
        gradeFiltersContainer.innerHTML = grades.map(grade => `
            <label class="checkbox-label">
                <input type="checkbox" name="grade" value="${grade}">
                <span class="checkbox-custom"></span>
                ${grade} klasė
            </label>
        `).join('');

        gradeFiltersContainer.querySelectorAll('input').forEach(input => {
            input.addEventListener('change', () => {
                updateActiveFilters('grades', input.value, input.checked);
                updateTopicVisibility();
            });
        });

        // 3. Topics (Initially empty)
        topicFiltersContainer.innerHTML = '<div style="padding: 0.5rem; color: #6b7280; font-size: 0.9rem;">Pasirinkite klasę, kad matytumėte temas.</div>';


        // 4. Types (Already in HTML)
        document.querySelectorAll('input[name="type"]').forEach(input => {
            input.addEventListener('change', () => {
                updateActiveFilters('types', input.value, input.checked);
            });
        });

        // 5. Clear All
        clearAllBtn.addEventListener('click', () => {
            // Reset State
            activeFilters = { search: '', grades: [], topics: [], types: [] };
            searchInput.value = '';

            // Uncheck all checkboxes
            document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);

            applyFilters();
        });
    }

    function updateTopicVisibility() {
        const selectedGrades = activeFilters.grades;
        topicFiltersContainer.innerHTML = ''; // Clear existing

        if (activeFilters.topics.length > 0) {
            activeFilters.topics = [];
            renderActiveTags();
            applyFilters();
        }

        if (selectedGrades.length === 1) {
            const grade = selectedGrades[0];
            const topics = topicHierarchy[grade];

            if (topics && Object.keys(topics).length > 0) {
                renderTopicAccordion(topics);
            } else {
                topicFiltersContainer.innerHTML = '<div style="padding: 0.5rem; color: #6b7280; font-size: 0.9rem;">Šiai klasei temų nėra.</div>';
            }
        } else if (selectedGrades.length === 0) {
            topicFiltersContainer.innerHTML = '<div style="padding: 0.5rem; color: #6b7280; font-size: 0.9rem;">Pasirinkite klasę, kad matytumėte temas.</div>';
        } else {
            topicFiltersContainer.innerHTML = '<div style="padding: 0.5rem; color: #6b7280; font-size: 0.9rem;">Pasirinkite tik vieną klasę, kad matytumėte temas.</div>';
        }
    }

    function renderTopicAccordion(topics) {
        let accordionHTML = '';
        for (const [parent, subtopics] of Object.entries(topics)) {
            let subtopicsHTML = '';

            if (Array.isArray(subtopics)) {
                subtopicsHTML = subtopics.map(child => `
                    <label class="checkbox-label">
                        <input type="checkbox" name="topic" value="${child}">
                        <span class="checkbox-custom"></span>
                        ${child}
                    </label>
                `).join('');
            } else {
                for (const [subtopic, subsubtopics] of Object.entries(subtopics)) {
                    const subsubtopicsHTML = subsubtopics.map(subsub => `
                        <label class="checkbox-label sub-sub-topic" style="margin-left: 1.5rem; font-size: 0.85rem;">
                            <input type="checkbox" name="topic" value="${subsub}">
                            <span class="checkbox-custom"></span>
                            ${subsub}
                        </label>
                    `).join('');

                    subtopicsHTML += `
                        <div class="subtopic-group" style="margin-bottom: 0.5rem;">
                            <div class="subtopic-header" style="font-weight: 500; padding: 0.25rem 0.5rem; cursor: pointer; display: flex; justify-content: space-between; align-items: center; color: #4b5563;">
                                <span>${subtopic}</span>
                                <span class="accordion-icon" style="font-size: 0.8em;">▼</span>
                            </div>
                            <div class="subtopic-content" style="display: none; padding-left: 0.5rem;">
                                ${subsubtopicsHTML}
                            </div>
                        </div>
                    `;
                }
            }

            accordionHTML += `
                <div class="accordion-item">
                    <div class="accordion-header">
                        <span>${parent}</span>
                        <span class="accordion-icon">▼</span>
                    </div>
                    <div class="accordion-content">
                        ${subtopicsHTML}
                    </div>
                </div>
            `;
        }
        topicFiltersContainer.innerHTML = accordionHTML;

        topicFiltersContainer.querySelectorAll('.accordion-header').forEach(header => {
            header.addEventListener('click', () => {
                const item = header.parentElement;
                item.classList.toggle('active');
            });
        });

        topicFiltersContainer.querySelectorAll('.subtopic-header').forEach(header => {
            header.addEventListener('click', (e) => {
                e.stopPropagation();
                const content = header.nextElementSibling;
                const icon = header.querySelector('.accordion-icon');
                if (content.style.display === 'none') {
                    content.style.display = 'block';
                    icon.style.transform = 'rotate(180deg)';
                } else {
                    content.style.display = 'none';
                    icon.style.transform = 'rotate(0deg)';
                }
            });
        });

        topicFiltersContainer.querySelectorAll('input').forEach(input => {
            input.addEventListener('change', () => {
                updateActiveFilters('topics', input.value, input.checked);
            });
        });
    }

    function updateActiveFilters(category, value, isChecked) {
        if (isChecked) {
            activeFilters[category].push(value);
        } else {
            activeFilters[category] = activeFilters[category].filter(item => item !== value);
        }
        applyFilters();
    }

    function applyFilters() {
        renderActiveTags();

        let filtered = allExercises;

        if (activeFilters.search) {
            const term = activeFilters.search;
            filtered = filtered.filter(ex =>
                ex.question.toLowerCase().includes(term) ||
                (ex.topic && ex.topic.toLowerCase().includes(term)) ||
                (ex.subtopic && ex.subtopic.toLowerCase().includes(term)) ||
                (ex.subsubtopic && ex.subsubtopic.toLowerCase().includes(term))
            );
        }

        if (activeFilters.grades.length > 0) {
            filtered = filtered.filter(ex => activeFilters.grades.includes(ex.grade.toString()));
        }

        if (activeFilters.topics.length > 0) {
            filtered = filtered.filter(ex => {
                return activeFilters.topics.includes(ex.topic) ||
                    activeFilters.topics.includes(ex.subtopic) ||
                    activeFilters.topics.includes(ex.subsubtopic);
            });
        }

        if (activeFilters.types.length > 0) {
            filtered = filtered.filter(ex => {
                if (activeFilters.types.includes('simulation') && ex.type === 'simulation') return true;
                if (activeFilters.types.includes('structural') && ex.type === 'structural') return true;
                if (activeFilters.types.includes('normal') && ex.type !== 'simulation' && ex.type !== 'structural') return true;
                return false;
            });
        }

        renderExercises(filtered);
    }

    function renderActiveTags() {
        activeFiltersContainer.innerHTML = '';

        const createTag = (text, onClick) => {
            const tag = document.createElement('div');
            tag.className = 'active-filter-tag';
            tag.innerHTML = `<span>${text}</span><button class="remove-filter-btn">×</button>`;
            tag.querySelector('button').addEventListener('click', onClick);
            activeFiltersContainer.appendChild(tag);
        };

        activeFilters.grades.forEach(g => {
            createTag(`${g} klasė`, () => {
                const cb = document.querySelector(`input[name="grade"][value="${g}"]`);
                if (cb) { cb.checked = false; cb.dispatchEvent(new Event('change')); }
            });
        });

        activeFilters.topics.forEach(t => {
            createTag(t, () => {
                const cb = document.querySelector(`input[name="topic"][value="${t}"]`);
                if (cb) { cb.checked = false; cb.dispatchEvent(new Event('change')); }
            });
        });

        activeFilters.types.forEach(t => {
            let label = t;
            if (t === 'normal') label = 'Vienos dalies';
            if (t === 'structural') label = 'Struktūrinės';
            if (t === 'simulation') label = 'Simuliacinės';

            createTag(label, () => {
                const cb = document.querySelector(`input[name="type"][value="${t}"]`);
                if (cb) { cb.checked = false; cb.dispatchEvent(new Event('change')); }
            });
        });
    }

    function setupMobileSidebar() {
        const toggleSidebar = () => {
            sidebar.classList.toggle('open');
            sidebarOverlay.classList.toggle('open');
        };

        if (mobileFilterToggle) mobileFilterToggle.addEventListener('click', toggleSidebar);
        if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', toggleSidebar);
        if (sidebarOverlay) sidebarOverlay.addEventListener('click', toggleSidebar);
    }

    // --- Rendering Logic (Mostly unchanged, just cleaned up) ---

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
                card.classList.add('expanded');
            }

            card.innerHTML = buildCardHTML(ex, isFullSimulation);
            exercisesContainer.appendChild(card);

            attachCardEvents(card, ex, isFullSimulation);

            if (isFullSimulation && ex.type === 'simulation') {
                setTimeout(() => {
                    loadGeoGebraApplet(ex.simulationFile, `ggb-element-${ex.id}`);
                }, 100);
            }
        });

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
            const badgeStyle = isStructural
                ? 'background-color: #FEF3C7; color: #92400E; border-color: #FCD34D;'
                : 'background-color: #E0E7FF; color: #4338CA; border-color: #C7D2FE;';

            if (!isFullView) {
                return `
                    <div class="card-header">
                        <div style="display: flex; flex-direction: column; gap: 0.5rem; align-items: flex-start;">
                            <span class="badge">${ex.grade} klasė</span>
                            <span class="badge" style="${badgeStyle}">${badgeText}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <button class="share-btn" aria-label="Dalintis" title="Kopijuoti nuorodą">🔗</button>
                            <span class="badge">${ex.topic}</span>
                        </div>
                    </div>
                    <div class="card-question">${ex.question}</div>
                    <div class="card-content">
                        <div class="simulation-preview">
                            <p style="margin-bottom: 1rem; color: #6b7280;">${isStructural ? 'Ši užduotis yra struktūrinė.' : 'Ši užduotis turi interaktyvią simuliaciją.'}</p>
                            <button class="btn btn-primary start-simulation-btn">${isStructural ? 'Pradėti užduotį' : 'Pradėti simuliaciją'}</button>
                        </div>
                    </div>
                `;
            } else {
                const questionsHTML = ex.questions.map(q => {
                    if (q.type === 'group') return `<div class="card-question" style="margin-top: 2rem; font-weight: bold;">${q.question}</div>`;
                    return `
                    <div class="simulation-question-block">
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
                    ? `<img src="${ex.image}" alt="Užduoties iliustracija" style="max-width: 60%; height: auto; display: block; margin: 0 auto 2rem auto; border-radius: 8px;">`
                    : `<div id="ggb-element-${ex.id}" class="simulation-container" style="margin-bottom: 2rem; border: 1px solid #e5e7eb; border-radius: 8px;"></div>`;

                return `
                    <div class="card-header">
                        <div style="display: flex; flex-direction: column; gap: 0.5rem; align-items: flex-start;">
                            <span class="badge">${ex.grade} klasė</span>
                            <span class="badge" style="${badgeStyle}">${badgeText}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <button class="share-btn" aria-label="Dalintis" title="Kopijuoti nuorodą">🔗</button>
                            <span class="badge">${ex.topic}</span>
                        </div>
                    </div>
                    <div class="card-question">${ex.question}</div>
                    ${mainContent}
                    <div class="simulation-questions">${questionsHTML}</div>
                `;
            }
        }

        const inputArea = buildInputArea(ex);
        const imageHTML = ex.image ? `<img src="${ex.image}" alt="Užduoties grafikas" class="card-image">` : '';

        return `
            <div class="card-header">
                <span class="badge">${ex.grade} klasė</span>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <button class="share-btn" aria-label="Dalintis" title="Kopijuoti nuorodą">🔗</button>
                    <button class="expand-btn" aria-label="Išskleisti">⤢</button>
                    <span class="badge">${ex.topic}</span>
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
                        ${keys.map((key) => `
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

    function toggleCardExpansion(card, expandBtn) {
        const isExpanded = card.classList.contains('expanded');
        const allCards = document.querySelectorAll('.exercise-card');

        if (isExpanded) {
            card.classList.remove('expanded');
            expandBtn.innerHTML = '⤢';
            expandBtn.setAttribute('aria-label', 'Išskleisti');
            allCards.forEach(c => c.classList.remove('hidden-card'));
            const existingOverlay = document.querySelector('.image-zoom-overlay');
            if (existingOverlay) existingOverlay.remove();
        } else {
            allCards.forEach(c => {
                if (c !== card) c.classList.add('hidden-card');
            });
            card.classList.add('expanded');
            expandBtn.innerHTML = '✕';
            expandBtn.setAttribute('aria-label', 'Suskleisti');
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });

            const cardImage = card.querySelector('.card-image');
            if (cardImage && !cardImage.dataset.zoomListener) {
                cardImage.dataset.zoomListener = 'true';
                cardImage.addEventListener('click', () => {
                    const overlay = document.createElement('div');
                    overlay.className = 'image-zoom-overlay';
                    const zoomedImg = document.createElement('img');
                    zoomedImg.src = cardImage.src;
                    overlay.appendChild(zoomedImg);
                    document.body.appendChild(overlay);
                    overlay.addEventListener('click', () => overlay.remove());
                });
            }
        }
    }

    function attachCardEvents(card, ex, isFullSimulation = false) {
        if ((ex.type === 'simulation' || ex.type === 'structural') && !isFullSimulation) {
            const startBtn = card.querySelector('.start-simulation-btn');
            if (startBtn) {
                startBtn.addEventListener('click', () => {
                    const newUrl = `${window.location.pathname}?id=${ex.id}`;
                    window.history.pushState({ id: ex.id }, '', newUrl);
                    window.scrollTo(0, 0);
                    renderExercises([ex]);

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

            const shareBtn = card.querySelector('.share-btn');
            if (shareBtn) {
                shareBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const url = `${window.location.origin}${window.location.pathname}?id=${ex.id}`;
                    navigator.clipboard.writeText(url).then(() => showToast('Nuoroda nukopijuota!'));
                });
            }
            return;
        }

        if (isFullSimulation) {
            ex.questions.forEach(q => {
                if (q.type === 'group') return;
                const contentDiv = card.querySelector(`.card-content[data-qid="${q.id}"]`);
                const submitBtn = card.querySelector(`.submit-btn[data-qid="${q.id}"]`);
                const solutionBtn = card.querySelector(`.solution-btn[data-qid="${q.id}"]`);
                const feedbackEl = contentDiv.querySelector('.feedback');
                attachQuestionEvents(card, q, contentDiv, submitBtn, solutionBtn, feedbackEl);
            });

            const shareBtn = card.querySelector('.share-btn');
            if (shareBtn) {
                shareBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const url = `${window.location.origin}${window.location.pathname}?id=${ex.id}`;
                    navigator.clipboard.writeText(url).then(() => showToast('Nuoroda nukopijuota!'));
                });
            }
            return;
        }

        const submitBtn = card.querySelector('.submit-btn');
        const solutionBtn = card.querySelector('.solution-btn');
        const feedbackEl = card.querySelector('.feedback');
        const contentDiv = card.querySelector('.card-content');

        attachQuestionEvents(card, ex, contentDiv, submitBtn, solutionBtn, feedbackEl);

        const shareBtn = card.querySelector('.share-btn');
        shareBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const url = `${window.location.origin}${window.location.pathname}?id=${ex.id}`;
            navigator.clipboard.writeText(url).then(() => showToast('Nuoroda nukopijuota!'));
        });

        const expandBtn = card.querySelector('.expand-btn');
        if (expandBtn) {
            expandBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleCardExpansion(card, expandBtn);
            });
            card.addEventListener('dblclick', (e) => {
                if (e.target.closest('.btn, .option-btn, input, select, .share-btn')) return;
                e.stopPropagation();
                toggleCardExpansion(card, expandBtn);
            });
        }
    }

    function attachQuestionEvents(card, ex, contentDiv, submitBtn, solutionBtn, feedbackEl) {
        if (ex.type === 'multiple_choice') {
            const options = contentDiv.querySelectorAll('.option-btn');
            const hiddenInput = contentDiv.querySelector('.user-answer');
            options.forEach(opt => {
                opt.addEventListener('click', () => {
                    options.forEach(o => o.classList.remove('selected'));
                    opt.classList.add('selected');
                    hiddenInput.value = opt.dataset.value;
                });
                opt.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        options.forEach(o => o.classList.remove('selected'));
                        opt.classList.add('selected');
                        hiddenInput.value = opt.dataset.value;
                        submitBtn.click();
                    }
                });
                opt.setAttribute('tabindex', '0');
            });
        }

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
                        if (ex.matchItems[index].correctAnswer !== select.value) allCorrect = false;
                    } else {
                        if (ex.pairs[select.dataset.key] !== select.value) allCorrect = false;
                    }
                });
                if (ex.secondPart) {
                    const secondInput = contentDiv.querySelector('.second-part-input');
                    if (!secondInput.value) allSelected = false;
                    if (secondInput.value.trim() !== ex.secondPart.correctAnswer) allCorrect = false;
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
            const existingSolution = feedbackEl.querySelector('.solution-text');
            if (existingSolution) {
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
                const solutionDiv = document.createElement('div');
                solutionDiv.className = 'solution-text';
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
        if (!user) return false;
        return user.replace(',', '.').trim() === correct.replace(',', '.').trim();
    }

    function showCorrectAnswer(contentDiv, ex) {
        if (ex.type === 'multiple_choice') {
            const options = contentDiv.querySelectorAll('.option-btn');
            options.forEach(opt => {
                if (opt.dataset.value === ex.correctAnswer) {
                    opt.classList.add('correct-answer');
                }
            });
        } else if (ex.type === 'matching') {
            // For matching, we might want to highlight correct options if possible, 
            // or just rely on the solution text. 
            // The previous implementation didn't seem to do much for matching inline.
            // We can try adding .showing-answer to selects if we knew the correct value for each.
            // But for now let's leave matching as is or just highlight the inputs if they exist.
            const selects = contentDiv.querySelectorAll('.matching-select');
            selects.forEach(select => select.classList.add('showing-answer'));

            if (ex.secondPart) {
                const secondInput = contentDiv.querySelector('.second-part-input');
                if (secondInput) {
                    secondInput.value = ex.secondPart.correctAnswer;
                    secondInput.classList.add('showing-answer');
                }
            }
        } else {
            const input = contentDiv.querySelector('.text-input');
            input.value = ex.correctAnswer;
            input.classList.add('showing-answer');
        }
    }

    function hideCorrectAnswer(contentDiv, ex) {
        if (ex.type === 'multiple_choice') {
            const options = contentDiv.querySelectorAll('.option-btn');
            options.forEach(opt => {
                opt.classList.remove('correct-answer');
            });
        } else if (ex.type === 'matching') {
            const selects = contentDiv.querySelectorAll('.matching-select');
            selects.forEach(select => select.classList.remove('showing-answer'));

            if (ex.secondPart) {
                const secondInput = contentDiv.querySelector('.second-part-input');
                if (secondInput) {
                    secondInput.value = '';
                    secondInput.classList.remove('showing-answer');
                }
            }
        } else {
            const input = contentDiv.querySelector('.text-input');
            input.value = '';
            input.classList.remove('showing-answer');
        }
    }

    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.textContent = message;
        document.body.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('show'));
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }
});
