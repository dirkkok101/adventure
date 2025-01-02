import {Scene, SceneExit} from "../../../models";
import { ValidationError } from '../validation-error.model';

export class SceneExitValidator {
    validateSceneExits(sceneId: string, scene: Scene): ValidationError[] {
        const errors: ValidationError[] = [];
        const path = `${sceneId}.exits`;

        if (!scene.exits) {
            errors.push({
                scene: sceneId,
                type: 'error',
                message: 'Scene has no exits defined',
                path,
                fix: 'Add exits array to scene'
            });
            return errors;
        }

        scene.exits.forEach((exit, index) => {
            errors.push(...this.validateExit(sceneId, exit, index));
        });

        return errors;
    }

    private validateExit(sceneId: string, exit: SceneExit, index: number): ValidationError[] {
        const errors: ValidationError[] = [];
        const path = `exits[${index}]`;

        // Required fields
        if (!exit.direction) {
            errors.push({
                scene: sceneId,
                type: 'error',
                message: `Exit ${index} missing required field: direction`,
                path: `${path}.direction`,
                fix: 'Add direction (north, south, east, west, up, down)'
            });
        }

        if (!exit.targetScene) {
            errors.push({
                scene: sceneId,
                type: 'error',
                message: `Exit ${index} missing required field: targetScene`,
                path: `${path}.targetScene`,
                fix: 'Add targetScene (id of destination scene)'
            });
        }

        if (!exit.description) {
            errors.push({
                scene: sceneId,
                type: 'error',
                message: `Exit ${index} missing required field: description`,
                path: `${path}.description`,
                fix: 'Add description of where the exit leads'
            });
        }

        // Validate conditional exits
        if (exit.requiredFlags && exit.requiredFlags.length > 0 && !exit.failureMessage) {
            errors.push({
                scene: sceneId,
                type: 'warning',
                message: `Exit ${index} has required flags but no failure message`,
                path: `${path}.failureMessage`,
                fix: 'Add failureMessage for when flags are not met'
            });
        }

        return errors;
    }
}
