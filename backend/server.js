import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: ["http://localhost:3000", "https://reflefek.vercel.app", "https://reflefek-hzkt02zme-ercan-yarmacis-projects.vercel.app"],
        methods: ["GET", "POST"],
        credentials: true
    }
});

app.use(cors());
app.use(express.json());

// Game state
const rooms = new Map(); // roomId -> room data
const players = new Map(); // socketId -> player data
const userStats = new Map(); // playerName -> { totalPoints, gamesWon, gamesPlayed }

// Room structure:
// {
//   id: string,
//   name: string,
//   players: Map(socketId -> { id, name, score, ready, totalPoints }),
//   spectators: Set(socketId),
//   gameState: 'waiting' | 'ready' | 'playing' | 'finished',
//   currentNumber: number,
//   roundStartTime: timestamp,
//   winner: null | playerId,
//   messages: Array({ type: 'user'|'system'|'score', sender: string, text: string, timestamp: number })
// }

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Get list of rooms
    socket.on('getRooms', () => {
        const roomList = Array.from(rooms.values()).map(room => ({
            id: room.id,
            name: room.name,
            playerCount: room.players.size,
            gameState: room.gameState
        }));
        socket.emit('roomsList', roomList);
    });

    // Create a new room
    socket.on('createRoom', ({ roomName, playerName }) => {
        const roomId = `room_${Date.now()}`;
        const room = {
            id: roomId,
            name: roomName,
            players: new Map(),
            spectators: new Set(),
            gameState: 'waiting',
            currentNumber: null,
            roundStartTime: null,
            winner: null,
            messages: []
        };

        rooms.set(roomId, room);

        // Initialize user stats if needed
        if (!userStats.has(playerName)) {
            userStats.set(playerName, { totalPoints: 0, gamesWon: 0, gamesPlayed: 0 });
        }

        // Add creator as player
        room.players.set(socket.id, {
            id: socket.id,
            name: playerName,
            score: 0,
            ready: false,
            totalPoints: userStats.get(playerName).totalPoints
        });

        // System message
        room.messages.push({
            type: 'system',
            sender: 'System',
            text: `${playerName} created the room`,
            timestamp: Date.now()
        });

        players.set(socket.id, { roomId, role: 'player' });
        socket.join(roomId);

        socket.emit('roomCreated', { roomId, room: serializeRoom(room) });
        io.emit('roomsList', getRoomsList());

        console.log(`Room created: ${roomName} by ${playerName}`);
    });

    // Join room as player
    socket.on('joinRoom', ({ roomId, playerName }) => {
        const room = rooms.get(roomId);

        if (!room) {
            socket.emit('error', { message: 'Room not found' });
            return;
        }

        if (room.players.size >= 4) {
            socket.emit('error', { message: 'Room is full' });
            return;
        }

        // Initialize user stats if needed
        if (!userStats.has(playerName)) {
            userStats.set(playerName, { totalPoints: 0, gamesWon: 0, gamesPlayed: 0 });
        }

        room.players.set(socket.id, {
            id: socket.id,
            name: playerName,
            score: 0,
            ready: false,
            totalPoints: userStats.get(playerName).totalPoints
        });

        // System message
        room.messages.push({
            type: 'system',
            sender: 'System',
            text: `${playerName} joined the room`,
            timestamp: Date.now()
        });

        players.set(socket.id, { roomId, role: 'player' });
        socket.join(roomId);

        socket.emit('roomJoined', { roomId, room: serializeRoom(room) });
        io.to(roomId).emit('roomUpdate', serializeRoom(room));
        io.emit('roomsList', getRoomsList());

        console.log(`${playerName} joined room ${room.name}`);
    });

    // Join room as spectator
    socket.on('spectateRoom', ({ roomId }) => {
        const room = rooms.get(roomId);

        if (!room) {
            socket.emit('error', { message: 'Room not found' });
            return;
        }

        room.spectators.add(socket.id);
        players.set(socket.id, { roomId, role: 'spectator' });
        socket.join(roomId);

        socket.emit('spectatingRoom', { roomId, room: serializeRoom(room) });

        console.log(`Spectator joined room ${room.name}`);
    });

    // Player ready
    socket.on('playerReady', () => {
        const playerData = players.get(socket.id);
        if (!playerData || playerData.role !== 'player') return;

        const room = rooms.get(playerData.roomId);
        if (!room) return;

        const player = room.players.get(socket.id);
        if (player) {
            player.ready = true;
            console.log(`${player.name} is ready!`);

            io.to(room.id).emit('roomUpdate', serializeRoom(room));

            // Check if all players are ready
            const playersArray = Array.from(room.players.values());
            const allReady = playersArray.every(p => p.ready);

            console.log(`Room ${room.name}:`);
            playersArray.forEach(p => {
                console.log(`  - ${p.name}: ${p.ready ? 'READY' : 'NOT READY'}`);
            });
            console.log(`All ready: ${allReady}, Player count: ${room.players.size}`);

            if (allReady && room.players.size >= 2) {
                console.log('Starting game!');
                startGame(room);
            }
        }
    });

    // Player clicked
    socket.on('playerClick', ({ clickTime }) => {
        const playerData = players.get(socket.id);
        if (!playerData || playerData.role !== 'player') return;

        const room = rooms.get(playerData.roomId);
        if (!room || room.gameState !== 'playing') return;

        const player = room.players.get(socket.id);
        if (!player) return;

        // Award point
        player.score++;

        // Update user stats total points
        const stats = userStats.get(player.name);
        stats.totalPoints++;
        player.totalPoints = stats.totalPoints;

        // Score chat message
        room.messages.push({
            type: 'score',
            sender: 'System',
            text: `${player.name} scored! Round: ${player.score}/10, Total: ${stats.totalPoints} pts`,
            timestamp: Date.now()
        });

        io.to(room.id).emit('playerScored', {
            playerId: socket.id,
            playerName: player.name,
            score: player.score
        });

        io.to(room.id).emit('chatMessage', room.messages[room.messages.length - 1]);

        // Check win condition
        if (player.score >= 10) {
            room.gameState = 'finished';
            room.winner = socket.id;

            // Update user stats for win
            stats.gamesWon++;
            stats.gamesPlayed++;

            // Winner chat message
            room.messages.push({
                type: 'system',
                sender: 'System',
                text: `🏆 ${player.name} wins! Career: ${stats.gamesWon}W-${stats.gamesPlayed - stats.gamesWon}L, ${stats.totalPoints} total pts`,
                timestamp: Date.now()
            });

            io.to(room.id).emit('chatMessage', room.messages[room.messages.length - 1]);

            // Update all other players' games played count
            room.players.forEach((p, pid) => {
                if (pid !== socket.id) {
                    const pStats = userStats.get(p.name);
                    pStats.gamesPlayed++;
                }
            });

            io.to(room.id).emit('gameFinished', {
                winner: {
                    id: socket.id,
                    name: player.name,
                    score: player.score
                },
                room: serializeRoom(room)
            });
        } else {
            // Next round
            setTimeout(() => {
                if (room.gameState !== 'finished') {
                    startRound(room);
                }
            }, 2000);
        }
    });

    // Restart game
    socket.on('restartGame', () => {
        const playerData = players.get(socket.id);
        if (!playerData) return;

        const room = rooms.get(playerData.roomId);
        if (!room) return;

        // Reset scores and state
        room.players.forEach(player => {
            player.score = 0;
            player.ready = false;
        });

        room.gameState = 'waiting';
        room.currentNumber = null;
        room.winner = null;

        io.to(room.id).emit('roomUpdate', serializeRoom(room));
    });

    // Chat message
    socket.on('chatMessage', ({ message }) => {
        const playerData = players.get(socket.id);
        if (!playerData) return;

        const room = rooms.get(playerData.roomId);
        if (!room) return;

        // Get player or spectator name
        let senderName = 'Unknown';
        if (playerData.role === 'player') {
            const player = room.players.get(socket.id);
            if (player) senderName = player.name;
        } else {
            senderName = 'Spectator';
        }

        const chatMsg = {
            type: 'user',
            sender: senderName,
            text: message,
            timestamp: Date.now()
        };

        room.messages.push(chatMsg);

        // Keep only last 100 messages
        if (room.messages.length > 100) {
            room.messages.shift();
        }

        io.to(room.id).emit('chatMessage', chatMsg);
    });

    // Leave room
    socket.on('leaveRoom', () => {
        handleDisconnect(socket);
    });

    // Disconnect
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        handleDisconnect(socket);
    });
});

function startGame(room) {
    room.gameState = 'ready';
    io.to(room.id).emit('gameStarting', { countdown: 3 });

    setTimeout(() => {
        room.gameState = 'playing';
        io.to(room.id).emit('gameStarted');
        startRound(room);
    }, 3000);
}

function startRound(room) {
    if (room.gameState !== 'playing') return;

    const randomDelay = Math.random() * 3000 + 1000; // 1-4 seconds

    io.to(room.id).emit('waitingForNumber');

    setTimeout(() => {
        if (room.gameState !== 'playing') return;

        const randomNumber = Math.floor(Math.random() * 100) + 1;
        room.currentNumber = randomNumber;
        room.roundStartTime = Date.now();

        io.to(room.id).emit('numberAppeared', { number: randomNumber });
    }, randomDelay);
}

function handleDisconnect(socket) {
    const playerData = players.get(socket.id);

    if (playerData) {
        const room = rooms.get(playerData.roomId);

        if (room) {
            if (playerData.role === 'player') {
                room.players.delete(socket.id);

                // If no players left, delete room
                if (room.players.size === 0) {
                    rooms.delete(room.id);
                    console.log(`Room ${room.name} deleted (no players)`);
                } else {
                    io.to(room.id).emit('roomUpdate', serializeRoom(room));
                }
            } else if (playerData.role === 'spectator') {
                room.spectators.delete(socket.id);
            }

            io.emit('roomsList', getRoomsList());
        }

        players.delete(socket.id);
    }
}

function serializeRoom(room) {
    return {
        id: room.id,
        name: room.name,
        players: Array.from(room.players.values()),
        spectatorCount: room.spectators.size,
        gameState: room.gameState,
        currentNumber: room.currentNumber,
        winner: room.winner ? room.players.get(room.winner) : null,
        messages: room.messages || []
    };
}

function getRoomsList() {
    return Array.from(rooms.values()).map(room => ({
        id: room.id,
        name: room.name,
        playerCount: room.players.size,
        gameState: room.gameState
    }));
}

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
