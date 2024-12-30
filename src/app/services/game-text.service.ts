import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class GameTextService {
    private gameText: string[] = [];
    private gameTextSubject = new BehaviorSubject<string[]>([]);
    gameText$ = this.gameTextSubject.asObservable();

    getGameText() {
        return this.gameText$;
    }

    addText(text: string) {
        this.gameText = [...this.gameText, text];
        this.gameTextSubject.next(this.gameText);
    }

    clearGameText() {
        this.gameText = [];
        this.gameTextSubject.next(this.gameText);
    }

    loadGameText(text: string[]) {
        this.gameText = text;
        this.gameTextSubject.next(this.gameText);
    }
}
