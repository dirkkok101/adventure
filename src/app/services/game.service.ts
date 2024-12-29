import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Scene, SceneObject, SceneExit, GameState, SceneInteraction } from '../models/game-state.model';
import { scenes } from '../data/scenes';
import { verbSynonyms } from '../data/game-mechanics';
import { ParserService } from './parser.service';
import { SceneValidatorService } from './validators/scene/scene-validator.service';
import { checkRequiredFlags, processInteraction } from '../data/game-mechanics';

interface Command {
    verb: string;
    object?: string;
    target?: string;
    preposition?: string;
    originalInput: string;
}

@Injectable({
    providedIn: 'root'
})
export class GameService {
    private gameState: GameState;
    private gameStateSubject: BehaviorSubject<GameState>;
    gameState$: Observable<GameState>;

    private gameTextSubject = new BehaviorSubject<string[]>([]);
    gameText$ = this.gameTextSubject.asObservable();

    private sidebarSubject = new BehaviorSubject<{
        commands: string;
        objects: string;
        score: number;
        moves: number;
    }>({
        commands: '',
        objects: '',
        score: 0,
        moves: 0
    });
    sidebar$ = this.sidebarSubject.asObservable();

    constructor(
        private parser: ParserService,
        private sceneValidator: SceneValidatorService
    ) {
        this.gameState = {
            currentScene: '',
            inventory: [],
            flags: [],
            score: 0,
            moves: 0,
            gameOver: false,
            gameWon: false
        };
        this.gameStateSubject = new BehaviorSubject<GameState>(this.gameState);
        this.gameState$ = this.gameStateSubject.asObservable();
        this.validateScenes();
        this.initializeScene('westOfHouse');
        this.updateSidebar();
        const response = this.executeCommand({ verb: 'look', originalInput: 'look' });
        this.appendToGameText(response);
    }

    private validateScenes(): void {
        const validationSummary = this.sceneValidator.validateAllScenes();
        if (validationSummary.errors > 0 || validationSummary.warnings > 0) {
            console.log(validationSummary.toString());
        }
    }

    processInput(input: string): string {
        this.appendToGameText(`> ${input}`);
        const command = this.parser.parseCommand(input);
        const response = this.executeCommand(command);
        this.appendToGameText(response);
        this.updateSidebar();
        return response;
    }

    private executeCommand(command: Command): string {
        const currentScene = scenes[this.gameState.currentScene];
        if (!currentScene) {
            return 'Error: Invalid scene';
        }

        switch (command.verb) {
            case 'look':
                return this.lookAround(currentScene);
            case 'inventory':
                return this.checkInventory();
            case 'take':
                if (!command.object) {
                    return 'What do you want to take?';
                }
                return this.takeObject(command.object);
            case 'use':
                if (!command.object) {
                    return 'What do you want to use?';
                }
                return this.useObject(command.object, command.target);
            case 'go':
                if (!command.object) {
                    return 'Which direction do you want to go?';
                }
                return this.move(command.object);
            default:
                if (!command.object) {
                    return 'I don\'t understand that command.';
                }
                return this.handleObjectInteraction(command.verb, command.object);
        }
    }

    private lookAround(scene: Scene): string {
        let description = scene.descriptions.default;

        const visibleObjects = scene.objects ? 
            Object.entries(scene.objects)
                .filter(([_, obj]) => obj.visibleOnEntry)
                .map(([_, obj]) => obj.descriptions.default)
            : [];

        if (visibleObjects.length > 0) {
            description += '\n\n' + visibleObjects.join('\n');
        }

        if (scene.exits && scene.exits.length > 0) {
            description += '\n\nObvious exits:';
            scene.exits.forEach(exit => {
                description += `\n${exit.direction} - ${exit.description}`;
            });
        }

        return description;
    }

    private checkInventory(): string {
        if (this.gameState.inventory.length === 0) {
            return 'You are not carrying anything.';
        }
        return 'You are carrying:\n' + this.gameState.inventory.join('\n');
    }

    private takeObject(objectId: string): string {
        const scene = scenes[this.gameState.currentScene];
        if (!scene.objects?.[objectId]) {
            return 'That object is not here.';
        }

        const object = scene.objects[objectId];
        if (object.canTake) {
            this.gameState.inventory.push(objectId);
            this.gameStateSubject.next(this.gameState);
            return `You took the ${objectId}.`;
        }

        return 'You cannot take that.';
    }

    private useObject(objectId: string, targetId?: string): string {
        const scene = scenes[this.gameState.currentScene];
        if (!scene.objects?.[objectId]) {
            return 'That object is not here.';
        }

        const object = scene.objects[objectId];
        if (object.interactions?.['use']) {
            const interaction = object.interactions['use'];
            if (interaction) {
                return processInteraction(interaction, this.gameState);
            }
        }

        return 'You cannot use that.';
    }

    private move(direction: string): string {
        const scene = scenes[this.gameState.currentScene];
        if (!scene.exits) {
            return 'There are no exits in that direction.';
        }

        const exit = scene.exits.find(exit => exit.direction === direction);
        if (!exit) {
            return 'You cannot go that way.';
        }

        if (exit.requiredFlags && !checkRequiredFlags(this.gameState, exit.requiredFlags)) {
            return exit.failureMessage || 'You cannot go that way.';
        }

        this.initializeScene(exit.targetScene);
        return this.lookAround(scenes[exit.targetScene]);
    }

    private handleObjectInteraction(verb: string, objectId: string): string {
        const scene = scenes[this.gameState.currentScene];
        if (!scene.objects?.[objectId]) {
            return 'That object is not here.';
        }

        const object = scene.objects[objectId];
        const interaction = object.interactions?.[verb];
        if (interaction) {
            return processInteraction(interaction, this.gameState);
        }

        return 'You cannot do that.';
    }

    private initializeScene(sceneId: string): void {
        this.gameState.currentScene = sceneId;
        this.gameStateSubject.next(this.gameState);
    }

    private getSceneDescription(scene: Scene): string {
        let description = scene.descriptions.default;

        const availableExits = scene.exits ? scene.exits.map(exit => exit.direction).join(', ') : 'none';
        description += `\n\nExits: ${availableExits}`;

        const visibleObjects = scene.objects ? 
            Object.entries(scene.objects)
                .filter(([_, obj]) => obj.visibleOnEntry)
                .map(([id, obj]) => `${obj.name} - ${obj.descriptions.default}`)
            : [];

        if (visibleObjects.length > 0) {
            description += '\n\nYou can see:\n' + visibleObjects.join('\n');
        }

        return description;
    }

    private appendToGameText(text: string) {
        const currentText = this.gameTextSubject.value;
        this.gameTextSubject.next([...currentText, text]);
    }

    private updateSidebar() {
        const scene = scenes[this.gameState.currentScene];
        if (!scene) return;

        const baseCommands = ['look', 'inventory'];
        const availableExits = scene.exits ? 
            scene.exits
                .filter(exit => !exit.requiredFlags || checkRequiredFlags(this.gameState, exit.requiredFlags))
                .map(exit => exit.direction)
            : [];

        const allCommands = [...baseCommands, ...availableExits].sort().join(', ');
        
        const visibleObjects = scene.objects ? 
            Object.entries(scene.objects)
                .filter(([_, obj]) => obj.visibleOnEntry)
                .map(([id, _]) => id)
            : [];
        
        const knownObjects = [...visibleObjects, ...this.gameState.inventory].sort().join(', ');

        this.sidebarSubject.next({
            commands: allCommands,
            objects: knownObjects,
            score: this.gameState.score,
            moves: this.gameState.moves
        });
    }
}
