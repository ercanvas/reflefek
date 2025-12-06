import React, { useState, useEffect } from 'react';

function Lobby({ socket, onCreateRoom, onJoinRoom, onSpectateRoom }) {
    const [rooms, setRooms] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [selectedRoomId, setSelectedRoomId] = useState(null);
    const [roomName, setRoomName] = useState('');
    const [playerName, setPlayerName] = useState('');

    useEffect(() => {
        socket.emit('getRooms');

        socket.on('roomsList', (roomsList) => {
            setRooms(roomsList);
        });

        return () => {
            socket.off('roomsList');
        };
    }, [socket]);

    const handleCreateSubmit = (e) => {
        e.preventDefault();
        if (roomName.trim() && playerName.trim()) {
            onCreateRoom(roomName, playerName);
        }
    };

    const handleJoinSubmit = (e) => {
        e.preventDefault();
        if (playerName.trim() && selectedRoomId) {
            onJoinRoom(selectedRoomId, playerName);
        }
    };

    const handleJoinClick = (roomId) => {
        setSelectedRoomId(roomId);
        setShowJoinModal(true);
    };

    const handleSpectateClick = (roomId) => {
        onSpectateRoom(roomId);
    };

    return (
        <div className="lobby">
            <div className="lobby-content">
                <div className="lobby-actions">
                    <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                        ➕ Yeni Oda Oluştur
                    </button>
                </div>

                <div className="rooms-section">
                    <h2 className="section-title">Aktif Odalar</h2>

                    {rooms.length === 0 ? (
                        <div className="empty-state">
                            <p>Henüz oda yok. İlk odayı siz oluşturun!</p>
                        </div>
                    ) : (
                        <div className="rooms-grid">
                            {rooms.map((room) => (
                                <div key={room.id} className="room-card">
                                    <div className="room-info">
                                        <h3 className="room-name">{room.name}</h3>
                                        <div className="room-meta">
                                            <span className="player-count">👥 {room.playerCount}/4</span>
                                            <span className={`game-status status-${room.gameState}`}>
                                                {room.gameState === 'waiting' ? '⏳ Bekliyor' :
                                                    room.gameState === 'playing' ? '🎮 Oynanıyor' :
                                                        room.gameState === 'finished' ? '🏁 Bitti' : '🚀 Başlıyor'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="room-actions">
                                        <button
                                            className="btn btn-success btn-sm"
                                            onClick={() => handleJoinClick(room.id)}
                                            disabled={room.playerCount >= 4 || room.gameState !== 'waiting'}
                                        >
                                            Katıl
                                        </button>
                                        <button
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => handleSpectateClick(room.id)}
                                        >
                                            İzle
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Create Room Modal */}
            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title">Yeni Oda Oluştur</h2>
                        <form onSubmit={handleCreateSubmit}>
                            <div className="form-group">
                                <label>Oda Adı</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="Örn: Süper Hızlı Oda"
                                    value={roomName}
                                    onChange={(e) => setRoomName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>İsminiz</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="Örn: Ahmet"
                                    value={playerName}
                                    onChange={(e) => setPlayerName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                                    İptal
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Oluştur
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Join Room Modal */}
            {showJoinModal && (
                <div className="modal-overlay" onClick={() => setShowJoinModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title">Odaya Katıl</h2>
                        <form onSubmit={handleJoinSubmit}>
                            <div className="form-group">
                                <label>İsminiz</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="Örn: Mehmet"
                                    value={playerName}
                                    onChange={(e) => setPlayerName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowJoinModal(false)}>
                                    İptal
                                </button>
                                <button type="submit" className="btn btn-success">
                                    Katıl
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Lobby;
