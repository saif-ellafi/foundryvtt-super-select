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

  static _addControls(toggled) {
    if (toggled) {
      SuperSelect._activateSuperMode();
    } else {
      SuperSelect._deactivateSuperMode();
    }
  }

  static _inSuperSelectMode() {
    return ui.controls
      .controls.find(c => c.name == ui.controls.activeControl)
      .tools.find(t => t.name == "superselect")
      .active;
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
          onClick: SuperSelect._addControls,
          layer: control.layer,
          activeTool: "select"
        });
        const lastStateBeforeCleanup = SuperSelect._mergedLayer;
        if (SuperSelect._mergedLayer) {
          console.log("Super Select: Cleanup Merged Layer: " + SuperSelect._mergedLayer);
          SuperSelect._deactivateSuperMode(canvas.getLayer(SuperSelect._mergedLayer));
        }
        if (canvas && lastStateBeforeCleanup) {
          SuperSelect._activateSuperMode();
        }
      }
    })
  }

}

Hooks.on('getSceneControlButtons', (controls) => {
  if (game.user.isGM) {
    SuperSelect._getControlButtons(controls)
  }
});

Hooks.on('controlTile', (tile, into) => {
  if (SuperSelect._inSuperSelectMode && into)
    SuperSelect._releaseDifferentPlaceables(tile);
});

Hooks.on('controlDrawing', (drawing, into) => {
  if (SuperSelect._inSuperSelectMode && into)
    SuperSelect._releaseDifferentPlaceables(drawing);
});

Hooks.on('controlToken', (token, into) => {
  if (SuperSelect._inSuperSelectMode && into)
    SuperSelect._releaseDifferentPlaceables(token);
});

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

});