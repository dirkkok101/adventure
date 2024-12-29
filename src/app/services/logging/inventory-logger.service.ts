import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class InventoryLoggerService {
    logInventoryAdd(objectId: string, currentInventory: string[]): void {
        console.log('\n=== Adding to Inventory ===');
        console.log('Details:', {
            addedObject: objectId,
            inventoryBefore: currentInventory,
            inventoryAfter: [...currentInventory, objectId]
        });
    }

    logInventoryRemove(objectId: string, currentInventory: string[]): void {
        console.log('\n=== Removing from Inventory ===');
        console.log('Details:', {
            removedObject: objectId,
            inventoryBefore: currentInventory,
            inventoryAfter: currentInventory.filter(id => id !== objectId)
        });
    }

    logInventoryCheck(inventory: string[]): void {
        console.log('\n=== Inventory Check ===');
        console.log('Current Inventory:', inventory);
    }

    logObjectUse(objectId: string, targetId: string | undefined, inventory: string[]): void {
        console.log('\n=== Object Use ===');
        console.log('Details:', {
            object: objectId,
            target: targetId,
            hasObject: inventory.includes(objectId)
        });
    }
}
