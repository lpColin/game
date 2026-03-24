/**
 * TTS 语音合成 - 阿里云语音合成
 */
import axios from 'axios';

const TTS_API = 'https://dashscope.aliyuncs.com/api/v1/services/audio/tts';

class TTSClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  /**
   * 合成语音
   * @param {string} text - 要合成的内容
   * @param {object} options - 选项
   * @returns {Promise<Buffer>} - 音频数据
   */
  async synthesize(text, options = {}) {
    const {
      voice = 'xiaoyun',     // 发音人
      format = 'mp3',       // 音频格式
      speed = 1.0,          // 语速
      pitch = 1.0           // 音调
    } = options;

    try {
      const response = await axios.post(
        TTS_API,
        {
          model: "cosyvoice-v1",
          input: { text },
          parameters: {
            voice,
            format,
            speed,
            pitch
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'audio/*'
          },
          responseType: 'arraybuffer'
        }
      );

      return Buffer.from(response.data);
    } catch (error) {
      console.error('TTS 合成失败:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * 获取可用发音人列表
   */
  async getVoiceList() {
    // 千问 TTS 支持的发音人
    return [
      { id: 'xiaoyun', name: '云小悠', gender: '女' },
      { id: 'xiaogang', name: '郭小刚', gender: '男' },
      { id: 'ruoxi', name: '若曦', gender: '女' },
      { id: 'xiaoxian', name: '小贤', gender: '男' }
    ];
  }
}

export default TTSClient;