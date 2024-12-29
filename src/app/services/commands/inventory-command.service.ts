import { Injectable } from '@angular/core';
import { Command } from '../../models/command.model';
import { CommandHandler } from './command-handler.interface';
import { InventoryService } from '../inventory.service';

@Injectable({
    providedIn: 'root'
})
export class InventoryCommandService implements CommandHandler {
    constructor(private inventoryService: InventoryService) {}

    canHandle(command: Command): boolean {
        return command.verb === 'inventory' || command.verb === 'i';
    }

    handle(_: Command): string {
        return this.inventoryService.checkInventory();
    }
}
