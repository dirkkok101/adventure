import { Scene, SceneInteraction, SceneObject } from "../../models";


export const cellar: Scene = {
    id: 'cellar',
    name: 'Cellar',
    region: 'Inside House',
    light: false,
    descriptions: {
        default: 'You are in a dark and damp cellar with a narrow passageway leading north, and a crawlway to the south. On the west is the bottom of a steep metal ramp which is unclimbable.',
        dark: 'It is pitch dark. You are likely to be eaten by a grue.',
        states: {
            'hasLight': 'You are in a dark and damp cellar. The walls are dirt and stone, with a steep metal ramp leading up to the west. A narrow passageway leads north, and a crawlway leads south.'
        }
    },
    objects: {
        ramp: {
            id: 'ramp',
            name: 'Metal Ramp',
            visibleOnEntry: true,
            canTake: false,
            descriptions: {
                default: 'The ramp is made of smooth, polished metal and is too steep to climb.'
            },
            interactions: {
                examine: {
                    message: 'The ramp is made of smooth, polished metal. It\'s far too steep and slippery to climb.',
                    requiredFlags: ['hasLight']
                },
                climb: {
                    message: 'The ramp is too steep and slippery to climb.',
                    failureMessage: 'You would just slide back down.',
                    requiredFlags: ['hasLight']
                }
            } as { [key: string]: SceneInteraction }
        } as SceneObject,
        grue: {
            id: 'grue',
            name: 'Grue',
            visibleOnEntry: false,
            canTake: false,
            descriptions: {
                default: 'The grue is a sinister, lurking presence in the dark places of the earth. Its favorite diet is adventurers, but its insatiable appetite is tempered by its fear of light.'
            },
            interactions: {
                examine: {
                    message: 'The grue is a sinister, lurking presence in the dark places of the earth. Its favorite diet is adventurers, but its insatiable appetite is tempered by its fear of light.',
                    requiredFlags: ['!hasLight']
                }
            } as { [key: string]: SceneInteraction }
        } as SceneObject,
        walls: {
            id: 'walls',
            name: 'Cellar Walls',
            visibleOnEntry: true,
            canTake: false,
            descriptions: {
                default: 'The walls are made of dirt and stone, with occasional wooden support beams.'
            },
            interactions: {
                examine: {
                    message: 'The walls are made of dirt and stone, held up by wooden support beams. They\'re cold and slightly damp to the touch.',
                    requiredFlags: ['hasLight']
                }
            } as { [key: string]: SceneInteraction }
        } as SceneObject
    },
    exits: [
        {
            direction: 'up',
            targetScene: 'livingRoom',
            description: 'A steep metal ramp leads up.',
            failureMessage: 'The ramp is too steep and slippery to climb.'
        },
        {
            direction: 'north',
            targetScene: 'northCellar',
            description: 'A narrow passageway leads north.',
            requiredFlags: ['hasLight'],
            failureMessage: 'It\'s too dark to risk going that way. You might be eaten by a grue!'
        },
        {
            direction: 'south',
            targetScene: 'southCellar',
            description: 'A crawlway leads south.',
            requiredFlags: ['hasLight'],
            failureMessage: 'It\'s too dark to risk going that way. You might be eaten by a grue!'
        }
    ]
};
