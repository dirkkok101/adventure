import { Scene, SceneObject, SceneInteraction } from '../../models/game-state.model';

export const livingRoom: Scene = {
    id: 'livingRoom',
    name: 'Living Room',
    region: 'Inside House',
    light: true,
    descriptions: {
        default: 'You are in the living room of the white house. A comfortable-looking trophy case stands against the northern wall. A wooden door with gothic lettering leads east, and an archway leads west into the kitchen. There\'s a large oriental rug in the center of the room.',
        states: {
            'rugMoved': 'You are in the living room of the white house. A comfortable-looking trophy case stands against the northern wall. A wooden door with gothic lettering leads east, and an archway leads west into the kitchen. A large oriental rug has been moved aside, revealing a closed trap door in the floor.'
        }
    },
    objects: {
        trophyCase: {
            id: 'trophyCase',
            name: 'Trophy Case',
            visibleOnEntry: true,
            canTake: false,
            isContainer: true,
            isOpen: false,
            capacity: 10,
            descriptions: {
                default: 'The trophy case is securely fastened to the wall.',
                contents: 'The trophy case contains:',
                empty: 'The trophy case is empty.'
            },
            interactions: {
                examine: {
                    message: 'The trophy case is made of fine wood and glass. It\'s currently closed.',
                    states: {
                        'trophyCaseOpen': 'The trophy case is made of fine wood and glass. It\'s open, ready to display treasures.'
                    }
                },
                open: {
                    message: 'You unlock the trophy case and open it carefully.',
                    grantsFlags: ['trophyCaseOpen'],
                    score: 5
                },
                close: {
                    message: 'You close the trophy case.',
                    grantsFlags: ['!trophyCaseOpen'],
                    requiredFlags: ['trophyCaseOpen']
                }
            } as { [key: string]: SceneInteraction }
        } as SceneObject,
        orientalRug: {
            id: 'orientalRug',
            name: 'Oriental Rug',
            visibleOnEntry: true,
            canTake: false,
            descriptions: {
                default: 'A large, ornate oriental rug covers part of the floor.',
                states: {
                    'rugMoved': 'The oriental rug has been moved aside, revealing a trap door.'
                }
            },
            interactions: {
                examine: {
                    message: 'The rug is extremely ornate, with intricate patterns woven in rich colors. It looks like it could be moved.',
                    states: {
                        'rugMoved': 'The ornate rug has been moved aside, revealing a trap door beneath.'
                    }
                },
                move: {
                    message: 'With a great effort, you move the rug aside, revealing a trap door underneath!',
                    grantsFlags: ['rugMoved'],
                    revealsObjects: ['trapDoor'],
                    score: 5,
                    requiredFlags: ['!rugMoved']
                },
                take: {
                    message: 'The rug is too heavy to take.',
                    failureMessage: 'The rug is far too heavy to carry.'
                }
            } as { [key: string]: SceneInteraction }
        } as SceneObject,
        trapDoor: {
            id: 'trapDoor',
            name: 'Trap Door',
            visibleOnEntry: false,
            canTake: false,
            descriptions: {
                default: 'A sturdy wooden trap door is set into the floor.',
                states: {
                    'trapDoorOpen': 'The trap door is open, revealing a dark passage below.'
                }
            },
            interactions: {
                examine: {
                    message: 'The trap door is made of sturdy wood with iron fittings. It\'s currently closed.',
                    states: {
                        'trapDoorOpen': 'The trap door is open, revealing a dark passage leading down into what appears to be a cellar.'
                    },
                    requiredFlags: ['rugMoved']
                },
                open: {
                    message: 'You pull on the iron ring and the trap door opens with a creak.',
                    grantsFlags: ['trapDoorOpen'],
                    requiredFlags: ['rugMoved', '!trapDoorOpen'],
                    score: 5
                },
                close: {
                    message: 'You close the trap door with a solid thud.',
                    grantsFlags: ['!trapDoorOpen'],
                    requiredFlags: ['trapDoorOpen']
                }
            } as { [key: string]: SceneInteraction }
        } as SceneObject,
        gothicDoor: {
            id: 'gothicDoor',
            name: 'Gothic Door',
            visibleOnEntry: true,
            canTake: false,
            descriptions: {
                default: 'A wooden door with gothic lettering leads east.',
                states: {
                    'gothicDoorOpen': 'The gothic door is open, leading east.'
                }
            },
            interactions: {
                examine: {
                    message: 'The door is made of solid wood with ornate gothic lettering carved into it. It appears to lead to a closet.',
                    states: {
                        'gothicDoorOpen': 'The ornate gothic door is open, revealing a closet beyond.'
                    }
                },
                read: {
                    message: 'The gothic lettering spells out "Closet" in an ornate, medieval style.'
                },
                open: {
                    message: 'The door opens smoothly.',
                    grantsFlags: ['gothicDoorOpen'],
                    requiredFlags: ['!gothicDoorOpen']
                },
                close: {
                    message: 'You close the gothic door.',
                    grantsFlags: ['!gothicDoorOpen'],
                    requiredFlags: ['gothicDoorOpen']
                }
            } as { [key: string]: SceneInteraction }
        } as SceneObject,
        sword: {
            id: 'sword',
            name: 'Elvish Sword',
            visibleOnEntry: true,
            canTake: true,
            weight: 3,
            descriptions: {
                default: 'A finely crafted elvish sword lies against the wall. It glows with a faint blue light.',
                states: {
                    'swordTaken': 'The elvish sword glows with a faint blue light.'
                }
            },
            interactions: {
                examine: {
                    message: 'The sword is of elvish workmanship. Strange runes are inscribed on its blade, and it glows with a faint blue light.',
                    states: {
                        'swordTaken': 'The elvish sword glows brighter when danger is near.'
                    }
                },
                take: {
                    message: 'You pick up the elvish sword. It feels perfectly balanced.',
                    grantsFlags: ['hasSword', 'swordTaken'],
                    score: 10
                }
            }
        },
        lantern: {
            id: 'lantern',
            name: 'Brass Lantern',
            visibleOnEntry: true,
            canTake: true,
            weight: 2,
            descriptions: {
                default: 'A brass lantern is here.',
                states: {
                    'lanternOn': 'A brass lantern is here, providing light.',
                    'lanternDead': 'A brass lantern is here, but its batteries are dead.'
                }
            },
            interactions: {
                examine: {
                    message: 'The brass lantern looks sturdy and well-made. It requires batteries to work.',
                    states: {
                        'lanternOn': 'The brass lantern is on, casting a warm light.',
                        'lanternDead': 'The lantern\'s batteries are dead.'
                    }
                },
                take: {
                    message: 'Taken.',
                    grantsFlags: ['hasLantern']
                },
                on: {
                    message: 'The lantern is now on.',
                    grantsFlags: ['lanternOn', 'hasLight'],
                    requiredFlags: ['hasLantern', '!lanternOn', '!lanternDead'],
                    failureMessage: 'The lantern won\'t turn on. It needs batteries.'
                },
                off: {
                    message: 'The lantern is now off.',
                    grantsFlags: ['!lanternOn', '!hasLight'],
                    requiredFlags: ['lanternOn']
                }
            }
        },
        batteries: {
            id: 'batteries',
            name: 'Fresh Batteries',
            visibleOnEntry: true,
            canTake: true,
            weight: 1,
            descriptions: {
                default: 'There are some fresh batteries here.'
            },
            interactions: {
                examine: {
                    message: 'These are fresh D-cell batteries, perfect for the brass lantern.'
                },
                take: {
                    message: 'Taken.',
                    grantsFlags: ['hasBatteries']
                },
                use: {
                    message: 'You install the fresh batteries in the lantern.',
                    grantsFlags: ['lanternReady', '!lanternDead', '!hasBatteries'],
                    requiredFlags: ['hasLantern', 'hasBatteries'],
                    score: 5
                }
            }
        }
    },
    exits: [
        {
            direction: 'west',
            targetScene: 'kitchen',
            description: 'An archway leads west to the kitchen.'
        },
        {
            direction: 'east',
            targetScene: 'closet',
            description: 'A wooden door with gothic lettering leads east.',
            requiredFlags: ['gothicDoorOpen'],
            failureMessage: 'The gothic door is closed.'
        },
        {
            direction: 'down',
            targetScene: 'cellar',
            description: 'The trap door leads down to the cellar.',
            requiredFlags: ['trapDoorOpen', 'hasLight'],
            failureMessage: 'The trap door needs to be opened first.'
        }
    ]
};
