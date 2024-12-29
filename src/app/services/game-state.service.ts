import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { GameState } from '../models/game-state.model';
import { GameStateLoggerService } from './logging/game-state-logger.service';

const STORAGE_KEY = 'zork_game_state';

@Injectable({
  providedIn: 'root'
})
export class GameStateService {
  private state: GameState = {
    currentScene: '',
    inventory: {},
    flags: {},
    score: 0,
    moves: 0,
    knownObjects: new Set<string>(),
    gameOver: false,
    gameWon: false
  };

  private stateSubject = new BehaviorSubject<GameState>(this.state);
  state$ = this.stateSubject.asObservable();

  constructor(private logger: GameStateLoggerService) {}

  getCurrentState(): GameState {
    return this.state;
  }

  initializeState(sceneId: string) {
    this.state = {
      currentScene: sceneId,
      inventory: {},
      flags: {},
      score: 0,
      moves: 0,
      knownObjects: new Set<string>(),
      gameOver: false,
      gameWon: false
    };
    this.stateSubject.next(this.state);
    this.saveGame();
  }

  setCurrentScene(sceneId: string) {
    this.state = {
      ...this.state,
      currentScene: sceneId
    };
    this.stateSubject.next(this.state);
    this.saveGame();
  }

  addToInventory(itemId: string) {
    if (!this.state.inventory[itemId]) {
      this.state = {
        ...this.state,
        inventory: {
          ...this.state.inventory,
          [itemId]: true
        }
      };
      this.stateSubject.next(this.state);
      this.saveGame();
    }
  }

  removeFromInventory(itemId: string) {
    const { [itemId]: _, ...remainingInventory } = this.state.inventory;
    this.state = {
      ...this.state,
      inventory: remainingInventory
    };
    this.stateSubject.next(this.state);
    this.saveGame();
  }

  setFlag(flag: string) {
    this.state = {
      ...this.state,
      flags: {
        ...this.state.flags,
        [flag]: true
      }
    };
    this.stateSubject.next(this.state);
    this.saveGame();
  }

  removeFlag(flag: string) {
    const { [flag]: _, ...remainingFlags } = this.state.flags;
    this.state = {
      ...this.state,
      flags: remainingFlags
    };
    this.stateSubject.next(this.state);
    this.saveGame();
  }

  hasFlag(flag: string): boolean {
    return !!this.state.flags[flag];
  }

  addScore(points: number) {
    this.state = {
      ...this.state,
      score: this.state.score + points
    };
    this.stateSubject.next(this.state);
    this.saveGame();
  }

  incrementMoves() {
    this.state = {
      ...this.state,
      moves: this.state.moves + 1
    };
    this.stateSubject.next(this.state);
    this.saveGame();
  }

  addKnownObject(objectId: string) {
    this.state.knownObjects.add(objectId);
    this.stateSubject.next(this.state);
    this.saveGame();
  }

  setGameOver(won: boolean = false) {
    this.state = {
      ...this.state,
      gameOver: true,
      gameWon: won
    };
    this.stateSubject.next(this.state);
    this.saveGame();
  }

  // Save/Load functionality
  saveGame() {
    const saveState = {
      ...this.state,
      knownObjects: Array.from(this.state.knownObjects)
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saveState));
    this.logger.logState('Game saved', this.state);
  }

  loadGame(): boolean {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState);
        this.state = {
          ...parsedState,
          knownObjects: new Set(parsedState.knownObjects)
        };
        this.stateSubject.next(this.state);
        this.logger.logState('Game loaded', this.state);
        return true;
      } catch (error) {
        console.error('Error loading saved game:', error);
        return false;
      }
    }
    return false;
  }

  hasSavedGame(): boolean {
    return localStorage.getItem(STORAGE_KEY) !== null;
  }

  clearSavedGame() {
    localStorage.removeItem(STORAGE_KEY);
    this.logger.logState('Game cleared', this.state);
  }
}
