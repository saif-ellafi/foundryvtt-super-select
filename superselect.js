class SuperSelect {
  
  static CONTROL_LAYER_MAP = {
    token: 'TokenLayer',
    tiles: 'TilesLayer',
    drawings: 'DrawingsLayer'
  }
  
  static addControls(layerKey) {
    return (toggled) => {
      const currLayer = SuperSelect.CONTROL_LAYER_MAP[layerKey];
      if (toggled) {
        let mergedObjects = canvas.getLayer(currLayer).objects.children
        const others = Object.keys(SuperSelect.CONTROL_LAYER_MAP).filter(key => key != layerKey);
        for (let ii = 0; ii < others.length; ii++) {
          const other = SuperSelect.CONTROL_LAYER_MAP[others[ii]];
          const enriched = canvas.getLayer(other).objects.children.map(child => {
            if (child.updateSource == undefined) {
              child.updateSource = function () {};
            }
            return child;
          });
          mergedObjects = mergedObjects.concat(enriched);
        };
        canvas.getLayer(currLayer).objects.children = mergedObjects;
      } else {
        const tileObjects = canvas.getLayer(currLayer).objects;
        const filteredObjects = tileObjects.children.filter(child => child.layer.name == currLayer);
        tileObjects.children = filteredObjects;
      }
    }
  }
  
  static _getControlButtons(controls){
    for (let i = 0; i < controls.length; i++) {
      if (Object.keys(SuperSelect.CONTROL_LAYER_MAP).includes(controls[i].name)) {
        const layerKey = controls[i].name;
        controls[i].tools.push({
          name: "SuperSelect",
          title: "Super Select Mode",
          icon: "fas fa-object-group",
          toggle: true,
          visible: game.user.isGM,
          onClick: SuperSelect.addControls(layerKey),
          layer: SuperSelect.CONTROL_LAYER_MAP[layerKey],
          activeTool: "select"
        });
      }
    }
  }

}

Hooks.on('getSceneControlButtons', (controls) => {
  SuperSelect._getControlButtons(controls)
});
