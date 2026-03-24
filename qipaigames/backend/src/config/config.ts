export interface AppConfig {
  claudeApiKey: string;
  claudeModel: string;
  claudeApiUrl: string;  // 自定义API地址（用于阿里云等兼容服务）
  port: number;
}

export const config: AppConfig = {
  // 从环境变量获取API Key，生产环境请设置环境变量
  claudeApiKey: process.env.ALI_API_KEY || '',
  claudeModel: process.env.ALI_MODEL || 'MiniMax-M2.5',
  claudeApiUrl: process.env.ALI_API_URL || '',  // 阿里云模型地址示例: https://dashscope.aliyuncs.com/compatible-mode/v1
  port: parseInt(process.env.PORT || '4000', 10),
};