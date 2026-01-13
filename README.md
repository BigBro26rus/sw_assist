# Генератор персонажей для Savage Worlds

Веб-приложение для создания персонажей на основе правил Savage Worlds.

## Установка

1. Установите зависимости:
```bash
pip install -r requirements.txt
```

## Запуск

```bash
python app.py
```

Приложение будет доступно по адресу: http://localhost:5000

## Структура проекта

- `app.py` - Flask бэкенд с API endpoints
- `templates/index.html` - Главная страница создания персонажа
- `static/style.css` - Стили
- `static/app.js` - JavaScript логика
- `flaws.json` - База данных изъянов
- `skills.json` - База данных навыков
- `traits.json` - База данных черт
- `character_template.json` - Шаблон структуры персонажа
- `characters/` - Директория для сохранённых персонажей

## API Endpoints

- `GET /api/flaws` - Получить все изъяны
- `GET /api/skills` - Получить все навыки
- `GET /api/traits` - Получить все черты
- `GET /api/traits/<category>` - Получить черты по категории
- `POST /api/character` - Создать персонажа
- `GET /api/character/<uuid>` - Получить персонажа
- `PUT /api/character/<uuid>` - Обновить персонажа
- `GET /api/characters` - Список всех персонажей

## Функции

- Создание персонажа с выбором характеристик, навыков, изъянов и черт
- Автоматический подсчёт потраченных пунктов
- Поиск и фильтрация навыков, изъянов и черт
- Сохранение и загрузка персонажей
- Валидация правил создания персонажа
