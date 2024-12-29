import { Scene } from '../../models/game-state.model';

export const southOfHouse: Scene = {
    id: 'southOfHouse',
    name: 'South of House',
    region: 'outside',
    light: true,
    descriptions: {
        default: 'You are facing the south side of a white house. There is no door here, and all the windows are boarded up. A path leads around the house to the east and west.'
    },
    objects: {
        house: {
            id: 'house',
            name: 'White House',
            visibleOnEntry: true,
            canTake: false,
            descriptions: {
                default: 'The house is a beautiful colonial house which is painted white. It is clear that the owners must have been quite wealthy.'
            },
            interactions: {
                examine: {
                    message: 'The house is a beautiful colonial house which is painted white. It is clear that the owners must have been quite wealthy.'
                },
                enter: {
                    message: 'There is no entrance on this side of the house.',
                    failureMessage: 'There is no entrance on this side of the house.'
                }
            }
        },
        windows: {
            id: 'windows',
            name: 'Boarded Windows',
            visibleOnEntry: true,
            canTake: false,
            descriptions: {
                default: 'The windows are all boarded up.'
            },
            interactions: {
                examine: {
                    message: 'The windows are all firmly boarded up.'
                },
                open: {
                    message: 'The windows are boarded up.',
                    failureMessage: 'The windows are firmly boarded up.'
                },
                break: {
                    message: 'The boards are too strong to break.',
                    failureMessage: 'The boards are too strong to break.'
                }
            }
        }
    },
    exits: [
        {
            direction: 'east',
            targetScene: 'behindHouse',
            description: 'The path leads around to the east side of the house.'
        },
        {
            direction: 'west',
            targetScene: 'westOfHouse',
            description: 'The path leads around to the west side of the house.'
        },
        {
            direction: 'north',
            targetScene: 'southOfHouse',
            description: 'The windows are all boarded up on this side of the house.',
            failureMessage: 'The windows are all boarded up on this side of the house.'
        }
    ]
};
