import {Injectable} from "@angular/core";
import {Observable} from "rxjs";
import {SidebarData} from "../components/game/game-sidebar/game-sidebar.component";
import {CommandService} from "./commands/command.service";
import {GameInitializationService} from "./game-initialization.service";
import {GameStateService} from "./game-state.service";
import {GameTextService} from "./game-text.service";
import {ProgressMechanicsService} from "./mechanics/progress-mechanics.service";
import {SaveLoadService} from "./save-load.service";
import {SceneMechanicsService} from "./mechanics/scene-mechanics.service";
import {GameState, Scene, SceneObject} from "../models";
import {ContainerMechanicsService} from './mechanics/container-mechanics.service';
import {MovementMechanicsService} from './mechanics/movement-mechanics.service';
import {ExaminationMechanicsService} from './mechanics/examination-mechanics.service';
import {InventoryMechanicsService} from './mechanics/inventory-mechanics.service';
import {ObjectMechanicsService} from './mechanics/object-mechanics.service';

/**
 * Main game orchestration service responsible for coordinating game flow and state management.
 * Acts as the central hub for game operations, coordinating between various services and mechanics.
 *
 * Key responsibilities:
 * - Game initialization and state management
 * - Command processing and execution
 * - Scene navigation and state updates
 * - Game saving and loading
 * - Score and progressMechanicsService tracking
 * - UI text management
 */
@Injectable({
    providedIn: 'root'
})
export class GameService {
    /**
     * Constructs a new GameService instance.
     *
     * @param gameStateService GameStateService instance for managing game state
     * @param sceneMechanicsService SceneService instance for scene management
     * @param commandService CommandService instance for command processing
     * @param saveLoadService SaveLoadService instance for game saving and loading
     * @param gameTextService GameTextService instance for UI text management
     * @param progressMechanicsService ProgressMechanicsService instance for score and progressMechanicsService tracking
     * @param gameInitializationService GameInitializationService instance for game initialization
     * @param movementMechanicsService
     * @param objectMechanicsService
     */
    constructor(
        private gameStateService: GameStateService,
        private sceneMechanicsService: SceneMechanicsService,
        private commandService: CommandService,
        private saveLoadService: SaveLoadService,
        private gameTextService: GameTextService,
        private progressMechanicsService: ProgressMechanicsService,
        private gameInitializationService: GameInitializationService,
        private movementMechanicsService: MovementMechanicsService,
        private objectMechanicsService: ObjectMechanicsService,
    ) {}

    /**
     * Get an observable of the game state for reactive UI updates
     * @returns Observable of the current GameState
     */
    getCurrentState$(): Observable<GameState> {
        return this.gameStateService.state$;
    }

    /**
     * Process and execute a player command
     * Coordinates between CommandService for parsing/execution and GameText for output
     * @param input The raw command string from the player
     */
    processCommand(input: string): void {
        if (!input.trim()) {
            return;
        }

        const state = this.gameStateService.getCurrentState();
        if (state.gameOver) {
            this.gameTextService.addText('The game is over. Start a new game or load a saved game.');
            return;
        }

        // Add command to output with a > prefix
        this.gameTextService.addText(`> ${input}`);

        const result = this.commandService.processInput(input);

        if (result.message) {
            this.gameTextService.addText(result.message);
        }

        if (result.success && result.incrementTurn) {
            this.progressMechanicsService.incrementTurns();
            this.saveGame();
        }
    }

    /**
     * Get suggestions for the player based on the current game state
     * @param input The raw input string from the player
     * @returns Array of suggestion strings
     */
    getSuggestions(input: string): string[] {
      return this.commandService.getSuggestions(input);
    }

    /**
     * Start a new game session
     * Initializes game state, scene, and player position
     * @throws Error if initialization fails
     */
    startNewGame(): void {
        try {
            this.gameInitializationService.startNewGame();
            this.saveGame(); // Auto-save on new game
        } catch (error) {
            console.error('Error starting new game:', error);
            this.gameTextService.addText('Error starting new game. Please try again.');
            throw error;
        }
    }

    /**
     * Load a saved game session
     * Restores game state, scene, and player position from saved data
     * @returns True if loading is successful, false otherwise
     */
    loadGame(): boolean {
        try {
            const success = this.saveLoadService.loadGame();
            if (success) {
                const state = this.gameStateService.getCurrentState();
                const scene = this.sceneMechanicsService.getScene(state.currentScene);
                if (scene) {
                    this.gameTextService.addText(this.sceneMechanicsService.getSceneDescription(scene));
                }
            }
            return success;
        } catch (error) {
            console.error('Error loading game:', error);
            this.gameTextService.addText('Error loading game. The save file might be corrupted.');
            return false;
        }
    }

    /**
     * Save the current game session
     * Saves game state, scene, and player position to storage
     * @returns True if saving is successful, false otherwise
     */
    saveGame(): boolean {
        try {
            this.saveLoadService.saveGame();
            return true;
        } catch (error) {
            console.error('Error saving game:', error);
            this.gameTextService.addText('Error saving game. Please try again.');
            return false;
        }
    }

    /**
     * Check if a saved game session exists
     * @returns True if a saved game exists, false otherwise
     */
    hasSavedGame(): boolean {
        try {
            return this.saveLoadService.hasSavedGame();
        } catch (error) {
            console.error('Error checking saved game:', error);
            return false;
        }
    }

    /**
     * Reset the game to its initial state
     * Clears saved game data and resets game state, scene, and player position
     * @throws Error if reset fails
     */
    resetGame(): void {
        try {
            this.saveLoadService.clearSavedGame();
            this.gameInitializationService.resetGame();
        } catch (error) {
            console.error('Error resetting game:', error);
            this.gameTextService.addText('Error resetting game. Please refresh the page.');
            throw error;
        }
    }

    /**
     * Get available commands based on scene state and known items
     * @param scene The current scene
     * @returns Array of available commands
     */
    private getAvailableCommands(scene: Scene): string[] {
        // Default commands always available
        const commands = [
            'look',
            'inventory',
            'examine',
            'help'
        ];

        // Remove duplicates and sort
        return [...new Set(commands)].sort();
    }

    /**
     * Get sidebar data combining all scene information
     * @param state The current game state
     * @returns SidebarData object with formatted display strings
     */
    async getSidebarData(state: GameState): Promise<SidebarData> {
        const scene = this.sceneMechanicsService.getScene(state.currentScene);
        if (!scene) {
            return {
                commands: '',
                objects: '',
                exits: '',
                score: 0,
                moves: 0
            };
        }

        const knownItems = this.objectMechanicsService.getAllKnownObjects(scene);
        const availableCommands = this.getAvailableCommands(scene);
        const availableExits = this.movementMechanicsService.getAvailableExits(scene);

        return {
            commands: availableCommands.join('\n'),
            objects: knownItems.map(obj => obj.name).join('\n'),
            exits: availableExits.map(exit =>
                exit.direction.charAt(0).toUpperCase() + exit.direction.slice(1)
            ).join('\n'),
            score: state.score,
            moves: state.moves
        };
    }
}
