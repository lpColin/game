import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import ChatBox from './components/ChatBox/ChatBox';
import GameBoard from './components/GameBoard/GameBoard';
import CharacterPanel from './components/CharacterPanel/CharacterPanel';
import { useGameStore } from './stores/game.store';

interface Character {
  id: string;
  name: string;
  avatar: string;
  personality: {
    traits: string[];
    speakingStyle: string;
    emotionalRange: number;
    verbosity: string;
  };
  background: string;
}

interface Game {
  type: string;
  name: string;
}

function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<string>('');
  const [selectedGame, setSelectedGame] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');
  const [gameState, setGameState] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);

  const { messages, addMessage, clearMessages } = useGameStore();

  useEffect(() => {
    // 连接WebSocket
    const newSocket = io('http://localhost:4000', {
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
    });

    newSocket.on('newMessage', (message) => {
      addMessage(message);
    });

    newSocket.on('gameStateChanged', (data) => {
      setGameState(data.state);
    });

    newSocket.on('gameEnded', (data) => {
      addMessage({
        role: 'assistant',
        content: `游戏结束！${data.winner}获胜，原因：${data.reason}`,
        timestamp: Date.now(),
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // 获取角色和游戏列表
  useEffect(() => {
    if (socket && isConnected) {
      socket.emit('getCharacters', {}, (response: Character[]) => {
        setCharacters(response);
        if (response.length > 0) {
          setSelectedCharacter(response[0].id);
        }
      });

      socket.emit('getGames', {}, (response: Game[]) => {
        setGames(response);
        if (response.length > 0) {
          setSelectedGame(response[0].type);
        }
      });
    }
  }, [socket, isConnected]);

  const handleStartGame = () => {
    if (!socket || !selectedCharacter || !selectedGame) return;

    socket.emit(
      'createGame',
      {
        gameType: selectedGame,
        playerName: '玩家',
        characterId: selectedCharacter,
      },
      (response: any) => {
        if (response.sessionId) {
          setSessionId(response.sessionId);
          setGameState(response.gameState);
          clearMessages();

          // 添加欢迎消息
          const character = characters.find((c) => c.id === selectedCharacter);
          addMessage({
            role: 'assistant',
            content: `你好！我是${character?.name}，很高兴和你一起玩游戏。让我们开始吧！`,
            timestamp: Date.now(),
          });
        }
      }
    );
  };

  const handleSendMessage = (content: string) => {
    if (!socket || !sessionId) return;

    addMessage({ role: 'user', content, timestamp: Date.now() });

    socket.emit('sendMessage', {
      sessionId,
      content,
    });
  };

  const handleMakeMove = (action: any) => {
    if (!socket || !sessionId) return;

    socket.emit('makeMove', {
      sessionId,
      action,
    });
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>AI 游戏陪练</h1>
        <div style={styles.status}>
          <span
            style={{
              ...styles.statusDot,
              backgroundColor: isConnected ? '#4ade80' : '#ef4444',
            }}
          />
          {isConnected ? '已连接' : '未连接'}
        </div>
      </header>

      <main style={styles.main}>
        {!sessionId ? (
          <div style={styles.setupPanel}>
            <div style={styles.setupSection}>
              <h3 style={styles.sectionTitle}>选择游戏角色</h3>
              <div style={styles.characterGrid}>
                {characters.map((character) => (
                  <div
                    key={character.id}
                    style={{
                      ...styles.characterCard,
                      ...(selectedCharacter === character.id
                        ? styles.characterCardSelected
                        : {}),
                    }}
                    onClick={() => setSelectedCharacter(character.id)}
                  >
                    <div style={styles.characterAvatar}>
                      {character.name[0]}
                    </div>
                    <div style={styles.characterName}>{character.name}</div>
                    <div style={styles.characterTraits}>
                      {character.personality.traits.slice(0, 2).join('、')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={styles.setupSection}>
              <h3 style={styles.sectionTitle}>选择游戏</h3>
              <div style={styles.gameGrid}>
                {games.map((game) => (
                  <div
                    key={game.type}
                    style={{
                      ...styles.gameCard,
                      ...(selectedGame === game.type ? styles.gameCardSelected : {}),
                    }}
                    onClick={() => setSelectedGame(game.type)}
                  >
                    {game.name}
                  </div>
                ))}
              </div>
            </div>

            <button
              style={styles.startButton}
              onClick={handleStartGame}
              disabled={!selectedCharacter || !selectedGame}
            >
              开始游戏
            </button>
          </div>
        ) : (
          <div style={styles.gamePanel}>
            <div style={styles.gameLeft}>
              <CharacterPanel
                character={characters.find((c) => c.id === selectedCharacter)}
              />
              <GameBoard
                gameType={selectedGame}
                gameState={gameState}
                onMove={handleMakeMove}
              />
            </div>
            <div style={styles.gameRight}>
              <ChatBox
                messages={messages}
                onSendMessage={handleSendMessage}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  title: {
    color: '#fff',
    fontSize: '24px',
    fontWeight: 'bold',
  },
  status: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#fff',
    fontSize: '14px',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  main: {
    flex: 1,
    padding: '24px',
  },
  setupPanel: {
    maxWidth: '800px',
    margin: '0 auto',
  },
  setupSection: {
    marginBottom: '32px',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: '18px',
    marginBottom: '16px',
  },
  characterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: '16px',
  },
  characterCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    padding: '16px',
    cursor: 'pointer',
    border: '2px solid transparent',
    transition: 'all 0.2s',
  },
  characterCardSelected: {
    borderColor: '#4ade80',
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
  },
  characterAvatar: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: 'rgba(74, 222, 128, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 12px',
    color: '#fff',
    fontSize: '24px',
    fontWeight: 'bold',
  },
  characterName: {
    color: '#fff',
    fontSize: '16px',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: '8px',
  },
  characterTraits: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '12px',
    textAlign: 'center',
  },
  gameGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
    gap: '12px',
  },
  gameCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    padding: '16px',
    color: '#fff',
    textAlign: 'center',
    cursor: 'pointer',
    border: '2px solid transparent',
    transition: 'all 0.2s',
  },
  gameCardSelected: {
    borderColor: '#60a5fa',
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
  },
  startButton: {
    width: '100%',
    padding: '16px',
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#fff',
    backgroundColor: '#4ade80',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  gamePanel: {
    display: 'flex',
    gap: '24px',
    height: 'calc(100vh - 120px)',
  },
  gameLeft: {
    flex: '1',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  gameRight: {
    width: '400px',
  },
};

export default App;