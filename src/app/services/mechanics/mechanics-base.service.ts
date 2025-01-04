import {Injectable} from '@angular/core';
import {GameStateService} from '../game-state.service';
import {Scene, SceneObject} from '../../models';

@Injectable()
export abstract class MechanicsBaseService
{
  protected constructor(
    protected gameStateService: GameStateService,
  ) {}

  protected isObjectRevealed(objectId: string): boolean {
    return this.hasFlag(`${objectId}Revealed`);
  }

  /**
   * Check if an object has a specific flag
   * @param objectId ID of object to check
   * @param flag Flag to check for
   * @returns Whether the object has the flag
   */
  protected hasObjectFlag(objectId: string, flag: string): boolean {
    return this.hasFlag(`${objectId}_${flag}`);
  }

  /**
   * Check a list of flag conditions
   * Supports complex conditions including:
   * - AND conditions (all flags in array must match)
   * - OR conditions (flags separated by |)
   * - NOT conditions (flags prefixed with !)
   *
   * Example: ['flag1', 'flag2|flag3', '!flag4'] means:
   * (flag1 AND (flag2 OR flag3) AND (NOT flag4))
   */
  protected checkFlags(flags: string[]): boolean {
    return flags.every(flag => {
      if (flag.includes('|')) {
        return flag.split('|').some(orFlag =>
          orFlag.startsWith('!') ? !this.hasFlag(orFlag.substring(1)) : this.hasFlag(orFlag)
        );
      }
      return flag.startsWith('!') ? !this.hasFlag(flag.substring(1)) : this.hasFlag(flag);
    });
  }

  protected hasFlag(flag: string): boolean {
    return this.gameStateService.getCurrentState().flags[flag];
  }

  protected setFlag(flag: string): void {
    this.gameStateService.updateState(state => ({
      ...state,
      flags: {
        ...state.flags,
        [flag]: true
      }
    }));
  }

  protected removeFlag(flag: string): void {
    this.gameStateService.updateState(state => {
      const { [flag]: _, ...remainingFlags } = state.flags;
      return {
        ...state,
        flags: remainingFlags
      };
    });
  }

  /**
   * Sets a flag from an interaction.
   * Used by command services to set flags granted by interactions.
   *
   * @param flag Flag to set
   * @param objectId Optional object ID for scoping
   */
  protected setInteractionFlag(flag: string, objectId?: string): void {
    if (objectId) {
      this.setObjectFlag(objectId, flag, true);
    } else {
      this.setFlag(flag);
    }
  }

  /**
   * Set an object flag
   * @param objectId ID of object to update
   * @param flag Flag to set
   * @param value Value to set flag to
   */
  protected setObjectFlag(objectId: string, flag: string, value: boolean): void {
    if (value) {
      this.setFlag(`${objectId}_${flag}`);
    } else {
      this.removeFlag(`${objectId}_${flag}`);
    }
  }

  /**
   * Check if a container is open
   * @param containerId ID of container to check
   * @returns Whether the container is open
   */
  protected containerIsOpen(containerId: string): boolean {
    return this.hasFlag(`${containerId}Open`);
  }

  /**
   * Check if a container is locked
   * @param containerId ID of container to check
   * @returns Whether the container is locked
   */
  protected containerIsLocked(containerId: string): boolean {
    return this.hasFlag(`${containerId}Locked`);
  }

  // Object visibility methods
  protected setObjectRevealed(objectId: string, revealed: boolean = true): void {
    const flag = `${objectId}Revealed`;
    if (revealed) {
      this.setFlag(flag);
    } else {
      this.removeFlag(flag);
    }
  }


}
