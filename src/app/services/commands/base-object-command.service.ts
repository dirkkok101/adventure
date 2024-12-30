import { Injectable } from '@angular/core';
import { GameCommand, SceneObject } from '../../models/game-state.model';
import { SceneService } from '../scene.service';
import { GameStateService } from '../game-state.service';
import { StateMechanicsService } from '../mechanics/state-mechanics.service';
import { FlagMechanicsService } from '../mechanics/flag-mechanics.service';
import { ProgressMechanicsService } from '../mechanics/progress-mechanics.service';

@Injectable()
export abstract class BaseObjectCommandService {
    constructor(
        protected gameState: GameStateService,
        protected sceneService: SceneService,
        protected stateMechanics: StateMechanicsService,
        protected flagMechanics: FlagMechanicsService,
        protected progress: ProgressMechanicsService
    ) {}

    abstract canHandle(command: GameCommand): boolean;

    abstract handle(command: GameCommand): { success: boolean; message: string; incrementTurn: boolean };

    protected handleObjectCommand(command: GameCommand): { success: boolean; message: string; incrementTurn: boolean } {
        if (!command.object) {
            return { 
                success: false, 
                message: `What do you want to ${command.verb}?`,
                incrementTurn: false 
            };
        }

        const scene = this.sceneService.getCurrentScene();
        if (!scene) {
            return { 
                success: false, 
                message: 'Error: No current scene',
                incrementTurn: false 
            };
        }

        // Find object in scene or inventory
        const state = this.gameState.getCurrentState();
        const sceneObjects = scene.objects || {};
        const object = Object.values(sceneObjects).find(obj => 
            obj.name.toLowerCase() === command.object?.toLowerCase() && 
            (state.inventory[obj.id] || obj.id in sceneObjects)
        );

        if (!object) {
            return { 
                success: false, 
                message: `You don't see any ${command.object} here.`,
                incrementTurn: false 
            };
        }

        // Add to known objects
        this.gameState.updateState(state => ({
            ...state,
            knownObjects: new Set([...state.knownObjects, object.id])
        }));

        // Handle interaction
        const interaction = object.interactions?.[command.verb];
        if (!interaction) {
            return { 
                success: false, 
                message: `You can't ${command.verb} the ${object.name}.`,
                incrementTurn: false 
            };
        }

        const result = this.stateMechanics.handleInteraction(interaction);
        return {
            success: result.success,
            message: result.message,
            incrementTurn: result.success
        };
    }

    protected findObjectInScene(objectName: string): SceneObject | null {
        const scene = this.sceneService.getCurrentScene();
        if (!scene?.objects) return null;

        return Object.values(scene.objects).find(obj => 
            obj.name.toLowerCase() === objectName.toLowerCase()
        ) || null;
    }

    protected findObjectInInventory(objectName: string): SceneObject | null {
        const state = this.gameState.getCurrentState();
        const scene = this.sceneService.getCurrentScene();
        if (!scene?.objects) return null;

        return Object.values(scene.objects).find(obj => 
            obj.name.toLowerCase() === objectName.toLowerCase() && 
            state.inventory[obj.id]
        ) || null;
    }

    protected findObject(objectName: string): SceneObject | null {
        return this.findObjectInScene(objectName) || this.findObjectInInventory(objectName);
    }
}
