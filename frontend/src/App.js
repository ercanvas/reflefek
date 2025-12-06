import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Lobby from './components/Lobby';
import GameRoom from './components/GameRoom';
import SpectatorView from './components/SpectatorView';
import './index.css';

const socket = io('http://localhost:3001');

function App() {
  const [view, setView] = useState('lobby'); // 'lobby', 'game', 'spectator'
  const [roomId, setRoomId] = useState(null);
  const [roomData, setRoomData] = useState(null);
  const [playerName, setPlayerName] = useState('');

  useEffect(() => {
    socket.on('roomCreated', ({ roomId, room }) => {
      setRoomId(roomId);
      setRoomData(room);
      setView('game');
    });

    socket.on('roomJoined', ({ roomId, room }) => {
      setRoomId(roomId);
      setRoomData(room);
      setView('game');
    });

    socket.on('spectatingRoom', ({ roomId, room }) => {
      setRoomId(roomId);
      setRoomData(room);
      setView('spectator');
    });

    socket.on('roomUpdate', (room) => {
      setRoomData(room);
    });

    socket.on('error', ({ message }) => {
      alert(message);
    });

    return () => {
      socket.off('roomCreated');
      socket.off('roomJoined');
      socket.off('spectatingRoom');
      socket.off('roomUpdate');
      socket.off('error');
    };
  }, []);

  const handleCreateRoom = (roomName, playerName) => {
    setPlayerName(playerName);
    socket.emit('createRoom', { roomName, playerName });
  };

  const handleJoinRoom = (roomId, playerName) => {
    setPlayerName(playerName);
    socket.emit('joinRoom', { roomId, playerName });
  };

  const handleSpectateRoom = (roomId) => {
    socket.emit('spectateRoom', { roomId });
  };

  const handleLeaveRoom = () => {
    socket.emit('leaveRoom');
    setView('lobby');
    setRoomId(null);
    setRoomData(null);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">⚡ REFLEFEK</h1>
        <p className="app-subtitle">Hızlı Refleks Yarışması</p>
      </header>

      {view === 'lobby' && (
        <Lobby
          socket={socket}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onSpectateRoom={handleSpectateRoom}
        />
      )}

      {view === 'game' && roomData && (
        <GameRoom
          socket={socket}
          roomId={roomId}
          roomData={roomData}
          playerName={playerName}
          onLeaveRoom={handleLeaveRoom}
        />
      )}

      {view === 'spectator' && roomData && (
        <SpectatorView
          socket={socket}
          roomId={roomId}
          roomData={roomData}
          onLeaveRoom={handleLeaveRoom}
        />
      )}
    </div>
  );
}

export default App;
