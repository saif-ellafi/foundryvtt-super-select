class SuperSelect {
  
  static ACTIVE_LAYERS = [
    'TokenLayer',
    'TilesLayer',
    'DrawingsLayer'
  ]

  static _addControls(toggled) {
    if (toggled) {
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
    } else {
      canvas.activeLayer.releaseAll();
      const placeables = canvas.activeLayer.placeables;
      const originalPlaceables = placeables.filter(child => child.layer.name == canvas.activeLayer.name);
      canvas.activeLayer.objects.children = originalPlaceables;
    }
  }

  static _getControlButtons(controls){
    controls.forEach( control => {
      if (SuperSelect.ACTIVE_LAYERS.includes(control.layer)) {
        control.tools.push({
          name: "SuperSelect",
          title: "Super Select Mode",
          icon: "fas fa-object-group",
          toggle: true,
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
  SuperSelect._getControlButtons(controls)
});