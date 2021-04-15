class SuperSelect {
  
  static ACTIVE_LAYERS = [
    'DrawingsLayer',
    'TilesLayer',
    'TokenLayer'
  ]

  static _mergedLayer;

  static _getInitialState() {
    switch(game.settings.get("super-select", "startEnabled")) {
      case 'yes':
        return true;
      case 'no':
        return false;
      case 'remember':
        return SuperSelect._mergedLayer ? true : false;
      default:
        return false;
    }
  }

  static _activateSuperMode() {
    let mergedPlaceables = []
    SuperSelect.ACTIVE_LAYERS.forEach(layer => {
      const enriched = canvas.getLayer(layer).placeables.map(child => {
        if (child.updateSource == undefined) {
          child.updateSource = function () {};
        }
        return child;
      });
      mergedPlaceables = mergedPlaceables.concat(enriched);
    });
    canvas.activeLayer.objects.children = mergedPlaceables;
    SuperSelect._mergedLayer = canvas.activeLayer.name;
  }

  static _deactivateSuperMode(layer) {
    const activeLayer = layer ?? canvas.activeLayer
    const placeables = activeLayer.placeables;
    const originalPlaceables = placeables.filter(child => child.layer.name == activeLayer.name);
    activeLayer.releaseAll();
    activeLayer.objects.children = originalPlaceables;
    SuperSelect._mergedLayer = undefined;
  }

  static _simulateSuperClick() {
    if (SuperSelect.ACTIVE_LAYERS.includes(canvas.activeLayer.name))
      $("#controls li.control-tool.toggle[title='Super Select']")?.click();
  }

  static _refreshSuperSelect(forceRemember) {
    if (SuperSelect._mergedLayer) {
      console.log("Super Select: Cleanup Merged Layer: " + SuperSelect._mergedLayer);
      SuperSelect._deactivateSuperMode(canvas.getLayer(SuperSelect._mergedLayer));
    }
    if (canvas && (forceRemember || SuperSelect._getInitialState())) {
      SuperSelect._activateSuperMode();
    }
  }

  static _releaseDifferentPlaceables(entity) {
    canvas.activeLayer.placeables.filter(placeable => {
      let cond1 = placeable._controlled;
      let cond2 = placeable.layer.name != entity.layer.name;
      let cond3 = placeable.id != entity.id;
      return cond1 && cond2 && cond3
    }).forEach(placeable => {
      placeable.release()
    });
  }

  static _toggleSuperMode(toggled) {
    if (toggled) {
      SuperSelect._activateSuperMode();
    } else {
      SuperSelect._deactivateSuperMode();
    }
  }

  static _inSuperSelectMode() {
    return ui.controls
      .controls.find(c => c.name == ui.controls.activeControl)
      .tools.find(t => t.name == "superselect")?.active;
  }

  static _getControlButtons(controls){
    controls.forEach( control => {
      const cond1 = (canvas && SuperSelect.ACTIVE_LAYERS.includes(control.layer) && canvas.activeLayer.name == control.layer);
      const cond2 = (!canvas && control.layer == 'TokenLayer');
      if (cond1 || cond2) {
        control.tools.push({
          name: "superselect",
          title: "Super Select",
          icon: "fas fa-object-group",
          toggle: true,
          active: SuperSelect._getInitialState(),
          visible: game.user.isGM,
          onClick: SuperSelect._toggleSuperMode,
          layer: control.layer,
          activeTool: "select"
        });
        SuperSelect._refreshSuperSelect();
      }
    })
  }

}

Hooks.on('getSceneControlButtons', (controls) => {
  if (game.user.isGM) {
    SuperSelect._getControlButtons(controls)
  }
});

// Selecting and De-Selecting management

Hooks.on('controlTile', (tile, into) => {
  if (SuperSelect._inSuperSelectMode() && into)
    SuperSelect._releaseDifferentPlaceables(tile);
});

Hooks.on('controlDrawing', (drawing, into) => {
  if (SuperSelect._inSuperSelectMode() && into)
    SuperSelect._releaseDifferentPlaceables(drawing);
});

Hooks.on('controlToken', (token, into) => {
  if (SuperSelect._inSuperSelectMode() && into)
    SuperSelect._releaseDifferentPlaceables(token);
});

// Handling foreign drawers outside of appropriate layer

Hooks.on('createDrawing', () => {
  if (canvas.activeLayer.name != 'DrawingsLayer' && SuperSelect._inSuperSelectMode()) {
    console.log("Super Select: Refreshing because of new drawings outside of activeLayer")
    SuperSelect._refreshSuperSelect(true);
  }
});

Hooks.on('createTile', () => {
  if (canvas.activeLayer.name != 'TilesLayer' && SuperSelect._inSuperSelectMode()) {
    console.log("Super Select: Refreshing because of new tiles outside of activeLayer")
    SuperSelect._refreshSuperSelect(true);
  }
});

// Sight visibility tweaks
Hooks.on('sightRefresh', () => {
  if (canvas.activeLayer.name == 'TokenLayer' && SuperSelect._inSuperSelectMode()) {
    canvas.activeLayer.placeables.forEach(placeable => {
      if (placeable.visible == undefined) placeable.visible = true;
    })
  }
});

// Delete Handlers for foreigner placeables

$(document).keydown((event) => {
  if (SuperSelect._inSuperSelectMode()) {
    // 46 == Delete ----- 8 == Backspace
    if (event.which === 46 || event.which === 8) {
      const toDelete = canvas.activeLayer.placeables.filter(placeable => {
        return placeable._controlled && placeable.layer.name != canvas.activeLayer.name
      });
      if (toDelete.length > 0) {
        toDelete.forEach(placeable => placeable.delete());
      }
    }
  }
});

Hooks.on('deleteToken', (a, b, c, id) => {
  if (canvas.activeLayer.name != 'TokenLayer' && SuperSelect._inSuperSelectMode()) {
    SuperSelect._refreshSuperSelect(true);
  }
});

Hooks.on('deleteDrawing', (a, b, c, id) => {
  if (canvas.activeLayer.name != 'DrawingsLayer' && SuperSelect._inSuperSelectMode()) {
    SuperSelect._refreshSuperSelect(true);
  }
});

Hooks.on('deleteTile', () => {
  if (canvas.activeLayer.name != 'TilesLayer' && SuperSelect._inSuperSelectMode()) {
    SuperSelect._refreshSuperSelect(true);
  }
});

// Register configuration

Hooks.once('init', () => {

  game.settings.register("super-select", "startEnabled", {
    name: "Super Select enabled by Default",
    hint: "Whether to have Super Select toggled yes/no/remember when changin layers.",
    scope: "world",
    config: true,
    default: 'no',
    type: String,
    choices: {
      "yes": "Yes",
      "no": "No",
      "remember": "Remember Last"
    }
  });

  if (game.modules.get("lib-df-hotkeys")?.active) {
    Hotkeys.registerGroup({
      name: 'super-select',
      label: "Super Select"
    });

    Hotkeys.registerShortcut({
      name: 'super-select.super-mode-hotkey',
      label: 'Super Select',
      group: 'super-select',
      default: () => { return { key: Hotkeys.keys.KeyS, alt: false, ctrl: false, shift: true }; },
      onKeyDown: self => { SuperSelect._simulateSuperClick() },
    });
  }

});