import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { GameState } from '../models/game-state.model';

@Injectable({
  providedIn: 'root'
})
export class GameStateService {
  private state: GameState = {
    currentScene: '',
    inventory: {},
    containers: {},
    flags: {},
    score: 0,
    maxScore: 100,
    moves: 0,
    turns: 0,
    knownObjects: new Set<string>(),
    gameOver: false,
    gameWon: false,
    light: false
  };

  private stateSubject = new BehaviorSubject<GameState>(this.state);
  state$ = this.stateSubject.asObservable();

  getCurrentState(): GameState {
    return this.state;
  }

  updateState(updateFn: (state: GameState) => GameState) {
    this.state = updateFn(this.state);
    this.stateSubject.next(this.state);
  }

  initializeState(sceneId: string) {
    this.updateState(() => ({
      currentScene: sceneId,
      inventory: {},
      containers: {},
      flags: {},
      score: 0,
      maxScore: 100,
      moves: 0,
      turns: 0,
      knownObjects: new Set<string>(),
      gameOver: false,
      gameWon: false,
      light: false
    }));
  }

  setCurrentScene(sceneId: string) {
    this.updateState(state => ({
      ...state,
      currentScene: sceneId
    }));
  }

  setLight(isLit: boolean) {
    this.updateState(state => ({
      ...state,
      light: isLit
    }));
  }
}
