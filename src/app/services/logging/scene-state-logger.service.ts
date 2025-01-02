import { Injectable } from '@angular/core';
import { Scene, SceneExit } from '../../models';

@Injectable({
    providedIn: 'root'
})
export class SceneStateLoggerService {
    logSceneInitialization(sceneId: string): void {
        console.log('\n=== Scene Initialization ===');
        console.log('Scene ID:', sceneId);
    }

    logSceneDescription(scene: Scene, flags: string[]): void {
        console.log('\n=== Scene Description ===');
        console.log('Scene:', {
            id: scene.id,
            description: scene.descriptions.default,
            stateDescriptions: scene.descriptions.states,
            currentFlags: flags
        });
    }

    logObjectVisibility(objectId: string, details: {
        isVisibleByDefault: boolean;
        isRevealedByFlag: boolean;
        isVisibleByExamineFlags: boolean;
        flags: string[];
    }): void {
        console.log(`\n=== Object Visibility Check: ${objectId} ===`);
        console.log('Details:', details);
    }

    logObjectReveal(objectId: string, scene: Scene): void {
        console.log('\n=== Object Reveal ===');
        console.log('Object:', {
            id: objectId,
            object: scene.objects?.[objectId]
        });
    }

    logMovementCheck(direction: string, scene: Scene, exit?: SceneExit): void {
        console.log('\n=== Movement Check ===');
        console.log('Details:', {
            direction,
            currentScene: scene.id,
            exit: exit ? {
                direction: exit.direction,
                targetScene: exit.targetScene,
                requiredFlags: exit.requiredFlags
            } : 'No exit found'
        });
    }

    logVisibleObjects(objects: string[]): void {
        console.log('\n=== Visible Objects ===');
        console.log('Objects:', objects);
    }

    logAvailableExits(exits: SceneExit[]): void {
        console.log('\n=== Available Exits ===');
        console.log('Exits:', exits.map(e => ({
            direction: e.direction,
            targetScene: e.targetScene
        })));
    }
}
