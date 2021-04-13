class SuperSelect {
  
  static ACTIVE_LAYERS = [
    'TokenLayer',
    'TilesLayer',
    'DrawingsLayer'
  ]

  static _activateSuperMode() {
    let mergedObjects = canvas.activeLayer.objects.children
    const otherLayers = SuperSelect.ACTIVE_LAYERS.filter(layer => layer != canvas.activeLayer.name);
    for (let i = 0; i < otherLayers.length; i++) {
      const enriched = canvas.getLayer(otherLayers[i]).placeables.map(child => {
        if (child.updateSource == undefined) {
          child.updateSource = function () {};
        }
        return child;
      });
      mergedObjects = mergedObjects.concat(enriched);
    };
    canvas.activeLayer.objects.children = mergedObjects;
  }

  static _deactivateSuperMode() {
    canvas.activeLayer.releaseAll();
    const placeables = canvas.activeLayer.placeables;
    const originalPlaceables = placeables.filter(child => child.layer.name == canvas.activeLayer.name);
    canvas.activeLayer.objects.children = originalPlaceables;
  }

  static _addControls(toggled) {
    if (toggled) {
      SuperSelect._activateSuperMode();
    } else {
      SuperSelect._deactivateSuperMode();
    }
  }

  static _getControlButtons(controls){
    controls.forEach( control => {
      if (SuperSelect.ACTIVE_LAYERS.includes(control.layer)) {
        control.tools.push({
          name: "SuperSelect",
          title: "Super Select",
          icon: "fas fa-object-group",
          toggle: true,
          active: game.settings.get("super-select", "startEnabled"),
          visible: game.user.isGM,
          onClick: SuperSelect._addControls,
          layer: control.layer,
          activeTool: "select"
        });
      }
    })
  }
}

Hooks.on('getSceneControlButtons', (controls) => {
  if (game.user.isGM) {
    SuperSelect._getControlButtons(controls)
    if (game.settings.get("super-select", "startEnabled")) {
      SuperSelect._activateSuperMode();
    }
  }
});

Hooks.once('init', () => {

  game.settings.register("super-select", "startEnabled", {
    name: "Super Select enabled by Default",
    hint: "Whether to have Super Select toggled on by default.",
    scope: "world",
    config: true,
    default: false,
    type: Boolean
  });

});