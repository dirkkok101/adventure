import { Scene } from '../../../models/game-state.model';
import { ValidationError } from '../validation-error.model';
import { scenes } from '../../../data/scenes';

export class SceneExitValidator {
    validateSceneExits(sceneId: string, scene: Scene): ValidationError[] {
        const errors: ValidationError[] = [];

        if (!scene.exits) {
            errors.push({
                scene: sceneId,
                type: 'warning',
                message: 'Scene has no exits'
            });
            return errors;
        }

        for (const exit of scene.exits) {
            if (!exit.direction) {
                errors.push({
                    scene: sceneId,
                    type: 'error',
                    message: 'Exit missing direction'
                });
            }

            if (!exit.targetScene) {
                errors.push({
                    scene: sceneId,
                    type: 'error',
                    message: `Exit ${exit.direction} missing target scene`
                });
            } else if (!scenes[exit.targetScene]) {
                errors.push({
                    scene: sceneId,
                    type: 'error',
                    message: `Exit ${exit.direction} points to non-existent scene ${exit.targetScene}`
                });
            }

            if (!exit.description) {
                errors.push({
                    scene: sceneId,
                    type: 'warning',
                    message: `Exit ${exit.direction} missing description`
                });
            }

            if (exit.requiredFlags && exit.requiredFlags.length > 0 && !exit.failureMessage) {
                errors.push({
                    scene: sceneId,
                    type: 'warning',
                    message: `Exit ${exit.direction} has required flags but no failure message`
                });
            }
        }

        return errors;
    }
}
