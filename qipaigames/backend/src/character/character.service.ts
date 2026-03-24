import { Injectable } from '@nestjs/common';
import {
  CharacterConfig,
  PRESET_CHARACTERS,
  PersonalityConfig,
} from './types';

@Injectable()
export class CharacterService {
  private customCharacters: Map<string, CharacterConfig> = new Map();

  /**
   * 获取所有角色
   */
  getAllCharacters(): CharacterConfig[] {
    return [...PRESET_CHARACTERS, ...Array.from(this.customCharacters.values())];
  }

  /**
   * 获取预设角色
   */
  getPresetCharacters(): CharacterConfig[] {
    return PRESET_CHARACTERS;
  }

  /**
   * 获取自定义角色
   */
  getCustomCharacters(creatorId?: string): CharacterConfig[] {
    const customs = Array.from(this.customCharacters.values());
    if (creatorId) {
      return customs.filter((c) => c.creatorId === creatorId);
    }
    return customs;
  }

  /**
   * 获取角色
   */
  getCharacter(id: string): CharacterConfig | null {
    return (
      PRESET_CHARACTERS.find((c) => c.id === id) ||
      this.customCharacters.get(id) ||
      null
    );
  }

  /**
   * 创建自定义角色
   */
  createCharacter(
    config: Omit<CharacterConfig, 'id' | 'isCustom' | 'createdAt'>,
    creatorId: string,
  ): CharacterConfig {
    const id = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const character: CharacterConfig = {
      ...config,
      id,
      isCustom: true,
      creatorId,
      createdAt: Date.now(),
    };

    this.customCharacters.set(id, character);
    return character;
  }

  /**
   * 更新自定义角色
   */
  updateCharacter(
    id: string,
    updates: Partial<Omit<CharacterConfig, 'id' | 'isCustom' | 'createdAt'>>,
  ): CharacterConfig | null {
    const character = this.customCharacters.get(id);

    if (!character || !character.isCustom) {
      return null;
    }

    const updated = { ...character, ...updates };
    this.customCharacters.set(id, updated);
    return updated;
  }

  /**
   * 删除自定义角色
   */
  deleteCharacter(id: string): boolean {
    const character = this.customCharacters.get(id);

    if (!character || !character.isCustom) {
      return false;
    }

    return this.customCharacters.delete(id);
  }

  /**
   * 获取角色配置（用于AI）
   */
  getAgentConfig(characterId: string): {
    characterId: string;
    characterName: string;
    personality: PersonalityConfig;
    background: string;
    languageStyle: string;
  } | null {
    const character = this.getCharacter(characterId);

    if (!character) {
      return null;
    }

    return {
      characterId: character.id,
      characterName: character.name,
      personality: character.personality,
      background: character.background,
      languageStyle: character.languageStyle,
    };
  }

  /**
   * 获取角色数量统计
   */
  getStats(): { preset: number; custom: number } {
    return {
      preset: PRESET_CHARACTERS.length,
      custom: this.customCharacters.size,
    };
  }
}