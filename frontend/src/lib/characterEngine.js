// Глобальное состояние персонажа
let character = {
    uuid: '',
    concept: { name: '', description: '' },
    race: { uuid: '', name: '', name_en: '', features: [] },
    characteristics: {
        сила: { name_en: 'strength', value: 'd4', base_value: 'd4', race_modifier: '', points_spent: 0 },
        ловкость: { name_en: 'agility', value: 'd4', base_value: 'd4', race_modifier: '', points_spent: 0 },
        выносливость: { name_en: 'vigor', value: 'd4', base_value: 'd4', race_modifier: '', points_spent: 0 },
        смекалка: { name_en: 'smarts', value: 'd4', base_value: 'd4', race_modifier: '', points_spent: 0 },
        характер: { name_en: 'spirit', value: 'd4', base_value: 'd4', race_modifier: '', points_spent: 0 },
        total_points_available: 5,
        total_points_spent: 0
    },
    skills: [],
    starting_flaws: [],
    starting_traits: [],
    experience: { total: 0, spent: 0, available: 0 },
    advancements: [],
    derived_statistics: {
        стандартный_шаг: { name_en: 'standard_pace', base: 6, race_modifier: 0, modifiers: 0, total: 6 },
        бег: { name_en: 'run', base: 'd6', race_modifier: 0, modifiers: 0, total: 'd6' },
        защита: { name_en: 'parry', base: 2, race_modifier: 0, modifiers: 0, total: 2 },
        стойкость: { name_en: 'toughness', base: 2, race_modifier: 0, armor: 0, modifiers: 0, total: 2 }
    },
    equipment: { money: 500, items: [] },
    notes: {
        flaw_points_earned: 0,
        flaw_points_spent: 0,
        flaw_points_available: 0,
        skill_points_used: 0,
        skill_points_available: 12,
        characteristic_points_used: 0,
        characteristic_points_available: 5
    },
    flaw_points_spending: [] // Список трат пунктов изъянов
};

let allSkills = [];
let allFlaws = [];
let allTraits = [];
let allRaces = [];
let selectedRace = null; // Выбранная раса
let traitModalFromFlaws = false; // Флаг для отслеживания открытия модального окна черт через трату пунктов

// Маппинг атрибутов
const attributeMap = {
    'ловкость': 'ловкость',
    'сила': 'сила',
    'выносливость': 'выносливость',
    'смекалка': 'смекалка',
    'характер': 'характер'
};

// Функции для работы с костями
function increaseDieValue(currentValue) {
    if (!currentValue || currentValue === '') return 'd4';
    
    if (currentValue === 'd4') return 'd6';
    if (currentValue === 'd6') return 'd8';
    if (currentValue === 'd8') return 'd10';
    if (currentValue === 'd10') return 'd12';
    if (currentValue === 'd12') return 'd12+1';
    
    // Обработка d12+N
    const match = currentValue.match(/^d12\+(\d+)$/);
    if (match) {
        const num = parseInt(match[1]);
        return `d12+${num + 1}`;
    }
    
    return currentValue;
}

// Проверка, можно ли повысить значение (максимум d12 для характеристик, без ограничений для навыков)
function canIncreaseValue(currentValue, isAttribute = false) {
    if (!currentValue || currentValue === '') return true;
    
    // Для характеристик максимум d12 (без +N)
    if (isAttribute && currentValue === 'd12') {
        return false;
    }
    
    // Для навыков можно повышать до d12+N
    return true;
}

function decreaseDieValue(currentValue) {
    if (!currentValue || currentValue === '') return null;
    
    if (currentValue === 'd4') return null; // Нельзя уменьшить ниже d4
    if (currentValue === 'd6') return 'd4';
    if (currentValue === 'd8') return 'd6';
    if (currentValue === 'd10') return 'd8';
    if (currentValue === 'd12') return 'd10';
    
    // Обработка d12+N
    const match = currentValue.match(/^d12\+(\d+)$/);
    if (match) {
        const num = parseInt(match[1]);
        if (num === 1) return 'd12';
        return `d12+${num - 1}`;
    }
    
    return currentValue;
}

// Вычисление итогового значения характеристики с учётом модификатора расы
function calculateCharacteristicValue(charName) {
    const char = character.characteristics[charName];
    if (!char) return 'd4';
    
    const baseValue = char.base_value || 'd4';
    const raceModifier = char.race_modifier || '';
    
    if (!raceModifier) {
        return baseValue;
    }
    
    // Если есть модификатор расы, применяем его к базовому значению
    // Например, если базовое d4, а модификатор d6, то итоговое d6
    // Если базовое d6, а модификатор d6, то итоговое d6 (не суммируем)
    const basePoints = getDiePoints(baseValue);
    const modifierPoints = getDiePoints(raceModifier);
    
    // Берём максимальное значение
    const finalPoints = Math.max(basePoints, modifierPoints);
    
    // Преобразуем обратно в значение кости
    const dieValues = ['d4', 'd6', 'd8', 'd10', 'd12'];
    if (finalPoints < 5) {
        return dieValues[finalPoints];
    } else {
        return `d12+${finalPoints - 4}`;
    }
}

function updateCharacteristicDisplay(charName) {
    const char = character.characteristics[charName];
    if (!char) return;
    
    // Вычисляем итоговое значение с учётом модификатора расы
    const finalValue = calculateCharacteristicValue(charName);
    char.value = finalValue;
    
    const valueSpan = document.querySelector(`.char-value[data-char="${charName}"]`);
    if (valueSpan) {
        valueSpan.textContent = finalValue;
    }
    
    // Обновляем состояние кнопок
    const minusBtn = document.querySelector(`.btn-char-minus[data-char="${charName}"]`);
    const baseValue = char.base_value || 'd4';
    if (minusBtn) {
        minusBtn.disabled = (!baseValue || baseValue === 'd4');
    }
}

// Инициализация
export async function initCharacterCreator() {
    await loadData();
    setupEventListeners();
    
    // Автоматически выбираем расу "Человек" по умолчанию, если раса не выбрана
    if (!character.race || !character.race.uuid) {
        const humanRace = allRaces.find(r => r.name === 'ЛЮДИ' || r.name_en === 'HUMANS');
        if (humanRace) {
            selectedRace = humanRace;
            applyRace(humanRace);
        }
    }
    
    // Инициализация отображения характеристик
    Object.keys(character.characteristics).forEach(key => {
        if (key !== 'total_points_available' && key !== 'total_points_spent') {
            updateCharacteristicDisplay(key);
        }
    });
    
    renderBaseSkills();
    renderSelectedFlaws();
    renderSelectedTraits();
    renderSpentFlawPoints();
    renderEquipment();
    renderDevelopment();
    updatePoints();
    
    // Обновляем состояние всех кнопок
    updateCharacteristicButtons();
    updateSkillButtons();
    updateAddTraitButton();
    
    // Инициализируем производные параметры
    calculateDerivedStatistics();
    updateDerivedStatisticsDisplay();
    
    // Настраиваем сворачивание секций
    setupCollapsibleSections();
    
    // Закрытие блока ошибок
    const closeBtn = document.getElementById('validation-errors-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            const errorsContainer = document.getElementById('validation-errors');
            if (errorsContainer) {
                errorsContainer.style.display = 'none';
            }
        });
    }
    
    // Валидация персонажа после полной загрузки DOM
    setTimeout(() => {
        validateCharacter();
    }, 200);
}

// Загрузка данных
async function loadData() {
    try {
        const [skillsRes, flawsRes, traitsRes, racesRes] = await Promise.all([
            fetch('/api/skills'),
            fetch('/api/flaws'),
            fetch('/api/traits'),
            fetch('/api/races')
        ]);
        
        allSkills = await skillsRes.json();
        allFlaws = await flawsRes.json();
        allTraits = await traitsRes.json();
        allRaces = await racesRes.json();
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
    }
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Концепция
    document.getElementById('character-name').addEventListener('input', (e) => {
        character.concept.name = e.target.value;
    });
    document.getElementById('character-description').addEventListener('input', (e) => {
        character.concept.description = e.target.value;
    });

    // Раса
    document.getElementById('select-race-btn').addEventListener('click', () => {
        openRaceModal();
    });
    document.getElementById('remove-race-btn').addEventListener('click', () => {
        removeRace();
    });

    // Характеристики - кнопки + и -
    document.querySelectorAll('.btn-char-plus').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const charName = e.target.dataset.char;
            const char = character.characteristics[charName];
            const currentBase = char.base_value || 'd4';
            const newBase = increaseDieValue(currentBase);
            char.base_value = newBase;
            updateCharacteristicDisplay(charName);
            updateCharacteristicPoints();
            renderSkillsForCharacteristic(charName);
            // Валидация после изменения характеристики
            setTimeout(() => validateCharacter(), 100);
        });
    });

    document.querySelectorAll('.btn-char-minus').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const charName = e.target.dataset.char;
            const char = character.characteristics[charName];
            const currentBase = char.base_value || 'd4';
            const newBase = decreaseDieValue(currentBase);
            if (newBase) {
                char.base_value = newBase;
                updateCharacteristicDisplay(charName);
                updateCharacteristicPoints();
                renderSkillsForCharacteristic(charName);
                calculateDerivedStatistics();
                updateDerivedStatisticsDisplay();
                if (window.updateTraitModalIfOpen) window.updateTraitModalIfOpen();
                // Валидация после изменения
                setTimeout(() => validateCharacter(), 100);
            }
        });
    });

    // Кнопки добавления
    document.getElementById('add-skill-btn').addEventListener('click', () => {
        openSkillModal();
    });
    document.getElementById('add-flaw-btn').addEventListener('click', () => {
        openFlawModal();
    });
    document.getElementById('add-trait-btn').addEventListener('click', () => {
        traitModalFromFlaws = false;
        openTraitModal();
    });

    // Закрытие модальных окон
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', (e) => {
            e.target.closest('.modal').style.display = 'none';
        });
    });

    // Поиск в модальном окне рас
    document.getElementById('race-modal-search').addEventListener('input', (e) => {
        renderRaceModal(e.target.value);
    });

    // Поиск в модальных окнах
    document.getElementById('skill-modal-search').addEventListener('input', (e) => {
        if (window.advancementSkillMode) {
            renderSkillModalForAdvancement(window.advancementSkillMode);
        } else {
            renderSkillModal(e.target.value);
        }
    });
    document.getElementById('flaw-modal-search').addEventListener('input', (e) => {
        renderFlawModal(e.target.value);
    });
    document.getElementById('trait-modal-search').addEventListener('input', () => {
        renderTraitModal();
    });
    document.getElementById('trait-modal-category').addEventListener('change', () => {
        renderTraitModal();
    });
    
    // Обновляем список черт при изменении характеристик, навыков или ранга
    // Это нужно для пересчета доступности черт
    const updateTraitModalIfOpen = () => {
        const traitModal = document.getElementById('trait-modal');
        if (traitModal && traitModal.style.display === 'block') {
            renderTraitModal();
        }
    };
    
    // Сохраняем ссылку на функцию для использования в других местах
    window.updateTraitModalIfOpen = updateTraitModalIfOpen;

    // Клик вне модального окна
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
            // Сбрасываем флаги повышений при закрытии модального окна
            if (e.target.id === 'advancement-modal') {
                currentAdvancementIndex = null;
            }
            if (e.target.id === 'skill-modal') {
                window.advancementSkillMode = undefined;
                window.advancementSelectedSkills = [];
            }
            if (e.target.id === 'flaw-modal') {
                window.advancementRemoveFlaw = false;
            }
        }
    });
    
    // Закрытие модального окна повышения
    const advancementModal = document.getElementById('advancement-modal');
    if (advancementModal) {
        advancementModal.querySelector('.close').addEventListener('click', () => {
            advancementModal.style.display = 'none';
            currentAdvancementIndex = null;
        });
    }

    // Кнопки траты пунктов изъянов
    document.getElementById('add-characteristic-point-btn').addEventListener('click', () => {
        addCharacteristicPointFromFlaws();
    });
    document.getElementById('add-trait-from-flaws-btn').addEventListener('click', () => {
        traitModalFromFlaws = true;
        openTraitModal();
    });
    document.getElementById('add-skill-point-btn').addEventListener('click', () => {
        addSkillPointFromFlaws();
    });
    document.getElementById('add-money-btn').addEventListener('click', () => {
        addMoneyFromFlaws();
    });

    // Кнопки действий
    document.getElementById('save-character').addEventListener('click', saveCharacter);
    document.getElementById('export-character').addEventListener('click', exportCharacter);
    document.getElementById('load-character').addEventListener('click', loadCharacter);
    document.getElementById('reset-character').addEventListener('click', resetCharacter);
    
    // Обработчик загрузки файла
    const fileInput = document.getElementById('load-character-file');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileLoad);
    }
    
    // Управление деньгами
    document.getElementById('money-plus-btn').addEventListener('click', () => {
        const moneyInput = document.getElementById('character-money');
        const currentValue = parseInt(moneyInput.value) || 0;
        moneyInput.value = currentValue + 100;
        character.equipment.money = parseInt(moneyInput.value);
    });
    
    document.getElementById('money-minus-btn').addEventListener('click', () => {
        const moneyInput = document.getElementById('character-money');
        const currentValue = parseInt(moneyInput.value) || 0;
        const newValue = Math.max(0, currentValue - 100);
        moneyInput.value = newValue;
        character.equipment.money = newValue;
        document.getElementById('money-minus-btn').disabled = newValue === 0;
    });
    
    document.getElementById('character-money').addEventListener('input', (e) => {
        const value = parseInt(e.target.value) || 0;
        character.equipment.money = Math.max(0, value);
        e.target.value = character.equipment.money;
        document.getElementById('money-minus-btn').disabled = character.equipment.money === 0;
    });
    
    // Управление инвентарем
    document.getElementById('add-item-btn').addEventListener('click', () => {
        openItemModal();
    });
    
    // Модальное окно предмета
    document.getElementById('item-modal-cancel').addEventListener('click', () => {
        closeItemModal();
    });
    
    document.getElementById('item-modal-save').addEventListener('click', () => {
        saveItem();
    });
    
    // Закрытие модального окна предмета
    const itemModal = document.getElementById('item-modal');
    itemModal.querySelector('.close').addEventListener('click', () => {
        closeItemModal();
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === itemModal) {
            closeItemModal();
        }
    });
    
    // Управление опытом и повышениями
    document.getElementById('add-experience-btn').addEventListener('click', () => {
        addExperience();
    });
    
    document.getElementById('remove-experience-btn').addEventListener('click', () => {
        removeExperience();
    });
    
    document.getElementById('use-advancement-btn').addEventListener('click', () => {
        openAdvancementModal();
    });
}

// Настройка сворачивания секций
function setupCollapsibleSections() {
    // Загружаем сохраненное состояние из localStorage
    const savedState = localStorage.getItem('sectionCollapseState');
    const collapsedSections = savedState ? JSON.parse(savedState) : {};
    
    // Находим все секции с кнопками сворачивания
    document.querySelectorAll('.section-toggle').forEach(toggle => {
        const sectionId = toggle.dataset.section;
        const section = document.getElementById(sectionId);
        const content = section.querySelector('.section-content');
        
        // Восстанавливаем сохраненное состояние
        if (collapsedSections[sectionId]) {
            content.classList.add('collapsed');
            toggle.classList.add('collapsed');
        }
        
        // Обработчик клика на заголовок или кнопку
        const header = section.querySelector('.section-header');
        header.addEventListener('click', (e) => {
            // Не сворачиваем, если кликнули на кнопку удаления или другую кнопку внутри
            if (e.target.tagName === 'BUTTON' && !e.target.classList.contains('section-toggle')) {
                return;
            }
            
            toggleSection(sectionId);
        });
    });
}

// Переключение состояния секции
function toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    const content = section.querySelector('.section-content');
    const toggle = section.querySelector('.section-toggle');
    
    const isCollapsed = content.classList.contains('collapsed');
    
    if (isCollapsed) {
        content.classList.remove('collapsed');
        toggle.classList.remove('collapsed');
        toggle.textContent = '▼';
    } else {
        content.classList.add('collapsed');
        toggle.classList.add('collapsed');
        toggle.textContent = '▶';
    }
    
    // Сохраняем состояние в localStorage
    const savedState = localStorage.getItem('sectionCollapseState');
    const collapsedSections = savedState ? JSON.parse(savedState) : {};
    collapsedSections[sectionId] = !isCollapsed;
    localStorage.setItem('sectionCollapseState', JSON.stringify(collapsedSections));
}

// Рендеринг базовых навыков
function renderBaseSkills() {
    const baseSkills = allSkills.filter(skill => skill.is_base);
    baseSkills.forEach(skill => {
        const attribute = attributeMap[skill.attribute] || 'смекалка';
        addSkillToCharacteristic(attribute, skill);
    });
}

// Рендеринг навыков для конкретной характеристики
function renderSkillsForCharacteristic(charName) {
    const container = document.getElementById(`skills-${charName}`);
    const skillsForChar = character.skills.filter(skill => {
        const skillData = allSkills.find(s => s.uuid === skill.uuid);
        if (!skillData) return false;
        const skillAttr = attributeMap[skillData.attribute] || 'смекалка';
        return skillAttr === charName;
    });

    container.innerHTML = skillsForChar.map(skill => {
        const skillData = allSkills.find(s => s.uuid === skill.uuid);
        return createSkillItemHTML(skill, skillData);
    }).join('');

    // Обработчики для увеличения уровня навыка
    container.querySelectorAll('.btn-skill-plus').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const skillUuid = e.target.dataset.uuid;
            const skill = character.skills.find(s => s.uuid === skillUuid);
            if (skill && !skill.from_race) {
                // Для навыков не от расы изменяем base_value
                const currentBase = skill.base_value || skill.value || 'd4';
                const newBase = increaseDieValue(currentBase);
                skill.base_value = newBase;
                skill.value = newBase; // Для навыков не от расы value = base_value
                updateSkillDisplay(skillUuid);
                updateSkillPoints();
            } else if (skill && skill.from_race) {
                // Для навыков от расы изменяем base_value, но итоговое значение = max(base_value, race_modifier)
                const currentBase = skill.base_value || 'd4';
                const newBase = increaseDieValue(currentBase);
                skill.base_value = newBase;
                // Вычисляем итоговое значение
                const raceModifier = skill.race_modifier || '';
                if (raceModifier) {
                    const basePoints = getDiePoints(newBase);
                    const modifierPoints = getDiePoints(raceModifier);
                    const finalPoints = Math.max(basePoints, modifierPoints);
                    const dieValues = ['d4', 'd6', 'd8', 'd10', 'd12'];
                    if (finalPoints < 5) {
                        skill.value = dieValues[finalPoints];
                    } else {
                        skill.value = `d12+${finalPoints - 4}`;
                    }
                } else {
                    skill.value = newBase;
                }
                updateSkillDisplay(skillUuid);
                updateSkillPoints();
            }
        });
    });

    // Обработчики для уменьшения уровня навыка
    container.querySelectorAll('.btn-skill-minus').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const skillUuid = e.target.dataset.uuid;
            const skill = character.skills.find(s => s.uuid === skillUuid);
            if (skill && !skill.from_race) {
                // Для навыков не от расы изменяем base_value
                const currentBase = skill.base_value || skill.value || 'd4';
                const newBase = decreaseDieValue(currentBase);
                if (newBase) {
                    skill.base_value = newBase;
                    skill.value = newBase;
                    updateSkillDisplay(skillUuid);
                    updateSkillPoints();
                    // Валидация после изменения навыка
                    setTimeout(() => validateCharacter(), 100);
                }
            } else if (skill && skill.from_race) {
                // Для навыков от расы изменяем base_value
                const currentBase = skill.base_value || 'd4';
                const newBase = decreaseDieValue(currentBase);
                if (newBase) {
                    skill.base_value = newBase;
                    // Вычисляем итоговое значение
                    const raceModifier = skill.race_modifier || '';
                    if (raceModifier) {
                        const basePoints = getDiePoints(newBase);
                        const modifierPoints = getDiePoints(raceModifier);
                        const finalPoints = Math.max(basePoints, modifierPoints);
                        const dieValues = ['d4', 'd6', 'd8', 'd10', 'd12'];
                        if (finalPoints < 5) {
                            skill.value = dieValues[finalPoints];
                        } else {
                            skill.value = `d12+${finalPoints - 4}`;
                        }
                    } else {
                        skill.value = newBase;
                    }
                    updateSkillDisplay(skillUuid);
                    updateSkillPoints();
                }
            }
        });
    });

    // Обработчики для удаления навыка
    container.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const skillUuid = e.target.dataset.uuid;
            removeSkill(skillUuid);
        });
    });
}

// Обновление отображения навыка
function updateSkillDisplay(skillUuid) {
    const skill = character.skills.find(s => s.uuid === skillUuid);
    if (!skill) return;
    
    // Вычисляем итоговое значение навыка
    let finalValue = skill.value || '';
    if (skill.from_race && skill.race_modifier) {
        const basePoints = getDiePoints(skill.base_value || 'd4');
        const modifierPoints = getDiePoints(skill.race_modifier);
        const finalPoints = Math.max(basePoints, modifierPoints);
        const dieValues = ['d4', 'd6', 'd8', 'd10', 'd12'];
        if (finalPoints < 5) {
            finalValue = dieValues[finalPoints];
        } else {
            finalValue = `d12+${finalPoints - 4}`;
        }
        skill.value = finalValue;
    }
    
    const valueSpan = document.querySelector(`.skill-value[data-uuid="${skillUuid}"]`);
    const minusBtn = document.querySelector(`.btn-skill-minus[data-uuid="${skillUuid}"]`);
    
    if (valueSpan) {
        valueSpan.textContent = finalValue || '-';
    }
    
    if (minusBtn) {
        // Для навыков от расы проверяем base_value, для остальных - value
        const checkValue = skill.from_race ? (skill.base_value || 'd4') : (skill.value || '');
        const canDecrease = checkValue && checkValue !== 'd4' && checkValue !== '';
        minusBtn.disabled = !canDecrease;
    }
    
    // Проверяем, является ли это навыком ДРАКА, и пересчитываем производные параметры
    const skillData = allSkills.find(s => s.uuid === skillUuid);
    if (skillData && (skillData.name === 'ДРАКА' || skillData.name_en === 'FIGHTING')) {
        calculateDerivedStatistics();
        updateDerivedStatisticsDisplay();
    }
}

// Создание HTML для элемента навыка
function createSkillItemHTML(skill, skillData) {
    // Вычисляем итоговое значение навыка
    let finalValue = skill.value || '';
    if (skill.from_race && skill.race_modifier) {
        const basePoints = getDiePoints(skill.base_value || 'd4');
        const modifierPoints = getDiePoints(skill.race_modifier);
        const finalPoints = Math.max(basePoints, modifierPoints);
        const dieValues = ['d4', 'd6', 'd8', 'd10', 'd12'];
        if (finalPoints < 5) {
            finalValue = dieValues[finalPoints];
        } else {
            finalValue = `d12+${finalPoints - 4}`;
        }
        skill.value = finalValue;
    }
    
    const displayValue = finalValue || '-';
    // Для навыков от расы проверяем base_value, для остальных - value
    const checkValue = skill.from_race ? (skill.base_value || 'd4') : (finalValue || '');
    const canDecrease = checkValue && checkValue !== 'd4' && checkValue !== '';
    
    return `
        <div class="skill-item-under-char" data-uuid="${skill.uuid}">
            <div class="skill-name">${skillData ? skillData.name : skill.name}</div>
            <div class="skill-controls">
                <button class="btn-skill btn-skill-minus" data-uuid="${skill.uuid}" ${!canDecrease ? 'disabled' : ''}>-</button>
                <span class="skill-value" data-uuid="${skill.uuid}">${displayValue}</span>
                <button class="btn-skill btn-skill-plus" data-uuid="${skill.uuid}">+</button>
            </div>
            ${skillData && !skillData.is_base && !skill.from_race ? '<button class="remove-btn" data-uuid="' + skill.uuid + '">×</button>' : ''}
        </div>
    `;
}

// Добавление навыка к характеристике
function addSkillToCharacteristic(charName, skillData) {
    const existingSkill = character.skills.find(s => s.uuid === skillData.uuid);
    if (existingSkill) return;

    character.skills.push({
        uuid: skillData.uuid,
        name: skillData.name,
        name_en: skillData.name_en,
        value: skillData.is_base ? 'd4' : '', // Базовые навыки начинаются с d4, остальные пустые
        base_value: skillData.is_base ? 'd4' : '', // Базовое значение
        points_spent: 0,
        is_base: skillData.is_base,
        from_race: false
    });

    renderSkillsForCharacteristic(charName);
    updateSkillPoints();
    // Валидация после добавления навыка
    setTimeout(() => validateCharacter(), 100);
}

// Удаление навыка
function removeSkill(skillUuid) {
    const skill = character.skills.find(s => s.uuid === skillUuid);
    if (!skill) return;
    
    const skillData = allSkills.find(s => s.uuid === skillUuid);
    if (skillData && skillData.is_base) return; // Нельзя удалить базовый навык
    if (skill.from_race) return; // Нельзя удалить навык от расы

    const isFightingSkill = skillData && (skillData.name === 'ДРАКА' || skillData.name_en === 'FIGHTING');
    
    character.skills = character.skills.filter(s => s.uuid !== skillUuid);
    const attribute = attributeMap[skillData.attribute] || 'смекалка';
    renderSkillsForCharacteristic(attribute);
    updateSkillPoints();
    // Валидация после удаления навыка
    setTimeout(() => validateCharacter(), 100);
    
    // Если удалили навык ДРАКА, пересчитываем производные параметры
    if (isFightingSkill) {
        calculateDerivedStatistics();
        updateDerivedStatisticsDisplay();
    }
}

// Открытие модального окна навыков
function openSkillModal() {
    document.getElementById('skill-modal').style.display = 'block';
    renderSkillModal();
}

// Рендеринг модального окна навыков
function renderSkillModal(searchTerm = '') {
    const container = document.getElementById('skill-modal-list');
    const selectedUuids = character.skills.map(s => s.uuid);
    
    // Если применяется повышение, показываем все навыки (включая уже добавленные)
    const showAllSkills = window.advancementSkillMode !== undefined;
    
    const filtered = allSkills.filter(skill => {
        if (!showAllSkills && selectedUuids.includes(skill.uuid)) return false;
        if (!searchTerm) return true;
        return skill.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
               skill.name_en.toLowerCase().includes(searchTerm.toLowerCase());
    });

    container.innerHTML = filtered.map(skill => {
        const attribute = attributeMap[skill.attribute] || 'смекалка';
        const existingSkill = character.skills.find(s => s.uuid === skill.uuid);
        const currentValue = existingSkill ? (existingSkill.value || 'd4') : 'd4';
        const charName = attributeMap[skill.attribute] || 'смекалка';
        const charValue = character.characteristics[charName]?.value || 'd4';
        
        // Для режима повышения показываем текущее значение навыка
        let skillInfo = '';
        if (showAllSkills && existingSkill) {
            skillInfo = `<div class="cc-info">Текущее значение: ${currentValue} (характеристика: ${charValue})</div>`;
        }
        
        return `
            <div class="modal-item" data-uuid="${skill.uuid}" data-attribute="${attribute}">
                <div class="modal-item-header">
                    <div class="modal-item-name">${skill.name}</div>
                    <div class="modal-item-details">${skill.attribute}</div>
                </div>
                <div class="modal-item-description">${skill.description}</div>
                ${skillInfo}
            </div>
        `;
    }).join('');

    // Обработчики клика
    container.querySelectorAll('.modal-item').forEach(item => {
        item.addEventListener('click', () => {
            const skillUuid = item.dataset.uuid;
            const attribute = item.dataset.attribute;
            const skill = allSkills.find(s => s.uuid === skillUuid);
            
            // Проверяем, применяется ли повышение через навык
            if (window.advancementSkillMode) {
                applySkillAdvancement(skillUuid, attribute, skill);
            } else {
                addSkillToCharacteristic(attribute, skill);
            }
            
            document.getElementById('skill-modal').style.display = 'none';
            document.getElementById('skill-modal-search').value = '';
        });
    });
}

// Открытие модального окна изъянов
function openFlawModal() {
    document.getElementById('flaw-modal').style.display = 'block';
    renderFlawModal();
}

// Рендеринг модального окна изъянов
function renderFlawModal(searchTerm = '') {
    const container = document.getElementById('flaw-modal-list');
    
    // Если применяется повышение для удаления изъяна, показываем только изъяны персонажа
    if (window.advancementRemoveFlaw) {
        const characterFlaws = character.starting_flaws.filter(f => !f.from_race);
        const filtered = characterFlaws.filter(flaw => {
            if (!searchTerm) return true;
            return flaw.name.toLowerCase().includes(searchTerm.toLowerCase());
        });
        
        container.innerHTML = filtered.map(flaw => {
            const flawData = allFlaws.find(f => f.uuid === flaw.uuid);
            const selectedType = flaw.selected_type || (flaw.type.includes('крупный') ? 'крупный' : 'мелкий');
            const canRemove = selectedType === 'мелкий' || flaw.type.includes('крупный');
            
            return `
                <div class="modal-item" data-uuid="${flaw.uuid}" data-can-remove="${canRemove}">
                    <div class="modal-item-header">
                        <div class="modal-item-name">${flaw.name} (${selectedType})</div>
                    </div>
                    ${flawData ? `<div class="modal-item-description">${flawData.description}</div>` : ''}
                    ${!canRemove ? '<div class="cc-warning">Можно удалить только МЕЛКИЙ изъян или уменьшить КРУПНЫЙ до МЕЛКОГО</div>' : ''}
                </div>
            `;
        }).join('');
        
        // Обработчики клика для удаления изъяна
        container.querySelectorAll('.modal-item').forEach(item => {
            item.addEventListener('click', () => {
                const flawUuid = item.dataset.uuid;
                const canRemove = item.dataset.canRemove === 'true';
                
                if (!canRemove) {
                    alert('Можно удалить только МЕЛКИЙ изъян или уменьшить КРУПНЫЙ до МЕЛКОГО');
                    return;
                }
                
                removeFlawForAdvancement(flawUuid);
                document.getElementById('flaw-modal').style.display = 'none';
                document.getElementById('flaw-modal-search').value = '';
            });
        });
        
        return;
    }
    
    // Обычный режим добавления изъяна
    const selectedUuids = character.starting_flaws.map(f => f.uuid);
    
    const filtered = allFlaws.filter(flaw => {
        if (selectedUuids.includes(flaw.uuid)) return false;
        if (!searchTerm) return true;
        return flaw.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
               flaw.name_en.toLowerCase().includes(searchTerm.toLowerCase());
    });

    container.innerHTML = filtered.map(flaw => {
        const canBeMajor = flaw.type.includes('крупный');
        const canBeMinor = flaw.type.includes('мелкий');
        const isBoth = canBeMajor && canBeMinor;
        
        // Формируем кнопки для всех изъянов
        let typeButtons = '<div class="flaw-type-buttons">';
        
        if (isBoth) {
            // Если изъян может быть обоих типов - две кнопки
            typeButtons += `
                <button class="btn-flaw-type btn-flaw-minor" data-uuid="${flaw.uuid}" data-type="мелкий">Мелкий (+1)</button>
                <button class="btn-flaw-type btn-flaw-major" data-uuid="${flaw.uuid}" data-type="крупный">Крупный (+2)</button>
            `;
        } else if (canBeMajor) {
            // Только крупный
            typeButtons += `
                <button class="btn-flaw-type btn-flaw-major" data-uuid="${flaw.uuid}" data-type="крупный">Крупный (+2)</button>
            `;
        } else {
            // Только мелкий
            typeButtons += `
                <button class="btn-flaw-type btn-flaw-minor" data-uuid="${flaw.uuid}" data-type="мелкий">Мелкий (+1)</button>
            `;
        }
        
        typeButtons += '</div>';
        
        return `
            <div class="modal-item" data-uuid="${flaw.uuid}" data-can-be-major="${canBeMajor}" data-can-be-minor="${canBeMinor}">
                <div class="modal-item-header">
                    <div class="modal-item-name">${flaw.name}</div>
                </div>
                <div class="modal-item-description">${flaw.description}</div>
                ${typeButtons}
            </div>
        `;
    }).join('');

    // Функция добавления изъяна
    function addFlaw(flawUuid, selectedType) {
        const flaw = allFlaws.find(f => f.uuid === flawUuid);
        if (!flaw) return;
        
        // Проверяем, применяется ли повышение для удаления изъяна
        if (window.advancementRemoveFlaw) {
            removeFlawForAdvancement(flawUuid);
            window.advancementRemoveFlaw = false;
            document.getElementById('flaw-modal').style.display = 'none';
            document.getElementById('flaw-modal-search').value = '';
            return;
        }
        
        const points = selectedType === 'крупный' ? 2 : 1;
        
        // Проверяем текущее количество полученных пунктов
        const currentEarned = getFlawPointsEarned();
        const maxPoints = 4;
        
        // Вычисляем, сколько пунктов даст этот изъян
        let pointsToAdd = points;
        if (currentEarned + points > maxPoints) {
            pointsToAdd = Math.max(0, maxPoints - currentEarned);
        }
        
        // Добавляем изъян, даже если он не дает пунктов (можно брать сколько угодно)
        character.starting_flaws.push({
            uuid: flawUuid,
            name: flaw.name,
            name_en: flaw.name_en,
            type: flaw.type, // Оригинальные типы изъяна
            selected_type: selectedType, // Выбранный тип
            points: points, // Пункты за выбранный тип
            points_earned: pointsToAdd // Фактически полученные пункты
        });
        
        // Применяем эффекты изъяна к производным параметрам
        applyFlawEffects(flaw, selectedType);
        
        renderSelectedFlaws();
        updateFlawPoints();
        calculateDerivedStatistics();
        updateDerivedStatisticsDisplay();
        document.getElementById('flaw-modal').style.display = 'none';
        document.getElementById('flaw-modal-search').value = '';
    }

    // Обработчики для всех кнопок выбора типа
    container.querySelectorAll('.btn-flaw-type').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // Останавливаем всплытие события
            const flawUuid = btn.dataset.uuid;
            const selectedType = btn.dataset.type;
            addFlaw(flawUuid, selectedType);
        });
    });
}

// Рендеринг выбранных изъянов
function renderSelectedFlaws() {
    const container = document.getElementById('selected-flaws-list');
    container.innerHTML = character.starting_flaws.map(flaw => {
        const pointsEarned = flaw.points_earned !== undefined ? flaw.points_earned : 0;
        const selectedType = flaw.selected_type || (flaw.type.includes('крупный') ? 'крупный' : 'мелкий');
        const typeDisplay = flaw.type.length > 1 ? ` (${selectedType})` : '';
        
        let pointsDisplay;
        if (flaw.from_race) {
            pointsDisplay = 'от расы';
        } else {
            pointsDisplay = pointsEarned > 0 ? `+${pointsEarned} пункт${pointsEarned > 1 ? 'а' : ''}` : '0 пунктов';
        }
        
        const canRemove = !flaw.from_race; // Изъяны расы нельзя удалить
        
        // Получаем описание изъяна
        let description = '';
        if (flaw.from_race && selectedRace) {
            // Для изъянов расы ищем описание в объекте расы
            const raceFlaw = selectedRace.flaws.find(f => 
                f.name.toLowerCase() === flaw.name.toLowerCase()
            );
            if (raceFlaw) {
                description = raceFlaw.description || '';
            }
        }
        
        // Если не нашли в расе, ищем в базе изъянов
        if (!description) {
            const flawData = allFlaws.find(f => f.uuid === flaw.uuid);
            description = flawData ? flawData.description : '';
        }
        
        // Экранируем описание для HTML атрибута
        const escapedDescription = description
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/\n/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        
        return `
            <div class="selected-item" data-uuid="${flaw.uuid}" data-type="flaw" data-description="${escapedDescription}">
                <div class="selected-item-info">
                    <div class="selected-item-name">${flaw.name}${typeDisplay}</div>
                    <div class="selected-item-details">${pointsDisplay}</div>
                </div>
                ${canRemove ? `<button class="selected-item-remove" data-uuid="${flaw.uuid}">×</button>` : ''}
            </div>
        `;
    }).join('');

    // Обработчики для tooltip
    setupTooltips(container, 'flaw');

    // Обработчики удаления (только для изъянов, не от расы)
    container.querySelectorAll('.selected-item-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const flawUuid = e.target.dataset.uuid;
            const flaw = character.starting_flaws.find(f => f.uuid === flawUuid);
            // Не позволяем удалять изъяны расы
            if (flaw && !flaw.from_race) {
                character.starting_flaws = character.starting_flaws.filter(f => f.uuid !== flawUuid);
                // Пересчитываем производные параметры после удаления изъяна
                recalculateDerivedStatisticsFromFlaws();
                renderSelectedFlaws();
                updateFlawPoints();
                calculateDerivedStatistics();
                updateDerivedStatisticsDisplay();
            }
        });
    });
}

// Открытие модального окна черт
function openTraitModal() {
    document.getElementById('trait-modal').style.display = 'block';
    renderTraitModal();
}

// Рендеринг модального окна черт
function renderTraitModal() {
    const container = document.getElementById('trait-modal-list');
    const category = document.getElementById('trait-modal-category').value;
    const searchTerm = document.getElementById('trait-modal-search').value.toLowerCase();
    const selectedUuids = character.starting_traits.map(t => t.uuid);
    
    const filtered = allTraits.filter(trait => {
        if (selectedUuids.includes(trait.uuid)) return false;
        if (category && trait.category !== category) return false;
        if (!searchTerm) return true;
        return trait.name.toLowerCase().includes(searchTerm) ||
               trait.name_en.toLowerCase().includes(searchTerm);
    });

    // Разделяем черты на доступные и недоступные
    const traitsWithAvailability = filtered.map(trait => {
        const check = checkTraitRequirements(trait);
        return { trait, ...check };
    });
    
    const availableTraits = traitsWithAvailability.filter(t => t.available);
    const unavailableTraits = traitsWithAvailability.filter(t => !t.available);
    
    // Рендерим доступные черты
    let html = '';
    
    if (availableTraits.length > 0) {
        html += '<div class="traits-section-header is-available">✓ Доступные черты</div>';
        html += availableTraits.map(({ trait }) => {
            return `
                <div class="modal-item trait-available" data-uuid="${trait.uuid}">
                    <div class="modal-item-header">
                        <div class="modal-item-name">${trait.name}</div>
                        <div class="modal-item-details">${trait.category_en}</div>
                    </div>
                    <div class="modal-item-description">${trait.description}</div>
                </div>
            `;
        }).join('');
    }
    
    // Рендерим недоступные черты
    if (unavailableTraits.length > 0) {
        if (availableTraits.length > 0) {
            html += '<div class="traits-section-header is-unavailable">✗ Недоступные черты</div>';
        }
        html += unavailableTraits.map(({ trait, reasons }) => {
            return `
                <div class="modal-item trait-unavailable" data-uuid="${trait.uuid}">
                    <div class="modal-item-header">
                        <div class="modal-item-name">${trait.name}</div>
                        <div class="modal-item-details">${trait.category_en}</div>
                    </div>
                    <div class="modal-item-description">${trait.description}</div>
                    <div class="trait-requirements-block">
                        <div><strong>Требования не выполнены:</strong></div>
                        <ul>
                            ${reasons.map(r => `<li>${r}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    if (html === '') {
        html = '<p class="cc-empty">Черты не найдены</p>';
    }
    
    container.innerHTML = html;

    // Обработчики клика (только для доступных черт)
    container.querySelectorAll('.modal-item.trait-available').forEach(item => {
        item.addEventListener('click', () => {
            const traitUuid = item.dataset.uuid;
            const trait = allTraits.find(t => t.uuid === traitUuid);
            
            // Проверяем требования еще раз перед добавлением
            const check = checkTraitRequirements(trait);
            if (!check.available) {
                alert('Эта черта больше не доступна:\n' + check.reasons.join('\n'));
                renderTraitModal(); // Обновляем список
                return;
            }
            
            // Проверяем разрешение от расы (например, люди дают бесплатную черту)
            const hasRacePermission = checkRaceTraitPermission();
            
            // Можно брать черту только если:
            // 1. Есть разрешение от расы (например, люди)
            // 2. Потрачены пункты изъянов (через traitModalFromFlaws)
            // 3. Есть повышение (через pendingAdvancement)
            const pendingAdvancement = character.advancements.find(a => 
                !a.applied && a.pending_action === 'select_trait'
            );
            
            if (!traitModalFromFlaws && !pendingAdvancement && !hasRacePermission) {
                alert('Черту можно взять только:\n- За 2 пункта изъянов\n- Через повышение\n- Если ваша раса разрешает (например, люди дают бесплатную черту)');
                return;
            }
            
            // Если модальное окно открыто через трату пунктов изъянов
            if (traitModalFromFlaws) {
                if (character.notes.flaw_points_available < 2) {
                    alert('Недостаточно пунктов изъянов. Нужно 2 пункта.');
                    traitModalFromFlaws = false;
                    return;
                }
                
                // Добавляем трату
                character.flaw_points_spending.push({
                    type: 'trait',
                    cost: 2,
                    description: `Черта: ${trait.name}`,
                    data: { traitUuid: traitUuid }
                });
                
                updateFlawPoints();
                traitModalFromFlaws = false;
            } else if (pendingAdvancement) {
                // Применяем повышение через выбор черты
                pendingAdvancement.applied = true;
                pendingAdvancement.type = 'trait';
                pendingAdvancement.description = `Черта: ${trait.name}`;
                pendingAdvancement.pending_action = undefined;
                updateExperienceAndAdvancements();
                renderDevelopment();
            } else if (hasRacePermission) {
                // Используем разрешение от расы
                useRaceTraitPermission();
            }
            
            character.starting_traits.push({
                uuid: traitUuid,
                name: trait.name,
                name_en: trait.name_en,
                category: trait.category,
                category_en: trait.category_en
            });
            
            renderSelectedTraits();
            document.getElementById('trait-modal').style.display = 'none';
            document.getElementById('trait-modal-search').value = '';
            document.getElementById('trait-modal-category').value = '';
        });
    });
    
    // Обновляем список при изменении характеристик, навыков или ранга
    // Это будет вызываться из других функций при необходимости
}

// Проверка разрешения от расы на бесплатную черту
function checkRaceTraitPermission() {
    if (!character.race || !character.race.uuid) return false;
    
    const race = allRaces.find(r => r.uuid === character.race.uuid);
    if (!race) return false;
    
    // Проверяем, есть ли у расы черта, дающая бесплатную черту
    const freeTraitTrait = race.traits?.find(t => 
        t.name === 'Разностороннее развитие' || 
        t.name_en === 'Versatile Development' ||
        (t.effects && (t.effects.free_trait || t.effects.choice))
    );
    
    if (!freeTraitTrait) return false;
    
    // Проверяем, не использовали ли уже это разрешение
    if (character.race.used_free_trait) return false;
    
    return true;
}

// Использование разрешения от расы на бесплатную черту
function useRaceTraitPermission() {
    if (!character.race || !character.race.uuid) return;
    
    // Помечаем, что использовали бесплатную черту от расы
    if (!character.race.used_free_trait) {
        character.race.used_free_trait = true;
    }
}

// Настройка tooltip для изъянов и черт
function setupTooltips(container, type) {
    // Создаем элемент tooltip, если его еще нет
    let tooltip = document.getElementById('item-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'item-tooltip';
        tooltip.className = 'item-tooltip';
        document.body.appendChild(tooltip);
    }
    
    container.querySelectorAll('.selected-item').forEach(item => {
        const description = item.dataset.description;
        if (!description) return;
        
        // Декодируем HTML-сущности обратно в текст
        const decodedDescription = description
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>');
        
        let tooltipTimeout = null;
        
        item.addEventListener('mouseenter', (e) => {
            // Небольшая задержка перед показом tooltip
            tooltipTimeout = setTimeout(() => {
                tooltip.textContent = decodedDescription;
                tooltip.style.display = 'block';
                updateTooltipPosition(e, tooltip);
            }, 300); // 300ms задержка
        });
        
        item.addEventListener('mousemove', (e) => {
            if (tooltip.style.display === 'block') {
                updateTooltipPosition(e, tooltip);
            }
        });
        
        item.addEventListener('mouseleave', () => {
            if (tooltipTimeout) {
                clearTimeout(tooltipTimeout);
                tooltipTimeout = null;
            }
            tooltip.style.display = 'none';
        });
    });
}

// Обновление позиции tooltip
function updateTooltipPosition(event, tooltip) {
    const x = event.clientX;
    const y = event.clientY;
    const tooltipWidth = tooltip.offsetWidth;
    const tooltipHeight = tooltip.offsetHeight;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    // Позиционируем tooltip справа от курсора с небольшим отступом
    let left = x + 15;
    let top = y + 15;
    
    // Если tooltip выходит за правый край экрана, показываем слева
    if (left + tooltipWidth > windowWidth) {
        left = x - tooltipWidth - 15;
    }
    
    // Если tooltip выходит за нижний край экрана, поднимаем выше
    if (top + tooltipHeight > windowHeight) {
        top = y - tooltipHeight - 15;
    }
    
    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
}

// Рендеринг выбранных черт
function renderSelectedTraits() {
    const container = document.getElementById('selected-traits-list');
    container.innerHTML = character.starting_traits.map(trait => {
        // Получаем описание черты
        const traitData = allTraits.find(t => t.uuid === trait.uuid);
        const description = traitData ? traitData.description : '';
        
        // Экранируем описание для HTML атрибута
        const escapedDescription = description
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/\n/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        
        return `
            <div class="selected-item" data-uuid="${trait.uuid}" data-type="trait" data-description="${escapedDescription}">
                <div class="selected-item-info">
                    <div class="selected-item-name">${trait.name}</div>
                    <div class="selected-item-details">${trait.category_en}</div>
                </div>
                <button class="selected-item-remove" data-uuid="${trait.uuid}">×</button>
            </div>
        `;
    }).join('');

    // Обработчики для tooltip
    setupTooltips(container, 'trait');

    // Обработчики удаления
    container.querySelectorAll('.selected-item-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const traitUuid = e.target.dataset.uuid;
            character.starting_traits = character.starting_traits.filter(t => t.uuid !== traitUuid);
            renderSelectedTraits();
            updateAddTraitButton(); // Обновляем состояние кнопки добавления черты
        });
    });
}

// Открытие модального окна выбора расы
function openRaceModal() {
    document.getElementById('race-modal').style.display = 'block';
    renderRaceModal();
}

// Рендеринг модального окна рас
function renderRaceModal(searchTerm = '') {
    const container = document.getElementById('race-modal-list');
    
    const filtered = allRaces.filter(race => {
        if (!searchTerm) return true;
        return race.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
               race.name_en.toLowerCase().includes(searchTerm.toLowerCase()) ||
               race.description.toLowerCase().includes(searchTerm.toLowerCase());
    });

    container.innerHTML = filtered.map(race => {
        return `
            <div class="modal-item" data-uuid="${race.uuid}">
                <div class="modal-item-header">
                    <div class="modal-item-name">${race.name}</div>
                    <div class="modal-item-details">${race.name_en}</div>
                </div>
                <div class="modal-item-description">${race.description}</div>
            </div>
        `;
    }).join('');

    // Обработчики клика
    container.querySelectorAll('.modal-item').forEach(item => {
        item.addEventListener('click', () => {
            const raceUuid = item.dataset.uuid;
            const race = allRaces.find(r => r.uuid === raceUuid);
            selectRace(race);
            document.getElementById('race-modal').style.display = 'none';
            document.getElementById('race-modal-search').value = '';
        });
    });
}

// Выбор расы и применение её эффектов
function selectRace(race) {
    // Удаляем предыдущую расу, если была выбрана
    if (selectedRace) {
        removeRace();
    }
    
    selectedRace = race;
    character.race = {
        uuid: race.uuid,
        name: race.name,
        name_en: race.name_en,
        features: [],
        used_free_trait: false // Флаг использования бесплатной черты от расы
    };
    
    // Применяем эффекты расы
    applyRaceEffects(race);
    
    // Отображаем выбранную расу
    renderSelectedRace(race);
    
    // Обновляем состояние кнопки добавления черты (раса может давать разрешение)
    updateAddTraitButton();
}

// Применение расы (используется при автоматическом выборе)
function applyRace(race) {
    selectRace(race);
}

// Применение эффектов расы к персонажу
function applyRaceEffects(race) {
    // Применяем черты расы
    race.traits.forEach(trait => {
        applyRaceTrait(trait);
    });
    
    // Применяем изъяны расы
    race.flaws.forEach(flaw => {
        applyRaceFlaw(flaw);
    });
}

// Применение черты расы
function applyRaceTrait(trait) {
    const effects = trait.effects || {};
    
    // Изменение начального значения характеристики
    if (effects.attribute && effects.starting_value) {
        const attrName = effects.attribute;
        if (character.characteristics[attrName]) {
            // Сохраняем модификатор расы отдельно
            character.characteristics[attrName].race_modifier = effects.starting_value;
            // Итоговое значение будет пересчитано в updateCharacteristicDisplay
            updateCharacteristicDisplay(attrName);
        }
    }
    
    // Изменение максимального значения характеристики
    if (effects.attribute && effects.max_value) {
        // Сохраняем информацию о максимальном значении для будущего использования
        if (!character.race.features) {
            character.race.features = [];
        }
        character.race.features.push({
            type: 'max_attribute',
            attribute: effects.attribute,
            max_value: effects.max_value
        });
    }
    
    // Бесплатная черта
    if (effects.free_trait) {
        // Добавляем информацию о бесплатной черте
        if (!character.race.features) {
            character.race.features = [];
        }
        character.race.features.push({
            type: 'free_trait',
            trait_name: effects.free_trait,
            trait_name_en: effects.free_trait_en
        });
    }
    
    // Выбор между опциями (например, для полуэльфов)
    if (effects.choice === 'either' && effects.options) {
        // Пока просто сохраняем информацию, пользователь выберет позже
        if (!character.race.features) {
            character.race.features = [];
        }
        character.race.features.push({
            type: 'choice',
            options: effects.options
        });
    }
    
    // Бонус к навыку
    if (effects.skill && effects.starting_value) {
        // Находим навык и устанавливаем начальное значение
        const skillName = effects.skill;
        const skill = allSkills.find(s => 
            s.name.toLowerCase() === skillName.toLowerCase() ||
            s.name_en.toLowerCase() === (effects.skill_en || '').toLowerCase()
        );
        if (skill) {
            const existingSkill = character.skills.find(s => s.uuid === skill.uuid);
            if (existingSkill) {
                existingSkill.race_modifier = effects.starting_value;
                existingSkill.from_race = true; // Флаг, что навык от расы
                existingSkill.base_value = existingSkill.base_value || 'd4';
                // Вычисляем итоговое значение
                const basePoints = getDiePoints(existingSkill.base_value);
                const modifierPoints = getDiePoints(effects.starting_value);
                const finalPoints = Math.max(basePoints, modifierPoints);
                const dieValues = ['d4', 'd6', 'd8', 'd10', 'd12'];
                if (finalPoints < 5) {
                    existingSkill.value = dieValues[finalPoints];
                } else {
                    existingSkill.value = `d12+${finalPoints - 4}`;
                }
            } else {
                character.skills.push({
                    uuid: skill.uuid,
                    name: skill.name,
                    name_en: skill.name_en,
                    value: effects.starting_value,
                    base_value: 'd4', // Базовое значение
                    race_modifier: effects.starting_value, // Модификатор от расы
                    points_spent: 0,
                    is_base: skill.is_base,
                    from_race: true // Флаг, что навык от расы
                });
            }
        }
    }
    
    // Модификаторы стойкости
    if (effects.toughness_modifier !== undefined) {
        if (!character.derived_statistics.стойкость) {
            character.derived_statistics.стойкость = { base: 2, race_modifier: 0, armor: 0, modifiers: 0, total: 2 };
        }
        character.derived_statistics.стойкость.race_modifier = effects.toughness_modifier;
    }
    
    // Модификаторы шага
    if (effects.pace_modifier !== undefined) {
        if (!character.derived_statistics.стандартный_шаг) {
            character.derived_statistics.стандартный_шаг = { base: 6, race_modifier: 0, modifiers: 0, total: 6 };
        }
        character.derived_statistics.стандартный_шаг.race_modifier = effects.pace_modifier;
    }
    
    // Модификаторы бега (как ступень кости)
    if (effects.run_modifier !== undefined) {
        if (!character.derived_statistics.бег) {
            character.derived_statistics.бег = { base: 'd6', race_modifier: 0, modifiers: 0, total: 'd6' };
        }
        // Сохраняем модификатор как число ступеней (будет применен при расчете)
        // -1 означает уменьшение на 1 ступень, +1 означает увеличение на 1 ступень
        character.derived_statistics.бег.race_modifier = effects.run_modifier;
    }
    
    // Пересчитываем производные параметры после применения модификаторов расы
    // Сначала применяем эффекты изъянов расы, затем пересчитываем
    recalculateDerivedStatisticsFromFlaws();
    calculateDerivedStatistics();
    updateDerivedStatisticsDisplay();
    
    // Бонус к броне
    if (effects.armor_bonus) {
        if (!character.race.features) {
            character.race.features = [];
        }
        character.race.features.push({
            type: 'armor_bonus',
            value: effects.armor_bonus
        });
    }
    
    // Дополнительные фишки
    if (effects.bonus_bennies) {
        if (!character.race.features) {
            character.race.features = [];
        }
        character.race.features.push({
            type: 'bonus_bennies',
            value: effects.bonus_bennies
        });
    }
    
    // Игнорирование штрафов
    if (effects.ignores_penalties) {
        if (!character.race.features) {
            character.race.features = [];
        }
        character.race.features.push({
            type: 'ignores_penalties',
            conditions: effects.ignores_penalties
        });
    }
    
    // Естественное оружие
    if (effects.natural_weapon) {
        if (!character.race.features) {
            character.race.features = [];
        }
        character.race.features.push({
            type: 'natural_weapon',
            damage: effects.damage,
            damage_en: effects.damage_en
        });
    }
    
    // Полёт
    if (effects.flight_speed) {
        if (!character.race.features) {
            character.race.features = [];
        }
        character.race.features.push({
            type: 'flight',
            speed: effects.flight_speed,
            maneuver_skill: effects.maneuver_skill
        });
    }
    
    // Водный
    if (effects.cannot_drown || effects.water_movement) {
        if (!character.race.features) {
            character.race.features = [];
        }
        character.race.features.push({
            type: 'aquatic',
            cannot_drown: effects.cannot_drown,
            cannot_suffocate: effects.cannot_suffocate,
            water_movement: effects.water_movement
        });
    }
    
    updateCharacteristicPoints();
    updateSkillPoints();
    
    // Перерисовываем навыки для обновлённых характеристик
    Object.keys(attributeMap).forEach(charName => {
        renderSkillsForCharacteristic(charName);
    });
}

// Применение изъяна расы
function applyRaceFlaw(flaw) {
    // Добавляем изъян к персонажу
    const flawData = allFlaws.find(f => 
        f.name.toLowerCase() === flaw.name.toLowerCase()
    );
    
    // Определяем тип изъяна
    let selectedType = null;
    if (Array.isArray(flaw.type)) {
        selectedType = flaw.type.includes('крупный') ? 'крупный' : 'мелкий';
    } else {
        selectedType = flaw.type === 'крупный' ? 'крупный' : 'мелкий';
    }
    
    // Определяем, какие эффекты применять - приоритет у эффектов из расы (flaw.effects)
    const effectsToApply = flaw.effects || (flawData && flawData.effects) || null;
    const flawForEffects = flaw.effects ? flaw : (flawData || flaw);
    
    if (flawData) {
        // Проверяем, не добавлен ли уже этот изъян
        const existingFlaw = character.starting_flaws.find(f => f.uuid === flawData.uuid);
        if (!existingFlaw) {
            character.starting_flaws.push({
                uuid: flawData.uuid,
                name: flawData.name,
                name_en: flawData.name_en,
                type: flaw.type,
                points: 0, // Изъяны расы не дают пунктов
                points_earned: 0, // Изъяны расы не дают пунктов
                from_race: true // Флаг, что изъян от расы
            });
        }
    } else {
        // Если изъян не найден в базе, проверяем, не добавлен ли уже
        const existingFlaw = character.starting_flaws.find(f => 
            f.name.toLowerCase() === flaw.name.toLowerCase() && f.from_race
        );
        if (!existingFlaw) {
            character.starting_flaws.push({
                uuid: `race-flaw-${flaw.name}`,
                name: flaw.name,
                name_en: flaw.name_en || flaw.name,
                type: flaw.type,
                points: 0, // Изъяны расы не дают пунктов
                points_earned: 0, // Изъяны расы не дают пунктов
                from_race: true
            });
        }
    }
    
    // Пересчитываем производные параметры после применения эффектов изъяна расы
    // Это применит эффекты всех изъянов, включая только что добавленный
    recalculateDerivedStatisticsFromFlaws();
    calculateDerivedStatistics();
    updateDerivedStatisticsDisplay();
    
    updateFlawPoints();
    renderSelectedFlaws();
}

// Отображение выбранной расы
function renderSelectedRace(race) {
    const display = document.getElementById('selected-race-display');
    const nameEl = document.getElementById('selected-race-name');
    const descEl = document.getElementById('selected-race-description');
    const traitsList = document.getElementById('race-traits-list');
    const flawsList = document.getElementById('race-flaws-list');
    
    nameEl.textContent = race.name;
    descEl.textContent = race.description;
    
    // Рендерим черты расы
    traitsList.innerHTML = race.traits.map(trait => {
        return `
            <div class="race-trait-item">
                <div class="trait-name">${trait.name}</div>
                <div class="trait-description">${trait.description}</div>
            </div>
        `;
    }).join('');
    
    // Рендерим изъяны расы
    flawsList.innerHTML = race.flaws.map(flaw => {
        const typeText = flaw.type.includes('крупный') ? 'Крупный' : 'Мелкий';
        return `
            <div class="race-flaw-item">
                <div class="flaw-name">${flaw.name} (${typeText})</div>
                <div class="flaw-description">${flaw.description}</div>
            </div>
        `;
    }).join('');
    
    display.style.display = 'block';
    document.getElementById('select-race-btn').style.display = 'none';
}

// Удаление расы
function removeRace() {
    if (!selectedRace) return;
    
    // Удаляем изъяны расы
    character.starting_flaws = character.starting_flaws.filter(f => !f.from_race);
    
    // Сбрасываем модификаторы расы для характеристик
    Object.keys(character.characteristics).forEach(key => {
        if (key !== 'total_points_available' && key !== 'total_points_spent') {
            character.characteristics[key].race_modifier = '';
            updateCharacteristicDisplay(key);
        }
    });
    
    // Сбрасываем модификаторы расы для навыков
    character.skills.forEach(skill => {
        if (skill.from_race) {
            // Если навык был только от расы, удаляем его
            if (!skill.is_base) {
                character.skills = character.skills.filter(s => s.uuid !== skill.uuid);
            } else {
                // Если это базовый навык, сбрасываем модификатор расы
                skill.from_race = false;
                skill.race_modifier = '';
                skill.value = skill.base_value || 'd4';
            }
        } else if (skill.race_modifier) {
            // Если навык имел модификатор расы, но не был полностью от расы
            skill.race_modifier = '';
            skill.value = skill.base_value || skill.value;
        }
    });
    
    // Сбрасываем модификаторы расы для производных параметров
    if (character.derived_statistics) {
        if (character.derived_statistics.стандартный_шаг) {
            character.derived_statistics.стандартный_шаг.race_modifier = 0;
        }
        if (character.derived_statistics.бег) {
            character.derived_statistics.бег.race_modifier = 0;
        }
        if (character.derived_statistics.защита) {
            character.derived_statistics.защита.race_modifier = 0;
        }
        if (character.derived_statistics.стойкость) {
            character.derived_statistics.стойкость.race_modifier = 0;
        }
    }
    
    // Сбрасываем расу
    selectedRace = null;
    character.race = { uuid: '', name: '', name_en: '', features: [] };
    
    // Скрываем отображение расы
    document.getElementById('selected-race-display').style.display = 'none';
    document.getElementById('select-race-btn').style.display = 'inline-block';
    
    // Обновляем всё
    updateFlawPoints();
    updateCharacteristicPoints();
    updateSkillPoints();
    // Пересчитываем производные параметры с учетом всех изъянов (включая оставшиеся изъяны расы, если они есть)
    recalculateDerivedStatisticsFromFlaws();
    calculateDerivedStatistics();
    updateDerivedStatisticsDisplay();
    renderSelectedFlaws();
    
    // Перерисовываем навыки
    Object.keys(attributeMap).forEach(charName => {
        renderSkillsForCharacteristic(charName);
    });
}

// Получение пунктов из значения кости
function getDiePoints(value) {
    if (!value || value === '') return 0;
    
    const dieValues = { 'd4': 0, 'd6': 1, 'd8': 2, 'd10': 3, 'd12': 4 };
    if (dieValues.hasOwnProperty(value)) {
        return dieValues[value];
    }
    
    // Обработка d12+N
    const match = value.match(/^d12\+(\d+)$/);
    if (match) {
        const num = parseInt(match[1]);
        return 4 + num; // d12 = 4, +1 = 5, +2 = 6 и т.д.
    }
    
    return 0;
}

// Функция для преобразования пунктов кости обратно в значение кости
function pointsToDieValue(points) {
    const dieValues = ['d4', 'd6', 'd8', 'd10', 'd12'];
    if (points < 5) {
        return dieValues[points] || 'd4';
    } else {
        return `d12+${points - 4}`;
    }
}

// Функция для преобразования значения кости в числовое значение (d4=4, d6=6, d8=8, d10=10, d12=12)
function getDieNumericValue(value) {
    if (!value || value === '') return 4; // d4 по умолчанию
    
    const dieValues = { 'd4': 4, 'd6': 6, 'd8': 8, 'd10': 10, 'd12': 12 };
    if (dieValues.hasOwnProperty(value)) {
        return dieValues[value];
    }
    
    // Обработка d12+N
    const match = value.match(/^d12\+(\d+)$/);
    if (match) {
        const num = parseInt(match[1]);
        return 12 + num;
    }
    
    return 4; // По умолчанию d4
}

// Применение эффектов изъяна к производным параметрам
function applyFlawEffects(flaw, selectedType = null) {
    const effects = flaw.effects || {};
    
    // Если есть эффекты, зависящие от типа изъяна, используем их
    let finalEffects = { ...effects };
    if (effects.effects_by_type && selectedType && effects.effects_by_type[selectedType]) {
        // Объединяем базовые эффекты с эффектами для конкретного типа
        finalEffects = { ...effects, ...effects.effects_by_type[selectedType] };
    }
    
    // Модификаторы шага
    if (finalEffects.pace_modifier !== undefined) {
        if (!character.derived_statistics.стандартный_шаг) {
            character.derived_statistics.стандартный_шаг = { base: 6, race_modifier: 0, modifiers: 0, total: 6 };
        }
        // Модификаторы изъянов добавляются к modifiers, а не к race_modifier
        character.derived_statistics.стандартный_шаг.modifiers = 
            (character.derived_statistics.стандартный_шаг.modifiers || 0) + finalEffects.pace_modifier;
    }
    
    // Модификаторы бега
    if (finalEffects.run_modifier !== undefined) {
        if (!character.derived_statistics.бег) {
            character.derived_statistics.бег = { base: 'd6', race_modifier: 0, modifiers: 0, total: 'd6' };
        }
        // Модификаторы изъянов добавляются к modifiers
        character.derived_statistics.бег.modifiers = 
            (character.derived_statistics.бег.modifiers || 0) + finalEffects.run_modifier;
    }
    
    // Модификаторы стойкости
    if (finalEffects.toughness_modifier !== undefined) {
        if (!character.derived_statistics.стойкость) {
            character.derived_statistics.стойкость = { base: 2, race_modifier: 0, armor: 0, modifiers: 0, total: 2 };
        }
        character.derived_statistics.стойкость.modifiers = 
            (character.derived_statistics.стойкость.modifiers || 0) + finalEffects.toughness_modifier;
    }
}

// Пересчет производных параметров с учетом всех изъянов
function recalculateDerivedStatisticsFromFlaws() {
    // Сбрасываем модификаторы изъянов (но не race_modifier, который применяется отдельно)
    if (character.derived_statistics.стандартный_шаг) {
        character.derived_statistics.стандартный_шаг.modifiers = 0;
    }
    if (character.derived_statistics.бег) {
        character.derived_statistics.бег.modifiers = 0;
    }
    if (character.derived_statistics.стойкость) {
        character.derived_statistics.стойкость.modifiers = 0;
    }
    
    // Применяем эффекты всех изъянов (включая изъяны расы)
    character.starting_flaws.forEach(flaw => {
        const flawData = allFlaws.find(f => f.uuid === flaw.uuid);
        
        // Для изъянов расы используем тип из flaw.type, для обычных - из flaw.selected_type
        let selectedType = flaw.selected_type;
        if (!selectedType && flaw.type) {
            // Если нет selected_type, определяем по типу изъяна
            if (Array.isArray(flaw.type)) {
                selectedType = flaw.type.includes('крупный') ? 'крупный' : 'мелкий';
            } else {
                selectedType = flaw.type === 'крупный' ? 'крупный' : 'мелкий';
            }
        }
        
        // Для изъянов расы нужно получить эффекты из объекта расы, если они там есть
        // Ищем изъян в текущей расе
        let raceFlawWithEffects = null;
        if (flaw.from_race && selectedRace && selectedRace.flaws) {
            raceFlawWithEffects = selectedRace.flaws.find(f => 
                f.name.toLowerCase() === flaw.name.toLowerCase()
            );
        }
        
        // Приоритет: эффекты из расы > эффекты из базы изъянов
        const effectsToApply = raceFlawWithEffects?.effects || (flawData && flawData.effects) || null;
        const flawForEffects = raceFlawWithEffects?.effects ? raceFlawWithEffects : (flawData || flaw);
        
        if (effectsToApply) {
            applyFlawEffects(flawForEffects, selectedType);
        }
    });
}

// Расчет производных параметров
function calculateDerivedStatistics() {
    // Сначала пересчитываем модификаторы изъянов
    recalculateDerivedStatisticsFromFlaws();
    
    // Стандартный шаг: базовое значение 6 + модификаторы расы + модификаторы изъянов + ручные модификаторы
    const pace = character.derived_statistics.стандартный_шаг || { base: 6, race_modifier: 0, modifiers: 0 };
    const paceRaceModifier = pace.race_modifier || 0;
    // modifiers уже включает модификаторы изъянов после вызова recalculateDerivedStatisticsFromFlaws
    pace.total = pace.base + paceRaceModifier + pace.modifiers;
    
    // Бег: по умолчанию d6, рассчитывается на основе стандартного шага как кость
    const run = character.derived_statistics.бег || { base: 'd6', race_modifier: 0, modifiers: 0 };
    
    // Базовое значение бега зависит от стандартного шага
    // Стандартный шаг 6 = бег d6, шаг 7 = бег d8, шаг 8 = бег d10, и т.д.
    // Формула: если шаг <= 6, то d6, иначе d6 + (шаг - 6) ступеней
    const basePace = pace.base + paceRaceModifier;
    let baseRunPoints = 1; // d6 = 1 (по умолчанию d6, не d4)
    if (basePace > 6) {
        baseRunPoints = Math.min(1 + (basePace - 6), 4); // Максимум d12
    }
    
    // Применяем модификатор расы к бегу (если есть) - это число ступеней
    const runRaceModifier = typeof run.race_modifier === 'number' ? run.race_modifier : 0;
    let finalRunBasePoints = baseRunPoints + runRaceModifier;
    if (finalRunBasePoints < 0) finalRunBasePoints = 0;
    if (finalRunBasePoints > 8) finalRunBasePoints = 8; // Максимум d12+4
    run.base = pointsToDieValue(finalRunBasePoints);
    
    // Итоговое значение бега (базовое + модификаторы, но модификаторы применяются как ступени кости)
    let finalRunPoints = finalRunBasePoints + (run.modifiers || 0);
    if (finalRunPoints < 0) finalRunPoints = 0;
    if (finalRunPoints > 8) finalRunPoints = 8; // Максимум d12+4
    run.total = pointsToDieValue(finalRunPoints);
    
    // Защита: (значение ДРАКИ / 2) + 2 + модификаторы расы + модификаторы
    const parry = character.derived_statistics.защита || { base: 2, race_modifier: 0, modifiers: 0 };
    const fightingSkill = character.skills.find(s => {
        const skillData = allSkills.find(sd => sd.uuid === s.uuid);
        return skillData && (skillData.name === 'ДРАКА' || skillData.name_en === 'FIGHTING');
    });
    
    let fightingValue = 'd4';
    if (fightingSkill && fightingSkill.value) {
        fightingValue = fightingSkill.value;
    }
    
    // Используем числовое значение кости (d4=4, d6=6, d8=8, d10=10, d12=12)
    const fightingNumeric = getDieNumericValue(fightingValue);
    parry.base = Math.floor(fightingNumeric / 2) + 2;
    const parryRaceModifier = parry.race_modifier || 0;
    parry.total = parry.base + parryRaceModifier + parry.modifiers;
    
    // Стойкость: (значение Выносливости / 2) + 2 + броня + модификаторы расы + модификаторы
    const toughness = character.derived_statistics.стойкость || { base: 2, race_modifier: 0, armor: 0, modifiers: 0 };
    const vigorValue = character.characteristics.выносливость?.value || 'd4';
    // Используем числовое значение кости (d4=4, d6=6, d8=8, d10=10, d12=12)
    const vigorNumeric = getDieNumericValue(vigorValue);
    toughness.base = Math.floor(vigorNumeric / 2) + 2;
    const toughnessRaceModifier = toughness.race_modifier || 0;
    toughness.total = toughness.base + (toughness.armor || 0) + toughnessRaceModifier + toughness.modifiers;
    
    // Обновляем объект
    character.derived_statistics.стандартный_шаг = pace;
    character.derived_statistics.бег = run;
    character.derived_statistics.защита = parry;
    character.derived_statistics.стойкость = toughness;
}

// Обновление пунктов характеристик
function updateCharacteristicPoints() {
    let totalSpent = 0;

    Object.keys(character.characteristics).forEach(key => {
        if (key !== 'total_points_available' && key !== 'total_points_spent') {
            // Используем base_value для подсчёта пунктов, модификаторы расы не тратят пункты
            const baseValue = character.characteristics[key].base_value || 'd4';
            const points = getDiePoints(baseValue);
            character.characteristics[key].points_spent = points;
            totalSpent += points;
        }
    });

    character.characteristics.total_points_spent = totalSpent;
    document.getElementById('char-points-spent').textContent = totalSpent;
    document.getElementById('char-points-available').textContent = 
        character.characteristics.total_points_available - totalSpent;
    
    // Обновляем отображение всех характеристик
    Object.keys(character.characteristics).forEach(key => {
        if (key !== 'total_points_available' && key !== 'total_points_spent') {
            updateCharacteristicDisplay(key);
        }
    });
    
    // Обновляем состояние кнопок характеристик
    updateCharacteristicButtons();
    
    // Пересчитываем производные параметры
    calculateDerivedStatistics();
    updateDerivedStatisticsDisplay();
}

// Обновление пунктов навыков
function updateSkillPoints() {
    let totalSpent = 0;

    character.skills.forEach(skill => {
        // Навыки от расы не тратят пункты
        if (skill.from_race) {
            skill.points_spent = 0;
            return;
        }
        
        if (!skill.value || skill.value === '') return;
        
        const skillData = allSkills.find(s => s.uuid === skill.uuid);
        if (!skillData) return;
        
        const charName = attributeMap[skillData.attribute] || 'смекалка';
        // Используем итоговое значение характеристики (с учётом модификатора расы)
        const charValue = character.characteristics[charName]?.value || 'd4';
        const charPoints = getDiePoints(charValue);
        
        // Используем base_value навыка, если он есть, иначе value
        const skillBaseValue = skill.base_value || skill.value;
        const skillPoints = getDiePoints(skillBaseValue);

        let points = 0;
        if (skillPoints > charPoints) {
            points = (skillPoints - charPoints) * 2 + charPoints;
        } else {
            points = skillPoints;
        }

        skill.points_spent = points;
        totalSpent += points;
    });

    character.notes.skill_points_used = totalSpent;
    document.getElementById('skill-points-spent').textContent = totalSpent;
    document.getElementById('skill-points-available').textContent = 
        character.notes.skill_points_available - totalSpent;
    
    // Обновляем состояние кнопок навыков
    updateSkillButtons();
    
    // Пересчитываем производные параметры
    calculateDerivedStatistics();
    updateDerivedStatisticsDisplay();
    
    // Валидация персонажа (с небольшой задержкой для гарантии обновления DOM)
    setTimeout(() => validateCharacter(), 50);
}

// Обновление отображения производных параметров
function updateDerivedStatisticsDisplay() {
    const stats = character.derived_statistics;
    
    // Обновляем стандартный шаг
    const paceEl = document.getElementById('derived-pace-value');
    if (paceEl) {
        paceEl.textContent = stats.стандартный_шаг?.total || 6;
    }
    
    // Обновляем бег
    const runEl = document.getElementById('derived-run-value');
    if (runEl) {
        runEl.textContent = stats.бег?.total || 'd6';
    }
    
    // Обновляем защиту
    const parryEl = document.getElementById('derived-parry-value');
    if (parryEl) {
        parryEl.textContent = stats.защита?.total || 2;
    }
    
    // Обновляем стойкость
    const toughnessEl = document.getElementById('derived-toughness-value');
    if (toughnessEl) {
        toughnessEl.textContent = stats.стойкость?.total || 2;
    }
}


// Получение количества пунктов от изъянов (максимум 4)
function getFlawPointsEarned() {
    let totalEarned = 0;
    const maxPoints = 4;
    
    character.starting_flaws.forEach(flaw => {
        // Пропускаем изъяны расы - они не дают пунктов
        if (flaw.from_race) return;
        
        if (totalEarned < maxPoints) {
            const pointsToAdd = flaw.points_earned !== undefined ? flaw.points_earned : flaw.points;
            totalEarned = Math.min(maxPoints, totalEarned + pointsToAdd);
        }
    });
    
    return totalEarned;
}

// Обновление пунктов изъянов
function updateFlawPoints() {
    // Пересчитываем полученные пункты для всех изъянов
    let totalEarned = 0;
    const maxPoints = 4;
    
    character.starting_flaws.forEach(flaw => {
        // Изъяны расы не дают пунктов и не пересчитываются
        if (flaw.from_race) {
            flaw.points_earned = 0;
            flaw.points = 0;
            return;
        }
        
        if (totalEarned < maxPoints) {
            // Используем выбранный тип, если он есть, иначе определяем по типу изъяна
            let points = 1;
            if (flaw.selected_type) {
                points = flaw.selected_type === 'крупный' ? 2 : 1;
            } else {
                // Для старых записей без selected_type
                points = flaw.type.includes('крупный') ? 2 : 1;
            }
            
            const pointsToAdd = Math.min(points, maxPoints - totalEarned);
            flaw.points_earned = pointsToAdd;
            flaw.points = points; // Обновляем points на основе выбранного типа
            totalEarned += pointsToAdd;
        } else {
            // Если уже набрано 4 пункта, дальнейшие изъяны не дают пунктов
            flaw.points_earned = 0;
        }
    });
    
    character.notes.flaw_points_earned = totalEarned;
    
    // Подсчитываем потраченные пункты
    const totalSpent = character.flaw_points_spending.reduce((sum, spending) => sum + spending.cost, 0);
    character.notes.flaw_points_spent = totalSpent;
    character.notes.flaw_points_available = totalEarned - totalSpent;
    
    // Обновляем отображение
    document.getElementById('flaw-points-earned').textContent = totalEarned;
    document.getElementById('flaw-points-spent').textContent = totalSpent;
    document.getElementById('flaw-points-available').textContent = character.notes.flaw_points_available;
    
    // Обновляем состояние кнопок траты пунктов
    updateSpendButtonsState();
    
    // Обновляем список трат
    renderSpentFlawPoints();
    
    // Валидация персонажа (с небольшой задержкой для гарантии обновления DOM)
    setTimeout(() => validateCharacter(), 50);
}

// Обновление состояния кнопок траты пунктов
function updateSpendButtonsState() {
    const available = character.notes.flaw_points_available || 0;
    
    // Кнопки за 2 пункта
    const addCharacteristicPointBtn = document.getElementById('add-characteristic-point-btn');
    const addTraitFromFlawsBtn = document.getElementById('add-trait-from-flaws-btn');
    if (addCharacteristicPointBtn) addCharacteristicPointBtn.disabled = available < 2;
    if (addTraitFromFlawsBtn) addTraitFromFlawsBtn.disabled = available < 2;
    
    // Кнопки за 1 пункт
    const addSkillPointBtn = document.getElementById('add-skill-point-btn');
    const addMoneyBtn = document.getElementById('add-money-btn');
    if (addSkillPointBtn) addSkillPointBtn.disabled = available < 1;
    if (addMoneyBtn) addMoneyBtn.disabled = available < 1;
}

// Обновление состояния кнопок характеристик
function updateCharacteristicButtons() {
    const available = character.characteristics.total_points_available - character.characteristics.total_points_spent;
    
    Object.keys(character.characteristics).forEach(key => {
        if (key !== 'total_points_available' && key !== 'total_points_spent') {
            const char = character.characteristics[key];
            const baseValue = char.base_value || 'd4';
            const basePoints = getDiePoints(baseValue);
            
            // Кнопка "+" неактивна, если нет доступных пунктов или достигнут максимум (d12+4)
            const plusBtn = document.querySelector(`.btn-char-plus[data-char="${key}"]`);
            if (plusBtn) {
                const maxPoints = 8; // d12+4
                plusBtn.disabled = available <= 0 || basePoints >= maxPoints;
            }
            
            // Кнопка "-" неактивна, если значение уже минимальное (d4)
            const minusBtn = document.querySelector(`.btn-char-minus[data-char="${key}"]`);
            if (minusBtn) {
                minusBtn.disabled = basePoints <= 0; // d4 = 0
            }
        }
    });
}

// Обновление состояния кнопок навыков
function updateSkillButtons() {
    const available = character.notes.skill_points_available - character.notes.skill_points_used;
    
    // Обновляем кнопки для всех навыков
    character.skills.forEach(skill => {
        if (skill.from_race) {
            // Для навыков от расы кнопки всегда активны (но ограничены логикой)
            return;
        }
        
        const skillData = allSkills.find(s => s.uuid === skill.uuid);
        if (!skillData) return;
        
        const charName = attributeMap[skillData.attribute] || 'смекалка';
        const charValue = character.characteristics[charName]?.value || 'd4';
        const charPoints = getDiePoints(charValue);
        
        const skillBaseValue = skill.base_value || skill.value || 'd4';
        const skillPoints = getDiePoints(skillBaseValue);
        
        // Кнопка "+" неактивна, если нет доступных пунктов или достигнут максимум
        const plusBtn = document.querySelector(`.btn-skill-plus[data-uuid="${skill.uuid}"]`);
        if (plusBtn) {
            const maxPoints = 8; // d12+4
            plusBtn.disabled = available <= 0 || skillPoints >= maxPoints;
        }
        
        // Кнопка "-" неактивна, если значение уже минимальное (d4) или навык базовый
        const minusBtn = document.querySelector(`.btn-skill-minus[data-uuid="${skill.uuid}"]`);
        if (minusBtn) {
            minusBtn.disabled = skillPoints <= 0 || (skillData.is_base && skillPoints <= charPoints);
        }
    });
}

// Обновление состояния кнопки добавления черты
function updateAddTraitButton() {
    const addTraitBtn = document.getElementById('add-trait-btn');
    if (!addTraitBtn) return;
    
    // Проверяем, есть ли разрешение на добавление черты
    const hasRacePermission = checkRaceTraitPermission();
    const hasFlawPoints = (character.notes.flaw_points_available || 0) >= 2;
    const hasPendingAdvancement = character.advancements.some(a => 
        !a.applied && a.pending_action === 'select_trait'
    );
    
    // Кнопка активна только если есть хотя бы одно разрешение
    addTraitBtn.disabled = !hasRacePermission && !hasFlawPoints && !hasPendingAdvancement;
}

// Рендеринг списка потраченных пунктов
function renderSpentFlawPoints() {
    const container = document.getElementById('spent-flaw-points-list');
    if (!container) return;
    
    container.innerHTML = character.flaw_points_spending.map((spending, index) => {
        return `
            <div class="spent-point-item">
                <div class="spent-point-item-info">
                    <div class="spent-point-item-name">${spending.description}</div>
                    <div class="spent-point-item-cost">${spending.cost} пункт${spending.cost > 1 ? 'а' : ''}</div>
                </div>
                <button class="spent-point-item-remove" data-index="${index}">×</button>
            </div>
        `;
    }).join('');
    
    // Обработчики удаления трат
    container.querySelectorAll('.spent-point-item-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            const spending = character.flaw_points_spending[index];
            
            // Откатываем эффект траты перед удалением
            if (spending) {
                if (spending.type === 'characteristic_point') {
                    // Откатываем пункт характеристик
                    character.characteristics.total_points_available -= 1;
                } else if (spending.type === 'skill_point') {
                    // Откатываем пункт навыков
                    character.notes.skill_points_available -= 1;
                } else if (spending.type === 'money') {
                    // Откатываем деньги
                    character.equipment.money -= spending.data.amount;
                } else if (spending.type === 'trait') {
                    // Откатываем черту
                    character.starting_traits = character.starting_traits.filter(
                        t => t.uuid !== spending.data.traitUuid
                    );
                    renderSelectedTraits();
                }
            }
            
            // Удаляем трату
            character.flaw_points_spending.splice(index, 1);
            
            updateFlawPoints();
            updateCharacteristicPoints();
            updateSkillPoints();
            updateAddTraitButton(); // Обновляем состояние кнопки добавления черты
        });
    });
}

// Добавление пункта характеристик за 2 пункта изъянов
function addCharacteristicPointFromFlaws() {
    if (character.notes.flaw_points_available < 2) {
        alert('Недостаточно пунктов изъянов. Нужно 2 пункта.');
        return;
    }
    
    character.characteristics.total_points_available += 1;
    
    // Добавляем трату
    character.flaw_points_spending.push({
        type: 'characteristic_point',
        cost: 2,
        description: 'Дополнительный пункт характеристик',
        data: {}
    });
    
    updateFlawPoints();
    updateCharacteristicPoints();
    document.getElementById('char-points-available').textContent = 
        character.characteristics.total_points_available - character.characteristics.total_points_spent;
}

// Добавление пункта навыков за 1 пункт изъянов
function addSkillPointFromFlaws() {
    if (character.notes.flaw_points_available < 1) {
        alert('Недостаточно пунктов изъянов. Нужно 1 пункт.');
        return;
    }
    
    character.notes.skill_points_available += 1;
    
    // Добавляем трату
    character.flaw_points_spending.push({
        type: 'skill_point',
        cost: 1,
        description: 'Дополнительный пункт навыков',
        data: {}
    });
    
    updateFlawPoints();
    updateSkillPoints();
    document.getElementById('skill-points-available').textContent = character.notes.skill_points_available;
}

// Добавление денег за 1 пункт изъянов
function addMoneyFromFlaws() {
    if (character.notes.flaw_points_available < 1) {
        alert('Недостаточно пунктов изъянов. Нужно 1 пункт.');
        return;
    }
    
    const startingMoney = 500;
    const additionalMoney = startingMoney * 2;
    character.equipment.money += additionalMoney;
    
    // Добавляем трату
    character.flaw_points_spending.push({
        type: 'money',
        cost: 1,
        description: `Деньги (+$${additionalMoney})`,
        data: { amount: additionalMoney }
    });
    
    updateFlawPoints();
    renderEquipment(); // Обновляем отображение денег
    alert(`Добавлено $${additionalMoney}. Всего денег: $${character.equipment.money}`);
}

// Обновление всех пунктов
function updatePoints() {
    updateCharacteristicPoints();
    updateSkillPoints();
    updateFlawPoints();
}

/**
 * Валидация персонажа
 * Проверяет правила создания персонажа и отображает ошибки в красной плашке вверху экрана.
 * 
 * Валидация вызывается автоматически:
 * 1. При загрузке страницы (DOMContentLoaded)
 * 2. При изменении характеристик (кнопки +/-)
 * 3. При изменении навыков (кнопки +/-, добавление, удаление)
 * 4. При изменении изъянов (добавление, удаление)
 * 5. При изменении опыта (добавление, уменьшение)
 * 6. При загрузке персонажа
 * 
 * Проверяемые ошибки:
 * - Отрицательные пункты характеристик (потрачено больше, чем доступно)
 * - Отрицательные пункты навыков (потрачено больше, чем доступно)
 * - Не потраченные пункты изъянов (получено больше, чем потрачено)
 */
function validateCharacter() {
    const errors = [];
    
    // Проверка пунктов характеристик (отрицательные пункты)
    const charPointsSpent = character.characteristics.total_points_spent || 0;
    const charPointsAvailable = character.characteristics.total_points_available || 5;
    const charPointsRemaining = charPointsAvailable - charPointsSpent;
    if (charPointsRemaining < 0) {
        errors.push(`Отрицательные пункты характеристик: потрачено ${charPointsSpent}, доступно ${charPointsAvailable} (не хватает ${Math.abs(charPointsRemaining)} пунктов)`);
    }
    
    // Проверка пунктов навыков (отрицательные пункты)
    const skillPointsSpent = character.notes.skill_points_used || 0;
    const skillPointsAvailable = character.notes.skill_points_available || 12;
    const skillPointsRemaining = skillPointsAvailable - skillPointsSpent;
    if (skillPointsRemaining < 0) {
        errors.push(`Отрицательные пункты навыков: потрачено ${skillPointsSpent}, доступно ${skillPointsAvailable} (не хватает ${Math.abs(skillPointsRemaining)} пунктов)`);
    }
    
    // Проверка пунктов изъянов (не потраченные пункты)
    const flawPointsSpent = character.notes.flaw_points_spent || 0;
    const flawPointsEarned = character.notes.flaw_points_earned || 0;
    const flawPointsRemaining = flawPointsEarned - flawPointsSpent;
    if (flawPointsRemaining > 0) {
        errors.push(`Не потрачены пункты изъянов: получено ${flawPointsEarned}, потрачено ${flawPointsSpent} (осталось ${flawPointsRemaining} пунктов)`);
    }
    
    // Отображаем ошибки
    console.log('Валидация персонажа. Найдено ошибок:', errors.length, errors);
    displayValidationErrors(errors);
}

// Отображение ошибок валидации
function displayValidationErrors(errors) {
    // Используем requestAnimationFrame для гарантии, что DOM обновлен
    requestAnimationFrame(() => {
        const errorsContainer = document.getElementById('validation-errors');
        const errorsList = document.getElementById('validation-errors-list');
        
        if (!errorsContainer) {
            console.warn('Элемент validation-errors не найден');
            return;
        }
        
        if (!errorsList) {
            console.warn('Элемент validation-errors-list не найден');
            return;
        }
        
        if (errors.length === 0) {
            errorsContainer.style.display = 'none';
            return;
        }
        
        console.log('Отображаем ошибки валидации:', errors);
        errorsList.innerHTML = errors.map(error => `<li>${error}</li>`).join('');
        errorsContainer.style.display = 'block';
        errorsContainer.style.visibility = 'visible';
        errorsContainer.style.opacity = '1';
        
        // Прокручиваем к блоку ошибок, если он был скрыт
        setTimeout(() => {
            errorsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    });
}

// Сохранение персонажа в БД
async function saveCharacter() {
    if (!character.concept.name) {
        alert('Пожалуйста, введите имя персонажа');
        return;
    }

    try {
        if (!character.uuid) {
            character.uuid = generateUUID();
        }

        const response = await fetch('/api/character', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(character),
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || 'Ошибка сохранения');
        }

        alert('Персонаж сохранён');
    } catch (error) {
        console.error('Ошибка:', error);
        alert(error.message || 'Ошибка при сохранении персонажа');
    }
}

// Выгрузка персонажа в JSON-файл
function exportCharacter() {
    if (!character.concept.name) {
        alert('Пожалуйста, введите имя персонажа');
        return;
    }

    try {
        if (!character.uuid) {
            character.uuid = generateUUID();
        }

        const jsonString = JSON.stringify(character, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${character.concept.name || 'character'}_${character.uuid}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка при выгрузке персонажа');
    }
}

// Генерация UUID
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Загрузка персонажа
function loadCharacter() {
    // Триггерим клик на скрытом input для выбора файла
    const fileInput = document.getElementById('load-character-file');
    if (fileInput) {
        fileInput.click();
    }
}

// Обработка выбранного файла
function handleFileLoad(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const fileContent = e.target.result;
            character = JSON.parse(fileContent);
            
            // Инициализируем flaw_points_spending, если его нет
            if (!character.flaw_points_spending) {
                character.flaw_points_spending = [];
            }
            // Инициализируем опыт и повышения, если их нет
            if (!character.experience) {
                character.experience = { total: 0, spent: 0, available: 0 };
            }
            if (!character.advancements) {
                character.advancements = [];
            }
            
            // Автоматически выбираем расу "Человек" по умолчанию, если раса не выбрана
            if (!character.race || !character.race.uuid) {
                const humanRace = allRaces.find(r => r.name === 'ЛЮДИ' || r.name_en === 'HUMANS');
                if (humanRace) {
                    selectedRace = humanRace;
                    applyRace(humanRace);
                }
            } else {
                // Восстанавливаем выбранную расу
                const race = allRaces.find(r => r.uuid === character.race.uuid);
                if (race) {
                    selectedRace = race;
                    renderSelectedRace(race);
                }
            }
            
            loadCharacterToForm();
            validateCharacter(); // Валидация после загрузки
            alert('Персонаж загружен!');
            
            // Очищаем input, чтобы можно было загрузить тот же файл снова
            event.target.value = '';
        } catch (error) {
            console.error('Ошибка:', error);
            alert('Ошибка при загрузке персонажа. Убедитесь, что файл содержит корректный JSON.');
        }
    };
    
    reader.onerror = function() {
        alert('Ошибка при чтении файла');
    };
    
    reader.readAsText(file);
}

export function loadCharacterData(data) {
    try {
        character = data;

        if (!character.flaw_points_spending) {
            character.flaw_points_spending = [];
        }
        if (!character.experience) {
            character.experience = { total: 0, spent: 0, available: 0 };
        }
        if (!character.advancements) {
            character.advancements = [];
        }

        if (!character.race || !character.race.uuid) {
            const humanRace = allRaces.find(r => r.name === 'ЛЮДИ' || r.name_en === 'HUMANS');
            if (humanRace) {
                selectedRace = humanRace;
                applyRace(humanRace);
            }
        } else {
            const race = allRaces.find(r => r.uuid === character.race.uuid);
            if (race) {
                selectedRace = race;
                renderSelectedRace(race);
            }
        }

        loadCharacterToForm();
        validateCharacter();
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка при загрузке персонажа');
    }
}

// Загрузка данных персонажа в форму
function loadCharacterToForm() {
    document.getElementById('character-name').value = character.concept.name || '';
    document.getElementById('character-description').value = character.concept.description || '';

    // Загружаем расу, если она была выбрана
    if (character.race && character.race.uuid) {
        const race = allRaces.find(r => r.uuid === character.race.uuid);
        if (race) {
            selectedRace = race;
            renderSelectedRace(race);
        } else {
            // Если раса не найдена, выбираем "Человек" по умолчанию
            const humanRace = allRaces.find(r => r.name === 'ЛЮДИ' || r.name_en === 'HUMANS');
            if (humanRace) {
                selectedRace = humanRace;
                applyRace(humanRace);
            }
        }
    } else {
        // Если раса не выбрана, выбираем "Человек" по умолчанию
        const humanRace = allRaces.find(r => r.name === 'ЛЮДИ' || r.name_en === 'HUMANS');
        if (humanRace) {
            selectedRace = humanRace;
            applyRace(humanRace);
        } else {
            document.getElementById('selected-race-display').style.display = 'none';
            document.getElementById('select-race-btn').style.display = 'inline-block';
        }
    }

    // Характеристики - обновляем отображение
    Object.keys(character.characteristics).forEach(key => {
        if (key !== 'total_points_available' && key !== 'total_points_spent') {
            updateCharacteristicDisplay(key);
        }
    });

    // Навыки
    Object.keys(attributeMap).forEach(charName => {
        renderSkillsForCharacteristic(charName);
    });

    renderSelectedFlaws();
    renderSelectedTraits();
    renderSpentFlawPoints();
    renderEquipment();
    renderDevelopment();
    updatePoints();
    
    // Обновляем состояние всех кнопок
    updateCharacteristicButtons();
    updateSkillButtons();
    updateAddTraitButton();
    
    // Обновляем производные параметры
    calculateDerivedStatistics();
    updateDerivedStatisticsDisplay();
}

// Сброс персонажа
function resetCharacter() {
    if (confirm('Вы уверены, что хотите сбросить все данные?')) {
        character = {
            uuid: '',
            concept: { name: '', description: '' },
            race: { uuid: '', name: '', name_en: '', features: [] },
            characteristics: {
                сила: { name_en: 'strength', value: 'd4', base_value: 'd4', race_modifier: '', points_spent: 0 },
                ловкость: { name_en: 'agility', value: 'd4', base_value: 'd4', race_modifier: '', points_spent: 0 },
                выносливость: { name_en: 'vigor', value: 'd4', base_value: 'd4', race_modifier: '', points_spent: 0 },
                смекалка: { name_en: 'smarts', value: 'd4', base_value: 'd4', race_modifier: '', points_spent: 0 },
                характер: { name_en: 'spirit', value: 'd4', base_value: 'd4', race_modifier: '', points_spent: 0 },
                total_points_available: 5,
                total_points_spent: 0
            },
            skills: [],
            starting_flaws: [],
            starting_traits: [],
            experience: { total: 0, spent: 0, available: 0 },
            advancements: [],
            derived_statistics: {
                стандартный_шаг: { name_en: 'standard_pace', base: 6, race_modifier: 0, modifiers: 0, total: 6 },
                бег: { name_en: 'run', base: 'd6', race_modifier: 0, modifiers: 0, total: 'd6' },
                защита: { name_en: 'parry', base: 2, race_modifier: 0, modifiers: 0, total: 2 },
                стойкость: { name_en: 'toughness', base: 2, race_modifier: 0, armor: 0, modifiers: 0, total: 2 }
            },
            equipment: { money: 500, items: [] },
            notes: {
                flaw_points_earned: 0,
                flaw_points_spent: 0,
                flaw_points_available: 0,
                skill_points_used: 0,
                skill_points_available: 12,
                characteristic_points_used: 0,
                characteristic_points_available: 5
            },
            flaw_points_spending: []
        };
        selectedRace = null;
        
        // Автоматически выбираем расу "Человек" по умолчанию
        const humanRace = allRaces.find(r => r.name === 'ЛЮДИ' || r.name_en === 'HUMANS');
        if (humanRace) {
            selectedRace = humanRace;
            applyRace(humanRace);
        }
        
        loadCharacterToForm();
        renderBaseSkills();
        renderEquipment();
        renderDevelopment();
    }
}

// Рендеринг инвентаря и денег
function renderEquipment() {
    // Обновляем деньги
    const moneyInput = document.getElementById('character-money');
    if (moneyInput) {
        moneyInput.value = character.equipment.money || 500;
        document.getElementById('money-minus-btn').disabled = (character.equipment.money || 0) === 0;
    }
    
    // Рендерим предметы
    const container = document.getElementById('equipment-items-list');
    if (!container) return;
    
    const items = character.equipment.items || [];
    
    if (items.length === 0) {
        container.innerHTML = '<p class="cc-empty">Инвентарь пуст</p>';
        return;
    }
    
    container.innerHTML = items.map((item, index) => {
        const quantity = item.quantity || 1;
        const quantityDisplay = quantity > 1 ? ` (x${quantity})` : '';
        
        return `
            <div class="item-card" data-index="${index}">
                <div class="item-info">
                    <div class="item-name">${item.name || 'Безымянный предмет'}${quantityDisplay}</div>
                    ${item.description ? `<div class="item-description">${item.description}</div>` : ''}
                </div>
                <div class="item-actions">
                    <button class="btn-item-edit" data-index="${index}">Редактировать</button>
                    <button class="btn-item-remove" data-index="${index}">Удалить</button>
                </div>
            </div>
        `;
    }).join('');
    
    // Обработчики для кнопок редактирования и удаления
    container.querySelectorAll('.btn-item-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            editItem(index);
        });
    });
    
    container.querySelectorAll('.btn-item-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            removeItem(index);
        });
    });
}

// Открытие модального окна для добавления/редактирования предмета
let editingItemIndex = null;

function openItemModal(itemIndex = null) {
    editingItemIndex = itemIndex;
    const modal = document.getElementById('item-modal');
    const title = document.getElementById('item-modal-title');
    const nameInput = document.getElementById('item-name');
    const descInput = document.getElementById('item-description');
    const quantityInput = document.getElementById('item-quantity');
    
    if (itemIndex !== null) {
        // Редактирование существующего предмета
        const item = character.equipment.items[itemIndex];
        title.textContent = 'Редактировать предмет';
        nameInput.value = item.name || '';
        descInput.value = item.description || '';
        quantityInput.value = item.quantity || 1;
    } else {
        // Добавление нового предмета
        title.textContent = 'Добавить предмет';
        nameInput.value = '';
        descInput.value = '';
        quantityInput.value = 1;
    }
    
    modal.style.display = 'block';
    nameInput.focus();
}

// Закрытие модального окна предмета
function closeItemModal() {
    const modal = document.getElementById('item-modal');
    modal.style.display = 'none';
    editingItemIndex = null;
}

// Сохранение предмета
function saveItem() {
    const nameInput = document.getElementById('item-name');
    const descInput = document.getElementById('item-description');
    const quantityInput = document.getElementById('item-quantity');
    
    const name = nameInput.value.trim();
    if (!name) {
        alert('Пожалуйста, введите название предмета');
        return;
    }
    
    const item = {
        name: name,
        description: descInput.value.trim(),
        quantity: parseInt(quantityInput.value) || 1
    };
    
    if (editingItemIndex !== null) {
        // Обновляем существующий предмет
        character.equipment.items[editingItemIndex] = item;
    } else {
        // Добавляем новый предмет
        if (!character.equipment.items) {
            character.equipment.items = [];
        }
        character.equipment.items.push(item);
    }
    
    renderEquipment();
    closeItemModal();
}

// Удаление предмета
function removeItem(index) {
    if (confirm('Вы уверены, что хотите удалить этот предмет?')) {
        character.equipment.items.splice(index, 1);
        renderEquipment();
    }
}

// Редактирование предмета
function editItem(index) {
    openItemModal(index);
}

// Расчет ранга на основе количества повышений
function calculateRank(advancementsCount) {
    if (advancementsCount >= 16) return 'Легенда';
    if (advancementsCount >= 12) return 'Герой';
    if (advancementsCount >= 8) return 'Ветеран';
    if (advancementsCount >= 4) return 'Закалённый';
    return 'Новичок';
}

// Получение текущего ранга персонажа
function getCurrentRank() {
    const appliedAdvancements = getAppliedAdvancementsCount();
    return calculateRank(appliedAdvancements);
}

// Нормализация названия ранга для сравнения
function normalizeRank(rank) {
    if (!rank) return '';
    const normalized = rank.toLowerCase()
        .replace(/ё/g, 'е')  // Заменяем ё на е
        .replace(/[^а-я]/g, '');  // Убираем все не-буквы
    return normalized;
}

// Проверка требований черты
function checkTraitRequirements(trait) {
    if (!trait.requirements || trait.requirements.length === 0) {
        return { available: true, reasons: [] };
    }
    
    const reasons = [];
    const currentRank = getCurrentRank();
    const normalizedCurrentRank = normalizeRank(currentRank);
    
    // Маппинг нормализованных рангов для сравнения
    const rankMap = {
        'новичок': 0,
        'закаленный': 1,  // нормализованный (ё -> е)
        'ветеран': 2,
        'герой': 3,
        'легенда': 4
    };
    
    const currentRankLevel = rankMap[normalizedCurrentRank] || 0;
    
    // Маппинг названий характеристик
    const charNameMap = {
        'сила': 'сила',
        'ловкость': 'ловкость',
        'выносливость': 'выносливость',
        'смекалка': 'смекалка',
        'характер': 'характер',
        'ХАРАКТЕР': 'характер',
        'СИЛА': 'сила',
        'ЛОВКОСТЬ': 'ловкость',
        'ВЫНОСЛИВОСТЬ': 'выносливость',
        'СМЕКАЛКА': 'смекалка'
    };
    
    for (const requirement of trait.requirements) {
        const reqLower = requirement.toLowerCase();
        
        // Проверка ранга (нормализуем для сравнения)
        const normalizedRequirement = normalizeRank(requirement);
        if (rankMap.hasOwnProperty(normalizedRequirement)) {
            const requiredRankLevel = rankMap[normalizedRequirement];
            if (currentRankLevel < requiredRankLevel) {
                reasons.push(`Требуется ранг: ${requirement}`);
                continue;
            }
        }
        
        // Список названий характеристик для точной проверки
        const validCharacteristics = ['сила', 'ловкость', 'выносливость', 'смекалка', 'характер',
                                      'СИЛА', 'ЛОВКОСТЬ', 'ВЫНОСЛИВОСТЬ', 'СМЕКАЛКА', 'ХАРАКТЕР'];
        
        // Проверка навыка ПЕРЕД проверкой характеристики (формат: "ДРАКА d8+" или "СТРЕЛЬБА d6+")
        // Поддерживаем как заглавные, так и строчные буквы
        const skillMatch = requirement.match(/^([А-Яа-яA-Za-z]+)\s*(d\d+)\+?$/i);
        if (skillMatch) {
            const skillNameRaw = skillMatch[1];
            const requiredDie = skillMatch[2];
            
            // Нормализуем название навыка для поиска (заглавные буквы)
            const skillName = skillNameRaw.toUpperCase();
            
            // Ищем навык по русскому или английскому названию
            const skill = allSkills.find(s => 
                s.name.toUpperCase() === skillName || s.name_en === skillName
            );
            
            if (skill) {
                const charSkill = character.skills.find(s => s.uuid === skill.uuid);
                const skillValue = charSkill ? (charSkill.value || 'd4') : 'd4';
                const skillPoints = getDiePoints(skillValue);
                const requiredPoints = getDiePoints(requiredDie);
                
                if (skillPoints < requiredPoints) {
                    reasons.push(`Требуется навык ${skill.name} ${requiredDie}+ (текущее: ${skillValue})`);
                    continue;
                }
                // Навык найден и требование выполнено, переходим к следующему требованию
                continue;
            }
        }
        
        // Проверка характеристики (формат: "сила d6+" или "ловкость d8+")
        // Проверяем только если это точно название характеристики
        const charMatch = requirement.match(/^([а-яА-Я]+)\s*(d\d+)\+?$/i);
        if (charMatch) {
            const charNameRaw = charMatch[1].toLowerCase();
            const charName = charNameMap[charNameRaw] || charNameRaw;
            const requiredDie = charMatch[2];
            
            // Проверяем, что это действительно характеристика, а не навык
            if (validCharacteristics.includes(charMatch[1]) || validCharacteristics.includes(charMatch[1].toUpperCase()) || 
                ['сила', 'ловкость', 'выносливость', 'смекалка', 'характер'].includes(charName)) {
                
                if (character.characteristics[charName]) {
                    const charValue = character.characteristics[charName].value || 'd4';
                    const charPoints = getDiePoints(charValue);
                    const requiredPoints = getDiePoints(requiredDie);
                    
                    if (charPoints < requiredPoints) {
                        const charDisplayName = {
                            'сила': 'Сила',
                            'ловкость': 'Ловкость',
                            'выносливость': 'Выносливость',
                            'смекалка': 'Смекалка',
                            'характер': 'Характер'
                        }[charName] || charName;
                        reasons.push(`Требуется ${charDisplayName} ${requiredDie}+ (текущее: ${charValue})`);
                        continue;
                    }
                } else {
                    reasons.push(`Требуется характеристика: ${requirement}`);
                    continue;
                }
            }
        }
        
        // Проверка другой черты (просто название черты)
        const traitMatch = allTraits.find(t => 
            t.name === requirement || t.name_en === requirement.toUpperCase()
        );
        if (traitMatch) {
            const hasTrait = character.starting_traits.some(t => t.uuid === traitMatch.uuid);
            if (!hasTrait) {
                reasons.push(`Требуется черта: ${requirement}`);
                continue;
            }
        }
    }
    
    return {
        available: reasons.length === 0,
        reasons: reasons
    };
}

// Получение количества примененных повышений
function getAppliedAdvancementsCount() {
    return character.advancements.filter(a => a.applied).length;
}

// Добавление опыта
function addExperience() {
    const input = document.getElementById('add-experience-input');
    const amount = parseInt(input.value) || 0;
    
    if (amount <= 0) {
        alert('Введите положительное число');
        return;
    }
    
    character.experience.total = (character.experience.total || 0) + amount;
    
    // Пересчитываем доступный опыт и повышения
    updateExperienceAndAdvancements();
    
    input.value = 1;
    renderDevelopment();
}

// Уменьшение опыта
function removeExperience() {
    const input = document.getElementById('remove-experience-input');
    const amount = parseInt(input.value) || 0;
    
    if (amount <= 0) {
        alert('Введите положительное число');
        return;
    }
    
    const currentTotal = character.experience.total || 0;
    const appliedAdvancements = getAppliedAdvancementsCount();
    const minRequiredExp = appliedAdvancements * 4; // Минимум опыта для примененных повышений
    
    if (currentTotal - amount < minRequiredExp) {
        alert(`Нельзя уменьшить опыт ниже ${minRequiredExp} (требуется для примененных повышений). Сначала удалите примененные повышения.`);
        return;
    }
    
    character.experience.total = Math.max(0, currentTotal - amount);
    
    // Пересчитываем доступный опыт и повышения
    updateExperienceAndAdvancements();
    
    input.value = 1;
    renderDevelopment();
}

// Обновление опыта и повышений
function updateExperienceAndAdvancements() {
    const totalExp = character.experience.total || 0;
    const appliedAdvancements = getAppliedAdvancementsCount();
    const spentExp = appliedAdvancements * 4;
    const availableExp = totalExp - spentExp;
    
    character.experience.spent = spentExp;
    character.experience.available = availableExp;
    
    // Создаем повышения на основе доступного опыта
    const availableAdvancements = Math.floor(availableExp / 4);
    const currentAdvancementsCount = character.advancements.length;
    
    // Добавляем новые повышения, если нужно
    while (character.advancements.length < appliedAdvancements + availableAdvancements) {
        character.advancements.push({
            experience_cost: 4,
            type: '',
            description: '',
            applied: false
        });
    }
    
    // Удаляем лишние повышения, если опыта недостаточно
    const maxAdvancements = appliedAdvancements + availableAdvancements;
    if (character.advancements.length > maxAdvancements) {
        character.advancements = character.advancements.slice(0, maxAdvancements);
    }
}

// Отображение развития
function renderDevelopment() {
    // Инициализируем опыт, если его нет
    if (!character.experience) {
        character.experience = { total: 0, spent: 0, available: 0 };
    }
    if (!character.advancements) {
        character.advancements = [];
    }
    
    updateExperienceAndAdvancements();
    
    // Проверяем, что элементы существуют
    const totalExpEl = document.getElementById('experience-total');
    const availableExpEl = document.getElementById('experience-available');
    const rankEl = document.getElementById('character-rank');
    
    if (!totalExpEl || !availableExpEl || !rankEl) {
        // Элементы еще не загружены, пропускаем обновление
        return;
    }
    
    // Обновляем отображение опыта
    totalExpEl.textContent = character.experience.total || 0;
    availableExpEl.textContent = character.experience.available || 0;
    
    // Обновляем ранг
    const appliedAdvancements = getAppliedAdvancementsCount();
    const rank = calculateRank(appliedAdvancements);
    if (rankEl) {
        rankEl.textContent = rank;
    }
    
    // Отображаем повышения
    renderAdvancements();
    
    // Обновляем состояние кнопки добавления черты (может быть доступно повышение)
    updateAddTraitButton();
    
    // Обновляем модальное окно черт, если оно открыто (для пересчета доступности)
    if (window.updateTraitModalIfOpen) window.updateTraitModalIfOpen();
    
    // Валидация персонажа
    validateCharacter();
}

// Отображение повышений
function renderAdvancements() {
    const container = document.getElementById('advancements-list');
    if (!container) return;
    
    const appliedCount = getAppliedAdvancementsCount();
    const pendingAdvancements = character.advancements.filter(a => !a.applied);
    
    if (character.advancements.length === 0) {
        container.innerHTML = '<p class="cc-empty">Нет доступных повышений</p>';
        document.getElementById('use-advancement-btn').style.display = 'none';
        return;
    }
    
    container.innerHTML = character.advancements.map((advancement, index) => {
        const isApplied = advancement.applied;
        const statusClass = isApplied ? 'applied' : 'pending';
        const statusText = isApplied ? 'Применено' : 'Ожидает применения';
        const advancementNumber = index + 1;
        
        let description = '';
        if (isApplied && advancement.type) {
            description = `${advancement.type}: ${advancement.description || ''}`;
        }
        
        return `
            <div class="advancement-card">
                <div class="advancement-info">
                    <div>
                        <span class="advancement-number">Повышение #${advancementNumber}</span>
                        <span class="advancement-status ${statusClass}">${statusText}</span>
                    </div>
                    ${description ? `<div class="cc-info">${description}</div>` : ''}
                </div>
                <div class="advancement-actions">
                    ${!isApplied ? `
                        <button class="btn-advancement-apply" data-index="${index}">Применить</button>
                    ` : ''}
                    ${!isApplied ? `
                        <button class="btn-advancement-remove" data-index="${index}">Удалить</button>
                    ` : `
                        <button class="btn-advancement-remove" data-index="${index}" title="Удалить примененное повышение (отменит его эффекты)">Удалить</button>
                    `}
                </div>
            </div>
        `;
    }).join('');
    
    // Обработчики для кнопок применения
    container.querySelectorAll('.btn-advancement-apply').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            openAdvancementModal(index);
        });
    });
    
    // Обработчики для кнопок удаления
    container.querySelectorAll('.btn-advancement-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            removeAdvancement(index);
        });
    });
    
    // Показываем кнопку использования повышения, если есть непримененные
    const useBtn = document.getElementById('use-advancement-btn');
    if (useBtn) {
        useBtn.style.display = pendingAdvancements.length > 0 ? 'inline-block' : 'none';
    }
}

// Удаление повышения
function removeAdvancement(index) {
    const advancement = character.advancements[index];
    if (!advancement) return;
    
    if (advancement.applied) {
        // Если повышение применено, нужно отменить его эффекты
        const confirmMessage = `Вы уверены, что хотите удалить примененное повышение "${advancement.description || 'Повышение #' + (index + 1)}"?\n\nЭто отменит все эффекты этого повышения (черта будет удалена, навык/характеристика будут понижены).`;
        
        if (!confirm(confirmMessage)) {
            return;
        }
        
        // Отменяем эффекты повышения
        revertAdvancement(advancement);
    } else {
        if (!confirm('Вы уверены, что хотите удалить это повышение?')) {
            return;
        }
    }
    
    character.advancements.splice(index, 1);
    updateExperienceAndAdvancements();
    renderDevelopment();
}

// Отмена эффектов примененного повышения
function revertAdvancement(advancement) {
    if (!advancement || !advancement.applied) return;
    
    switch(advancement.type) {
        case 'trait':
            // Удаляем черту, если она была добавлена через это повышение
            // Находим черту по описанию
            if (advancement.description && advancement.description.startsWith('Черта: ')) {
                const traitName = advancement.description.replace('Черта: ', '');
                const trait = character.starting_traits.find(t => t.name === traitName);
                if (trait) {
                    character.starting_traits = character.starting_traits.filter(t => t.uuid !== trait.uuid);
                    renderSelectedTraits();
                }
            }
            break;
            
        case 'skill_one':
        case 'skill_two':
            // Понижаем навыки
            if (advancement.description && advancement.description.includes('→')) {
                // Извлекаем информацию о навыках из описания
                const skillMatches = advancement.description.match(/([^:]+):\s*([d\d+]+)\s*→\s*([d\d+]+)/g);
                if (skillMatches) {
                    skillMatches.forEach(match => {
                        const parts = match.match(/([^:]+):\s*([d\d+]+)\s*→\s*([d\d+]+)/);
                        if (parts) {
                            const skillName = parts[1].trim().replace(/"/g, '');
                            const oldValue = parts[2];
                            const skill = character.skills.find(s => s.name === skillName);
                            if (skill && skill.value !== oldValue) {
                                // Понижаем навык обратно
                                skill.value = oldValue;
                                skill.base_value = oldValue;
                                const charName = attributeMap[allSkills.find(s => s.uuid === skill.uuid)?.attribute] || 'смекалка';
                                updateSkillDisplay(skill.uuid);
                                renderSkillsForCharacteristic(charName);
                            }
                        }
                    });
                }
            }
            updateSkillPoints();
            break;
            
        case 'attribute':
            // Понижаем характеристику
            if (advancement.description && advancement.description.includes('→')) {
                const parts = advancement.description.match(/Характеристика\s+([^:]+):\s*([d\d+]+)\s*→\s*([d\d+]+)/);
                if (parts) {
                    const charDisplayName = parts[1].trim();
                    const oldValue = parts[2];
                    const charNameMap = {
                        'Сила': 'сила',
                        'Ловкость': 'ловкость',
                        'Выносливость': 'выносливость',
                        'Смекалка': 'смекалка',
                        'Характер': 'характер'
                    };
                    const charName = charNameMap[charDisplayName];
                    if (charName && character.characteristics[charName]) {
                        const char = character.characteristics[charName];
                        if (char.value !== oldValue) {
                            char.base_value = oldValue;
                            updateCharacteristicDisplay(charName);
                            updateCharacteristicPoints();
                            renderSkillsForCharacteristic(charName);
                        }
                    }
                }
            }
            break;
            
        case 'remove_flaw':
            // Восстанавливаем изъян (это сложнее, так как нужно знать, какой именно изъян был удален)
            // Пока просто пропускаем - пользователь может добавить изъян обратно вручную
            break;
    }
    
    // Пересчитываем производные параметры
    calculateDerivedStatistics();
    updateDerivedStatisticsDisplay();
}

// Открытие модального окна для применения повышения
let currentAdvancementIndex = null;

function openAdvancementModal(advancementIndex) {
    currentAdvancementIndex = advancementIndex;
    const modal = document.getElementById('advancement-modal');
    modal.style.display = 'block';
    
    // Настраиваем обработчики для кнопок выбора опций
    setupAdvancementOptions();
}

// Настройка обработчиков для опций повышения
function setupAdvancementOptions() {
    const modal = document.getElementById('advancement-modal');
    const optionButtons = modal.querySelectorAll('.advancement-option-btn');
    
    optionButtons.forEach(btn => {
        btn.onclick = () => {
            const type = btn.dataset.type;
            applyAdvancementOption(type);
        };
    });
}

// Применение опции повышения
function applyAdvancementOption(type) {
    if (currentAdvancementIndex === null) return;
    
    const advancement = character.advancements[currentAdvancementIndex];
    if (!advancement || advancement.applied) return;
    
    let description = '';
    let applied = false;
    
    switch(type) {
        case 'trait':
            // Открываем модальное окно выбора черты
            traitModalFromFlaws = false;
            // Сохраняем информацию о том, что это повышение
            advancement.type = 'trait';
            advancement.pending_action = 'select_trait';
            // Закрываем модальное окно повышения
            document.getElementById('advancement-modal').style.display = 'none';
            // Открываем модальное окно черт
            openTraitModal();
            return; // Выходим, так как выбор черты будет обработан отдельно
            
        case 'skill_one':
            // Открываем модальное окно выбора навыка для повышения на одну ступень
            openSkillForAdvancementModal('one');
            document.getElementById('advancement-modal').style.display = 'none';
            advancement.type = 'skill_one';
            advancement.pending_action = 'select_skill_one';
            return;
            
        case 'skill_two':
            // Открываем модальное окно выбора двух навыков
            openSkillForAdvancementModal('two');
            document.getElementById('advancement-modal').style.display = 'none';
            advancement.type = 'skill_two';
            advancement.pending_action = 'select_skill_two';
            return;
            
        case 'attribute':
            // Открываем модальное окно выбора характеристики
            openAttributeForAdvancementModal();
            document.getElementById('advancement-modal').style.display = 'none';
            advancement.type = 'attribute';
            advancement.pending_action = 'select_attribute';
            return;
            
        case 'remove_flaw':
            // Открываем модальное окно выбора изъяна для удаления
            openFlawForAdvancementModal();
            document.getElementById('advancement-modal').style.display = 'none';
            advancement.type = 'remove_flaw';
            advancement.pending_action = 'select_flaw';
            return;
    }
    
    // Если дошли сюда, значит опция применена напрямую
    advancement.applied = true;
    advancement.description = description;
    
    updateExperienceAndAdvancements();
    renderDevelopment();
    document.getElementById('advancement-modal').style.display = 'none';
    currentAdvancementIndex = null;
}

// Проверка, можно ли повысить характеристику (раз в ранг)
function canIncreaseAttribute() {
    const appliedAdvancements = getAppliedAdvancementsCount();
    const rank = calculateRank(appliedAdvancements);
    
    // Подсчитываем, сколько раз уже повышали характеристики в текущем ранге
    const rankRanges = {
        'Новичок': [0, 3],
        'Закалённый': [4, 7],
        'Ветеран': [8, 11],
        'Герой': [12, 15],
        'Легенда': [16, Infinity]
    };
    
    const [min, max] = rankRanges[rank];
    const advancementsInRank = character.advancements
        .filter((a, i) => a.applied && a.type === 'attribute' && i >= min && i <= max)
        .length;
    
    // В ранге можно повысить характеристику только один раз
    // Для Легенды можно повышать каждое второе повышение
    if (rank === 'Легенда') {
        return (appliedAdvancements - advancementsInRank) % 2 === 0;
    }
    
    return advancementsInRank === 0;
}

// Открытие модального окна для выбора навыка при повышении
function openSkillForAdvancementModal(mode) {
    // Используем существующее модальное окно навыков
    document.getElementById('skill-modal').style.display = 'block';
    
    // Сохраняем режим для обработки выбора
    window.advancementSkillMode = mode;
    window.advancementSkillCount = 0;
    window.advancementSelectedSkills = [];
    
    // Рендерим модальное окно с учетом режима
    renderSkillModalForAdvancement(mode);
}

// Рендеринг модального окна навыков для повышения
function renderSkillModalForAdvancement(mode) {
    const container = document.getElementById('skill-modal-list');
    const searchInput = document.getElementById('skill-modal-search');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    
    let filtered = allSkills.filter(skill => {
        if (!searchTerm) return true;
        return skill.name.toLowerCase().includes(searchTerm) ||
               skill.name_en.toLowerCase().includes(searchTerm);
    });
    
    // Фильтруем навыки по условиям в зависимости от режима
    if (mode === 'one') {
        // Показываем только навыки, которые равны или выше связанной характеристики
        filtered = filtered.filter(skill => {
            const charName = attributeMap[skill.attribute] || 'смекалка';
            const charValue = character.characteristics[charName]?.value || 'd4';
            const charPoints = getDiePoints(charValue);
            
            const existingSkill = character.skills.find(s => s.uuid === skill.uuid);
            const skillValue = existingSkill ? (existingSkill.value || 'd4') : 'd4';
            const skillPoints = getDiePoints(skillValue);
            
            return skillPoints >= charPoints;
        });
    } else if (mode === 'two') {
        // Показываем только навыки, которые ниже связанной характеристики
        filtered = filtered.filter(skill => {
            const charName = attributeMap[skill.attribute] || 'смекалка';
            const charValue = character.characteristics[charName]?.value || 'd4';
            const charPoints = getDiePoints(charValue);
            
            const existingSkill = character.skills.find(s => s.uuid === skill.uuid);
            const skillValue = existingSkill ? (existingSkill.value || 'd4') : 'd4';
            const skillPoints = getDiePoints(skillValue);
            
            return skillPoints < charPoints;
        });
    }
    
    container.innerHTML = filtered.map(skill => {
        const attribute = attributeMap[skill.attribute] || 'смекалка';
        const existingSkill = character.skills.find(s => s.uuid === skill.uuid);
        const currentValue = existingSkill ? (existingSkill.value || 'd4') : 'd4';
        const charName = attributeMap[skill.attribute] || 'смекалка';
        const charValue = character.characteristics[charName]?.value || 'd4';
        
        return `
            <div class="modal-item" data-uuid="${skill.uuid}" data-attribute="${attribute}">
                <div class="modal-item-header">
                    <div class="modal-item-name">${skill.name}</div>
                    <div class="modal-item-details">${skill.attribute}</div>
                </div>
                <div class="modal-item-description">${skill.description}</div>
                <div class="cc-info">
                    Текущее значение: ${currentValue} (характеристика: ${charValue})
                </div>
            </div>
        `;
    }).join('');
    
    if (filtered.length === 0) {
        container.innerHTML = `<p class="cc-empty">${
            mode === 'one'
                ? 'Нет навыков, которые равны или выше связанной характеристики'
                : 'Нет навыков, которые ниже связанной характеристики'
        }</p>`;
    }
    
    // Обработчики клика
    container.querySelectorAll('.modal-item').forEach(item => {
        item.addEventListener('click', () => {
            const skillUuid = item.dataset.uuid;
            const attribute = item.dataset.attribute;
            const skill = allSkills.find(s => s.uuid === skillUuid);
            applySkillAdvancement(skillUuid, attribute, skill);
            document.getElementById('skill-modal').style.display = 'none';
            if (searchInput) searchInput.value = '';
        });
    });
}

// Открытие модального окна для выбора характеристики при повышении
function openAttributeForAdvancementModal() {
    if (!canIncreaseAttribute()) {
        alert('Вы уже повысили характеристику в этом ранге. Можно повысить характеристику только один раз за ранг.');
        return;
    }
    
    // Создаем простое модальное окно для выбора характеристики
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'attribute-advancement-modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close">&times;</span>
            <h2>Выберите характеристику для повышения</h2>
            <div class="modal-list">
                ${Object.keys(character.characteristics)
                    .filter(key => key !== 'total_points_available' && key !== 'total_points_spent')
                    .map(charName => {
                        const char = character.characteristics[charName];
                        const charDisplayName = {
                            'сила': 'Сила',
                            'ловкость': 'Ловкость',
                            'выносливость': 'Выносливость',
                            'смекалка': 'Смекалка',
                            'характер': 'Характер'
                        }[charName] || charName;
                        return `
                            <div class="modal-item" data-char="${charName}">
                                <div class="modal-item-header">
                                    <div class="modal-item-name">${charDisplayName}</div>
                                    <div class="modal-item-details">Текущее значение: ${char.value}</div>
                                </div>
                            </div>
                        `;
                    }).join('')}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Обработчики
    modal.querySelector('.close').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    modal.querySelectorAll('.modal-item').forEach(item => {
        item.addEventListener('click', () => {
            const charName = item.dataset.char;
            applyAttributeAdvancement(charName);
            document.body.removeChild(modal);
        });
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
}

// Применение повышения характеристики
function applyAttributeAdvancement(charName) {
    const pendingAdvancement = character.advancements.find(a => 
        !a.applied && a.pending_action === 'select_attribute'
    );
    
    if (!pendingAdvancement) return;
    
    const char = character.characteristics[charName];
    const oldValue = char.base_value || 'd4';
    
    // Проверяем максимальное значение
    if (!canIncreaseValue(oldValue, true)) {
        alert('Характеристика уже имеет максимальное значение (d12)');
        return;
    }
    
    const newValue = increaseDieValue(oldValue);
    
    if (newValue && newValue !== oldValue) {
        char.base_value = newValue;
        updateCharacteristicDisplay(charName);
        updateCharacteristicPoints();
        renderSkillsForCharacteristic(charName);
        
        const charDisplayName = {
            'сила': 'Сила',
            'ловкость': 'Ловкость',
            'выносливость': 'Выносливость',
            'смекалка': 'Смекалка',
            'характер': 'Характер'
        }[charName] || charName;
        
        pendingAdvancement.applied = true;
        pendingAdvancement.type = 'attribute';
        pendingAdvancement.description = `Характеристика ${charDisplayName}: ${oldValue} → ${newValue}`;
        pendingAdvancement.pending_action = undefined;
        
        updateExperienceAndAdvancements();
        renderDevelopment();
        calculateDerivedStatistics();
        updateDerivedStatisticsDisplay();
    }
}

// Открытие модального окна для выбора изъяна при повышении
function openFlawForAdvancementModal() {
    // Создаем модальное окно для выбора изъяна для удаления
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'flaw-advancement-modal';
    modal.style.display = 'block';
    
    // Фильтруем только те изъяны, которые есть у персонажа
    const characterFlaws = character.starting_flaws.filter(f => !f.from_race);
    
    if (characterFlaws.length === 0) {
        alert('У персонажа нет изъянов для удаления');
        return;
    }
    
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close">&times;</span>
            <h2>Выберите изъян для удаления</h2>
            <p>Можно удалить только МЕЛКИЙ изъян или уменьшить КРУПНЫЙ до МЕЛКОГО</p>
            <div class="modal-list">
                ${characterFlaws.map(flaw => {
                    const flawData = allFlaws.find(f => f.uuid === flaw.uuid);
                    const selectedType = flaw.selected_type || (flaw.type.includes('крупный') ? 'крупный' : 'мелкий');
                    const canRemove = selectedType === 'мелкий' || flaw.type.includes('крупный');
                    
                    return `
                        <div class="modal-item" data-uuid="${flaw.uuid}" data-can-remove="${canRemove}">
                            <div class="modal-item-header">
                                <div class="modal-item-name">${flaw.name} (${selectedType})</div>
                            </div>
                            ${flawData ? `<div class="modal-item-description">${flawData.description}</div>` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Обработчики
    modal.querySelector('.close').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    modal.querySelectorAll('.modal-item').forEach(item => {
        item.addEventListener('click', () => {
            const flawUuid = item.dataset.uuid;
            const canRemove = item.dataset.canRemove === 'true';
            
            if (!canRemove) {
                alert('Можно удалить только МЕЛКИЙ изъян или уменьшить КРУПНЫЙ до МЕЛКОГО');
                return;
            }
            
            removeFlawForAdvancement(flawUuid);
            document.body.removeChild(modal);
        });
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
}

// Удаление изъяна через повышение
function removeFlawForAdvancement(flawUuid) {
    const flawIndex = character.starting_flaws.findIndex(f => f.uuid === flawUuid && !f.from_race);
    if (flawIndex === -1) return;
    
    const flaw = character.starting_flaws[flawIndex];
    const selectedType = flaw.selected_type || (flaw.type.includes('крупный') ? 'крупный' : 'мелкий');
    
    const pendingAdvancement = character.advancements.find(a => 
        !a.applied && a.pending_action === 'select_flaw'
    );
    
    if (!pendingAdvancement) return;
    
    if (selectedType === 'крупный' && flaw.type.includes('мелкий')) {
        // Уменьшаем крупный до мелкого
        flaw.selected_type = 'мелкий';
        flaw.points = 1;
        // Пересчитываем пункты изъянов
        updateFlawPoints();
        pendingAdvancement.applied = true;
        pendingAdvancement.type = 'remove_flaw';
        pendingAdvancement.description = `Изъян "${flaw.name}" уменьшен с КРУПНОГО до МЕЛКОГО`;
    } else if (selectedType === 'мелкий') {
        // Удаляем мелкий изъян
        character.starting_flaws.splice(flawIndex, 1);
        recalculateDerivedStatisticsFromFlaws();
        updateFlawPoints();
        pendingAdvancement.applied = true;
        pendingAdvancement.type = 'remove_flaw';
        pendingAdvancement.description = `Изъян "${flaw.name}" удален`;
    }
    
    pendingAdvancement.pending_action = undefined;
    
    updateExperienceAndAdvancements();
    renderDevelopment();
    renderSelectedFlaws();
    calculateDerivedStatistics();
    updateDerivedStatisticsDisplay();
}

// Применение повышения навыка
function applySkillAdvancement(skillUuid, attribute, skillData) {
    const pendingAdvancement = character.advancements.find(a => 
        !a.applied && (a.pending_action === 'select_skill_one' || a.pending_action === 'select_skill_two')
    );
    
    if (!pendingAdvancement) return;
    
    const mode = window.advancementSkillMode;
    
    if (mode === 'one') {
        // Повышение одного навыка на одну ступень (если равен или выше характеристики)
        const charName = attributeMap[skillData.attribute] || 'смекалка';
        const charValue = character.characteristics[charName]?.value || 'd4';
        const charPoints = getDiePoints(charValue);
        
        // Находим навык или добавляем его
        let skill = character.skills.find(s => s.uuid === skillUuid);
        if (!skill) {
            // Добавляем навык, если его нет
            skill = {
                uuid: skillUuid,
                name: skillData.name,
                name_en: skillData.name_en,
                value: 'd4',
                base_value: 'd4',
                points_spent: 0,
                is_base: skillData.is_base,
                from_race: false
            };
            character.skills.push(skill);
        }
        
        const skillPoints = getDiePoints(skill.value || 'd4');
        
        // Проверяем условие: навык должен быть равен или выше характеристики
        if (skillPoints < charPoints) {
            alert('Этот навык ниже связанной характеристики. Для повышения такого навыка используйте опцию "Увеличить два навыка на одну ступень"');
            return;
        }
        
        // Повышаем навык
        const oldValue = skill.value || 'd4';
        const newValue = increaseDieValue(oldValue);
        skill.value = newValue;
        skill.base_value = newValue;
        
                updateSkillDisplay(skillUuid);
                updateSkillPoints();
                renderSkillsForCharacteristic(charName);
                if (window.updateTraitModalIfOpen) window.updateTraitModalIfOpen();
        
        pendingAdvancement.applied = true;
        pendingAdvancement.type = 'skill_one';
        pendingAdvancement.description = `Навык "${skillData.name}": ${oldValue} → ${newValue}`;
        pendingAdvancement.pending_action = undefined;
        
        window.advancementSkillMode = undefined;
        
    } else if (mode === 'two') {
        // Повышение двух навыков на одну ступень (если ниже характеристик)
        if (!window.advancementSelectedSkills) {
            window.advancementSelectedSkills = [];
        }
        
        window.advancementSelectedSkills.push({
            uuid: skillUuid,
            attribute: attribute,
            skillData: skillData
        });
        
        if (window.advancementSelectedSkills.length < 2) {
            alert(`Выбран навык "${skillData.name}". Выберите еще один навык.`);
            return;
        }
        
        // Применяем повышение к обоим навыкам
        const skills = window.advancementSelectedSkills;
        const descriptions = [];
        
        skills.forEach(({uuid, attribute, skillData}) => {
            const charName = attributeMap[skillData.attribute] || 'смекалка';
            const charValue = character.characteristics[charName]?.value || 'd4';
            const charPoints = getDiePoints(charValue);
            
            let skill = character.skills.find(s => s.uuid === uuid);
            if (!skill) {
                skill = {
                    uuid: uuid,
                    name: skillData.name,
                    name_en: skillData.name_en,
                    value: 'd4',
                    base_value: 'd4',
                    points_spent: 0,
                    is_base: skillData.is_base,
                    from_race: false
                };
                character.skills.push(skill);
            }
            
            const skillPoints = getDiePoints(skill.value || 'd4');
            
            // Проверяем условие: навык должен быть ниже характеристики
            if (skillPoints >= charPoints) {
                alert(`Навык "${skillData.name}" равен или выше связанной характеристики. Для повышения такого навыка используйте опцию "Увеличить навык на одну ступень"`);
                window.advancementSelectedSkills = [];
                return;
            }
            
            const oldValue = skill.value || 'd4';
            const newValue = increaseDieValue(oldValue);
            skill.value = newValue;
            skill.base_value = newValue;
            
            descriptions.push(`${skillData.name}: ${oldValue} → ${newValue}`);
            
            updateSkillDisplay(uuid);
            renderSkillsForCharacteristic(charName);
        });
        
        updateSkillPoints();
        
        pendingAdvancement.applied = true;
        pendingAdvancement.type = 'skill_two';
        pendingAdvancement.description = `Навыки: ${descriptions.join(', ')}`;
        pendingAdvancement.pending_action = undefined;
        
        window.advancementSkillMode = undefined;
        window.advancementSelectedSkills = [];
    }
    
    updateExperienceAndAdvancements();
    renderDevelopment();
    calculateDerivedStatistics();
    updateDerivedStatisticsDisplay();
}
