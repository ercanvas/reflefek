import React, { useState, useEffect } from 'react';
import Chat from './Chat';
import './chat-layout.css';

function SpectatorView({ socket, roomId, roomData, onLeaveRoom }) {
    const [localRoomData, setLocalRoomData] = useState(roomData);

    // Update local room data when prop changes
    useEffect(() => {
        setLocalRoomData(roomData);
    }, [roomData]);

    useEffect(() => {
        socket.on('roomUpdate', (room) => {
            setLocalRoomData(room);
        });

        socket.on('playerScored', ({ playerId, score }) => {
            // Update the player's score in localRoomData
            setLocalRoomData(prev => {
                const updatedPlayers = prev.players.map(player =>
                    player.id === playerId
                        ? { ...player, score: score }
                        : player
                );
                return { ...prev, players: updatedPlayers };
            });
        });

        socket.on('gameFinished', ({ winner }) => {
            setLocalRoomData(prev => ({ ...prev, gameState: 'finished', winner }));
        });

        return () => {
            socket.off('roomUpdate');
            socket.off('playerScored');
            socket.off('gameFinished');
        };
    }, [socket]);

    return (
        <div className="spectator-view">
            <div className="spectator-header">
                <h2 className="room-title">👁️ İzleme Modu: {localRoomData.name}</h2>
                <button className="btn btn-danger btn-sm" onClick={onLeaveRoom}>
                    Ayrıl
                </button>
            </div>

            <div className="spectator-content-with-chat">
                <div className="spectator-main">
                    <div className="spectator-info">
                        <p className="info-text">
                            Bu odayı izliyorsunuz. Oyuna katılamaz ve puan alamazsınız.
                        </p>
                    </div>

                    <div className="scoreboard spectator-scoreboard">
                        <h3 className="scoreboard-title">
                            {localRoomData.gameState === 'waiting' ? 'Oyuncular Bekleniyor' :
                                localRoomData.gameState === 'playing' ? '🎮 Oyun Devam Ediyor' :
                                    localRoomData.gameState === 'finished' ? '🏁 Oyun Bitti' : 'Oyun Başlıyor'}
                        </h3>

                        <div className="player-list">
                            {localRoomData.players.length === 0 ? (
                                <p className="empty-text">Henüz oyuncu yok</p>
                            ) : (
                                localRoomData.players.map((player) => (
                                    <div key={player.id} className="player-item spectator-item">
                                        <span className="player-name">
                                            {player.name}
                                            {player.totalPoints > 0 && (
                                                <span className="total-points-badge">{player.totalPoints} pts</span>
                                            )}
                                        </span>
                                        <div className="player-stats">
                                            <span className="player-score">{player.score}/10</span>
                                            {localRoomData.gameState === 'waiting' && (
                                                <span className={`ready-indicator ${player.ready ? 'ready' : ''}`}>
                                                    {player.ready ? '✓ Hazır' : '○ Bekliyor'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {localRoomData.gameState === 'finished' && localRoomData.winner && (
                            <div className="winner-announcement">
                                <h2>🏆 {localRoomData.winner.name} KAZANDI! 🏆</h2>
                                <p>Final Skoru: {localRoomData.winner.score} puan</p>
                            </div>
                        )}

                        {localRoomData.currentNumber !== null && (
                            <div className="spectator-number-display">
                                <p>Gösterilen Sayı:</p>
                                <div className="spectator-number">{localRoomData.currentNumber}</div>
                                <p className="spectator-hint">Oyuncular {localRoomData.currentNumber} kere tıklamalı!</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Chat */}
                <div className="chat-sidebar">
                    <Chat socket={socket} roomData={localRoomData} />
                </div>
            </div>
        </div>
    );
}

export default SpectatorView;
