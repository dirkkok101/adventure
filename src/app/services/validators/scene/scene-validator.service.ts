import { Injectable } from '@angular/core';
import { scenes } from '../../../data/scenes';
import { ValidationError } from '../validation-error.model';
import { BaseSceneValidator } from './base-scene.validator';
import { SceneObjectValidator } from './scene-object.validator';
import { SceneExitValidator } from './scene-exit.validator';

@Injectable({
    providedIn: 'root'
})
export class SceneValidatorService {
    private baseValidator = new BaseSceneValidator();
    private objectValidator = new SceneObjectValidator();
    private exitValidator = new SceneExitValidator();

    validateAllScenes(): ValidationError[] {
        const errors: ValidationError[] = [];
        
        // Check if we have any scenes
        if (Object.keys(scenes).length === 0) {
            errors.push({
                scene: 'global',
                type: 'error',
                message: 'No scenes defined in the game'
            });
            return errors;
        }

        // Validate each scene
        for (const [sceneId, scene] of Object.entries(scenes)) {
            errors.push(
                ...this.baseValidator.validateScene(sceneId, scene),
                ...this.objectValidator.validateSceneObjects(sceneId, scene),
                ...this.exitValidator.validateSceneExits(sceneId, scene)
            );
        }

        return errors;
    }
}
