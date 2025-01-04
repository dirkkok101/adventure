import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";

/**
 * Interface for text template key-value pairs
 */
interface TextTemplate {
    [key: string]: string;
}

/**
 * Interface for text template parameter substitutions
 */
interface TextTemplateParams {
    [key: string]: string | number;
}

/**
 * Service responsible for managing game text output and templating.
 * Provides a reactive system for game text updates and standardized message templates.
 *
 * Key responsibilities:
 * - Game text output management
 * - Text templating and parameter substitution
 * - Standard message formatting
 * - Error and success message handling
 */
@Injectable({
    providedIn: 'root'
})
export class GameTextService {
    private gameText: string[] = [];
    private gameTextSubject = new BehaviorSubject<string[]>([]);
    /** Observable stream of game text updates */
    gameText$ = this.gameTextSubject.asObservable();

    /** Text templates for different types of messages */
    private readonly templates: TextTemplate = {
        // Landing page messages
        'landing.savedGame': "Saved Game Found\nTurns: {turns} | Moves: {moves} | Score: {score}/{maxScore}",
        'landing.newGame': "Start a new adventure...",

        // Error messages
        'error.objectNotFound': "You don't see any {item} here.",
        'error.notHoldingItem': "You don't have the {item}.",
        'error.containerNotFound': "You don't see any {container} here.",
        'error.containerFull': "The {container} is full.",
        'error.containerClosed': "The {container} is closed.",
        'error.containerLocked': "The {container} is locked.",
        'error.tooHeavy': "The {item} is too heavy to carry.",
        'error.cantTake': "You can't take the {item}.",
        'error.cantOpen': "You can't open the {item}.",
        'error.cantClose': "You can't close the {item}.",
        'error.cantRead': "You can't read the {item}.",
        'error.cantUse': "You can't use the {item}.",
        'error.tooDark': "It's too dark to see.",
        'error.noEffect': "Nothing happens.",
        'error.actionNotAllowed': "You can't do that right now.",
        'error.cantPerformAction': "You can't {action} the {item}.",
        'error.noScene': "Error: No current scene found for command {action}.",
        'error.noObject': "Error: No object or target supplied in command {action}",
        'error.action': "Unable to {action} the {item}.",
        'error.itemInInventory': "You already have the {item}.",
        'error.turnOnlyOnOff': "You can only turn light sources on or off.",
        'error.cantTurnOnOff': "You can't turn the {item} on or off.'",
        'error.objectNotVisible': "The {item} isn't visible.",
        'error.movementDirection': "I don't understand that direction.",
      'error.invalidContainer': "{container} is not a valid container.",

        // Success messages
        'success.take': "You take the {item}.",
        'success.drop': "You drop the {item}.",
        'success.putInContainer': "You put the {item} in the {container}.",
        'success.removeFromContainer': "You take the {item} from the {container}.",
        'success.open': "You open the {item}.",
      'success.move': "You move the {item}.",
        'success.close': "You close the {item}.",
        'success.read': "You read the {item}.",
        'success.use': "You use the {item}.",

        // Inventory messages
        'inventory.empty': "You aren't carrying anything.",
        'inventory.carrying': "You are carrying:\n{items}",
        'inventory.weight': "Total weight: {current}/{max}",

        // Container messages
        'container.empty': "The {container} is empty.",
        'container.locked': "The {container} is locked.",
      'container.alreadyOpen': "The {container} already open.",
      'container.alreadyClosed': "The {container} already closed.",
      'container.open': "You open the {container}.",
      'container.close': "You close the {container}.",
        'container.contents': "The {container} contains:\n{items}",

        // Score messages
        'score.current': "Your score is {score} out of {max}.",
        'score.increase': "Your score increases by {points} points.",

        // Light messages
        'light.tooDark': "It is pitch dark. You can't see a thing.",
        'light.darkWarning': "It's getting dark. You should find a light source.",
        'light.notLightSource': "The {item} is not a light source.",
        'light.isDead': "The {item} is dead.",
        'light.isOn': "The {item} is now on.",
        'light.isOff': "The {item} is now off.",

        // Movement messages
        'movement.cantGo': "You can't go that way.",
        'movement.blocked': "The way is blocked.",
        'movement.newRoom': "You go {exit}.",
        'movement.noExit': "You don't see any {exit} here.",
        'movement.exitNotVisible': "It is too dark to see the {item} clearly.",
        'movement.exitNotOpenable': "The {exit} can't be {action}ed.",
        'movement.exitLocked': "The {exit} is locked.",
        'movement.exitAlreadyInState': "The {exit} is already {action}.",
        'movement.exitStateChanged': "You {action} the {exit}.",

      // Scene
      'scene.objectAlreadyInScene': "{item} is already in the scene.",
      'scene.addObject': "{item} added to the {scene}.",
      'scene.removeObject': "{item} removed from the {scene}.",
    };

    /**
     * Get the current game text array
     * @returns Observable of the current game text array
     */
    getGameText$() {
        return this.gameText$;
    }

    /**
     * Get the current game text array
     * @returns Current game text array
     */
    getGameText(): string[] {
        return [...this.gameText];
    }

    /**
     * Add a new line of text to the game output
     * @param text Text to add
     */
    addText(text: string) {
        this.gameText = [...this.gameText, text];
        this.gameTextSubject.next(this.gameText);
    }

    /**
     * Clear all game text
     */
    clearGameText() {
        this.gameText = [];
        this.gameTextSubject.next(this.gameText);
    }

    /**
     * Load game text from an array
     * @param text Array of text to load
     */
    loadGameText(text: string[]) {
        this.gameText = text;
        this.gameTextSubject.next(this.gameText);
    }

    /**
     * Get a templated message with parameter substitution
     * @param key Template key
     * @param params Optional parameters for substitution
     * @returns Formatted message string
     */
    get(key: string, params?: TextTemplateParams): string {
        const template = this.templates[key];
        if (!template) {
            console.warn(`No template found for key: ${key}`);
            return key;
        }

        if (!params) {
            return template;
        }

        return template.replace(/{(\w+)}/g, (match, key) => {
            return params[key]?.toString() || match;
        });
    }

}
