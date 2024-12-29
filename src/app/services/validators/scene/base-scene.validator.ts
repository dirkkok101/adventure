import { Scene } from '../../../models/game-state.model';
import { ValidationError } from '../validation-error.model';

export class BaseSceneValidator {
    validateScene(sceneId: string, scene: Scene): ValidationError[] {
        const errors: ValidationError[] = [];

        // Basic scene validation
        if (!scene.id) {
            errors.push({
                scene: sceneId,
                type: 'error',
                message: 'Scene missing ID'
            });
        }

        if (!scene.name) {
            errors.push({
                scene: sceneId,
                type: 'error',
                message: 'Scene missing name'
            });
        }

        if (!scene.descriptions?.default) {
            errors.push({
                scene: sceneId,
                type: 'error',
                message: 'Scene missing default description'
            });
        }

        // Validate dark scenes have dark descriptions
        if (!scene.light && !scene.descriptions.dark) {
            errors.push({
                scene: sceneId,
                type: 'warning',
                message: 'Dark scene missing dark description'
            });
        }

        return errors;
    }
}
