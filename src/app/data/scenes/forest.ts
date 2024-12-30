import { Scene } from '../../models/game-state.model';

export const forest: Scene = {
    id: 'forest',
    name: 'Forest',
    region: 'Above Ground',
    light: true,
    descriptions: {
        default: 'This is a forest, with trees in all directions. To the east, there appears to be sunlight.',
        states: {
            'forestVisited': 'This is a dimly lit forest, with large trees all around.'
        }
    },
    objects: {
        tree: {
            id: 'tree',
            name: 'Tree',
            visibleOnEntry: true,
            canTake: false,
            descriptions: {
                default: 'A tall tree with thick branches.'
            },
            interactions: {
                climb: {
                    message: 'You climb the tree but find nothing interesting.',
                    score: 5
                }
            }
        }
    },
    exits: [
        {
            direction: 'north',
            targetScene: 'clearing',
            description: 'The forest continues to the north.'
        },
        {
            direction: 'south',
            targetScene: 'southOfHouse',
            description: 'You can see the house to the south.'
        },
        {
            direction: 'east',
            targetScene: 'westOfHouse',
            description: 'The white house is visible to the east.'
        }
    ]
};
