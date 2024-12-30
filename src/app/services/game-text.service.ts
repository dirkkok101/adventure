import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

interface TextTemplate {
    [key: string]: string;
}

interface TextTemplateParams {
    [key: string]: string | number;
}

@Injectable({
    providedIn: 'root'
})
export class GameTextService {
    private gameText: string[] = [];
    private gameTextSubject = new BehaviorSubject<string[]>([]);
    gameText$ = this.gameTextSubject.asObservable();

    // Text templates for different types of messages
    private readonly templates: TextTemplate = {
        // Landing page messages
        'landing.savedGame': "Saved Game Found\nTurns: {turns} | Moves: {moves} | Score: {score}/{maxScore}",
        'landing.newGame': "Start a new adventure...",

        // Error messages
        'error.itemNotFound': "You don't see any {item} here.",
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

        // Success messages
        'success.take': "You take the {item}.",
        'success.drop': "You drop the {item}.",
        'success.putInContainer': "You put the {item} in the {container}.",
        'success.removeFromContainer': "You take the {item} from the {container}.",
        'success.open': "You open the {item}.",
        'success.close': "You close the {item}.",
        'success.read': "You read the {item}.",
        'success.use': "You use the {item}.",

        // Inventory messages
        'inventory.empty': "You aren't carrying anything.",
        'inventory.carrying': "You are carrying:\n{items}",
        'inventory.weight': "Total weight: {current}/{max}",

        // Container messages
        'container.empty': "The {container} is empty.",
        'container.contents': "The {container} contains:\n{items}",

        // Score messages
        'score.current': "Your score is {score} out of {max}.",
        'score.increase': "Your score increases by {points} points.",

        // Light messages
        'light.tooDark': "It is pitch dark. You can't see a thing.",
        'light.darkWarning': "It's getting dark. You should find a light source.",

        // Movement messages
        'movement.cantGo': "You can't go that way.",
        'movement.blocked': "The way is blocked.",
        'movement.newRoom': "You move to {room}."
    };

    /**
     * Get game output history
     */
    getGameText(): string[] {
        return [...this.gameText];
    }

    /**
     * Get game output history as an observable
     */
    getGameText$() {
        return this.gameText$;
    }

    /**
     * Add text to game output history
     */
    addText(text: string) {
        this.gameText = [...this.gameText, text];
        this.gameTextSubject.next(this.gameText);
    }

    /**
     * Clear game output history
     */
    clearGameText() {
        this.gameText = [];
        this.gameTextSubject.next(this.gameText);
    }

    /**
     * Load game output history
     */
    loadGameText(text: string[]) {
        this.gameText = text;
        this.gameTextSubject.next(this.gameText);
    }

    /**
     * Get a text template with parameters filled in
     */
    get(key: string, params?: TextTemplateParams): string {
        const template = this.templates[key];
        if (!template) {
            console.warn(`Missing text template: ${key}`);
            return '';
        }

        if (!params) {
            return template;
        }

        return template.replace(/{(\w+)}/g, (match, key) => {
            return params[key]?.toString() || match;
        });
    }

    /**
     * Add a text template
     */
    addTemplate(key: string, template: string) {
        this.templates[key] = template;
    }

    /**
     * Check if a template exists
     */
    hasTemplate(key: string): boolean {
        return key in this.templates;
    }
}
