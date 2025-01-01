import { Scene } from "../../models";

export const northOfHouse: Scene = {
    id: 'northOfHouse',
    name: 'North of House',
    region: 'Above Ground',
    light: true,
    descriptions: {
        default: 'You are facing the north side of a white house. There is no door here, and all the windows are boarded up. To the north a narrow path winds through the trees. A tall chimney rises up the side of the house.',
        states: {
            'chimneySoot': 'You are facing the north side of a white house. There is no door here, and all the windows are boarded up. To the north a narrow path winds through the trees. A tall chimney, now covered in soot, rises up the side of the house.'
        }
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
            name: 'Windows',
            visibleOnEntry: true,
            canTake: false,
            descriptions: {
                default: 'The windows are all boarded.'
            },
            interactions: {
                examine: {
                    message: 'The windows are boarded up with strong wooden boards.'
                },
                open: {
                    message: 'The windows are all boarded up.',
                    failureMessage: 'The windows are all boarded up.'
                },
                break: {
                    message: 'The boards are too strong to break.',
                    failureMessage: 'The boards are too strong to break.'
                },
                unboard: {
                    message: 'The boards are fastened securely, and cannot be removed.',
                    failureMessage: 'The boards are fastened securely, and cannot be removed.'
                }
            }
        },
        boards: {
            id: 'boards',
            name: 'Wooden Boards',
            visibleOnEntry: true,
            canTake: false,
            descriptions: {
                default: 'The boards are firmly fastened across all the windows.'
            },
            interactions: {
                examine: {
                    message: 'The boards are made of strong wood and are firmly nailed to the window frames.'
                },
                take: {
                    message: 'The boards are securely fastened and cannot be removed.',
                    failureMessage: 'The boards are securely fastened and cannot be removed.'
                }
            }
        },
        chimney: {
            id: 'chimney',
            name: 'Chimney',
            visibleOnEntry: true,
            canTake: false,
            descriptions: {
                default: 'The chimney rises up the side of the house. Wisps of smoke occasionally drift out.',
                states: {
                    'chimneySoot': 'The chimney is now covered in soot from your attempt to climb down it.'
                }
            },
            interactions: {
                examine: {
                    message: 'The chimney is made of old red brick. It rises up the side of the house and disappears over the roof.',
                    states: {
                        'chimneySoot': 'The chimney is now covered in soot. It was not a good idea to try climbing down it.'
                    }
                },
                climb: {
                    message: 'You try to climb the chimney but quickly get covered in soot. This was not a good idea.',
                    grantsFlags: ['chimneySoot'],
                    score: -3
                },
                enter: {
                    message: 'The chimney is much too narrow to enter.',
                    failureMessage: 'The chimney is much too narrow to enter.'
                }
            }
        },
        path: {
            id: 'path',
            name: 'Path',
            visibleOnEntry: true,
            canTake: false,
            descriptions: {
                default: 'The path is bordered by tall trees on both sides. Their branches form a canopy overhead.'
            },
            interactions: {
                examine: {
                    message: 'The path is narrow and winds its way through the dense trees to the north. The trees cast deep shadows across the path.'
                }
            }
        },
        trees: {
            id: 'trees',
            name: 'Trees',
            visibleOnEntry: true,
            canTake: false,
            descriptions: {
                default: 'The trees are very tall and old, their branches forming a thick canopy overhead.'
            },
            interactions: {
                examine: {
                    message: 'The trees are ancient and imposing. Their branches intertwine overhead, creating a natural tunnel effect along the path.'
                },
                climb: {
                    message: 'The lowest branches are too high to reach.',
                    failureMessage: 'The lowest branches are too high to reach.'
                }
            }
        }
    },
    exits: [
        {
            direction: 'west',
            targetScene: 'westOfHouse',
            description: 'The path leads west along the house.'
        },
        {
            direction: 'east',
            targetScene: 'clearing',
            description: 'A path leads northeast to a clearing.'
        },
        {
            direction: 'north',
            targetScene: 'forest',
            description: 'A narrow path winds through the trees to the north.'
        }
    ]
};
