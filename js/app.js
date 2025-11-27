document.addEventListener('DOMContentLoaded', () => {
    const exercisesContainer = document.getElementById('exercises-list');
    const gradeFiltersContainer = document.getElementById('grade-filters');
    const topicFiltersContainer = document.getElementById('topic-filters');
    const sourceFiltersContainer = document.getElementById('source-filters');
    const activeFiltersContainer = document.getElementById('active-filters-container');
    const searchInput = document.getElementById('search-input');
    const clearAllBtn = document.getElementById('clear-all-filters');

    // Mobile Sidebar Elements
    const mobileFilterToggle = document.getElementById('mobile-filter-toggle');
    const closeSidebarBtn = document.getElementById('close-sidebar');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    let allExercises = [];
    let manifestFiles = [];
    let loadedCount = 0;
    const BATCH_SIZE = 10; // Load 10 exercises at a time
    let isLoading = false;
    let scrollObserver = null;

    // Filter State
    let activeFilters = {
        search: '',
        grades: [], // Array of numbers/strings
        topics: [], // Array of strings (child topics)
        types: [],   // Array of strings
        sources: []  // Array of strings
    };

    // Topic Hierarchy - will be loaded from topic_descriptions.json
    let topicHierarchy = {
        9: {},
        10: {},
        11: {},
        12: {}
    };

    // Source Hierarchy Definition
    const sourceHierarchy = {
        "VBE": ["2025 (1)", "2025 (2)"],
        "Vadovėliai": [],
        "Uždavinynai": [],
        "Kita": []
    };

    // Load topic descriptions and convert to hierarchy
    function loadTopicDescriptions() {
        return fetch('data/topic_descriptions.json')
            .then(response => response.json())
            .then(descriptions => {
                // Parse the structure for each grade
                Object.keys(descriptions).forEach(grade => {
                    const gradeTopics = descriptions[grade];
                    topicHierarchy[grade] = {};

                    Object.keys(gradeTopics).forEach(topicName => {
                        const topicData = gradeTopics[topicName];

                        // Check if topicData is an object (contains subtopics)
                        if (typeof topicData === 'object' && !Array.isArray(topicData)) {
                            topicHierarchy[grade][topicName] = {};

                            Object.keys(topicData).forEach(subtopicName => {
                                const subtopicData = topicData[subtopicName];

                                // Check if subtopicData is an object (contains subsubtopics)
                                if (typeof subtopicData === 'object' && !Array.isArray(subtopicData)) {
                                    // Has subsubtopics
                                    topicHierarchy[grade][topicName][subtopicName] = Object.keys(subtopicData);
                                } else {
                                    // No subsubtopics, just a description string
                                    topicHierarchy[grade][topicName][subtopicName] = [];
                                }
                            });
                        }
                    });
                });

                // Add "Bendra" topic for grade 11 if it doesn't exist
                if (!topicHierarchy[11]["Bendra"]) {
                    topicHierarchy[11]["Bendra"] = {
                        "Bendra": ["Bendra"]
                    };
                }
            })
            .catch(err => {
                console.error('Error loading topic descriptions:', err);
            });
    }

    // Fetch Data - Load topic descriptions first, then manifest and exercises
    loadTopicDescriptions()
        .then(() => fetch('data/manifest.json'))
        .then(response => response.json())
        .then(async files => {
            manifestFiles = files;

            // Check if there's a deep link - if so, load all exercises first
            const urlParams = new URLSearchParams(window.location.search);
            const exerciseId = urlParams.get('id');

            if (exerciseId) {
                // Load all exercises for deep linking
                exercisesContainer.innerHTML = '<div class="loading">Ieškoma užduotis...</div>';
                while (loadedCount < manifestFiles.length) {
                    await loadNextBatch();
                }
            } else {
                // Normal flow - load first batch
                await loadNextBatch();
            }
        })
        .then(() => {
            initApp();
        })
        .catch(err => {
            console.error('Error loading exercises:', err);
            exercisesContainer.innerHTML = '<div class="loading">Nepavyko užkrauti užduočių.</div>';
        });

    function enrichExerciseData(ex) {
        if (ex.category === 'VBE-2025-2') {
            ex.source = "VBE";
            ex.subsource = "2025 (2)";
        } else if (ex.category === 'VBE-2025') {
            ex.source = "VBE";
            ex.subsource = "2025 (1)";
        } else if (ex.grade === 11 || ex.grade === '11') {
            ex.source = "VBE";
            ex.subsource = "2025 (1)";
        } else {
            ex.source = "Kita";
        }
        return ex;
    }

    async function loadNextBatch() {
        if (isLoading || loadedCount >= manifestFiles.length) {
            return;
        }

        isLoading = true;
        const startIdx = loadedCount;
        const endIdx = Math.min(loadedCount + BATCH_SIZE, manifestFiles.length);
        const batchFiles = manifestFiles.slice(startIdx, endIdx);

        try {
            const promises = batchFiles.map(file =>
                fetch(`data/exercises/${file}`).then(res => res.json())
            );
            const batchData = await Promise.all(promises);

            // Enrich and add to allExercises
            const enrichedData = batchData.map(enrichExerciseData);
            allExercises.push(...enrichedData);
            loadedCount = endIdx;
        } catch (err) {
            console.error('Error loading batch:', err);
        } finally {
            isLoading = false;
        }
    }

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

                // Auto-expand (only for normal exercises, not simulation/structural which are already expanded)
                const exerciseType = specificExercise[0]?.type;
                if (exerciseType !== 'simulation' && exerciseType !== 'structural') {
                    setTimeout(() => {
                        const expandBtn = exercisesContainer.querySelector('.expand-btn');
                        if (expandBtn) expandBtn.click();
                    }, 100);
                }
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

        // 5. Sources
        renderSourceAccordion();

        // 5. Clear All
        clearAllBtn.addEventListener('click', () => {
            // Reset State
            activeFilters = { search: '', grades: [], topics: [], types: [], sources: [] };
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
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <button class="expand-subtopic-btn" data-topic="${subtopic}" style="background: none; border: none; padding: 0; cursor: pointer; color: #4b5563; font-size: 0.8em; display: flex; align-items: center; justify-content: center; width: 1.2rem; height: 1.2rem; margin-right: 0.25rem;">▼</button>
                                <label class="checkbox-label" style="flex: 1; margin: 0; font-weight: 500;">
                                    <input type="checkbox" class="subtopic-checkbox" name="topic" value="${subtopic}" data-subtopic="${subtopic}">
                                    <span class="checkbox-custom"></span>
                                    ${subtopic}
                                </label>
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
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <button class="expand-topic-btn" data-topic="${parent}" style="background: none; border: none; padding: 0; cursor: pointer; color: #4b5563; font-size: 0.8em; display: flex; align-items: center; justify-content: center; width: 1.2rem; height: 1.2rem;">▼</button>
                        <label class="checkbox-label" style="flex: 1; margin: 0; font-weight: 600;">
                            <input type="checkbox" class="topic-checkbox" name="topic" value="${parent}" data-parent-topic="${parent}">
                            <span class="checkbox-custom"></span>
                            ${parent}
                        </label>
                    </div>
                    <div class="accordion-content">
                        ${subtopicsHTML}
                    </div>
                </div>
            `;
        }
        topicFiltersContainer.innerHTML = accordionHTML;

        // Top-level expand/collapse buttons (triangles)
        topicFiltersContainer.querySelectorAll('.expand-topic-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const item = btn.closest('.accordion-item');
                const icon = btn;
                item.classList.toggle('active');
                icon.style.transform = item.classList.contains('active') ? 'rotate(180deg)' : 'rotate(0deg)';
            });
        });

        // Top-level topic checkboxes
        topicFiltersContainer.querySelectorAll('.topic-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                const topic = checkbox.value;
                const isChecked = checkbox.checked;
                updateActiveFilters('topics', topic, isChecked);
            });
        });

        // Subtopic expand/collapse buttons (triangles)
        topicFiltersContainer.querySelectorAll('.expand-subtopic-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const group = btn.closest('.subtopic-group');
                const content = group.querySelector('.subtopic-content');
                const icon = btn;

                // Toggle Expansion
                if (content.style.display === 'none') {
                    content.style.display = 'block';
                    icon.style.transform = 'rotate(180deg)';
                } else {
                    content.style.display = 'none';
                    icon.style.transform = 'rotate(0deg)';
                }
            });
        });

        // Subtopic checkboxes
        topicFiltersContainer.querySelectorAll('.subtopic-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                const topic = checkbox.value;
                const isChecked = checkbox.checked;

                if (isChecked) {
                    // Uncheck parent topic filter if any is selected
                    const parentAccordionItem = checkbox.closest('.accordion-item');
                    if (parentAccordionItem) {
                        const parentCheckbox = parentAccordionItem.querySelector('.topic-checkbox');
                        if (parentCheckbox && parentCheckbox.checked) {
                            parentCheckbox.checked = false;
                            updateActiveFilters('topics', parentCheckbox.value, false);
                        }
                    }
                }

                updateActiveFilters('topics', topic, isChecked);
            });
        });

        // Sub-subtopic checkboxes (allow multiple selections)
        topicFiltersContainer.querySelectorAll('input[name="topic"]:not(.topic-checkbox):not(.subtopic-checkbox)').forEach(input => {
            input.addEventListener('change', () => {
                const isChecked = input.checked;

                if (isChecked) {
                    // When checking a sub-subtopic, remove topic and subtopic filters
                    // but allow multiple sub-subtopic selections
                    const selectedTopics = [...activeFilters.topics];
                    selectedTopics.forEach(topic => {
                        const topicCheckbox = topicFiltersContainer.querySelector(`.topic-checkbox[value="${topic}"]`);
                        const subtopicCheckbox = topicFiltersContainer.querySelector(`.subtopic-checkbox[value="${topic}"]`);

                        if (topicCheckbox && topicCheckbox.checked) {
                            topicCheckbox.checked = false;
                            updateActiveFilters('topics', topic, false);
                        } else if (subtopicCheckbox && subtopicCheckbox.checked) {
                            subtopicCheckbox.checked = false;
                            updateActiveFilters('topics', topic, false);
                        }
                    });
                }

                updateActiveFilters('topics', input.value, input.checked);
            });
        });
    }

    function renderSourceAccordion() {
        let accordionHTML = '';
        for (const [source, subsources] of Object.entries(sourceHierarchy)) {
            let subsourcesHTML = '';

            if (subsources.length > 0) {
                subsourcesHTML = subsources.map(sub => `
                    <label class="checkbox-label">
                        <input type="checkbox" name="source" value="${sub}">
                        <span class="checkbox-custom"></span>
                        ${sub}
                    </label>
                `).join('');
            }

            if (subsources.length > 0) {
                accordionHTML += `
                    <div class="accordion-item">
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <button class="expand-source-btn" data-source="${source}" style="background: none; border: none; padding: 0; cursor: pointer; color: #4b5563; font-size: 0.8em; display: flex; align-items: center; justify-content: center; width: 1.2rem; height: 1.2rem;">▼</button>
                            <label class="checkbox-label" style="flex: 1; margin: 0; font-weight: 600;">
                                <input type="checkbox" name="source" class="source-category-checkbox" value="${source}">
                                <span class="checkbox-custom"></span>
                                ${source}
                            </label>
                        </div>
                        <div class="accordion-content">
                            ${subsourcesHTML}
                        </div>
                    </div>
                `;
            } else {
                accordionHTML += `
                    <label class="checkbox-label" style="padding: 0.5rem; display: flex; align-items: center; cursor: pointer;">
                        <input type="checkbox" name="source" value="${source}">
                        <span class="checkbox-custom"></span>
                        <span style="font-weight: 500; color: #4b5563;">${source}</span>
                    </label>
                `;
            }
        }
        sourceFiltersContainer.innerHTML = accordionHTML;

        // Expand/collapse buttons for sources
        sourceFiltersContainer.querySelectorAll('.expand-source-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const item = btn.closest('.accordion-item');
                const icon = btn;
                item.classList.toggle('active');
                icon.style.transform = item.classList.contains('active') ? 'rotate(180deg)' : 'rotate(0deg)';
            });
        });

        // Checkbox events
        sourceFiltersContainer.querySelectorAll('input[name="source"]').forEach(input => {
            input.addEventListener('change', () => {
                updateActiveFilters('sources', input.value, input.checked);
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

    async function applyFilters() {
        // Check if any filters are active
        const hasActiveFilters = activeFilters.search ||
            activeFilters.grades.length > 0 ||
            activeFilters.topics.length > 0 ||
            activeFilters.types.length > 0 ||
            activeFilters.sources.length > 0;

        // If filters are active and not all exercises are loaded, load them all
        if (hasActiveFilters && loadedCount < manifestFiles.length) {
            // Show loading indicator
            exercisesContainer.innerHTML = '<div class="loading">Įkeliami visi rezultatai...</div>';

            // Load all remaining exercises
            while (loadedCount < manifestFiles.length) {
                await loadNextBatch();
            }
        }

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

        if (activeFilters.sources.length > 0) {
            filtered = filtered.filter(ex => {
                // Check if any active source matches ex.source or ex.subsource
                return activeFilters.sources.includes(ex.source) ||
                    activeFilters.sources.includes(ex.subsource);
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
                // Uncheck the corresponding checkbox in sidebar
                const cb = gradeFiltersContainer.querySelector(`input[value="${g}"]`);
                if (cb) cb.checked = false;
                updateActiveFilters('grades', g, false);
            });
        });

        activeFilters.topics.forEach(t => {
            createTag(t, () => {
                // Uncheck the corresponding checkbox in sidebar
                const cb = topicFiltersContainer.querySelector(`input[name="topic"][value="${t}"]`);
                if (cb) cb.checked = false;
                updateActiveFilters('topics', t, false);
            });
        });

        activeFilters.types.forEach(t => {
            let label = t;
            if (t === 'normal') label = 'Vienos dalies';
            if (t === 'structural') label = 'Struktūrinės';
            if (t === 'simulation') label = 'Simuliacinės';

            createTag(label, () => {
                // Uncheck the corresponding checkbox in sidebar
                const cb = document.querySelector(`input[name="type"][value="${t}"]`);
                if (cb) cb.checked = false;
                updateActiveFilters('types', t, false);
            });
        });

        activeFilters.sources.forEach(s => {
            createTag(s, () => {
                // Uncheck the corresponding checkbox in sidebar
                const cb = sourceFiltersContainer.querySelector(`input[value="${s}"]`);
                if (cb) cb.checked = false;
                updateActiveFilters('sources', s, false);
            });
        });

        // Count total active filters
        const totalFilters = activeFilters.grades.length + activeFilters.topics.length + activeFilters.types.length + activeFilters.sources.length;

        // Show "Clear All" button if more than 1 filter is active
        if (totalFilters > 1) {
            const clearAllBtn = document.createElement('button');
            clearAllBtn.className = 'clear-all-filters-btn';
            clearAllBtn.textContent = 'Valyti visus';
            clearAllBtn.addEventListener('click', () => {
                activeFilters = { search: '', grades: [], topics: [], types: [], sources: [] };
                searchInput.value = '';
                document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
                applyFilters();
            });
            activeFiltersContainer.appendChild(clearAllBtn);
        }
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

        // Remove any existing scroll sentinel
        const existingSentinel = document.querySelector('.scroll-sentinel');
        if (existingSentinel) {
            existingSentinel.remove();
        }

        if (exercises.length === 0) {
            exercisesContainer.innerHTML = '<div class="loading">Užduočių nerasta.</div>';

            // If no filtered results but more exercises could be loaded, add sentinel
            if (loadedCount < manifestFiles.length && Object.values(activeFilters).every(f => !f || (Array.isArray(f) && f.length === 0))) {
                addScrollSentinel();
            }
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

        // Add scroll sentinel if there are more exercises to load
        if (loadedCount < manifestFiles.length) {
            addScrollSentinel();
        }

        // Hide/show active filters based on view mode
        const isExpandedView = exercises.length === 1 && (exercises[0].type === 'simulation' || exercises[0].type === 'structural');
        activeFiltersContainer.style.display = isExpandedView ? 'none' : 'flex';

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

    function addScrollSentinel() {
        // Disconnect existing observer if any
        if (scrollObserver) {
            scrollObserver.disconnect();
        }

        // Create sentinel element
        const sentinel = document.createElement('div');
        sentinel.className = 'scroll-sentinel';
        sentinel.style.cssText = 'height: 1px; width: 100%; margin-top: 2rem;';
        exercisesContainer.parentElement.appendChild(sentinel);

        // Create intersection observer
        scrollObserver = new IntersectionObserver(async (entries) => {
            const entry = entries[0];

            // When sentinel is visible and we're not already loading
            if (entry.isIntersecting && !isLoading && loadedCount < manifestFiles.length) {
                // Check if any card is currently expanded - if so, skip re-rendering
                const expandedCard = document.querySelector('.exercise-card.expanded');
                if (expandedCard) {
                    return;
                }

                await loadNextBatch();

                // Re-apply filters with newly loaded exercises
                applyFilters();
            }
        }, {
            root: null, // viewport
            rootMargin: '200px', // Start loading 200px before reaching the sentinel
            threshold: 0
        });

        scrollObserver.observe(sentinel);
    }

    function formatQuestionText(text) {
        // Remove leading numbering (e.g., "3. ", "12. ", etc.)
        text = text.replace(/^\d+\.\s+/, '');

        // Common question indicators in Lithuanian
        const questionIndicators = [
            'Kokiu', 'Koks', 'Kokia', 'Kokią', 'Kokiame', 'Kokie',
            'Kiek', 'Kuri', 'Kurį', 'Kuris', 'Kuriame', 'Kurie',
            'Ką', 'Kas', 'Kaip', 'Kodėl', 'Kada',
            'Pažymėkite', 'Nustatykite', 'Apskaičiuokite', 'Nurodykite',
            'Išrinkite', 'Parinkite', 'Raskite', 'Įvertinkite',
            'Apibrėžkite', 'Apibūdinkite', 'Paaiškinkite',
            'Dėl kurio', 'Į kurį', 'Su kuriuo', 'Kuriuo', 'Sujunkite'
        ];

        // Split by sentences (periods followed by space and capital letter, or question marks)
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

        // Find the last sentence that starts with a question indicator
        let questionIndex = -1;
        for (let i = sentences.length - 1; i >= 0; i--) {
            const sentence = sentences[i].trim();
            if (questionIndicators.some(indicator => sentence.startsWith(indicator))) {
                questionIndex = i;
                break;
            }
        }

        // If no question indicator found, check for question mark
        if (questionIndex === -1) {
            for (let i = sentences.length - 1; i >= 0; i--) {
                if (sentences[i].includes('?')) {
                    questionIndex = i;
                    break;
                }
            }
        }

        // If still not found, treat the last sentence as the question
        if (questionIndex === -1 && sentences.length > 1) {
            questionIndex = sentences.length - 1;
        }

        // Build formatted HTML
        if (questionIndex > 0) {
            const context = sentences.slice(0, questionIndex).join(' ').trim();
            const question = sentences.slice(questionIndex).join(' ').trim();
            return `<span class="question-context">${context}</span><span class="question-main">${question}</span>`;
        } else {
            // No context, just the question
            return `<span class="question-main">${text}</span>`;
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
                            <button class="expand-btn" aria-label="Išskleisti" title="Išskleisti">⤢</button>
                            <button class="share-btn" aria-label="Dalintis" title="Kopijuoti nuorodą">🔗</button>
                            <div class="topic-badge-container">
                                <span class="badge topic-badge">${ex.topic}</span>
                                <div class="topic-tooltip">
                                    ${ex.subtopic ? `<div class="tooltip-row"><span class="tooltip-label">Tema:</span>${ex.subtopic}</div>` : ''}
                                    ${ex.subsubtopic ? `<div class="tooltip-row"><span class="tooltip-label">Potemė:</span>${ex.subsubtopic}</div>` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="card-question">${formatQuestionText(ex.question)}</div>
                    <div class="card-content">
                        <div class="simulation-preview">
                            <p style="margin-bottom: 1rem; color: #6b7280;">${isStructural ? 'Ši užduotis yra struktūrinė.' : 'Ši užduotis turi interaktyvią simuliaciją.'}</p>
                            <button class="btn btn-primary start-simulation-btn">${isStructural ? 'Pradėti užduotį' : 'Pradėti simuliaciją'}</button>
                        </div>
                    </div>
                `;
            } else {
                let questionNumber = 0;
                const questionsHTML = ex.questions.map(q => {
                    if (q.type === 'group') return `<div class="card-question" style="margin-top: 2rem; font-weight: bold;">${q.question}</div>`;
                    questionNumber++;
                    const formattedQuestion = formatQuestionText(q.question);
                    const numberedQuestion = formattedQuestion.replace(/^(<span[^>]*>)/, `$1${questionNumber}. `);
                    return `
                    <div class="simulation-question-block">
                        <div class="card-question">${numberedQuestion}</div>
                        <div class="card-content" data-qid="${q.id}">
                            ${buildInputArea(q)}
                            <div class="feedback"></div>
                        </div>
                        <div class="card-actions">
                            <button class="btn btn-primary submit-btn" data-qid="${q.id}">Pateikti</button>
                            <button class="btn btn-outline solution-btn" data-qid="${q.id}">Rodyti sprendimą</button>
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
                            <button class="expand-btn" aria-label="Suskleisti" title="Suskleisti">✕</button>
                            <button class="share-btn" aria-label="Dalintis" title="Kopijuoti nuorodą">🔗</button>
                            <div class="topic-badge-container">
                                <span class="badge topic-badge">${ex.topic}</span>
                                <div class="topic-tooltip">
                                    ${ex.subtopic ? `<div class="tooltip-row"><span class="tooltip-label">Tema:</span>${ex.subtopic}</div>` : ''}
                                    ${ex.subsubtopic ? `<div class="tooltip-row"><span class="tooltip-label">Potemė:</span>${ex.subsubtopic}</div>` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="card-question">${formatQuestionText(ex.question)}</div>
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
                    <button class="expand-btn" aria-label="Išskleisti" title="Išskleisti">⤢</button>
                    <button class="share-btn" aria-label="Dalintis" title="Kopijuoti nuorodą">🔗</button>
                    <div class="topic-badge-container">
                        <span class="badge topic-badge">${ex.topic}</span>
                        <div class="topic-tooltip">
                            ${ex.subtopic ? `<div class="tooltip-row"><span class="tooltip-label">Tema:</span>${ex.subtopic}</div>` : ''}
                            ${ex.subsubtopic ? `<div class="tooltip-row"><span class="tooltip-label">Potemė:</span>${ex.subsubtopic}</div>` : ''}
                        </div>
                    </div>
                </div>
            </div>
            <div class="card-question">${formatQuestionText(ex.question)}</div>
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
        if (ex.type === 'fill_in_blanks') {
             let html = ex.template;
             ex.correctAnswers.forEach((_, i) => {
                 html = html.replace('{{}}', `<input type="text" class="text-input small-input" data-index="${i}" style="width: 60px; display: inline-block; margin: 0 5px; text-align: center;">`);
             });
             return `<div class="fill-in-blanks-container" style="font-size: 1.1rem;">${html}</div>`;
        } else if (ex.type === 'multiple_choice') {
            const isMultiSelect = Array.isArray(ex.correctAnswer) && ex.correctAnswer.length > 1;
            return `
                <div class="options-grid">
                    ${ex.options.map(opt => `<div class="option-btn${isMultiSelect ? ' multi-select-btn' : ''}" data-value="${opt}">${opt}</div>`).join('')}
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
                                ${ex.secondPart.unit ? `<span style="font-weight: 500; color: var(--text-secondary); white-space: nowrap;">${ex.secondPart.unit}</span>` : ''}
                            </div>
                        </div>
                    `;
                }

                // Check if inline rendering is requested
                if (ex.inline) {
                    // Render dropdowns inline with text
                    let inlineHTML = '<div class="matching-container" style="line-height: 2.2;">';
                    
                    ex.matchItems.forEach((item, index) => {
                        // Generate the dropdown HTML
                        const selectHTML = `<select class="matching-select text-input" data-index="${index}" style="display: inline-block; width: auto; min-width: 120px; margin: 0 0.35rem; vertical-align: middle;">
                            <option value="">―</option>
                            ${item.options.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
                        </select>`;

                        // Placeholder logic: Replace {{}} if present, otherwise append to end
                        let itemHTML = '';
                        if (item.question.includes('{{}}')) {
                            itemHTML = item.question.replace('{{}}', selectHTML);
                        } else {
                            itemHTML = item.question + ' ' + selectHTML;
                        }

                        // Wrap in a div to ensure each sentence is on a new line
                        inlineHTML += `<div style="margin-bottom: 0.5rem;">${itemHTML}</div>`;
                    });
                    
                    inlineHTML += '</div>';
                    return inlineHTML + secondPartHTML;
                } else {
                    // Original row-based rendering
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
                }
            } else {
                // Key-Value pair matching (legacy)
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
            // Standard text input
            return `
                <div class="input-group" style="display: flex; align-items: center; gap: 0.5rem;">
                    <input type="text" class="text-input" placeholder="Įveskite atsakymą...">
                    ${ex.unit ? `<span style="font-weight: 500; color: var(--text-secondary); white-space: nowrap;">${ex.unit}</span>` : ''}
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

            const expandBtn = card.querySelector('.expand-btn');
            if (expandBtn) {
                expandBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
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

            const expandBtn = card.querySelector('.expand-btn');
            if (expandBtn) {
                expandBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    window.history.pushState({}, document.title, window.location.pathname);
                    renderExercises(allExercises);

                    const showAllBtn = document.querySelector('.show-all-btn');
                    if (showAllBtn) {
                        showAllBtn.remove();
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

            // Add image zoom functionality for structural exercises
            const cardImage = card.querySelector('img[src^="assets/images"]');
            if (cardImage && !cardImage.dataset.zoomListener) {
                cardImage.dataset.zoomListener = 'true';
                cardImage.style.cursor = 'zoom-in';
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
        if (ex.type === 'fill_in_blanks') {
            const inputs = contentDiv.querySelectorAll('.text-input');
            inputs.forEach(input => {
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        submitBtn.click();
                    }
                });
            });

            submitBtn.addEventListener('click', () => {
                let allCorrect = true;
                let allFilled = true;
                inputs.forEach(input => {
                    if (!input.value) allFilled = false;
                    const idx = parseInt(input.dataset.index);
                    if (input.value.replace(',', '.').trim() !== ex.correctAnswers[idx]) allCorrect = false;
                });

                if (!allFilled) {
                    feedbackEl.className = 'feedback incorrect';
                    feedbackEl.innerHTML = `
                        <div class="feedback-header">
                            <div class="feedback-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                            </div>
                            <div>
                                <div class="feedback-title">Užpildykite visus laukus</div>
                            </div>
                        </div>`;
                    return;
                }

                if (allCorrect) {
                    feedbackEl.className = 'feedback correct';
                    feedbackEl.innerHTML = `
                    <div class="feedback-header">
                        <div class="feedback-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                        </div>
                        <div>
                            <div class="feedback-title">Teisingai!</div>
                            <div class="feedback-message">Puikiai atlikta užduotis.</div>
                        </div>
                    </div>`;
                } else {
                    feedbackEl.className = 'feedback incorrect';
                    feedbackEl.innerHTML = `
                    <div class="feedback-header">
                        <div class="feedback-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                        </div>
                        <div>
                            <div class="feedback-title">Neteisingai</div>
                            <div class="feedback-message">Pabandykite dar kartą.</div>
                        </div>
                    </div>`;
                }
            });
        } else if (ex.type === 'multiple_choice') {
            const isMultiSelect = Array.isArray(ex.correctAnswer) && ex.correctAnswer.length > 1;
            const options = contentDiv.querySelectorAll('.option-btn');
            const hiddenInput = contentDiv.querySelector('.user-answer');

            options.forEach(opt => {
                opt.addEventListener('click', () => {
                    if (isMultiSelect) {
                        // Multi-select: toggle selection with limit
                        const maxSelections = ex.correctAnswer.length;
                        const isCurrentlySelected = opt.classList.contains('selected');

                        if (!isCurrentlySelected) {
                            const currentlySelectedCount = contentDiv.querySelectorAll('.option-btn.selected').length;
                            if (currentlySelectedCount >= maxSelections) {
                                // Prevent selecting more than allowed
                                return;
                            }
                        }

                        opt.classList.toggle('selected');
                        // Update hidden input with array of selected values
                        const selectedValues = Array.from(contentDiv.querySelectorAll('.option-btn.selected')).map(o => o.dataset.value);
                        hiddenInput.value = JSON.stringify(selectedValues);
                    } else {
                        // Single select: only one can be selected
                        options.forEach(o => o.classList.remove('selected'));
                        opt.classList.add('selected');
                        hiddenInput.value = opt.dataset.value;
                    }
                });
                opt.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        if (isMultiSelect) {
                            const maxSelections = ex.correctAnswer.length;
                            const isCurrentlySelected = opt.classList.contains('selected');

                            if (!isCurrentlySelected) {
                                const currentlySelectedCount = contentDiv.querySelectorAll('.option-btn.selected').length;
                                if (currentlySelectedCount >= maxSelections) {
                                    return;
                                }
                            }

                            opt.classList.toggle('selected');
                            const selectedValues = Array.from(contentDiv.querySelectorAll('.option-btn.selected')).map(o => o.dataset.value);
                            hiddenInput.value = JSON.stringify(selectedValues);
                        } else {
                            options.forEach(o => o.classList.remove('selected'));
                            opt.classList.add('selected');
                            hiddenInput.value = opt.dataset.value;
                        }
                        submitBtn.click();
                    }
                });
                opt.setAttribute('tabindex', '0');
            });
        }

        const textInputs = contentDiv.querySelectorAll('.text-input');
        if (ex.type !== 'fill_in_blanks') {
             textInputs.forEach(textInput => {
                textInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        submitBtn.click();
                    }
                });
            });
        }

        if (ex.type !== 'fill_in_blanks') {
            submitBtn.addEventListener('click', () => {
                let isCorrect = false;
                let userAnswer = '';

                if (ex.type === 'multiple_choice') {
                    const isMultiSelect = Array.isArray(ex.correctAnswer) && ex.correctAnswer.length > 1;
                    userAnswer = contentDiv.querySelector('.user-answer').value;
                    if (!userAnswer) {
                        // Warning State
                        feedbackEl.className = 'feedback incorrect';
                        feedbackEl.innerHTML = `
                            <div class="feedback-header">
                                <div class="feedback-icon">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                                </div>
                                <div>
                                    <div class="feedback-title">Dėmesio</div>
                                    <div class="feedback-message">Pasirinkite atsakymą prieš pateikdami.</div>
                                </div>
                            </div>`;
                        return;
                    }

                    if (isMultiSelect) {
                        try {
                            const userAnswers = JSON.parse(userAnswer);
                            isCorrect = checkMultiSelectAnswer(userAnswers, ex.correctAnswer);
                        } catch (e) { isCorrect = false; }
                    } else {
                        isCorrect = checkAnswer(userAnswer, ex.correctAnswer);
                    }
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
                    if (!allSelected) {
                        // Warning State for Matching
                        feedbackEl.className = 'feedback incorrect';
                        feedbackEl.innerHTML = `
                            <div class="feedback-header">
                                <div class="feedback-icon">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                                </div>
                                <div>
                                    <div class="feedback-title">Užpildykite visus laukus</div>
                                </div>
                            </div>`;
                        return;
                    }
                    isCorrect = allCorrect;
                } else {
                    userAnswer = contentDiv.querySelector('.text-input').value.trim();
                    if (!userAnswer) return;
                    isCorrect = checkAnswer(userAnswer, ex.correctAnswer);
                }

                // RENDER RESULT
                if (isCorrect) {
                    feedbackEl.className = 'feedback correct';
                    feedbackEl.innerHTML = `
                        <div class="feedback-header">
                            <div class="feedback-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                            </div>
                            <div>
                                <div class="feedback-title">Teisingai!</div>
                                <div class="feedback-message">Puikiai atlikta užduotis.</div>
                            </div>
                        </div>`;
                } else {
                    feedbackEl.className = 'feedback incorrect';
                    feedbackEl.innerHTML = `
                        <div class="feedback-header">
                            <div class="feedback-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                            </div>
                            <div>
                                <div class="feedback-title">Neteisingai</div>
                                <div class="feedback-message">Pabandykite dar kartą arba peržiūrėkite teoriją.</div>
                            </div>
                        </div>`;
                }
            });
        }

        solutionBtn.addEventListener('click', () => {
            const existingSolutionContainer = feedbackEl.querySelector('.solution-container');

            if (existingSolutionContainer) {
                // Toggle visibility
                if (existingSolutionContainer.style.display === 'none') {
                    existingSolutionContainer.style.display = 'block';
                    solutionBtn.textContent = "Slėpti sprendimą";
                    feedbackEl.style.display = 'block'; // Ensure parent is visible
                    showCorrectAnswer(contentDiv, ex);
                } else {
                    existingSolutionContainer.style.display = 'none';
                    solutionBtn.textContent = "Rodyti sprendimą";
                    hideCorrectAnswer(contentDiv, ex);

                    // If we are not currently showing a specific Right/Wrong status, hide the whole box
                    if (!feedbackEl.classList.contains('correct') && !feedbackEl.classList.contains('incorrect')) {
                        feedbackEl.style.display = 'none';
                    }
                }
            } else {
                // Create Solution HTML
                // If feedback box isn't visible yet (no attempt made), show it neutrally
                if (feedbackEl.style.display === 'none' || feedbackEl.innerHTML === '') {
                    feedbackEl.className = 'feedback'; // Neutral class
                    feedbackEl.style.display = 'block';
                    feedbackEl.style.borderLeftColor = '#6B7280'; // Gray accent
                    feedbackEl.innerHTML = ''; // Clear empty
                }

                const solText = ex.solution ? ex.solution : 'Teisingas atsakymas parodytas laukeliuose.';

                const solutionHTML = `
                    <div class="solution-container">
                        <div class="solution-label">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
                            Sprendimo eiga
                        </div>
                        <div class="solution-text">${solText}</div>
                    </div>
                `;

                // Append without wiping existing status (if any)
                feedbackEl.insertAdjacentHTML('beforeend', solutionHTML);

                solutionBtn.textContent = "Slėpti sprendimą";
                showCorrectAnswer(contentDiv, ex);

                // Re-render math inside the new element
                if (window.renderMathInElement) {
                    renderMathInElement(feedbackEl, {
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

    function checkMultiSelectAnswer(userAnswers, correctAnswers) {
        // Check if user selected exactly the same answers as correct
        if (!Array.isArray(userAnswers) || !Array.isArray(correctAnswers)) return false;
        if (userAnswers.length !== correctAnswers.length) return false;

        // Sort both arrays and compare
        const sortedUser = userAnswers.slice().sort();
        const sortedCorrect = correctAnswers.slice().sort();

        return sortedUser.every((val, idx) => val === sortedCorrect[idx]);
    }

    function showCorrectAnswer(contentDiv, ex) {
        if (ex.type === 'fill_in_blanks') {
             const inputs = contentDiv.querySelectorAll('.text-input');
             inputs.forEach(input => {
                 const idx = parseInt(input.dataset.index);
                 input.value = ex.correctAnswers[idx];
                 input.classList.add('showing-answer');
             });
        } else if (ex.type === 'multiple_choice') {
            const isMultiSelect = Array.isArray(ex.correctAnswer) && ex.correctAnswer.length > 1;
            const options = contentDiv.querySelectorAll('.option-btn');
            options.forEach(opt => {
                if (isMultiSelect) {
                    if (ex.correctAnswer.includes(opt.dataset.value)) {
                        opt.classList.add('correct-answer');
                    }
                } else {
                    if (opt.dataset.value === ex.correctAnswer) {
                        opt.classList.add('correct-answer');
                    }
                }
            });
        } else if (ex.type === 'matching') {
            const selects = contentDiv.querySelectorAll('.matching-select');

            if (ex.matchItems) {
                // For matchItems format, set each dropdown to its correct answer
                selects.forEach(select => {
                    const index = parseInt(select.dataset.index);
                    const correctAnswer = ex.matchItems[index].correctAnswer;
                    select.value = correctAnswer;
                    select.classList.add('showing-answer');
                });
            } else if (ex.pairs) {
                // For pairs format, set each dropdown to its correct answer
                selects.forEach(select => {
                    const key = select.dataset.key;
                    const correctAnswer = ex.pairs[key];
                    select.value = correctAnswer;
                    select.classList.add('showing-answer');
                });
            }

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
        if (ex.type === 'fill_in_blanks') {
             const inputs = contentDiv.querySelectorAll('.text-input');
             inputs.forEach(input => {
                 input.value = '';
                 input.classList.remove('showing-answer');
             });
        } else if (ex.type === 'multiple_choice') {
            const options = contentDiv.querySelectorAll('.option-btn');
            options.forEach(opt => {
                opt.classList.remove('correct-answer');
            });
        } else if (ex.type === 'matching') {
            const selects = contentDiv.querySelectorAll('.matching-select');
            selects.forEach(select => {
                select.value = ''; // Reset to empty/default option
                select.classList.remove('showing-answer');
            });

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