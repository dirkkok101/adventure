import { Scene, SceneObject, SceneInteraction } from '../../models/game-state.model';

export const attic: Scene = {
    id: 'attic',
    name: 'Attic',
    region: 'Inside House',
    light: false,
    descriptions: {
        default: 'This is the attic. The only exit is a stairway leading down. A large window overlooks the front lawn.',
        dark: 'It is pitch dark. You are likely to be eaten by a grue.',
        states: {
            'hasLight': 'This is the attic. The room is cluttered with old furniture covered in white sheets. A thick rope is tied to a sturdy wooden beam. A large window overlooks the front lawn, and a stairway leads down.'
        }
    },
    objects: {
        furniture: {
            id: 'furniture',
            name: 'Covered Furniture',
            visibleOnEntry: true,
            descriptions: {
                default: 'Several pieces of old furniture are covered with white sheets.'
            },
            interactions: {
                examine: {
                    message: 'The furniture is covered with dusty white sheets. You can make out the shapes of chairs, tables, and what might be an old wardrobe.',
                    requiredFlags: ['hasLight']
                },
                uncover: {
                    message: 'You pull back one of the sheets, revealing some old wooden furniture. Nothing particularly interesting.',
                    requiredFlags: ['hasLight']
                }
            } as { [key: string]: SceneInteraction }
        } as SceneObject,
        window: {
            id: 'window',
            name: 'Large Window',
            visibleOnEntry: true,
            descriptions: {
                default: 'A large window offers a view of the front lawn.'
            },
            interactions: {
                examine: {
                    message: 'Through the window, you can see the front lawn far below. The window seems to be stuck shut.',
                    requiredFlags: ['hasLight']
                },
                open: {
                    message: 'The window is stuck and won\'t budge.',
                    failureMessage: 'The window appears to be painted shut.',
                    requiredFlags: ['hasLight']
                },
                break: {
                    message: 'That would be both noisy and dangerous.',
                    requiredFlags: ['hasLight']
                }
            } as { [key: string]: SceneInteraction }
        } as SceneObject,
        rope: {
            id: 'rope',
            name: 'Thick Rope',
            visibleOnEntry: true,
            canTake: false,
            descriptions: {
                default: 'A thick rope is securely tied to one of the wooden beams.'
            },
            interactions: {
                examine: {
                    message: 'The rope is thick and sturdy, securely tied to one of the wooden beams. It looks strong enough to climb.',
                    requiredFlags: ['hasLight']
                },
                take: {
                    message: 'The rope is securely tied to the beam and cannot be removed.',
                    failureMessage: 'The rope is tied too tightly to the beam.',
                    requiredFlags: ['hasLight']
                },
                climb: {
                    message: 'The rope might be useful for climbing down, but not up.',
                    requiredFlags: ['hasLight']
                }
            } as { [key: string]: SceneInteraction }
        } as SceneObject,
        beam: {
            id: 'beam',
            name: 'Wooden Beam',
            visibleOnEntry: true,
            descriptions: {
                default: 'Sturdy wooden beams support the roof of the attic.'
            },
            interactions: {
                examine: {
                    message: 'The wooden beam is sturdy and well-secured. A thick rope is tied to it.',
                    requiredFlags: ['hasLight']
                }
            } as { [key: string]: SceneInteraction }
        } as SceneObject
    },
    exits: [
        {
            direction: 'down',
            targetScene: 'kitchen',
            description: 'A stairway leads down to the kitchen.',
            requiredFlags: ['hasLight'],
            failureMessage: 'It\'s too dark to risk going down the stairs. You might fall!'
        }
    ]
};
