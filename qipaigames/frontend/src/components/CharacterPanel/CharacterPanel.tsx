import React from 'react';

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

interface CharacterPanelProps {
  character?: Character;
}

function CharacterPanel({ character }: CharacterPanelProps) {
  if (!character) return null;

  return (
    <div style={styles.container}>
      <div style={styles.avatarSection}>
        <div style={styles.avatar}>{character.name[0]}</div>
        <div style={styles.name}>{character.name}</div>
      </div>

      <div style={styles.infoSection}>
        <div style={styles.infoItem}>
          <span style={styles.label}>性格特点</span>
          <span style={styles.value}>
            {character.personality.traits.join('、')}
          </span>
        </div>

        <div style={styles.infoItem}>
          <span style={styles.label}>说话风格</span>
          <span style={styles.value}>{character.personality.speakingStyle}</span>
        </div>

        <div style={styles.infoItem}>
          <span style={styles.label}>情绪波动</span>
          <div style={styles.emotionBar}>
            <div
              style={{
                ...styles.emotionFill,
                width: `${character.personality.emotionalRange * 100}%`,
              }}
            />
          </div>
        </div>

        <div style={styles.infoItem}>
          <span style={styles.label}>说话详略</span>
          <span style={styles.value}>
            {character.personality.verbosity === 'brief'
              ? '简洁'
              : character.personality.verbosity === 'verbose'
              ? '详细'
              : '普通'}
          </span>
        </div>
      </div>

      <div style={styles.background}>
        <span style={styles.label}>背景故事</span>
        <p style={styles.backgroundText}>{character.background}</p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    gap: '16px',
  },
  avatarSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  avatar: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: 'rgba(74, 222, 128, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: '32px',
    fontWeight: 'bold',
  },
  name: {
    color: '#fff',
    fontSize: '18px',
    fontWeight: 'bold',
  },
  infoSection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  label: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: '12px',
  },
  value: {
    color: '#fff',
    fontSize: '14px',
  },
  emotionBar: {
    width: '100%',
    height: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  emotionFill: {
    height: '100%',
    backgroundColor: '#4ade80',
    borderRadius: '4px',
  },
  background: {
    width: '200px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  backgroundText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: '12px',
    lineHeight: 1.6,
    margin: 0,
  },
};

export default CharacterPanel;