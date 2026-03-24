import React from 'react';

interface GameBoardProps {
  gameType: string;
  gameState: any;
  onMove: (action: any) => void;
}

function GameBoard({ gameType, gameState, onMove: _onMove }: GameBoardProps) {
  const renderBoard = () => {
    switch (gameType) {
      case 'chineseChess':
        return <ChineseChessBoard gameState={gameState} />;
      case 'go':
        return <GoBoard gameState={gameState} />;
      case 'doudizhu':
        return <DouDiZhuBoard gameState={gameState} />;
      case 'mahjong':
        return <MahjongBoard gameState={gameState} />;
      case 'zhaJinHua':
        return <ZhaJinHuaBoard gameState={gameState} />;
      default:
        return <div style={{ color: '#fff' }}>选择游戏开始</div>;
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.board}>{renderBoard()}</div>
    </div>
  );
}

// 中国象棋棋盘
function ChineseChessBoard({ gameState }: { gameState: any }) {
  const board = Array(10).fill(null).map(() => Array(9).fill(null));

  if (gameState?.pieces) {
    for (const piece of gameState.pieces) {
      board[piece.position.y][piece.position.x] = piece;
    }
  }

  return (
    <div style={styles.chessBoard}>
      {/* 棋盘背景 */}
      <div style={styles.chessGrid}>
        {/* 横线 */}
        {Array(10).fill(0).map((_, i) => (
          <div key={`h${i}`} style={{ ...styles.line, top: `${i * 40 + 20}px` }} />
        ))}
        {/* 竖线 */}
        {Array(9).fill(0).map((_, i) => (
          <div key={`v${i}`} style={{ ...styles.line, left: `${i * 44 + 22}px`, height: '360px' }} />
        ))}
        {/* 九宫斜线 */}
        <div style={{ ...styles.line, top: '20px', left: '154px', width: '88px', transform: 'rotate(45deg)' }} />
        <div style={{ ...styles.line, top: '20px', right: '154px', width: '88px', transform: 'rotate(-45deg)' }} />
        <div style={{ ...styles.line, top: '360px', left: '154px', width: '88px', transform: 'rotate(-45deg)' }} />
        <div style={{ ...styles.line, top: '360px', right: '154px', width: '88px', transform: 'rotate(45deg)' }} />
      </div>

      {/* 棋子 */}
      {gameState?.pieces?.map((piece: any, index: number) => (
        <div
          key={index}
          style={{
            ...styles.chessPiece,
            left: `${piece.position.x * 44 + 22}px`,
            top: `${piece.position.y * 40 + 20}px`,
            backgroundColor: piece.color === 'red' ? '#dc2626' : '#1f2937',
          }}
        >
          {piece.type}
        </div>
      ))}

      <div style={styles.info}>
        当前回合: {gameState?.currentTurn === 'red' ? '红方' : '黑方'}
      </div>
    </div>
  );
}

// 围棋棋盘
function GoBoard({ gameState }: { gameState: any }) {
  return (
    <div style={styles.goBoard}>
      <div style={styles.goGrid}>
        {Array(19).fill(0).map((_, row) => (
          <div key={row} style={styles.goRow}>
            {Array(19).fill(0).map((_, col) => (
              <div key={col} style={styles.goIntersection}>
                {gameState?.board?.[row]?.[col] && (
                  <div
                    style={{
                      ...styles.goStone,
                      backgroundColor: gameState.board[row][col] === 'black' ? '#000' : '#fff',
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div style={styles.info}>
        黑子: {gameState?.captures?.white || 0} | 白子: {gameState?.captures?.black || 0}
      </div>
    </div>
  );
}

// 斗地主
function DouDiZhuBoard({ gameState }: { gameState: any }) {
  return (
    <div style={styles.cardBoard}>
      <div style={styles.cardInfo}>
        <div style={styles.cardSection}>
          <h4 style={styles.cardTitle}>地主</h4>
          <div style={styles.cardStatus}>
            {gameState?.landlordId ? '已确定' : '待叫'}
          </div>
        </div>
        <div style={styles.cardSection}>
          <h4 style={styles.cardTitle}>底牌</h4>
          <div style={styles.cardBack}>?</div>
        </div>
        <div style={styles.cardSection}>
          <h4 style={styles.cardTitle}>上家出牌</h4>
          <div style={styles.cardStatus}>
            {gameState?.lastPlay?.count || '无'} 张
          </div>
        </div>
      </div>
      <div style={styles.cardHand}>
        你的手牌: {gameState?.handSizes?.['your_id'] || 0} 张
      </div>
    </div>
  );
}

// 麻将
function MahjongBoard({ gameState }: { gameState: any }) {
  return (
    <div style={styles.cardBoard}>
      <div style={styles.cardInfo}>
        <div style={styles.cardSection}>
          <h4 style={styles.cardTitle}>牌池</h4>
          <div style={styles.cardStatus}>
            剩余: {gameState?.deckSize || 0} 张
          </div>
        </div>
        <div style={styles.cardSection}>
          <h4 style={styles.cardTitle}>摸牌</h4>
          <div style={styles.tile}>{gameState?.currentTile || '无'}</div>
        </div>
      </div>
      <div style={styles.cardHand}>
        你的手牌: {gameState?.handSizes?.['your_id'] || 0} 张
      </div>
    </div>
  );
}

// 炸金花
function ZhaJinHuaBoard({ gameState }: { gameState: any }) {
  return (
    <div style={styles.cardBoard}>
      <div style={styles.cardInfo}>
        <div style={styles.cardSection}>
          <h4 style={styles.cardTitle}>阶段</h4>
          <div style={styles.cardStatus}>
            {gameState?.phase === 'deal' ? '发牌' :
             gameState?.phase === 'bet' ? '下注' :
             gameState?.phase === 'showdown' ? '比牌' : '结束'}
          </div>
        </div>
        <div style={styles.cardSection}>
          <h4 style={styles.cardTitle}>当前下注</h4>
          <div style={styles.cardStatus}>{gameState?.currentBet || 0}</div>
        </div>
        <div style={styles.cardSection}>
          <h4 style={styles.cardTitle}>底池</h4>
          <div style={styles.cardStatus}>{gameState?.pot || 0}</div>
        </div>
      </div>
      <div style={styles.cardHand}>
        你的手牌: {gameState?.handSizes?.['your_id'] || 0} 张
        {gameState?.seen?.['your_id'] && ' (已看)'}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  board: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chessBoard: {
    position: 'relative',
    width: '400px',
    height: '440px',
    backgroundColor: '#d4a574',
    borderRadius: '4px',
    padding: '10px',
  },
  chessGrid: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  line: {
    position: 'absolute',
    width: '380px',
    height: '1px',
    backgroundColor: '#000',
  },
  chessPiece: {
    position: 'absolute',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 'bold',
    transform: 'translate(-50%, -50%)',
    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
  },
  goBoard: {
    width: '380px',
    height: '380px',
    backgroundColor: '#deb887',
    padding: '20px',
    borderRadius: '4px',
  },
  goGrid: {
    display: 'flex',
    flexDirection: 'column',
  },
  goRow: {
    display: 'flex',
    height: '20px',
  },
  goIntersection: {
    width: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  goStone: {
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    zIndex: 1,
  },
  cardBoard: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
  },
  cardInfo: {
    display: 'flex',
    gap: '40px',
  },
  cardSection: {
    textAlign: 'center',
  },
  cardTitle: {
    color: '#fff',
    fontSize: '14px',
    marginBottom: '8px',
  },
  cardStatus: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: '18px',
  },
  cardBack: {
    width: '40px',
    height: '56px',
    backgroundColor: '#dc2626',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffd700',
    fontSize: '24px',
  },
  tile: {
    width: '30px',
    height: '42px',
    backgroundColor: '#fff',
    borderRadius: '2px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#000',
    fontSize: '12px',
  },
  cardHand: {
    color: '#fff',
    fontSize: '16px',
  },
  info: {
    position: 'absolute',
    bottom: '-30px',
    left: '0',
    right: '0',
    textAlign: 'center',
    color: '#fff',
    fontSize: '14px',
  },
};

export default GameBoard;