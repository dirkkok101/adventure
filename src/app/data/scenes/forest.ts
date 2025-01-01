import { Scene } from "../../models";

export const forest: Scene = {
    id: 'forest',
    name: 'Forest',
    region: 'Above Ground',
    light: true,
    descriptions: {
        default: 'This is a forest, with trees in all directions. To the east, there appears to be sunlight.',
        visited: 'This is a dimly lit forest, with large trees all around.',
        states: {
            'forestVisited': 'This is a dimly lit forest, with large trees all around. A path leads north to a clearing.',
            'triedClimbing': 'This is a dimly lit forest, with large trees all around. The branches of the trees are still too high to reach.'
        }
    },
    objects: {
        tree: {
            id: 'tree',
            name: 'Tree',
            descriptions: {
                default: 'The trees of the forest are tall with branches far above your reach.',
                examine: 'The trees here are quite tall, with branches too high to reach.',
                states: {
                    'triedClimbing': 'The trees remain tall with branches far above your reach, despite your earlier attempts to climb them.'
                }
            },
            visibleOnEntry: true,
            canTake: false,
            moveable: false,
            interactions: {
                examine: {
                    message: 'The trees here are quite tall, with branches too high to reach.',
                    states: {
                        'triedClimbing': 'The trees remain tall with branches far above your reach, despite your earlier attempts to climb them.'
                    }
                },
                climb: {
                    message: 'The lowest branches are out of your reach.',
                    grantsFlags: ['triedClimbing'],
                    score: 5
                },
                push: {
                    message: 'You can\'t move such a large tree.',
                    failureMessage: 'The trees are firmly rooted and cannot be pushed.'
                },
                pull: {
                    message: 'You can\'t move such a large tree.',
                    failureMessage: 'The trees are firmly rooted and cannot be pulled.'
                },
                up: {
                    message: 'The lowest branches are out of your reach.',
                    grantsFlags: ['triedClimbing']
                }
            }
        }
    },
    exits: [
        {
            direction: 'north',
            targetScene: 'clearing',
            description: 'The forest continues to the north, leading to a clearing.',
            score: 5
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
