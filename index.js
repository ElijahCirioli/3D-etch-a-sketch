import * as THREE from "./three/build/three.module.js";
import { OrbitControls } from "./three/examples/jsm/controls/OrbitControls.js";
import { Line2 } from "./three/examples/jsm/lines/Line2.js";
import { LineMaterial } from "./three/examples/jsm/lines/LineMaterial.js";
import { LineGeometry } from "./three/examples/jsm/lines/LineGeometry.js";

const canvas = document.getElementById("myCanvas");

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(65, canvas.clientWidth / canvas.clientHeight, 0.01, 1000);
camera.position.z = 1.8;
const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true });

const controls = new OrbitControls(camera, canvas);
controls.minDistance = 0.2;
controls.maxDistance = 4;
controls.enableKeys = true;
controls.keys = {
	LEFT: 37, //left arrow
	UP: 38, //up arrow
	RIGHT: 39, //right arrow
	BOTTOM: 40, //down arrow
};

const MAX_NUM_POINTS = 10000; //maximum number of points in the line
let line, velocity, cursor, arrows, drawCount, positions, knobs, selectedBinding; //declare all important variables

//run to set everything up
const init = () => {
	velocity = new THREE.Vector3(0, 0, 0);

	/* LIGHT */
	const light = new THREE.DirectionalLight(0xffffff, 0.7);
	light.position.set(2, 1, 5);
	light.target.position.set(-2, -1, -5);
	scene.add(light);
	scene.add(light.target);

	const drawSpace = new THREE.Object3D();
	/* WIREFRAME DRAWING AREA */
	const boxGeometry = new THREE.BoxGeometry();
	const boxEdges = new THREE.EdgesGeometry(boxGeometry);
	const boxLines = new THREE.LineSegments(boxEdges, new THREE.LineBasicMaterial({ color: 0xa61928 }));
	drawSpace.add(boxLines);

	/* ETCH-A-SKETCH PICTURE FRAME */
	const frameShape = new THREE.Shape();
	frameShape.moveTo(-0.65, -0.7);
	frameShape.lineTo(0.65, -0.7);
	frameShape.lineTo(0.65, 0.65);
	frameShape.lineTo(-0.65, 0.65);

	const frameExtrudeSettings = {
		depth: 0.1,
		bevelEnabled: true,
		bevelSegments: 5,
		steps: 10,
		bevelSize: 0.02,
		bevelThickness: 0.02,
	};

	const holeRadius = 0.52;
	const holeShape = new THREE.Shape();
	holeShape.moveTo(-holeRadius, -holeRadius);
	holeShape.lineTo(holeRadius, -holeRadius);
	holeShape.lineTo(holeRadius, holeRadius);
	holeShape.lineTo(-holeRadius, holeRadius);

	frameShape.holes.push(holeShape);

	const frameGeometry = new THREE.ExtrudeBufferGeometry(frameShape, frameExtrudeSettings);
	const frameMaterial = new THREE.MeshLambertMaterial({ color: 0xa61928, emissive: 0x821623 });
	const mesh = new THREE.Mesh(frameGeometry, frameMaterial);
	mesh.position.z = 0.5;

	drawSpace.add(mesh);

	/* KNOBS */
	knobs = [];
	drawSpace.add(createKnob(-0.55, "x"));
	drawSpace.add(createKnob(0, "y"));
	drawSpace.add(createKnob(0.55, "z"));

	scene.add(drawSpace);

	/* DRAWING CURSOR */
	const radius = 0.02;
	const arrowLength = 0.04;
	var sphereGeometry = new THREE.SphereGeometry(radius, 15, 15);
	var sphereMaterial = new THREE.MeshBasicMaterial({ color: 0x5e5e5e, transparent: true, opacity: 0.7 });
	var sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
	cursor = new THREE.Object3D();
	cursor.add(sphere);

	arrows = [];
	createArrows(cursor, arrowLength);

	scene.add(cursor);

	/* SETUP LINE */
	positions = new Float32Array(MAX_NUM_POINTS * 3);

	const lineGeometry = new LineGeometry();
	lineGeometry.setPositions(positions);
	drawCount = 1;
	lineGeometry.instanceCount = drawCount;
	const lineMaterial = new LineMaterial({ color: 0x000000, linewidth: 0.005 });
	line = new Line2(lineGeometry, lineMaterial);

	scene.add(line);

	animate();
};

//update the line and move the cursor
const animate = () => {
	requestAnimationFrame(animate);

	//if the cursor should move
	if (!velocity.equals(new THREE.Vector3(0, 0, 0))) {
		//move cursor
		cursor.translateX(velocity.x);
		cursor.translateY(velocity.y);
		cursor.translateZ(velocity.z);
		cursor.position.clamp(new THREE.Vector3(-0.5, -0.5, -0.5), new THREE.Vector3(0.5, 0.5, 0.5));

		//add points
		if (drawCount < MAX_NUM_POINTS) {
			const index = 3 * drawCount;

			positions[index] = cursor.position.x;
			positions[index + 1] = cursor.position.y;
			positions[index + 2] = cursor.position.z;

			/* This part is important otherwise there's a line always going to the origin */
			positions[index + 3] = cursor.position.x;
			positions[index + 4] = cursor.position.y;
			positions[index + 5] = cursor.position.z;

			drawCount++;
			line.geometry.instanceCount = drawCount;
			line.geometry.setPositions(positions);
		} else {
			console.log("Out of points!");
		}

		//rotate knobs
		knobs[0].rotation.y -= velocity.x * 2;
		knobs[1].rotation.y += velocity.y * 2;
		knobs[2].rotation.y += velocity.z * 2;
	}

	//update memory label
	document.getElementById("memory-label").innerHTML = `Memory: ${Math.round(
		((drawCount - 1) * 100) / (MAX_NUM_POINTS - 2)
	)}%`;

	renderer.render(scene, camera); //render the scene
};

//create 6 arrows for the 3 axis
const createArrows = (object, length) => {
	const origin = new THREE.Vector3(0, 0, 0);
	const hex = 0x000000; //color

	let dir = new THREE.Vector3(1, 0, 0);
	let arrowHelper = new THREE.ArrowHelper(dir, origin, length, hex);
	object.add(arrowHelper);
	arrows.push(arrowHelper);

	dir = new THREE.Vector3(-1, 0, 0);
	arrowHelper = new THREE.ArrowHelper(dir, origin, length, hex);
	object.add(arrowHelper);
	arrows.push(arrowHelper);

	dir = new THREE.Vector3(0, 1, 0);
	arrowHelper = new THREE.ArrowHelper(dir, origin, length, hex);
	object.add(arrowHelper);
	arrows.push(arrowHelper);

	dir = new THREE.Vector3(0, -1, 0);
	arrowHelper = new THREE.ArrowHelper(dir, origin, length, hex);
	object.add(arrowHelper);
	arrows.push(arrowHelper);

	dir = new THREE.Vector3(0, 0, 1);
	arrowHelper = new THREE.ArrowHelper(dir, origin, length, hex);
	object.add(arrowHelper);
	arrows.push(arrowHelper);

	dir = new THREE.Vector3(0, 0, -1);
	arrowHelper = new THREE.ArrowHelper(dir, origin, length, hex);
	object.add(arrowHelper);
	arrows.push(arrowHelper);
};

//create a knob at the given x coordinate
const createKnob = (x, text) => {
	const knobGroup = new THREE.Object3D();

	//the cylinder
	const knobGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.06, 32);
	const knobMaterial = new THREE.MeshLambertMaterial({ color: 0x9c9c9c, emissive: 0x8f8f8f });
	const knob = new THREE.Mesh(knobGeometry, knobMaterial);
	knobGroup.add(knob);

	//the text
	const loader = new THREE.FontLoader();
	loader.load("./three/examples/fonts/helvetiker_bold.typeface.json", (font) => {
		const textGeometry = new THREE.TextGeometry(text, {
			font: font,
			size: 0.04,
			height: 0.01,
			curveSegments: 12,
		});

		const textMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
		const textObject = new THREE.Mesh(textGeometry, textMaterial);
		textObject.rotation.x = -Math.PI / 2;
		textObject.position.y = 0.025;
		textObject.position.x = -0.015;
		textObject.position.z = 0.015;
		knobGroup.add(textObject);
	});

	//position in space
	knobGroup.rotation.x = Math.PI / 2;
	knobGroup.position.x = x;
	knobGroup.position.y = -0.608;
	knobGroup.position.z = 0.65;

	knobs.push(knobGroup);
	return knobGroup;
};

/* UI CONTROLS */
//reset view to home
document.getElementById("home-button").onclick = () => {
	controls.reset();
};

//remove drawing
document.getElementById("trash-button").onclick = () => {
	line.geometry.setPositions(positions);
	drawCount = 0;
	line.geometry.instanceCount = drawCount;
	cursor.position.x = 0;
	cursor.position.y = 0;
	cursor.position.z = 0;
	velocity = new THREE.Vector3(0, 0, 0);
	knobs[0].rotation.y = 0;
	knobs[1].rotation.y = 0;
	knobs[2].rotation.y = 0;
};

//show and hide cursor
document.getElementById("eye-button").onclick = () => {
	cursor.visible = !cursor.visible;
};

/* CONTROLS */
const default_speed = 0.007;
let speed = default_speed; //cursor move speed
const red = new THREE.Color(0xff0000); //arrow active color
const black = new THREE.Color(0x000000); //arrow inactive color

/* KEY BINDINGS */
const default_bindings = {
	PLUSX: 68, //d
	MINUSX: 65, //a
	PLUSY: 87, //w
	MINUSY: 83, //s
	PLUSZ: 69, //e
	MINUSZ: 81, //q
};
let key_bindings = JSON.parse(JSON.stringify(default_bindings));

//on key press events
document.onkeydown = (e) => {
	e = window.event || e;
	const key = e.keyCode;
	e.preventDefault();

	if (selectedBinding) {
		if (key >= 48 && key <= 90) {
			selectedBinding.innerHTML = String.fromCharCode(key);
			key_bindings[selectedBinding.id] = key;
		}
		selectedBinding = null;
		$(".binding").css("background-color", "#d6d6d6");
	} else {
		switch (key) {
			case key_bindings.PLUSY:
				velocity.y = speed;
				arrows[2].setColor(red);
				break;
			case key_bindings.MINUSY:
				velocity.y = -speed;
				arrows[3].setColor(red);
				break;
			case key_bindings.MINUSX:
				velocity.x = -speed;
				arrows[1].setColor(red);
				break;
			case key_bindings.PLUSX:
				velocity.x = speed;
				arrows[0].setColor(red);
				break;
			case key_bindings.PLUSZ:
				velocity.z = -speed;
				arrows[5].setColor(red);
				break;
			case key_bindings.MINUSZ:
				velocity.z = speed;
				arrows[4].setColor(red);
				break;
		}
	}
};

//on key release events
document.onkeyup = (e) => {
	e = window.event || e;
	const key = e.keyCode;
	e.preventDefault();

	switch (key) {
		case key_bindings.PLUSY:
			if (velocity.y > 0) velocity.y = 0;
			arrows[2].setColor(black);
			break;
		case key_bindings.MINUSY:
			if (velocity.y < 0) velocity.y = 0;
			arrows[3].setColor(black);
			break;
		case key_bindings.MINUSX:
			if (velocity.x < 0) velocity.x = 0;
			arrows[1].setColor(black);
			break;
		case key_bindings.PLUSX:
			if (velocity.x > 0) velocity.x = 0;
			arrows[0].setColor(black);
			break;
		case key_bindings.PLUSZ:
			if (velocity.z < 0) velocity.z = 0;
			arrows[5].setColor(black);
			break;
		case key_bindings.MINUSZ:
			if (velocity.z > 0) velocity.z = 0;
			arrows[4].setColor(black);
			break;
	}
};

//fake keyboard buttons
document.getElementById("plus-x").onmousedown = () => {
	velocity.x = speed;
	arrows[0].setColor(red);
};
document.getElementById("plus-x").onmouseup = () => {
	if (velocity.x > 0) velocity.x = 0;
	arrows[0].setColor(black);
};
document.getElementById("minus-x").onmousedown = () => {
	velocity.x = -speed;
	arrows[1].setColor(red);
};
document.getElementById("minus-x").onmouseup = () => {
	if (velocity.x < 0) velocity.x = 0;
	arrows[1].setColor(black);
};
document.getElementById("plus-y").onmousedown = () => {
	velocity.y = speed;
	arrows[2].setColor(red);
};
document.getElementById("plus-y").onmouseup = () => {
	if (velocity.y > 0) velocity.y = 0;
	arrows[2].setColor(black);
};
document.getElementById("minus-y").onmousedown = () => {
	velocity.y = -speed;
	arrows[3].setColor(red);
};
document.getElementById("minus-y").onmouseup = () => {
	if (velocity.y < 0) velocity.y = 0;
	arrows[3].setColor(black);
};
document.getElementById("plus-z").onmousedown = () => {
	velocity.z = -speed;
	arrows[5].setColor(red);
};
document.getElementById("plus-z").onmouseup = () => {
	if (velocity.z < 0) velocity.z = 0;
	arrows[5].setColor(black);
};
document.getElementById("minus-z").onmousedown = () => {
	velocity.z = speed;
	arrows[4].setColor(red);
};
document.getElementById("minus-z").onmouseup = () => {
	if (velocity.z > 0) velocity.z = 0;
	arrows[4].setColor(black);
};

//mouse leave events
document.getElementById("plus-x").onmouseleave = () => {
	if (velocity.x > 0) velocity.x = 0;
	arrows[0].setColor(black);
};
document.getElementById("minus-x").onmouseleave = () => {
	if (velocity.x < 0) velocity.x = 0;
	arrows[1].setColor(black);
};
document.getElementById("plus-y").onmouseleave = () => {
	if (velocity.y > 0) velocity.y = 0;
	arrows[2].setColor(black);
};
document.getElementById("minus-y").onmouseleave = () => {
	if (velocity.y < 0) velocity.y = 0;
	arrows[3].setColor(black);
};
document.getElementById("plus-z").onmouseleave = () => {
	if (velocity.z < 0) velocity.z = 0;
	arrows[5].setColor(black);
};
document.getElementById("minus-z").onmouseleave = () => {
	if (velocity.z > 0) velocity.z = 0;
	arrows[4].setColor(black);
};

//touchscreen equivalents
document.getElementById("plus-x").ontouchstart = () => {
	velocity.x = speed;
	arrows[0].setColor(red);
};
document.getElementById("plus-x").ontouchend = () => {
	if (velocity.x > 0) velocity.x = 0;
	arrows[0].setColor(black);
};
document.getElementById("minus-x").ontouchstart = () => {
	velocity.x = -speed;
	arrows[1].setColor(red);
};
document.getElementById("minus-x").ontouchend = () => {
	if (velocity.x < 0) velocity.x = 0;
	arrows[1].setColor(black);
};
document.getElementById("plus-y").ontouchstart = () => {
	velocity.y = speed;
	arrows[2].setColor(red);
};
document.getElementById("plus-y").ontouchend = () => {
	if (velocity.y > 0) velocity.y = 0;
	arrows[2].setColor(black);
};
document.getElementById("minus-y").ontouchstart = () => {
	velocity.y = -speed;
	arrows[3].setColor(red);
};
document.getElementById("minus-y").ontouchend = () => {
	if (velocity.y < 0) velocity.y = 0;
	arrows[3].setColor(black);
};
document.getElementById("plus-z").ontouchstart = () => {
	velocity.z = -speed;
	arrows[5].setColor(red);
};
document.getElementById("plus-z").ontouchend = () => {
	if (velocity.z < 0) velocity.z = 0;
	arrows[5].setColor(black);
};
document.getElementById("minus-z").ontouchstart = () => {
	velocity.z = speed;
	arrows[4].setColor(red);
};
document.getElementById("minus-z").ontouchend = () => {
	if (velocity.z > 0) velocity.z = 0;
	arrows[4].setColor(black);
};

/* EDIT BINDINGS */
$(".binding").on("click", (e) => {
	$(".binding").css("background-color", "#d6d6d6");
	const button = e.target;
	button.style.backgroundColor = "#eb4646";
	selectedBinding = button;
});
document.getElementById("default-bindings-button").onclick = () => {
	key_bindings = JSON.parse(JSON.stringify(default_bindings));
	$(".binding").css("background-color", "#d6d6d6");
	selectedBinding = null;
	$(".binding").each((i, e) => {
		e.innerHTML = String.fromCharCode(key_bindings[e.id]);
	});
	speed = default_speed;
	$("#slider").val(speed * 10000);
};

/* ADJUST SPEED */
document.getElementById("slider").onchange = (e) => {
	speed = e.target.value / 10000;
};
document.getElementById("slider").onmousemove = (e) => {
	speed = e.target.value / 10000;
};

document.onload = init();
