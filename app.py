from flask import Flask, render_template, jsonify, request
import json
import uuid
import os

app = Flask(__name__)

# Пути к JSON файлам
DATA_DIR = os.path.dirname(os.path.abspath(__file__))
FLAWS_FILE = os.path.join(DATA_DIR, 'flaws.json')
SKILLS_FILE = os.path.join(DATA_DIR, 'skills.json')
TRAITS_FILE = os.path.join(DATA_DIR, 'traits.json')
RACES_FILE = os.path.join(DATA_DIR, 'races.json')
CHARACTERS_DIR = os.path.join(DATA_DIR, 'characters')

# Создаем директорию для персонажей, если её нет
os.makedirs(CHARACTERS_DIR, exist_ok=True)


def load_json(file_path):
    """Загружает JSON файл"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return []
    except json.JSONDecodeError:
        return []


def save_json(file_path, data):
    """Сохраняет данные в JSON файл"""
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


@app.route('/')
def index():
    """Главная страница"""
    return render_template('index.html')


@app.route('/api/flaws')
def get_flaws():
    """API: Получить все изъяны"""
    flaws = load_json(FLAWS_FILE)
    return jsonify(flaws)


@app.route('/api/skills')
def get_skills():
    """API: Получить все навыки"""
    skills = load_json(SKILLS_FILE)
    return jsonify(skills)


@app.route('/api/traits')
def get_traits():
    """API: Получить все черты"""
    traits = load_json(TRAITS_FILE)
    return jsonify(traits)


@app.route('/api/races')
def get_races():
    """API: Получить все расы"""
    races = load_json(RACES_FILE)
    return jsonify(races)


@app.route('/api/traits/<category>')
def get_traits_by_category(category):
    """API: Получить черты по категории"""
    traits = load_json(TRAITS_FILE)
    filtered = [t for t in traits if t.get('category') == category]
    return jsonify(filtered)


@app.route('/api/character', methods=['POST'])
def create_character():
    """API: Создать персонажа"""
    data = request.json
    
    # Генерируем UUID если его нет
    if not data.get('uuid'):
        data['uuid'] = str(uuid.uuid4())
    
    # Сохраняем персонажа
    char_file = os.path.join(CHARACTERS_DIR, f"{data['uuid']}.json")
    save_json(char_file, data)
    
    return jsonify({'success': True, 'uuid': data['uuid']})


@app.route('/api/character/<char_uuid>', methods=['GET'])
def get_character(char_uuid):
    """API: Получить персонажа по UUID"""
    char_file = os.path.join(CHARACTERS_DIR, f"{char_uuid}.json")
    character = load_json(char_file)
    if character:
        return jsonify(character)
    return jsonify({'error': 'Character not found'}), 404


@app.route('/api/character/<char_uuid>', methods=['PUT'])
def update_character(char_uuid):
    """API: Обновить персонажа"""
    data = request.json
    char_file = os.path.join(CHARACTERS_DIR, f"{char_uuid}.json")
    
    # Убеждаемся, что UUID совпадает
    data['uuid'] = char_uuid
    
    save_json(char_file, data)
    return jsonify({'success': True})


@app.route('/api/characters', methods=['GET'])
def list_characters():
    """API: Список всех персонажей"""
    characters = []
    if os.path.exists(CHARACTERS_DIR):
        for filename in os.listdir(CHARACTERS_DIR):
            if filename.endswith('.json'):
                char_file = os.path.join(CHARACTERS_DIR, filename)
                char_data = load_json(char_file)
                if char_data:
                    characters.append({
                        'uuid': char_data.get('uuid', ''),
                        'name': char_data.get('concept', {}).get('name', 'Безымянный'),
                        'created': os.path.getmtime(char_file)
                    })
    return jsonify(characters)


@app.route('/character/<char_uuid>')
def view_character(char_uuid):
    """Страница просмотра персонажа"""
    return render_template('character.html', char_uuid=char_uuid)


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=False, host='0.0.0.0', port=port)
