import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { GameState } from "../models";

/**
 * Core service responsible for managing the game's state.
 * Provides a reactive state management system using RxJS BehaviorSubject.
 * 
 * Key responsibilities:
 * - Maintains the single source of truth for game state
 * - Provides reactive state updates via Observable
 * - Manages state updates in an immutable way
 * - Tracks inventory, containers, flags, score, and other game properties
 */
@Injectable({
    providedIn: 'root'
})
export class GameStateService {
    /** Initial game state with default values */
    private state: GameState = {
        currentScene: '',
        inventory: {},
        containers: {},
        flags: {},
        objectData: {},
        score: 0,
        maxScore: 100,
        moves: 0,
        turns: 0,
        knownObjects: new Set<string>(),
        gameOver: false,
        gameWon: false,
        light: false,
        trophies: [],
        sceneState: {}
    };

    private stateSubject = new BehaviorSubject<GameState>(this.state);
    /** Observable stream of game state updates */
    state$ = this.stateSubject.asObservable();

    /**
     * Get the current snapshot of game state
     * @returns Current GameState object
     */
    getCurrentState(): GameState {
        return this.state;
    }

    /**
     * Update the game state in an immutable way
     * @param updateFn Function that takes current state and returns new state
     */
    updateState(updateFn: (state: GameState) => GameState) {
        this.state = updateFn(this.state);
        this.stateSubject.next(this.state);
    }

    /**
     * Initialize game state with a starting scene
     * @param sceneId ID of the starting scene
     */
    initializeState(sceneId: string) {
        this.updateState(() => ({
            currentScene: sceneId,
            inventory: {},
            containers: {},
            flags: {},
            objectData: {},
            score: 0,
            maxScore: 100,
            moves: 0,
            turns: 0,
            knownObjects: new Set<string>(),
            gameOver: false,
            gameWon: false,
            light: false,
            trophies: [],
            sceneState: {}
        }));
    }

    /**
     * Set the current scene
     * @param sceneId ID of the scene to set
     */
    setCurrentScene(sceneId: string) {
        this.updateState(state => ({
            ...state,
            currentScene: sceneId
        }));
    }

    /**
     * Set the light state
     * @param isLit True to turn on the light, false to turn off
     */
    setLight(isLit: boolean) {
        this.updateState(state => ({
            ...state,
            light: isLit
        }));
    }

    /**
     * Add an object to the list of known objects
     * @param objectId ID of the object to add
     */
    addKnownObject(objectId: string) {
        this.updateState(state => ({
            ...state,
            knownObjects: new Set([...state.knownObjects, objectId])
        }));
    }
}
