import {Injectable} from '@angular/core';
import {GameStateService} from '../game-state.service';
import {MechanicsBaseService} from './mechanics-base.service';
import {Scene, SceneObject} from '../../models';
import {SceneMechanicsService} from './scene-mechanics.service';
import {ProgressMechanicsService} from './progress-mechanics.service';
import {LightMechanicsService} from './light-mechanics.service';
import {InventoryMechanicsService} from './inventory-mechanics.service';
import {ScoreMechanicsService} from './score-mechanics.service';
import {ContainerMechanicsService} from './container-mechanics.service';

@Injectable({
  providedIn: 'root'
})
export class ObjectMechanicsService extends MechanicsBaseService {
  constructor(
    gameStateService: GameStateService,
    protected sceneMechanicsService: SceneMechanicsService,
    protected progressMechanicsService: ProgressMechanicsService,
    protected lightMechanicsService: LightMechanicsService,
    protected inventoryMechanicsService: InventoryMechanicsService,
    protected scoreMechanicsService: ScoreMechanicsService,
    protected containerMechanicsService: ContainerMechanicsService
  ) {
    super(gameStateService)
  }

  getAllKnownObjects(scene: Scene): SceneObject[] {
    // Get all readable objects from both inventory, scene and open containers
    const inventoryItems = this.inventoryMechanicsService.listInventory(scene);
    const knownSceneItems = this.getKnownObjectsNotOwned(scene);

    return [...inventoryItems, ...knownSceneItems];
  }

  getKnownObjectsNotOwned(scene: Scene): SceneObject[] {
    const sceneItems = this.sceneMechanicsService.getSceneObjects(scene)
      .filter(obj => !this.inventoryMechanicsService.hasItem(obj)
        && this.lightMechanicsService.isObjectVisible(obj));

    const containerItems: SceneObject[] = [];
    const openContainers = this.containerMechanicsService.getSceneContainers(scene)
      .filter(container => container.isOpen);
    for (let container of openContainers) {
      const contents = this.containerMechanicsService.getContainerContents(scene, container)
        .filter(obj => !this.inventoryMechanicsService.hasItem(obj));
      containerItems.push(...contents);
    }

    return [...sceneItems, ...containerItems];
  }
}
