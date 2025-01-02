import {Injectable} from '@angular/core';
import {GameStateService} from '../game-state.service';
import {MechanicsBaseService} from './mechanics-base.service';

/**
 * Service responsible for managing game progressMechanicsService and state tracking.
 * Handles all aspects of game progression including:
 * - Turn counting
 *
 * Game State Rules:
 * - Turns increment with any game action
 */
@Injectable({
  providedIn: 'root'
})
export class ProgressMechanicsService extends MechanicsBaseService {
  constructor(protected gameState: GameStateService) {
    super(gameState);
  }

  /**
   * Increments the turn counter
   * Should be called for any action that advances game time:
   * - Movement
   * - Item interactions
   * - Scene interactions
   * - Combat actions
   */
  incrementTurns(): void {
    this.gameState.updateState(state => ({
      ...state,
      turns: state.turns + 1
    }));
  }
}
