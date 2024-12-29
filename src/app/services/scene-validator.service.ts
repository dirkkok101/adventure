import { Injectable } from '@angular/core';
import { Scene, SceneObject, SceneExit } from '../models/game-state.model';

@Injectable({
    providedIn: 'root'
})
export class SceneValidatorService {
    validateScene(scene: Scene): string[] {
        const errors: string[] = [];

        // Check required scene properties
        if (!scene.id) {
            errors.push('Scene must have an id');
        }

        if (!scene.descriptions || !scene.descriptions.default) {
            errors.push('Scene must have a default description');
        }

        // Validate objects if they exist
        if (scene.objects) {
            Object.entries(scene.objects).forEach(([id, obj]) => {
                const objectErrors = this.validateObject(id, obj);
                errors.push(...objectErrors);
            });
        }

        // Validate exits if they exist
        if (scene.exits) {
            scene.exits.forEach((exit, index) => {
                const exitErrors = this.validateExit(exit, index);
                errors.push(...exitErrors);
            });
        }

        return errors;
    }

    private validateObject(id: string, object: SceneObject): string[] {
        const errors: string[] = [];

        if (!object.descriptions || !object.descriptions.default) {
            errors.push(`Object '${id}' must have a default description`);
        }

        if (object.interactions) {
            Object.entries(object.interactions).forEach(([verb, interaction]) => {
                if (!interaction.message) {
                    errors.push(`Interaction '${verb}' for object '${id}' must have a message`);
                }
            });
        }

        if (object.canTake === undefined) {
            errors.push(`Object '${id}' must specify if it can be taken`);
        }

        if (object.visibleOnEntry === undefined) {
            errors.push(`Object '${id}' must specify if it is visible on entry`);
        }

        return errors;
    }

    private validateExit(exit: SceneExit, index: number): string[] {
        const errors: string[] = [];

        if (!exit.direction) {
            errors.push(`Exit ${index} must have a direction`);
        }

        if (!exit.targetScene) {
            errors.push(`Exit ${index} must have a target scene`);
        }

        if (!exit.description) {
            errors.push(`Exit ${index} must have a description`);
        }

        return errors;
    }
}