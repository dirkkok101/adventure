import {Injectable} from '@angular/core';
import {GameStateService} from '../game-state.service';
import {ScoringOptions} from '../../models/scoring/scoring-options.interface';
import {MechanicsBaseService} from './mechanics-base.service';

/**
 * Service responsible for managing the game's scoring system.
 * Handles all aspects of scoring, achievements, and progressMechanicsService tracking.
 *
 * Key Responsibilities:
 * - Point accumulation and tracking
 * - Trophy/achievement management
 * - Score milestone tracking
 * - Special scoring conditions
 * - Score persistence
 *
 * State Dependencies:
 * - GameStateService: Score and trophy persistence
 *
 * Error Handling:
 * - Validates all scoring operations
 * - Prevents duplicate scoring
 * - Maintains score consistency
 * - Provides detailed error messages
 *
 * Scoring Rules:
 * - Points awarded for specific actions
 * - Actions can only be scored once
 * - Container interactions may have special scores
 * - Some actions require specific conditions
 * - Score cannot exceed maximum possible score
 *
 * Trophy System:
 * - Trophies awarded at score milestones
 * - Each trophy has unique requirements
 * - Trophies are permanent achievements
 * - Trophy state persists across saves
 *
 * Flag Usage:
 * Score State Flags:
 * - scored_[action]_[objectId]: Tracks scored actions
 * - trophy_[trophyId]: Tracks earned trophies
 * - [objectId]_[containerId]_placed: Special container scoring
 *
 * Related Services:
 * - InventoryMechanicsService: For inventory action scoring
 * - ContainerMechanicsService: For container placement scoring
 * - SceneMechanicsService: For scene-based achievements
 */
@Injectable({
  providedIn: 'root'
})
export class ScoreMechanicsService extends MechanicsBaseService {
  /**
   * Score threshold for earning the adventurer trophy
   * @private
   */
  private readonly TROPHY_SCORE_THRESHOLD = 50;

  constructor(
    protected gameState: GameStateService,
  ) {
    super(gameState)
  }

  /**
   * Adds points to the player's score
   * - Updates the game state
   * - Checks for trophy achievements
   * - Ensures score doesn't exceed max score
   *
   * @param points Number of points to add
   * @throws Error if points is invalid or state update fails
   */
  addScore(points: number): void {
    if (!Number.isInteger(points) || points < 0) {
      throw new Error('Points must be a non-negative integer');
    }

    try {
      this.gameState.updateState(state => ({
        ...state,
        score: Math.min(state.maxScore, state.score + points)
      }));
      this.checkTrophyAchievement();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to add score: ${message}`);
    }
  }

  /**
   * Handles complex scoring scenarios involving objects and containers
   * Supports:
   * - Container-specific scoring rules
   * - Action-based scoring
   * - One-time scoring per action
   * - Special container interactions
   *
   * @param options Scoring configuration options
   * @throws Error if options are invalid or scoring fails
   */
  handleObjectScoring(options: ScoringOptions): void {
    if (!options?.action || !options?.object) {
      throw new Error('Invalid scoring options: action and object are required');
    }

    try {
      const {action, object, container, skipGeneralRules = false} = options;

      // Handle container-specific scoring
      if (container && object.scoring?.containerTargets?.[container.id]) {
        if (!this.isActionScored(object.id, action, container.id)) {
          this.addScore(object.scoring.containerTargets[container.id]);
          this.setActionScored(object.id, action, container.id);
        }
      }

      // Handle general action scoring if not skipped
      if (!skipGeneralRules && object.scoring &&
        (action === 'drop' || action === 'take' || action === 'use') &&
        object.scoring[action] !== undefined) {
        if (!this.isActionScored(object.id, action)) {
          this.addScore(object.scoring[action]);
          this.setActionScored(object.id, action);
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to handle object scoring: ${message}`);
    }
  }

  /**
   * Awards a trophy to the player
   * - Trophies can only be earned once
   * - Adds trophy to player's collection
   * - Updates game state
   *
   * @param trophyId Unique identifier for the trophy
   * @throws Error if trophy ID is invalid or state update fails
   */
  addTrophy(trophyId: string): void {
    if (!trophyId) {
      throw new Error('Trophy ID is required');
    }

    try {
      this.gameState.updateState(state => {
        if (state.trophies.includes(trophyId)) {
          return state;
        }
        return {
          ...state,
          trophies: [...state.trophies, trophyId]
        };
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to add trophy: ${message}`);
    }
  }

  /**
   * Checks if the player has earned a specific trophy
   * @param trophyId Trophy to check for
   * @returns True if the player has earned the trophy
   * @throws Error if trophy ID is invalid or check fails
   */
  hasTrophy(trophyId: string): boolean {
    if (!trophyId) {
      throw new Error('Trophy ID is required');
    }

    try {
      return this.gameState.getCurrentState().trophies.includes(trophyId);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to check trophy: ${message}`);
    }
  }

  /**
   * Gets a list of all earned trophies
   * @returns Array of earned trophy IDs
   * @throws Error if state access fails
   */
  getTrophies(): string[] {
    try {
      return [...this.gameState.getCurrentState().trophies];
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to get trophies: ${message}`);
    }
  }

  /**
   * Gets the current score
   * @returns Current player score
   * @throws Error if state access fails
   */
  getScore(): number {
    try {
      return this.gameState.getCurrentState().score;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to get score: ${message}`);
    }
  }

  /**
   * Marks an action as scored for an object
   * @param objectId Object that was acted upon
   * @param action Action that was performed (e.g., 'take', 'drop', 'use')
   * @param containerId Optional container involved in the action
   */
  private setActionScored(objectId: string, action: string, containerId?: string): void {
    const flag = containerId
      ? `score_${action}_${objectId}_in_${containerId}`
      : `score_${action}_${objectId}`;
    this.setFlag(flag);
  }

  /**
   * Checks if an action has already been scored for an object
   * @param objectId Object to check
   * @param action Action to check
   * @param containerId Optional container involved in the action
   * @returns True if the action has been scored
   */
  private isActionScored(objectId: string, action: string, containerId?: string): boolean {
    const flag = containerId
      ? `score_${action}_${objectId}_in_${containerId}`
      : `score_${action}_${objectId}`;
    return this.hasFlag(flag);
  }

  /**
   * Checks if any trophies should be awarded based on current score
   * Currently checks:
   * - Adventurer trophy at TROPHY_SCORE_THRESHOLD points
   * @private
   * @throws Error if trophy check fails
   */
  private checkTrophyAchievement(): void {
    try {
      const score = this.getScore();
      if (score >= this.TROPHY_SCORE_THRESHOLD && !this.hasTrophy('adventurer')) {
        this.addTrophy('adventurer');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to check trophy achievements: ${message}`);
    }
  }


}
