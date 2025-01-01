import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { SidebarData } from "../components/game/game-sidebar/game-sidebar.component";
import { CommandService } from "./commands/command.service";
import { GameInitializationService } from "./game-initialization.service";
import { GameStateService } from "./game-state.service";
import { GameTextService } from "./game-text.service";
import { FlagMechanicsService } from "./mechanics/flag-mechanics.service";
import { ProgressMechanicsService } from "./mechanics/progress-mechanics.service";
import { SaveLoadService } from "./save-load.service";
import { SceneMechanicsService } from "./mechanics/scene-mechanics.service";
import { GameState, Scene, SceneObject } from "../models";

/**
 * Main game orchestration service responsible for coordinating game flow and state management.
 * Acts as the central hub for game operations, coordinating between various services and mechanics.
 * 
 * Key responsibilities:
 * - Game initialization and state management
 * - Command processing and execution
 * - Scene navigation and state updates
 * - Game saving and loading
 * - Score and progress tracking
 * - UI text management
 */
@Injectable({
    providedIn: 'root'
})
export class GameService {
    /**
     * Constructs a new GameService instance.
     * 
     * @param gameState GameStateService instance for managing game state
     * @param sceneService SceneService instance for scene management
     * @param commandService CommandService instance for command processing
     * @param saveLoad SaveLoadService instance for game saving and loading
     * @param gameText GameTextService instance for UI text management
     * @param progress ProgressMechanicsService instance for score and progress tracking
     * @param gameInit GameInitializationService instance for game initialization
     * @param flagMechanics FlagMechanicsService instance for flag management
     */
    constructor(
        private gameState: GameStateService,
        private sceneService: SceneMechanicsService,
        private commandService: CommandService,
        private saveLoad: SaveLoadService,
        private gameText: GameTextService,
        private progress: ProgressMechanicsService,
        private gameInit: GameInitializationService,
        private flagMechanics: FlagMechanicsService
    ) {}

    /**
     * Initializes a new game session.
     * Sets up initial game state, scene, and player position.
     * @throws Error if initialization fails
     */
    async initializeGame(): Promise<void> {
        try {
            await this.gameInit.initializeGame();
        } catch (error) {
            console.error('Error initializing game:', error);
            this.gameText.addText('Error initializing game. Please refresh the page.');
            throw error;
        }
    }

    /**
     * Get an observable of the game state for reactive UI updates
     * @returns Observable of the current GameState
     */
    getCurrentState$(): Observable<GameState> {
        return this.gameState.state$;
    }

    /**
     * Get the current game state synchronously. Only use this in services for game logic processing.
     * @internal Use getCurrentState$() in components instead
     */
    getCurrentState(): GameState {
        return this.gameState.getCurrentState();
    }

    /**
     * Process and execute a player command
     * Coordinates between CommandService for parsing/execution and GameText for output
     * @param input The raw command string from the player
     */
    async processCommand(input: string): Promise<void> {
        if (!input.trim()) {
            return;
        }

        const state = this.gameState.getCurrentState();
        if (state.gameOver) {
            this.gameText.addText('The game is over. Start a new game or load a saved game.');
            return;
        }

        // Add command to output with a > prefix
        this.gameText.addText(`> ${input}`);

        this.progress.incrementMoves();
        const result = await this.commandService.processInput(input);
        
        if (result.message) {
            this.gameText.addText(result.message);
        }

        if (result.success && result.incrementTurn) {
            this.progress.incrementTurns();
        }
    }

    /**
     * Process and execute a player input
     * Coordinates between processCommand for command processing and GameText for output
     * @param input The raw input string from the player
     */
    async processInput(input: string): Promise<void> {
        try {
            await this.processCommand(input);
        } catch (error) {
            console.error('Error processing input:', error);
            this.gameText.addText('An error occurred while processing your command.');
        }
    }

    /**
     * Get suggestions for the player based on the current game state
     * @param input The raw input string from the player
     * @returns Array of suggestion strings
     */
    async getSuggestions(input: string): Promise<string[]> {
        console.log('GameService.getSuggestions called with:', input);
        const suggestions = await this.commandService.getSuggestions(input);
        console.log('GameService.getSuggestions got suggestions:', suggestions);
        return suggestions;
    }

    /**
     * Start a new game session
     * Initializes game state, scene, and player position
     * @throws Error if initialization fails
     */
    async startNewGame(): Promise<void> {
        try {
            await this.gameInit.startNewGame();
            await this.saveGame(); // Auto-save on new game
        } catch (error) {
            console.error('Error starting new game:', error);
            this.gameText.addText('Error starting new game. Please try again.');
            throw error;
        }
    }

    /**
     * Load a saved game session
     * Restores game state, scene, and player position from saved data
     * @returns True if loading is successful, false otherwise
     */
    async loadGame(): Promise<boolean> {
        try {
            const success = await this.saveLoad.loadGame();
            if (success) {
                const state = this.gameState.getCurrentState();
                const scene = this.sceneService.getScene(state.currentScene);
                if (scene) {
                    this.gameText.addText(this.sceneService.getSceneDescription(scene));
                }
            }
            return success;
        } catch (error) {
            console.error('Error loading game:', error);
            this.gameText.addText('Error loading game. The save file might be corrupted.');
            return false;
        }
    }

    /**
     * Save the current game session
     * Saves game state, scene, and player position to storage
     * @returns True if saving is successful, false otherwise
     */
    async saveGame(): Promise<boolean> {
        try {
            await this.saveLoad.saveGame();
            return true;
        } catch (error) {
            console.error('Error saving game:', error);
            this.gameText.addText('Error saving game. Please try again.');
            return false;
        }
    }

    /**
     * Check if a saved game session exists
     * @returns True if a saved game exists, false otherwise
     */
    async hasSavedGame(): Promise<boolean> {
        try {
            return await this.saveLoad.hasSavedGame();
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
    async resetGame(): Promise<void> {
        try {
            this.saveLoad.clearSavedGame();
            await this.gameInit.resetGame();
        } catch (error) {
            console.error('Error resetting game:', error);
            this.gameText.addText('Error resetting game. Please refresh the page.');
            throw error;
        }
    }

    /**
     * Get the current game text
     * @returns Observable of the current game text
     */
    getGameText() {
        return this.gameText.getGameText$();
    }

    /**
     * Get all known items in a scene, including visible objects and items in open containers
     * @param scene The current scene
     * @returns Array of known items
     */
    private async getKnownItems(scene: Scene): Promise<SceneObject[]> {
        if (!scene.objects) return [];

        const visibleObjects = this.sceneService.getVisibleObjects(scene);
        const knownItems = [...visibleObjects];

        // Add items from open containers
        for (const obj of visibleObjects) {
            if (obj.isContainer && this.flagMechanics.isContainerOpen(obj.id)) {
                const state = this.getCurrentState();
                const containerContents = state.containers[obj.id] || [];
                for (const itemId of containerContents) {
                    const item = scene.objects[itemId];
                    if (item) {
                        knownItems.push(item);
                    }
                }
            }
        }

        return knownItems;
    }

    /**
     * Get available commands based on scene state and known items
     * @param scene The current scene
     * @returns Array of available commands
     */
    private async getAvailableCommands(scene: Scene): Promise<string[]> {
        // Default commands always available
        const commands = [
            'look',
            'inventory',
            'examine',
            'help'
        ];

        // Get known items and their states
        const knownItems = await this.getKnownItems(scene);
        
        // Add item-specific commands based on state
        for (const item of knownItems) {
            // Add examine command for the specific item
            commands.push(`examine ${item.name}`);

            // Container-specific commands
            if (item.isContainer) {
                const isOpen = this.flagMechanics.isContainerOpen(item.id);
                commands.push(isOpen ? `close ${item.name}` : `open ${item.name}`);

                // If container is open and has items, add take commands
                if (isOpen) {
                    const state = this.getCurrentState();
                    const contents = state.containers[item.id] || [];
                    if (contents.length > 0) {
                        for (const contentId of contents) {
                            const contentItem = scene.objects?.[contentId];
                            if (contentItem?.canTake) {
                                commands.push(`take ${contentItem.name}`);
                            }
                        }
                    }
                }
            }

            // Add take command if item can be taken
            if (item.canTake) {
                commands.push(`take ${item.name}`);
            }
        }

        // Add movement commands from available exits
        const exits = this.sceneService.getAvailableExits(scene);
        for (const exit of exits) {
            commands.push(`go ${exit.direction}`);
            // Add shorthand directions
            commands.push(exit.direction);
        }

        // Remove duplicates and sort
        return [...new Set(commands)].sort();
    }

    /**
     * Get sidebar data combining all scene information
     * @param state The current game state
     * @returns SidebarData object with formatted display strings
     */
    async getSidebarData(state: GameState): Promise<SidebarData> {
        const scene = this.sceneService.getScene(state.currentScene);
        if (!scene) {
            return {
                commands: '',
                objects: '',
                exits: '',
                score: 0,
                moves: 0
            };
        }

        const knownItems = await this.getKnownItems(scene);
        const availableCommands = await this.getAvailableCommands(scene);
        const availableExits = this.sceneService.getAvailableExits(scene);

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