import React, { useState, useEffect } from 'react';
import './click-counter.css';

function GameRoom({ socket, roomId, roomData, playerName, onLeaveRoom }) {
    const [currentNumber, setCurrentNumber] = useState(null);
    const [clickCount, setClickCount] = useState(0);
    const [waiting, setWaiting] = useState(false);
    const [countdown, setCountdown] = useState(null);
    const [flashMessage, setFlashMessage] = useState('');
    const [localRoomData, setLocalRoomData] = useState(roomData);

    // Update local room data when prop changes
    useEffect(() => {
        setLocalRoomData(roomData);
    }, [roomData]);

    useEffect(() => {
        socket.on('gameStarting', ({ countdown: countdownValue }) => {
            setCountdown(countdownValue);
            setLocalRoomData(prev => ({ ...prev, gameState: 'ready' }));
            const interval = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        return null;
                    }
                    return prev - 1;
                });
            }, 1000);
        });

        socket.on('gameStarted', () => {
            setCountdown(null);
            setWaiting(true);
            setLocalRoomData(prev => ({ ...prev, gameState: 'playing' }));
        });

        socket.on('waitingForNumber', () => {
            setCurrentNumber(null);
            setClickCount(0);
            setWaiting(true);
        });

        socket.on('numberAppeared', ({ number }) => {
            setCurrentNumber(number);
            setClickCount(0);
            setWaiting(false);
        });

        socket.on('playerScored', ({ playerId, playerName: scorerName, score }) => {
            setFlashMessage(`${scorerName} KAZANDI! 🎯`);
            setTimeout(() => setFlashMessage(''), 2000);

            // Update the player's score in localRoomData
            setLocalRoomData(prev => {
                const updatedPlayers = prev.players.map(player =>
                    player.id === playerId
                        ? { ...player, score: score }
                        : player
                );
                return { ...prev, players: updatedPlayers };
            });

            setCurrentNumber(null);
            setClickCount(0);
            setWaiting(true);
        });

        socket.on('gameFinished', ({ winner }) => {
            if (winner.id === socket.id) {
                setFlashMessage(`🏆 KAZANDIN! 🏆`);
            } else {
                setFlashMessage(`${winner.name} KAZANDI!`);
            }
            setLocalRoomData(prev => ({ ...prev, gameState: 'finished', winner }));
        });

        socket.on('roomUpdate', (room) => {
            setLocalRoomData(room);
        });

        return () => {
            socket.off('gameStarting');
            socket.off('gameStarted');
            socket.off('waitingFor Number');
            socket.off('numberAppeared');
            socket.off('playerScored');
            socket.off('gameFinished');
            socket.off('roomUpdate');
        };
    }, [socket]);

    const handleReady = () => {
        socket.emit('playerReady');
    };

    const handleClick = () => {
        if (currentNumber !== null && !waiting) {
            const newCount = clickCount + 1;
            setClickCount(newCount);

            // Check if we completed the required clicks
            if (newCount >= currentNumber) {
                socket.emit('playerClick', { clickTime: Date.now() });
            }
        }
    };

    const handleRestart = () => {
        socket.emit('restartGame');
        setCurrentNumber(null);
        setClickCount(0);
        setWaiting(false);
        setFlashMessage('');
    };

    const myPlayer = localRoomData.players.find((p) => p.name === playerName);
    const isReady = myPlayer?.ready || false;
    const canStart = localRoomData.players.length >= 2;
    const remainingClicks = currentNumber ? currentNumber - clickCount : 0;

    return (
        <div className="game-room">
            <div className="game-header">
                <h2 className="room-title">{localRoomData.name}</h2>
                <button className="btn btn-danger btn-sm" onClick={onLeaveRoom}>
                    Ayrıl
                </button>
            </div>

            <div className="game-container">
                {/* Scoreboard */}
                <div className="scoreboard">
                    <h3 className="scoreboard-title">Skor Tablosu</h3>
                    <div className="player-list">
                        {localRoomData.players.map((player) => (
                            <div
                                key={player.id}
                                className={`player-item ${player.id === socket.id ? 'current-player' : ''}`}
                            >
                                <span className="player-name">
                                    {player.name} {player.id === socket.id ? '(Sen)' : ''}
                                </span>
                                <span className="player-score">{player.score}/10</span>
                                {localRoomData.gameState === 'waiting' && (
                                    <span className={`ready-indicator ${player.ready ? 'ready' : ''}`}>
                                        {player.ready ? '✓' : '○'}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Game Area */}
                <div className="game-area">
                    {localRoomData.gameState === 'waiting' && (
                        <div className="waiting-screen">
                            <h2>Oyuncular Bekleniyor...</h2>
                            <p>En az 2 oyuncu gerekli</p>
                            {!isReady && canStart && (
                                <button className="btn btn-primary btn-large" onClick={handleReady}>
                                    Hazırım!
                                </button>
                            )}
                            {isReady && (
                                <p className="status-text">Diğer oyuncular bekleniyor...</p>
                            )}
                        </div>
                    )}

                    {countdown !== null && (
                        <div className="countdown-screen">
                            <h1 className="countdown-number">{countdown}</h1>
                            <p>Oyun başlıyor...</p>
                        </div>
                    )}

                    {localRoomData.gameState === 'playing' && (
                        <div className="play-screen">
                            {waiting && !currentNumber && (
                                <div className="waiting-number">
                                    <div className="spinner"></div>
                                    <p>Sayı gösterilmeyi bekliyor...</p>
                                </div>
                            )}

                            {currentNumber !== null && (
                                <div className="number-display">
                                    <div className="click-counter">
                                        <span className="counter-text">{clickCount} / {currentNumber}</span>
                                        <span className="remaining-text">{remainingClicks} tıklama kaldı</span>
                                    </div>
                                    <div className="number-circle" onClick={handleClick}>
                                        {currentNumber}
                                    </div>
                                    <p className="click-instruction">
                                        {currentNumber} KERE TIKLA!
                                    </p>
                                </div>
                            )}

                            {flashMessage && (
                                <div className="flash-message">
                                    {flashMessage}
                                </div>
                            )}
                        </div>
                    )}

                    {localRoomData.gameState === 'finished' && (
                        <div className="finished-screen">
                            <h1 className="winner-announce">
                                {localRoomData.winner?.name} KAZANDI! 🏆
                            </h1>
                            <div className="final-scores">
                                <h3>Final Skorları:</h3>
                                {localRoomData.players.map((player) => (
                                    <div key={player.id} className="final-score-item">
                                        <span>{player.name}</span>
                                        <span>{player.score} puan</span>
                                    </div>
                                ))}
                            </div>
                            <button className="btn btn-primary btn-large" onClick={handleRestart}>
                                Yeniden Oyna
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default GameRoom;
