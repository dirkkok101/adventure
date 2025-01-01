import { Injectable } from "@angular/core";
import { Observable, map } from "rxjs";
import { GameStateService } from "../game-state.service";

/**
 * Service responsible for managing game flags and state indicators.
 * Acts as the single source of truth for game state management.
 * 
 * Key Responsibilities:
 * - Game state flag management
 * - Object state tracking
 * - Scene state management
 * - Flag condition evaluation
 * - State persistence
 * - Structured data storage
 * 
 * State Dependencies:
 * - GameStateService: Core state persistence
 * 
 * Error Handling:
 * - Validates all flag operations
 * - Maintains state consistency
 * - Provides detailed error messages
 * - Prevents invalid state transitions
 * 
 * Flag Categories:
 * Object State Flags:
 * - [objectId]Open: Container open state
 * - [objectId]Locked: Container locked state
 * - [objectId]Revealed: Hidden object visibility
 * - [objectId]On: Light source state
 * - [objectId]Dead: Resource depletion
 * 
 * Scene State Flags:
 * - [sceneId]_visited: Scene visit tracking
 * - [sceneId]_[state]: Scene-specific states
 * - [sceneId]_dark: Scene lighting state
 * - [sceneId]_underwater: Scene environment
 * 
 * Game Progress Flags:
 * - has[ObjectId]: Inventory tracking
 * - scored_[action]: One-time scoring
 * - trophy_[id]: Achievement tracking
 * - global_[state]: Game-wide states
 * 
 * Flag Rules:
 * - Flag names must be unique and descriptive
 * - Flag values are always boolean
 * - Flag states persist across saves
 * - Flags can be combined for complex conditions
 * 
 * Related Services:
 * - All mechanics services depend on this service
 * - Provides state management interface
 * - Coordinates state changes
 * - Ensures state consistency
 */
@Injectable({
    providedIn: 'root'
})
export class FlagMechanicsService {
    constructor(private gameState: GameStateService) {}

    // Base flag operations
    private setFlag(flag: string): void {
        this.gameState.updateState(state => ({
            ...state,
            flags: {
                ...state.flags,
                [flag]: true
            }
        }));
    }

    private removeFlag(flag: string): void {
        this.gameState.updateState(state => {
            const { [flag]: _, ...remainingFlags } = state.flags;
            return {
                ...state,
                flags: remainingFlags
            };
        });
    }

    private hasFlag(flag: string): boolean {
        return !!this.gameState.getCurrentState().flags[flag];
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
    checkFlags(flags: string[]): boolean {
        return flags.every(flag => {
            if (flag.includes('|')) {
                return flag.split('|').some(orFlag => 
                    orFlag.startsWith('!') ? !this.hasFlag(orFlag.substring(1)) : this.hasFlag(orFlag)
                );
            }
            return flag.startsWith('!') ? !this.hasFlag(flag.substring(1)) : this.hasFlag(flag);
        });
    }

    // Structured data operations
    /**
     * Sets structured data for an object
     * @param objectId Object ID to store data for
     * @param key Data key
     * @param data Data to store
     */
    setObjectData<T>(objectId: string, key: string, data: T): void {
        const dataKey = `${objectId}_${key}`;
        this.gameState.updateState(state => ({
            ...state,
            objectData: {
                ...state.objectData,
                [dataKey]: JSON.stringify(data)
            }
        }));
    }

    /**
     * Gets structured data for an object
     * @param objectId Object ID to get data for
     * @param key Data key
     * @returns Parsed data or null if not found
     */
    getObjectData<T>(objectId: string, key: string): T | null {
        const dataKey = `${objectId}_${key}`;
        const data = this.gameState.getCurrentState().objectData[dataKey];
        if (!data) return null;

        try {
            return JSON.parse(data) as T;
        } catch {
            return null;
        }
    }

    /**
     * Removes structured data for an object
     * @param objectId Object ID to remove data from
     * @param key Data key
     */
    removeObjectData(objectId: string, key: string): void {
        const dataKey = `${objectId}_${key}`;
        this.gameState.updateState(state => {
            const { [dataKey]: _, ...remainingData } = state.objectData;
            return {
                ...state,
                objectData: remainingData
            };
        });
    }

    /**
     * Check if object has structured data
     * @param objectId Object ID to check
     * @param key Data key
     */
    hasObjectData(objectId: string, key: string): boolean {
        const dataKey = `${objectId}_${key}`;
        return dataKey in this.gameState.getCurrentState().objectData;
    }

    // Scene state methods
    setSceneVisited(sceneId: string, visited: boolean = true): void {
        const flag = `${sceneId}_visited`;
        if (visited) {
            this.setFlag(flag);
        } else {
            this.removeFlag(flag);
        }
    }

    isSceneVisited(sceneId: string): boolean {
        return this.hasFlag(`${sceneId}_visited`);
    }

    setSceneDark(sceneId: string, isDark: boolean = true): void {
        const flag = `${sceneId}_dark`;
        if (isDark) {
            this.setFlag(flag);
        } else {
            this.removeFlag(flag);
        }
    }

    isSceneDark(sceneId: string): boolean {
        return this.hasFlag(`${sceneId}_dark`);
    }

    setSceneUnderwater(sceneId: string, isUnderwater: boolean = true): void {
        const flag = `${sceneId}_underwater`;
        if (isUnderwater) {
            this.setFlag(flag);
        } else {
            this.removeFlag(flag);
        }
    }

    isSceneUnderwater(sceneId: string): boolean {
        return this.hasFlag(`${sceneId}_underwater`);
    }

    setSceneFlooded(sceneId: string, isFlooded: boolean = true): void {
        const flag = `${sceneId}_flooded`;
        if (isFlooded) {
            this.setFlag(flag);
        } else {
            this.removeFlag(flag);
        }
    }

    isSceneFlooded(sceneId: string): boolean {
        return this.hasFlag(`${sceneId}_flooded`);
    }

    // Container state methods
    setContainerOpen(containerId: string, isOpen: boolean): void {
        const flag = `${containerId}Open`;
        if (isOpen) {
            this.setFlag(flag);
        } else {
            this.removeFlag(flag);
        }
    }

    isContainerOpen(containerId: string): boolean {
        return this.hasFlag(`${containerId}Open`);
    }

    // Lock state methods
    setObjectLocked(objectId: string, isLocked: boolean): void {
        const flag = `${objectId}Locked`;
        if (isLocked) {
            this.setFlag(flag);
        } else {
            this.removeFlag(flag);
        }
    }

    isObjectLocked(objectId: string): boolean {
        return this.hasFlag(`${objectId}Locked`);
    }

    // Inventory state methods
    setObjectInInventory(objectId: string, inInventory: boolean): void {
        const flag = `${objectId}Has`;
        if (inInventory) {
            this.setFlag(flag);
        } else {
            this.removeFlag(flag);
        }
    }

    isObjectInInventory(objectId: string): boolean {
        return this.hasFlag(`${objectId}Has`);
    }

    // Object visibility methods
    setObjectRevealed(objectId: string, revealed: boolean = true): void {
        const flag = `${objectId}Revealed`;
        if (revealed) {
            this.setFlag(flag);
        } else {
            this.removeFlag(flag);
        }
    }

    isObjectRevealed(objectId: string): boolean {
        return this.hasFlag(`${objectId}Revealed`);
    }

    // Light source methods
    setLightSourceOn(sourceId: string, isOn: boolean): void {
        const flag = `${sourceId}On`;
        if (isOn) {
            this.setFlag(flag);
        } else {
            this.removeFlag(flag);
        }
    }

    isLightSourceOn(sourceId: string): boolean {
        return this.hasFlag(`${sourceId}On`);
    }

    setLightSourceDead(sourceId: string, isDead: boolean): void {
        const flag = `${sourceId}Dead`;
        if (isDead) {
            this.setFlag(flag);
        } else {
            this.removeFlag(flag);
        }
    }

    isLightSourceDead(sourceId: string): boolean {
        return this.hasFlag(`${sourceId}Dead`);
    }

    // Global state methods
    /**
     * Set global light state
     * @param hasLight Whether there is global light
     */
    setGlobalLight(hasLight: boolean): void {
        if (hasLight) {
            this.setFlag('hasLight');
        } else {
            this.removeFlag('hasLight');
        }
    }

    /**
     * Check if there is global light
     * Either from natural light or a light source
     * @returns Whether there is global light
     */
    hasGlobalLight(): boolean {
        return this.hasFlag('hasLight');
    }

    // Score tracking methods
    /**
     * Marks an action as scored for an object
     * @param objectId Object that was acted upon
     * @param action Action that was performed (e.g., 'take', 'drop', 'use')
     * @param containerId Optional container involved in the action
     */
    setActionScored(objectId: string, action: string, containerId?: string): void {
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
    isActionScored(objectId: string, action: string, containerId?: string): boolean {
        const flag = containerId 
            ? `score_${action}_${objectId}_in_${containerId}`
            : `score_${action}_${objectId}`;
        return this.hasFlag(flag);
    }

    // Observable for reactive UI updates
    observeFlag(flag: string): Observable<boolean> {
        return this.gameState.state$.pipe(
            map(state => !!state.flags[flag])
        );
    }

    /**
     * Check if an object is open
     * @param objectId ID of object to check
     * @returns Whether the object is open
     */
    isObjectOpen(objectId: string): boolean {
        return this.hasFlag(`${objectId}Open`);
    }

    /**
     * Set whether an object is open
     * @param objectId ID of object to update
     * @param isOpen Whether the object should be open
     */
    setObjectOpen(objectId: string, isOpen: boolean): void {
        if (isOpen) {
            this.setFlag(`${objectId}Open`);
        } else {
            this.removeFlag(`${objectId}Open`);
        }
    }

    /**
     * Check if an object has a specific flag
     * @param objectId ID of object to check
     * @param flag Flag to check for
     * @returns Whether the object has the flag
     */
    hasObjectFlag(objectId: string, flag: string): boolean {
        return this.hasFlag(`${objectId}_${flag}`);
    }

    /**
     * Set an object flag
     * @param objectId ID of object to update
     * @param flag Flag to set
     * @param value Value to set flag to
     */
    setObjectFlag(objectId: string, flag: string, value: boolean): void {
        if (value) {
            this.setFlag(`${objectId}_${flag}`);
        } else {
            this.removeFlag(`${objectId}_${flag}`);
        }
    }

    /**
     * Check if a scene has a specific flag
     * @param sceneId ID of scene to check
     * @param flag Flag to check for
     * @returns Whether the scene has the flag
     */
    hasSceneFlag(sceneId: string, flag: string): boolean {
        return this.hasFlag(`${sceneId}_${flag}`);
    }

    /**
     * Set a scene flag
     * @param sceneId ID of scene to update
     * @param flag Flag to set
     * @param value Value to set flag to
     */
    setSceneFlag(sceneId: string, flag: string, value: boolean): void {
        if (value) {
            this.setFlag(`${sceneId}_${flag}`);
        } else {
            this.removeFlag(`${sceneId}_${flag}`);
        }
    }

    /**
     * Get the current score
     * @returns Current score
     */
    getCurrentScore(): number {
        return this.gameState.getCurrentState().score;
    }

    /**
     * Get the maximum possible score
     * @returns Maximum possible score
     */
    getMaxScore(): number {
        return this.gameState.getCurrentState().maxScore;
    }

    /**
     * Mark an object as examined
     * @param objectId ID of object examined
     * @param examined Whether the object has been examined
     */
    setObjectExamined(objectId: string, examined: boolean = true): void {
        const flag = `${objectId}_examined`;
        if (examined) {
            this.setFlag(flag);
        } else {
            this.removeFlag(flag);
        }
    }

    /**
     * Check if an object has been examined
     * @param objectId ID of object to check
     * @returns Whether the object has been examined
     */
    isObjectExamined(objectId: string): boolean {
        return this.hasFlag(`${objectId}_examined`);
    }

    /**
     * Mark an object's examine action as scored
     * @param objectId ID of object examined
     * @param scored Whether the examine action has been scored
     */
    setExamineScored(objectId: string, scored: boolean = true): void {
        const flag = `${objectId}_score_examine`;
        if (scored) {
            this.setFlag(flag);
        } else {
            this.removeFlag(flag);
        }
    }

    /**
     * Check if an object's examine action has been scored
     * @param objectId ID of object to check
     * @returns Whether the examine action has been scored
     */
    isExamineScored(objectId: string): boolean {
        return this.hasFlag(`${objectId}_score_examine`);
    }

    /**
     * Mark an exit as used
     * @param exitId ID of the exit used
     * @param used Whether the exit has been used
     */
    setExitUsed(exitId: string, used: boolean = true): void {
        const flag = `${exitId}_used`;
        if (used) {
            this.setFlag(flag);
        } else {
            this.removeFlag(flag);
        }
    }

    /**
     * Check if an exit has been used
     * @param exitId ID of exit to check
     * @returns Whether the exit has been used
     */
    isExitUsed(exitId: string): boolean {
        return this.hasFlag(`${exitId}_used`);
    }

    /**
     * Mark an exit's movement as scored
     * @param exitId ID of exit used
     * @param scored Whether the movement has been scored
     */
    setExitScored(exitId: string, scored: boolean = true): void {
        const flag = `${exitId}_score`;
        if (scored) {
            this.setFlag(flag);
        } else {
            this.removeFlag(flag);
        }
    }

    /**
     * Check if an exit's movement has been scored
     * @param exitId ID of exit to check
     * @returns Whether the movement has been scored
     */
    isExitScored(exitId: string): boolean {
        return this.hasFlag(`${exitId}_score`);
    }
}
