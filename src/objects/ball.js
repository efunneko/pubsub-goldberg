// ball.js - Object definition for a ball

import * as THREE             from 'three' 
import {DynamicObject}        from './dynamic-object.js'
import {Assets}               from '../assets.js'
import {utils}                from '../utils.js'


const defaultRadius        = 20
const defaultZPosition     = 50

export class Ball extends DynamicObject {
  constructor(app, opts) {
    super(app, opts, [
      // Object parameters
      {name: "x", type: "hidden", eventLabels: ["position"]},
      {name: "y", type: "hidden", eventLabels: ["position"]},
      {name: "rotation", type: "hidden", eventLabels: ["rotation"]},      
      {name: "radius", type: "numberRange", min: 5, max: 40, step: 1, label: "Radius", eventLabels: ["appearance"], default: defaultRadius},
      {name: "color", type: "hidden", default: "#ffffff"},
      {name: "colors", type: "colorGrid", label: "Ball Color", eventLabels: ["appearance"], default: ["white"], multiSelect: opts.isSubObject, cols: 4, options: ["white", "red", "green", "blue", "yellow", "orange", "purple", "black"]},
      {name: "label", type: "text", label: "Label", eventLabels: ["appearance"]},
      {name: "partitionKey", type: "text", label: "Partition Key"},
      // {name: "labelColor", type: "color", label: "Label Color"},
      {name: "forceTopic", type: "boolean", label: "Force Topic", title: "Use the configured topic when going through a portal", default: false},
      {name: "topic", type: "text", width: 50, label: "Topic", title: "If Force Topic is true, this topic is used when going through a portal", default: ""},      
    ]);

    this.type        = "ball"

    this.isSubObject = opts.isSubObject || false

    this.uis         = app.ui.getUiSelection();

    if (this.isSubObject) return;

    this.create()

    // This is necessary to run in the case when physics is disabled
    this.setValues({
      x: this.x,
      y: this.y,
      rotation: this.rotation,
    })

    this.setInitialVelocity(opts)

  }

  create() {
    if (this.isSubObject) return;

    super.create();

    // Create the geometry for the ball
    const geometry = new THREE.SphereGeometry(this.radius, 32, 32, Math.PI/2 * 3);
    
    let texture;

    if (this.label) {

      let maxLineLength = 0;
      const lines = this.label.split(/\n|\\n/);
      lines.forEach(line => {
        if (line.length > maxLineLength) maxLineLength = line.length;
      });

      let labelColor = utils.getComplementaryColor(this.color);
      if (!labelColor) labelColor = "#000000";
    
      // Create the material
      let height, width;
      const textTexture = utils.textToTexture({
        text: this.label, 
        font: "Times New Roman, serif",
        width: 512, 
        height: 512,
        fontSize: maxLineLength > 3 ? 360/maxLineLength : 120,
        align: 'center',
        valign: 'middle',
        color: labelColor,
        backgroundColor: this.color,
      });

      texture = textTexture.texture;

    }
    else {
      texture = Assets.textures.stainlessSteelTexture.albedo;
    }

    const material = new THREE.MeshStandardMaterial({
      map:               texture,
      roughnessMap:      Assets.textures.stainlessSteelTexture.rough,
      metalness:         0.1,
      roughness:         1,
    });

    if (this.color && !this.label) {
      // set the emissive color to the color of the ball
      material.emissive = new THREE.Color(this.color);
      material.emissiveIntensity = 0.1;
      material.color.set(this.color);      
    }

    // Create the mesh
    const mesh = new THREE.Mesh(geometry, material);

    // Move the ball away from the back a bit
    mesh.position.z = defaultZPosition;

    // If useShadows is true, then cast and receive shadows
    mesh.castShadow    = this.useShadows;
    mesh.receiveShadow = this.useShadows;

    // Add the mesh to the dynamic group
    this.group.add(mesh);

    // Do the same for the physics engine
    mesh.userData.physicsBodies = [this.createPhysicsBody()];

    // Register with the selection manager
    this.uis.registerMesh(mesh, {
      moveable:   true,
      selectable: true,
      onMove:     (obj, pos, info) => this.onMove(obj, pos, info),
      onDown:     (obj, pos, info) => this.onDown(obj, pos, info),
      onUp:       (obj, pos, info) => this.onUp(obj, pos, info),
      onDelete:   (obj) => this.removeFromWorld(),
      object:     this,
    });

  }

  createPhysicsBody() {
    // Create the physics body
    this.body = this.app.getPhysicsEngine().createCircle(this, this.x, -this.y, this.radius, {restitution: 0.4, friction: 0.8, inertia: 0});
    return this.body;
  }

  onMove(obj, pos, info) {
    super.onMove(obj, pos, info);

    this.app.getPhysicsEngine().setPosition(this.body, this.group.position.x, -this.group.position.y);
  }

  onDown(obj, pos, info) {
    super.onDown(obj, pos, info);
    this.body.setStatic();
  }

  onUp(obj, pos, info) {
    this.body.setDynamic();
    this.saveableConfigChanged();
  }

  onAppearanceChange() {
    if (this.colors.length > 0) {
      this.color = this.colors[0];      
    }
    super.onAppearanceChange();
  }

}