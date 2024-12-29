import { Scene } from '../../models/game-state.model';

export const kitchen: Scene = {
    id: 'kitchen',
    name: 'Kitchen',
    region: 'house',
    light: true,
    descriptions: {
        default: 'You are in the kitchen of the white house. A table seems to have been used recently for the preparation of food. A passage leads to the west and a dark staircase can be seen leading upward. The door to the east leads to the cellar. A chimney leads down and to the east. On the table is an elongated brown sack, smelling of hot peppers.',
        states: {
            'tableEmpty': 'You are in the kitchen of the white house. A table seems to have been used recently for the preparation of food. A passage leads to the west and a dark staircase can be seen leading upward. The door to the east leads to the cellar. A chimney leads down and to the east.'
        }
    },
    objects: {
        table: {
            id: 'table',
            name: 'Table',
            visibleOnEntry: true,
            descriptions: {
                default: 'The table seems to have been used recently for the preparation of food.',
                states: {
                    'tableEmpty': 'The table is empty.'
                }
            },
            interactions: {
                examine: {
                    message: 'The table seems to have been used recently for the preparation of food.',
                    states: {
                        'tableEmpty': 'The table is empty.'
                    }
                }
            }
        },
        sack: {
            id: 'sack',
            name: 'Brown Sack',
            visibleOnEntry: true,
            descriptions: {
                default: 'The brown sack smells of hot peppers.',
                empty: 'The brown sack is empty.'
            },
            interactions: {
                examine: {
                    message: 'The brown sack smells of hot peppers and appears to contain something.',
                    states: {
                        'sackEmpty': 'The brown sack is empty.'
                    }
                },
                take: {
                    message: 'Taken.',
                    grantsFlags: ['hasSack'],
                    score: 5
                }
            },
            isContainer: true,
            capacity: 5,
            canTake: true,
            weight: 1
        }
    },
    exits: [
        {
            direction: 'west',
            targetScene: 'livingRoom',
            description: 'A passage leads to the west.',
            requiredFlags: []
        },
        {
            direction: 'up',
            targetScene: 'attic',
            description: 'A dark staircase can be seen leading upward.',
            requiredFlags: ['hasLight'],
            failureMessage: 'The stairs are too dark to climb without a light source.'
        },
        {
            direction: 'east',
            targetScene: 'cellar',
            description: 'A door to the east leads to the cellar.',
            requiredFlags: []
        }
    ]
};
