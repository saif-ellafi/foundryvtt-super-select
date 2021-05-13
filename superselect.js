class SuperSelect {

  static ACTIVE_LAYERS = {
    DrawingsLayer: 'drawings',
    BackgroundLayer: 'background',
    TokenLayer: 'tokens'
  }

  static ctrlPressed = false;
  static shiftPressed = false;
  static altPressed = false;

  static _copy = [];

  static _mergedLayer;

  static _getInitialState() {
    switch(game.settings.get("super-select", "startEnabled")) {
      case 'yes':
        return true;
      case 'no':
        return false;
      case 'remember':
        return !!SuperSelect._mergedLayer;
      default:
        return false;
    }
  }

  static _activateSuperMode() {
    if (!canvas.ready) return;
    let mergedPlaceables = []
    Object.keys(SuperSelect.ACTIVE_LAYERS).forEach(layer => {
      const enriched = canvas.getLayer(layer).placeables.map(child => {
        if (child.updateSource === undefined) {
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
    const originalPlaceables = placeables.filter(child => child.layer.name === activeLayer.name);
    activeLayer.releaseAll();
    activeLayer.objects.children = originalPlaceables;
    SuperSelect._mergedLayer = undefined;
  }

  static _toggleSuperMode(toggled) {
    if (toggled) {
      SuperSelect._activateSuperMode();
    } else {
      SuperSelect._deactivateSuperMode();
    }
  }

  static simulateSuperClick() {
    if (Object.values(SuperSelect.ACTIVE_LAYERS).includes(canvas.activeLayer.options.name))
      $("#controls li.control-tool.toggle[title='Super Select']")?.click();
  }

  static refreshSuperSelect(forceRemember) {
    if (SuperSelect._mergedLayer) {
      console.log("Super Select: Cleanup Merged Layer: " + SuperSelect._mergedLayer);
      SuperSelect._deactivateSuperMode(canvas.getLayer(SuperSelect._mergedLayer));
    }
    if (canvas && forceRemember) {
      SuperSelect._activateSuperMode();
    }
  }

  static releaseDifferentPlaceables(entity) {
    canvas.activeLayer.placeables.filter(placeable => {
      const cond1 = placeable._controlled;
      const cond2 = placeable.layer.name !== entity.layer.name;
      const cond3 = placeable.id !== entity.id;
      return cond1 && cond2 && cond3
    }).forEach(placeable => {
      placeable.release()
    });
  }

  static inSuperSelectMode() {
    if (game.user?.isGM) {
      return ui.controls
          .controls.find(c => c.name === ui.controls.activeControl)
          .tools.find(t => t.name === "superselect")?.active;
    } else {
      return false;
    }
  }

  static addSuperSelectButtons(controls){
    controls.forEach( control => {
      const cond1 = (canvas && canvas.ready && Object.values(SuperSelect.ACTIVE_LAYERS).includes(control.layer) && canvas.activeLayer.options.name === control.layer);
      const cond2 = ((!canvas || !canvas.ready) && control.layer === 'tokens');
      if (cond1 || cond2) {
        const initialState = SuperSelect._getInitialState();
        control.tools.push({
          name: "superselect",
          title: "Super Select",
          icon: "fas fa-object-group",
          toggle: true,
          active: initialState,
          visible: game.user.isGM,
          onClick: SuperSelect._toggleSuperMode,
          layer: control.layer,
          activeTool: "select"
        });
        SuperSelect.refreshSuperSelect(initialState);
      }
    })
  }

}

Hooks.on('getSceneControlButtons', (controls) => {
  if (game.user.isGM) {
    SuperSelect.addSuperSelectButtons(controls)
  }
});

// Selecting and De-Selecting management

Hooks.on('controlTile', (tile, into) => {
  if (SuperSelect.inSuperSelectMode() && into)
    SuperSelect.releaseDifferentPlaceables(tile);
});

Hooks.on('controlDrawing', (drawing, into) => {
  if (SuperSelect.inSuperSelectMode() && into)
    SuperSelect.releaseDifferentPlaceables(drawing);
});

Hooks.on('controlToken', (token, into) => {
  if (SuperSelect.inSuperSelectMode() && into)
    SuperSelect.releaseDifferentPlaceables(token);
});

// Handling foreign drawers outside of appropriate layer

Hooks.on('createDrawing', () => {
  if (canvas.activeLayer.options.name !== 'drawings' && SuperSelect.inSuperSelectMode()) {
    console.log("Super Select: Refreshing because of new drawings outside of activeLayer")
    SuperSelect.refreshSuperSelect(true);
  }
});

Hooks.on('createTile', () => {
  if (canvas.activeLayer.options.name !== 'background' && SuperSelect.inSuperSelectMode()) {
    console.log("Super Select: Refreshing because of new tiles outside of activeLayer")
    SuperSelect.refreshSuperSelect(true);
  }
});

// Sight visibility tweaks
Hooks.on('sightRefresh', () => {
  if (canvas.ready && SuperSelect.inSuperSelectMode() && canvas.activeLayer?.options.name === 'tokens') {
    canvas.activeLayer.placeables.forEach(placeable => {
      if (placeable.visible === undefined) placeable.visible = true;
    })
  }
});

// Delete Action Handler for foreigner placeables
$(document).keydown((event) => {
  if (SuperSelect.inSuperSelectMode()) {
    // 46 == Delete ----- 8 == Backspace
    if (event.which === 46 || event.which === 8) {
      const toDeleteIds = canvas.activeLayer.placeables.filter(placeable => {
        return placeable._controlled && placeable.layer.name !== canvas.activeLayer.name
      });
      if (toDeleteIds.length > 0) {
        game.scenes.active.deleteEmbeddedDocuments(
            toDeleteIds[0].document.documentName,
            toDeleteIds.map(placeable => placeable.id)
        )
      }
    }
    // 17 == ctrl ----- 91 == cmd
    if (event.keyCode === 17 || event.keyCode === 91) {
      SuperSelect.ctrlPressed = true;
    }
    // 16 == shift
    if (event.keyCode === 16) {
      SuperSelect.shiftPressed = true;
    }
    // 18 == alt
    if (event.keyCode === 18) {
      SuperSelect.altPressed = true;
    }
    // 67 == c
    if (SuperSelect.ctrlPressed && event.which === 67 ) {
      SuperSelect.ctrlPressed = false;
      const toCopy = canvas.activeLayer.placeables.filter(placeable => {
        return placeable._controlled && placeable.layer.name !== canvas.activeLayer.name
      });
      if (toCopy.length > 0) {
        SuperSelect._copy = [];
        toCopy.forEach(placeable => SuperSelect._copy.push(placeable));
        const cn = toCopy[0].layer.options.objectClass.name;
        ui.notifications.info(`Copied data for ${SuperSelect._copy.length} ${cn} objects.`);
      }
    }
    // 86 == v
    if (SuperSelect.ctrlPressed && event.which === 86 && SuperSelect._copy.length > 0) {
      canvas.getLayer(SuperSelect._copy[0].layer.name).activate();
      const layer = canvas.activeLayer;
      layer._copy = SuperSelect._copy;
      let pos = canvas.app.renderer.plugins.interaction.mouse.getLocalPosition(canvas.tokens);
      layer.pasteObjects(pos, {hidden: SuperSelect.altPressed, snap: !SuperSelect.shiftPressed});
      layer._copy = [];
    }
  }
});

$(document).keyup((event) => {
  if (SuperSelect.inSuperSelectMode()) {
    // 17 == ctrl ----- 91 == cmd
    if (event.keyCode === 17 || event.keyCode === 91) {
      SuperSelect.ctrlPressed = false;
    }
    // 16 == shift
    if (event.keyCode === 16) {
      SuperSelect.shiftPressed = false;
    }
    // 18 == alt
    if (event.keyCode === 18) {
      SuperSelect.altPressed = false;
    }
  }
});

Hooks.on('deleteToken', () => {
  if (canvas.activeLayer.options.name !== 'tokens' && SuperSelect.inSuperSelectMode()) {
    SuperSelect.refreshSuperSelect(true);
  }
});

Hooks.on('deleteDrawing', () => {
  if (canvas.activeLayer.options.name !== 'drawings' && SuperSelect.inSuperSelectMode()) {
    SuperSelect.refreshSuperSelect(true);
  }
});

Hooks.on('deleteTile', () => {
  if (canvas.activeLayer.options.name !== 'background' && SuperSelect.inSuperSelectMode()) {
    SuperSelect.refreshSuperSelect(true);
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
      default: _ => { return { key: Hotkeys.keys.KeyS, alt: false, ctrl: false, shift: true }; },
      onKeyDown: _ => { if (game.user.isGM) SuperSelect.simulateSuperClick() },
    });
  }

  libWrapper.register('super-select', 'PlaceableObject.prototype._canControl', function (wrapped, ...args) {
    return this.document.canUserModify(game.user, "update");
  }, 'OVERRIDE');

});