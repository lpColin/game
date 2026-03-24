import { Module } from '@nestjs/common';
import { AgentModule } from './agent/agent.module';
import { GameEngineModule } from './game-engine/game-engine.module';
import { CharacterModule } from './character/character.module';
import { WebsocketModule } from './websocket/websocket.module';

@Module({
  imports: [
    AgentModule,
    GameEngineModule,
    CharacterModule,
    WebsocketModule,
  ],
})
export class AppModule {}