import * as THREE from 'three';

import Stats from 'three/addons/libs/stats.module.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let container, stats, clock, gui, mixer, actions, activeAction, previousAction;
let camera, scene, renderer, model, face;

const api = { state: 'Walking' };

// Keyboard controls
const keys = {
	w: false,
	a: false,
	s: false,
	d: false,
	space: false,
	x: false
};

const moveSpeed = 0.05;

init();

function init() {

	container = document.createElement( 'div' );
	document.body.appendChild( container );

	camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.25, 100 );
	camera.position.set( - 5, 3, 10 );
	camera.lookAt( 0, 2, 0 );

	scene = new THREE.Scene();
	scene.background = new THREE.Color( 0xe0e0e0 );
	scene.fog = new THREE.Fog( 0xe0e0e0, 20, 100 );

	clock = new THREE.Clock();

	// lights

	const hemiLight = new THREE.HemisphereLight( 0xffffff, 0x8d8d8d, 3 );
	hemiLight.position.set( 0, 20, 0 );
	scene.add( hemiLight );

	const dirLight = new THREE.DirectionalLight( 0xffffff, 3 );
	dirLight.position.set( 0, 20, 10 );
	scene.add( dirLight );

	// ground

	const mesh = new THREE.Mesh( new THREE.PlaneGeometry( 2000, 2000 ), new THREE.MeshPhongMaterial( { color: 0xcbcbcb, depthWrite: false } ) );
	mesh.rotation.x = - Math.PI / 2;
	scene.add( mesh );

	const grid = new THREE.GridHelper( 200, 40, 0x000000, 0x000000 );
	grid.material.opacity = 0.2;
	grid.material.transparent = true;
	scene.add( grid );

	// model

	const loader = new GLTFLoader();
	// Using a CDN-hosted model from three.js examples
	loader.load( 'https://threejs.org/examples/models/gltf/RobotExpressive/RobotExpressive.glb', function ( gltf ) {

		model = gltf.scene;
		scene.add( model );

		createGUI( model, gltf.animations );

	}, undefined, function ( e ) {

		console.error( e );
		console.error( 'Failed to load model. Make sure you have internet connection to load from CDN.' );

	} );

	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setAnimationLoop( animate );
	container.appendChild( renderer.domElement );

	window.addEventListener( 'resize', onWindowResize );

	// Keyboard event listeners
	setupKeyboardControls();

	// stats
	stats = new Stats();
	container.appendChild( stats.dom );

}

function createGUI( model, animations ) {

	const states = [ 'Idle', 'Walking', 'Running', 'Dance', 'Death', 'Sitting', 'Standing' ];
	const emotes = [ 'Jump', 'Yes', 'No', 'Wave', 'Punch', 'ThumbsUp' ];

	gui = new GUI();

	mixer = new THREE.AnimationMixer( model );

	actions = {};

	for ( let i = 0; i < animations.length; i ++ ) {

		const clip = animations[ i ];
		const action = mixer.clipAction( clip );
		actions[ clip.name ] = action;

		if ( emotes.indexOf( clip.name ) >= 0 || states.indexOf( clip.name ) >= 4 ) {

			action.clampWhenFinished = true;
			action.loop = THREE.LoopOnce;

		}

	}

	// states

	const statesFolder = gui.addFolder( 'States' );

	const clipCtrl = statesFolder.add( api, 'state' ).options( states );

	clipCtrl.onChange( function () {

		fadeToAction( api.state, 0.5 );

	} );

	statesFolder.open();

	// emotes

	const emoteFolder = gui.addFolder( 'Emotes' );

	function createEmoteCallback( name ) {

		api[ name ] = function () {

			fadeToAction( name, 0.2 );

			mixer.addEventListener( 'finished', restoreState );

		};

		emoteFolder.add( api, name );

	}

	function restoreState() {

		mixer.removeEventListener( 'finished', restoreState );

		fadeToAction( api.state, 0.2 );

	}

	for ( let i = 0; i < emotes.length; i ++ ) {

		createEmoteCallback( emotes[ i ] );

	}

	emoteFolder.open();

	// expressions

	face = model.getObjectByName( 'Head_4' );

	const expressions = Object.keys( face.morphTargetDictionary );
	const expressionFolder = gui.addFolder( 'Expressions' );

	for ( let i = 0; i < expressions.length; i ++ ) {

		expressionFolder.add( face.morphTargetInfluences, i, 0, 1, 0.01 ).name( expressions[ i ] );

	}

	activeAction = actions[ 'Walking' ];
	activeAction.play();

	expressionFolder.open();

}

function fadeToAction( name, duration ) {

	previousAction = activeAction;
	activeAction = actions[ name ];

	if ( previousAction !== activeAction ) {

		previousAction.fadeOut( duration );

	}

	activeAction
		.reset()
		.setEffectiveTimeScale( 1 )
		.setEffectiveWeight( 1 )
		.fadeIn( duration )
		.play();

}

function setupKeyboardControls() {

	window.addEventListener( 'keydown', ( event ) => {

		const key = event.key.toLowerCase();

		if ( key === 'w' ) keys.w = true;
		if ( key === 'a' ) keys.a = true;
		if ( key === 's' ) keys.s = true;
		if ( key === 'd' ) keys.d = true;
		if ( key === ' ' ) {
			keys.space = true;
			event.preventDefault();
			// Trigger jump emote
			if ( api.Jump && mixer ) {
				api.Jump();
			}
		}
		if ( key === 'x' ) {
			keys.x = true;
			// Trigger punch emote
			if ( api.Punch && mixer ) {
				api.Punch();
			}
		}

	} );

	window.addEventListener( 'keyup', ( event ) => {

		const key = event.key.toLowerCase();

		if ( key === 'w' ) keys.w = false;
		if ( key === 'a' ) keys.a = false;
		if ( key === 's' ) keys.s = false;
		if ( key === 'd' ) keys.d = false;
		if ( key === ' ' ) {
			keys.space = false;
			event.preventDefault();
		}
		if ( key === 'x' ) keys.x = false;

	} );

}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );

}

//

function animate() {

	const dt = clock.getDelta();

	if ( mixer ) mixer.update( dt );

	// Handle movement
	if ( model ) {
		handleMovement( dt );
	}

	renderer.render( scene, camera );

	stats.update();

}

function handleMovement( dt ) {

	let moveX = 0;
	let moveZ = 0;
	let isMoving = false;

	// Calculate movement direction
	if ( keys.w ) {
		moveZ -= 1;
		isMoving = true;
	}
	if ( keys.s ) {
		moveZ += 1;
		isMoving = true;
	}
	if ( keys.a ) {
		moveX -= 1;
		isMoving = true;
	}
	if ( keys.d ) {
		moveX += 1;
		isMoving = true;
	}

	// Normalize diagonal movement
	if ( moveX !== 0 && moveZ !== 0 ) {
		moveX *= 0.707; // 1/sqrt(2) for diagonal normalization
		moveZ *= 0.707;
	}

	// Apply movement
	if ( isMoving ) {
		// Move the model
		model.position.x += moveX * moveSpeed;
		model.position.z += moveZ * moveSpeed;

		// Rotate model to face movement direction
		if ( moveX !== 0 || moveZ !== 0 ) {
			const angle = Math.atan2( moveX, moveZ );
			model.rotation.y = angle;
		}

		// Switch to Walking state if not already in an emote
		if ( api.state !== 'Walking' && activeAction && !activeAction.paused ) {
			const currentActionName = Object.keys( actions ).find( name => actions[ name ] === activeAction );
			const emotes = [ 'Jump', 'Yes', 'No', 'Wave', 'Punch', 'ThumbsUp' ];
			if ( !emotes.includes( currentActionName ) ) {
				api.state = 'Walking';
				fadeToAction( 'Walking', 0.2 );
			}
		} else if ( api.state === 'Idle' ) {
			api.state = 'Walking';
			fadeToAction( 'Walking', 0.2 );
		}
	} else {
		// Stop moving - switch to Idle if not in an emote
		if ( api.state === 'Walking' ) {
			const currentActionName = Object.keys( actions ).find( name => actions[ name ] === activeAction );
			const emotes = [ 'Jump', 'Yes', 'No', 'Wave', 'Punch', 'ThumbsUp' ];
			if ( !emotes.includes( currentActionName ) ) {
				api.state = 'Idle';
				fadeToAction( 'Idle', 0.2 );
			}
		}
	}

}
