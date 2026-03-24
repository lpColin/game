import { Module } from '@nestjs/common';
import { WebsocketGateway } from './websocket.gateway';
import { AgentModule } from '../agent/agent.module';
import { GameEngineModule } from '../game-engine/game-engine.module';
import { CharacterModule } from '../character/character.module';

@Module({
  imports: [AgentModule, GameEngineModule, CharacterModule],
  providers: [WebsocketGateway],
})
export class WebsocketModule {}