// 角色配置接口
export interface CharacterConfig {
  id: string;
  name: string;
  avatar: string;
  personality: PersonalityConfig;
  background: string;
  languageStyle: string;
  voiceConfig?: VoiceConfig;
  isCustom: boolean;
  creatorId?: string;
  createdAt: number;
}

// 性格配置
export interface PersonalityConfig {
  traits: string[];
  speakingStyle: string;
  emotionalRange: number;
  verbosity: 'brief' | 'normal' | 'verbose';
}

// 语音配置
export interface VoiceConfig {
  language: string;
  rate: number;
  pitch: number;
  voiceName?: string;
}

// 预设角色列表
export const PRESET_CHARACTERS: CharacterConfig[] = [
  {
    id: 'scholar-wang',
    name: '王学士',
    avatar: '/avatars/scholar.png',
    personality: {
      traits: ['博学', '儒雅', '谨慎', '耐心'],
      speakingStyle: '文言文',
      emotionalRange: 0.3,
      verbosity: 'normal',
    },
    background: '明朝进士，学富五车，精通琴棋书画。为人正直谦逊，喜欢以棋会友。',
    languageStyle: '文雅端庄',
    isCustom: false,
    createdAt: Date.now(),
  },
  {
    id: 'warrior-zhang',
    name: '张将军',
    avatar: '/avatars/warrior.png',
    personality: {
      traits: ['豪爽', '直率', '好胜', '勇敢'],
      speakingStyle: '豪放',
      emotionalRange: 0.7,
      verbosity: 'brief',
    },
    background: '镇守边关的大将军，善于带兵打仗。性格刚烈，爱好下棋讨论兵法。',
    languageStyle: '豪迈直爽',
    isCustom: false,
    createdAt: Date.now(),
  },
  {
    id: 'maiden-li',
    name: '李小姐',
    avatar: '/avatars/maiden.png',
    personality: {
      traits: ['活泼', '俏皮', '聪明', '有点小脾气'],
      speakingStyle: '俏皮',
      emotionalRange: 0.8,
      verbosity: 'verbose',
    },
    background: '大户人家的千金，琴棋书画样样精通。性格古灵精怪，喜欢开玩笑。',
    languageStyle: '活泼可爱',
    isCustom: false,
    createdAt: Date.now(),
  },
  {
    id: 'master-chen',
    name: '陈大师',
    avatar: '/avatars/master.png',
    personality: {
      traits: ['沉稳', '智慧', '神秘', '洞察人心'],
      speakingStyle: '哲理',
      emotionalRange: 0.2,
      verbosity: 'brief',
    },
    background: '隐居山中的世外高人，精通各种棋艺。说话富有哲理，常有独到见解。',
    languageStyle: '深邃有哲理',
    isCustom: false,
    createdAt: Date.now(),
  },
  {
    id: 'youth-zhao',
    name: '赵少年',
    avatar: '/avatars/youth.png',
    personality: {
      traits: ['热血', '冲动', '好学', '有礼貌'],
      speakingStyle: '热血',
      emotionalRange: 0.9,
      verbosity: 'normal',
    },
    background: '初出茅庐的少年剑客，热爱棋道。时常请教他人，进步很快。',
    languageStyle: '朝气蓬勃',
    isCustom: false,
    createdAt: Date.now(),
  },
];