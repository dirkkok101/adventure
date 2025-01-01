import { Scene, SceneInteraction, SceneObject } from "../../models";

export const behindHouse: Scene = {
    id: 'behindHouse',
    name: 'Behind House',
    region: 'Outside House',
    light: true,
    descriptions: {
        default: 'You are behind the white house. A path leads into the forest to the east. In one corner of the house there is a small window which is slightly ajar.',
        states: {
            'windowOpen': 'You are behind the white house. A path leads into the forest to the east. In one corner of the house there is a small window which is open.',
            'windowBroken': 'You are behind the white house. A path leads into the forest to the east. In one corner of the house there is a small window which has been broken.'
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
                }
            } as { [key: string]: SceneInteraction }
        } as SceneObject,
        window: {
            id: 'window',
            name: 'Small Window',
            visibleOnEntry: true,
            canTake: false,
            descriptions: {
                default: 'The window is slightly ajar.',
                states: {
                    'windowOpen': 'The window is open.',
                    'windowBroken': 'The window is broken, with shards of glass around it.'
                }
            },
            interactions: {
                examine: {
                    message: 'The window is slightly ajar. You might be able to open it further.',
                    states: {
                        'windowOpen': 'The window is wide open, revealing the kitchen inside.',
                        'windowBroken': 'The window is broken. You can see the kitchen inside through the broken glass.'
                    }
                },
                open: {
                    message: 'With a little effort, you open the window wide enough to enter.',
                    grantsFlags: ['windowOpen'],
                    requiredFlags: ['!windowOpen', '!windowBroken'],
                    score: 5
                },
                close: {
                    message: 'You close the window.',
                    removesFlags: ['windowOpen'],
                    requiredFlags: ['windowOpen', '!windowBroken']
                },
                break: {
                    message: 'You break the window. Not very subtle, but effective.',
                    grantsFlags: ['windowBroken'],
                    requiredFlags: ['!windowBroken'],
                    score: -5
                },
                enter: {
                    message: 'You climb through the window into the kitchen.',
                    targetScene: 'kitchen',
                    requiredFlags: ['windowOpen', '!windowBroken']
                }
            } as { [key: string]: SceneInteraction }
        } as SceneObject,
        pump: {
            id: 'pump',
            name: 'Water Pump',
            visibleOnEntry: true,
            canTake: false,
            descriptions: {
                default: 'An old-fashioned water pump stands here. It looks like it might still work.'
            },
            interactions: {
                examine: {
                    message: 'The pump appears to be in working condition, though it might need to be primed with water to get started.'
                },
                pump: {
                    message: 'You pump the handle, but nothing comes out. It needs to be primed with water first.',
                    failureMessage: 'You pump the handle, but nothing comes out. It needs to be primed with water first.',
                    requiredFlags: ['!pumpPrimed']
                },
                prime: {
                    message: 'You pour water into the pump. After a few pumps, water starts flowing freely!',
                    requiredFlags: ['hasBottle', 'bottleWater', '!pumpPrimed'],
                    grantsFlags: ['pumpPrimed'],
                    score: 10
                },
                fill: {
                    message: 'You fill the bottle with clean water from the pump.',
                    requiredFlags: ['hasBottle', 'pumpPrimed', '!bottleWater'],
                    grantsFlags: ['bottleWater'],
                    score: 3
                }
            } as { [key: string]: SceneInteraction }
        } as SceneObject,
        path: {
            id: 'path',
            name: 'Forest Path',
            visibleOnEntry: true,
            canTake: false,
            descriptions: {
                default: 'A forest path leads east from here.'
            },
            interactions: {
                examine: {
                    message: 'The path leads into what appears to be a dense forest.'
                }
            } as { [key: string]: SceneInteraction }
        } as SceneObject
    },
    exits: [
        {
            direction: 'east',
            targetScene: 'forest',
            description: 'A forest path leads east.'
        },
        {
            direction: 'north',
            targetScene: 'northOfHouse',
            description: 'The path leads north along the house.'
        },
        {
            direction: 'south',
            targetScene: 'southOfHouse',
            description: 'The path leads south along the house.'
        },
        {
            direction: 'west',
            targetScene: 'kitchen',
            description: 'You can enter the kitchen through the window.',
            requiredFlags: ['windowOpen', '!windowBroken'],
            failureMessage: 'You need to open the window first.'
        }
    ]
};
