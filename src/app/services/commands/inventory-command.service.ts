import { Injectable } from '@angular/core';
import { CommandHandler } from './command-handler.interface';
import { InventoryMechanicsService } from '../mechanics/inventory-mechanics.service';

@Injectable({
    providedIn: 'root'
})
export class InventoryCommandService implements CommandHandler {
    constructor(
        private inventoryMechanics: InventoryMechanicsService
    ) {}

    canHandle(command: string): boolean {
        const cmd = command.toLowerCase();
        return cmd === 'inventory' || cmd === 'i' || cmd === 'inv';
    }

    handle(command: string): string {
        return this.inventoryMechanics.listInventory();
    }
}
