import * as THREE from 'three';

import Stats from 'three/addons/libs/stats.module.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let container, stats, clock, gui, mixer, actions, activeAction, previousAction;
let camera, scene, renderer, model, face;
let model2, mixer2, actions2, activeAction2, previousAction2;
let wall, wall2;
let raycaster, mouse;
let stage2Objects = [];
let speechBubble = null;
let currentNearbyObject = null;
let frame_1, frame_2, frame_3, frame_4;
let speechBubbles = []; // Array to store all speech bubbles
let helpBubble = null; // Static help speech bubble at bottom of screen
let currentHelpMessage = ''; // Track current message to avoid unnecessary updates
let wateringCan;
let groundTiles = []; // 2D array of ground tile meshes
let wateredTiles = []; // 2D array of boolean values
const TILE_SIZE = 2; // Size of each tile
const GRID_SIZE = 20; // 20x20 grid for 40x40 area
const WATERING_RADIUS = 8;
let grass, grass2, grass3;
let tree;
let tulips;
let blue;
let rose


const api = { state: 'Walking' };

const states = {
	"wall_1_up": false,
	"wall_2_up": false,
	"walls_up": false,
	"stage2_initialized": false,
	"frame1_dusted": false,
	"frame2_dusted": false,
	"frame3_dusted": false,
	"frame4_dusted": false,
	"stage3_initialized": false,
	"wateringCan_pickedUp": false,
	"stage4_initialized": false,
	"y_pressed_stage4": false
}

// Keyboard controls
const keys = {
	w: false,
	a: false,
	s: false,
	d: false,
	space: false,
	x: false,
	y: false,
	n: false
};

const moveSpeed = 10; // units per second (adjust this value to change speed)

init();

function init() {

	container = document.createElement( 'div' );
	document.body.appendChild( container );

	camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.25, 100 );
	camera.position.set( 0, 20, 35 );
	camera.lookAt( 0, 0, 0 );

	scene = new THREE.Scene();
	scene.background = new THREE.Color( 0xe0e0e0 );
	scene.fog = new THREE.Fog( 0xe0e0e0, 100, 500 );

	clock = new THREE.Clock();

	// lights

	const hemiLight = new THREE.HemisphereLight( 0xffffff, 0x8d8d8d, 3 );
	hemiLight.position.set( 0, 20, 0 );
	scene.add( hemiLight );

	const dirLight = new THREE.DirectionalLight( 0xffffff, 3 );
	dirLight.position.set( 0, 20, 10 );
	scene.add( dirLight );

	// ground - create grid of tiles
	createGroundGrid();

	const grid = new THREE.GridHelper( 40, 40, 0x000000, 0x000000 );
	grid.material.opacity = 0.2;
	grid.material.transparent = true;
	scene.add( grid );

	// model

	const loader = new GLTFLoader();
	// Using a CDN-hosted model from three.js examples
	loader.load( 'https://threejs.org/examples/models/gltf/RobotExpressive/RobotExpressive.glb', function ( gltf ) {

		model = gltf.scene;
		
		// Make only yellow parts a very pastel pink
		model.traverse( function ( child ) {
			if ( child.isMesh ) {
				if ( child.material ) {
					// Handle both single materials and arrays
					const materials = Array.isArray( child.material ) ? child.material : [ child.material ];
					materials.forEach( material => {
						if ( material.color ) {
							const color = material.color;
							const r = color.r;
							const g = color.g;
							const b = color.b;
							
							if ( color.getHexString() === 'ca9337' ) {
								material.color.setHex( 0xff96e4 );
							}

							// console.log( material.color.getHexString());
						}
					} );
				}
			}
		} );
		
		scene.add( model );
		console.log( 'First model added to scene at position:', model.position );

		createGUI( model, gltf.animations );

	}, undefined, function ( e ) {

		console.error( e );
		console.error( 'Failed to load model. Make sure you have internet connection to load from CDN.' );

	} );

	// Load second model (idle, positioned 5 blocks away)
	loader.load( 'https://threejs.org/examples/models/gltf/RobotExpressive/RobotExpressive.glb', function ( gltf ) {

		model2 = gltf.scene;
		
		// Position the second model 5 blocks away (along x-axis)
		model2.position.set( 5, 0, 0 );
		
		// Scale the model if needed (same as first model)
		model2.scale.set( 1, 1, 1 );
		
		console.log( 'Second model loaded at position:', model2.position );
		
		// Make only yellow parts a very pastel pink (same as first model)
		// Clone materials to ensure independent rendering
		model2.traverse( function ( child ) {
			if ( child.isMesh ) {
				if ( child.material ) {
					// Clone materials to ensure they're independent
					if ( Array.isArray( child.material ) ) {
						child.material = child.material.map( mat => mat.clone() );
					} else {
						child.material = child.material.clone();
					}
					
					// Handle both single materials and arrays
					const materials = Array.isArray( child.material ) ? child.material : [ child.material ];
					materials.forEach( material => {
						if ( material.color ) {
							const color = material.color;
							
							if ( color.getHexString() === 'ca9337' ) {
								material.color.setHex( 0x4287f5 );
							}
						}
					} );
				}
			}
		} );
		
		scene.add( model2 );
		console.log( 'Second model added to scene. Total scene children:', scene.children.length );

		// Set up animations for second model (idle state)
		mixer2 = new THREE.AnimationMixer( model2 );
		actions2 = {};

		for ( let i = 0; i < gltf.animations.length; i ++ ) {
			const clip = gltf.animations[ i ];
			const action = mixer2.clipAction( clip );
			actions2[ clip.name ] = action;

			const emotes = [ 'Jump', 'Yes', 'No', 'Wave', 'Punch', 'ThumbsUp' ];
			const states = [ 'Idle', 'Walking', 'Running', 'Dance', 'Death', 'Sitting', 'Standing' ];
			
			if ( emotes.indexOf( clip.name ) >= 0 || states.indexOf( clip.name ) >= 4 ) {
				action.clampWhenFinished = true;
				action.loop = THREE.LoopOnce;
			}
		}

		// Set second model to Idle state (not controllable, just stands there)
		if ( actions2[ 'Idle' ] ) {
			activeAction2 = actions2[ 'Idle' ];
			activeAction2.setLoop( THREE.LoopRepeat ); // Ensure Idle loops continuously
			activeAction2.play();
			console.log( 'Second model set to Idle animation' );
		} else {
			console.warn( 'Idle animation not found for second model' );
		}

	}, undefined, function ( e ) {

		console.error( e );
		console.error( 'Failed to load second model. Make sure you have internet connection to load from CDN.' );

	} );

	loader.load( './assets/Wall.glb', function ( gltf ) {
		wall = gltf.scene;
		scene.add( wall );
		wall.position.set( 20, 0, 0 );
		wall.scale.set( 20, 5, 1 );

		wall.rotation.set( Math.PI / 2, 0, Math.PI / 2 );


		wall.traverse( function ( child ) {
			if ( child.isMesh ) {
				child.castShadow = true;
				child.receiveShadow = true;
			}
		} );

		scene.add( wall );
	
	} );

	loader.load( './assets/Wall.glb', function ( gltf ) {
		wall2 = gltf.scene;
		scene.add( wall2 );
		wall2.position.set( -20, 0, 0 );
		wall2.scale.set( 20, 5, 1 );
		wall2.rotation.set( Math.PI / 2, 0,  - Math.PI / 2 );

		wall2.traverse( function ( child ) {
			if ( child.isMesh ) {
				child.castShadow = true;
				child.receiveShadow = true;
			}
		} );

		scene.add( wall2 );
	
	} );

	




	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setAnimationLoop( animate );
	container.appendChild( renderer.domElement );

	window.addEventListener( 'resize', onWindowResize );

	// Setup raycasting for interactions
	raycaster = new THREE.Raycaster();
	mouse = new THREE.Vector2();

	// Mouse click event listener for stage 2 interactions
	window.addEventListener( 'click', onMouseClick, false );

	// Keyboard event listeners
	setupKeyboardControls();

	// Create help bubble
	helpBubble = createHelpBubble();

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

	// expressions

	face = model.getObjectByName( 'Head_4' );

	const expressions = Object.keys( face.morphTargetDictionary );
	const expressionFolder = gui.addFolder( 'Expressions' );

	for ( let i = 0; i < expressions.length; i ++ ) {

		expressionFolder.add( face.morphTargetInfluences, i, 0, 1, 0.01 ).name( expressions[ i ] );

	}

	activeAction = actions[ 'Walking' ];
	activeAction.play();

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

function fadeToAction2( name, duration ) {

	previousAction2 = activeAction2;
	activeAction2 = actions2[ name ];

	if ( previousAction2 !== activeAction2 ) {

		previousAction2.fadeOut( duration );

	}

	// Set loop mode for Dance animation
	if ( name === 'Dance' ) {
		activeAction2.setLoop( THREE.LoopRepeat );
	}

	activeAction2
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
		if ( key === 'y' ) {
			keys.y = true;
			// Trigger dance animation only in stage 4
			if ( states.stage4_initialized && mixer && actions[ 'Dance' ] ) {
				api.state = 'Dance';
				fadeToAction( 'Dance', 0.5 );
			}
			// Trigger dance animation for model2 as well
			if ( states.stage4_initialized && mixer2 && actions2[ 'Dance' ] ) {
				fadeToAction2( 'Dance', 0.5 );
			}
			// Update help bubble message in stage 4
			if ( states.stage4_initialized && helpBubble && helpBubble.userData.updateText ) {
				states.y_pressed_stage4 = true;
				helpBubble.userData.updateText( 'woooooooooo' );
				currentHelpMessage = 'woooooooooo';
			}
		}
		if ( key === 'n' ) {
			keys.n = true;
			// Trigger death animation for model2 only in stage 4
			if ( states.stage4_initialized && mixer2 && actions2[ 'Death' ] ) {
				fadeToAction2( 'Death', 0.5 );
			}
		}
		if ( key === 'x' ) {
			keys.x = true;
			// Trigger punch emote
			if ( api.Punch && mixer ) {
				api.Punch();
			}
			// Rotate wall(s) 90 degrees only when near the wall
			if ( model ) {
				const proximityThreshold = 3; // Distance threshold for being "near" the wall
				if ( ! states.walls_up ) {
					if ( wall && Math.abs( model.position.x - 19 ) < proximityThreshold && ! states.wall_1_up ) {
						// wall.rotation.x += Math.PI / 2;
						wall.rotation.y -= Math.PI / 2;
						states.wall_1_up = true;
					}

					if ( wall2 && Math.abs( model.position.x - ( -19 ) ) < proximityThreshold && ! states.wall_2_up ) {
						// wall2.rotation.x += Math.PI / 2;
						wall2.rotation.y += Math.PI / 2;
						states.wall_2_up = true;
					}

					if ( states.wall_1_up && states.wall_2_up ) {
						states.walls_up = true;
						// Initialize stage 2 when both walls are up
						if ( !states.stage2_initialized ) {
							initStage2();
							states.stage2_initialized = true;
						}
					}

				}
				
				// Remove dusty overlay from frames when near them (only once per frame)
				if ( states.stage2_initialized ) {
					const frameProximityThreshold = 3.0; // Same threshold as used in animate function
					
					// Check each frame
					if ( frame_1 && !states.frame1_dusted ) {
						const dx1 = model.position.x - frame_1.position.x;
						const dz1 = model.position.z - frame_1.position.z;
						const dist1 = Math.sqrt( dx1 * dx1 + dz1 * dz1 );
						if ( dist1 < frameProximityThreshold && frame_1.userData.dustyOverlay ) {
							frame_1.userData.dustyOverlay.visible = false;
							states.frame1_dusted = true;
							console.log( 'Dust removed from frame 1' );
						}
					}
					
					if ( frame_2 && !states.frame2_dusted ) {
						const dx2 = model.position.x - frame_2.position.x;
						const dz2 = model.position.z - frame_2.position.z;
						const dist2 = Math.sqrt( dx2 * dx2 + dz2 * dz2 );
						if ( dist2 < frameProximityThreshold && frame_2.userData.dustyOverlay ) {
							frame_2.userData.dustyOverlay.visible = false;
							states.frame2_dusted = true;
							console.log( 'Dust removed from frame 2' );
						}
					}
					
					if ( frame_3 && !states.frame3_dusted ) {
						const dx3 = model.position.x - frame_3.position.x;
						const dz3 = model.position.z - frame_3.position.z;
						const dist3 = Math.sqrt( dx3 * dx3 + dz3 * dz3 );
						if ( dist3 < frameProximityThreshold && frame_3.userData.dustyOverlay ) {
							frame_3.userData.dustyOverlay.visible = false;
							states.frame3_dusted = true;
							console.log( 'Dust removed from frame 3' );
						}
					}
					
					if ( frame_4 && !states.frame4_dusted ) {
						const dx4 = model.position.x - frame_4.position.x;
						const dz4 = model.position.z - frame_4.position.z;
						const dist4 = Math.sqrt( dx4 * dx4 + dz4 * dz4 );
						if ( dist4 < frameProximityThreshold && frame_4.userData.dustyOverlay ) {
							frame_4.userData.dustyOverlay.visible = false;
							states.frame4_dusted = true;
							console.log( 'Dust removed from frame 4' );
						}
					}
					
					// Check if all frames have been dusted and initialize stage 3
					if ( states.frame1_dusted && states.frame2_dusted && states.frame3_dusted && states.frame4_dusted ) {
						if ( !states.stage3_initialized ) {
							initStage3();
							states.stage3_initialized = true;
						}
					}
				}
				
				// Pick up wateringCan when near it
				if ( states.stage3_initialized && wateringCan && !states.wateringCan_pickedUp ) {
					const wateringCanProximityThreshold = 10.0; // Increased threshold
					
					// Get world position of wateringCan
					const wateringCanWorldPos = new THREE.Vector3();
					wateringCan.getWorldPosition( wateringCanWorldPos );
					
					const dx = model.position.x - wateringCanWorldPos.x;
					const dz = model.position.z - wateringCanWorldPos.z;
					const dist = Math.sqrt( dx * dx + dz * dz );
					
					// Debug logging - only log when close enough
					if ( dist < wateringCanProximityThreshold * 1.5 ) {
						console.log( 'Near wateringCan - distance:', dist.toFixed(2), 'threshold:', wateringCanProximityThreshold );
					}
					
					if ( dist < wateringCanProximityThreshold ) {
						// Pick up the wateringCan - attach it to the model
						// Make sure it's in the scene before removing
						if ( wateringCan.parent === scene ) {
							scene.remove( wateringCan );
						}
						model.add( wateringCan );
						// Position it relative to the model (e.g., in hand or next to body)
						wateringCan.position.set( 0.5, 1.5, 0.5 ); // Adjust these values to position it nicely
						wateringCan.rotation.set( 0, 0, 0 );
						states.wateringCan_pickedUp = true;
						console.log( 'Watering can picked up!' );
					}
				} else if ( states.stage3_initialized && !wateringCan ) {
					console.log( 'Warning: stage3 initialized but wateringCan not loaded yet' );
				} else if ( states.stage3_initialized && states.wateringCan_pickedUp ) {
					console.log( 'WateringCan already picked up' );
				}
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
		if ( key === 'y' ) keys.y = false;
		if ( key === 'n' ) keys.n = false;

	} );

}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );

}

function initStage2() {
	console.log( 'Stage 2 initialized! Loading interactive objects...' );
	const loader = new GLTFLoader();
	loader.load( './assets/frame.glb', function ( gltf ) {
		frame_1 = gltf.scene;
		scene.add( frame_1 );
		frame_1.position.set( -19.5, 5, -5 );
		frame_1.scale.set( 5, 5, 5 );

		frame_1.rotation.set( 0, 0, 0 );


		frame_1.traverse( function ( child ) {
			if ( child.isMesh ) {
				child.castShadow = true;
				child.receiveShadow = true;
			}
		} );

		// Add custom properties for interaction (similar to shapes)
		frame_1.userData.isInteractive = true;
		frame_1.userData.originalPosition = { x: -19.5, y: 5, z: -5 };
		frame_1.userData.rotationSpeed = 0;
		frame_1.userData.bobSpeed = 0;
		frame_1.userData.bobAmount = 0;
		frame_1.userData.interacted = false;

		scene.add( frame_1 );
		stage2Objects.push( frame_1 );
		
		// Create speech bubble for this frame with image 1
		// To use a different image, add img1.jpeg to assets/images/ and change the path below
		createSpeechBubbleForFrame( frame_1, './assets/images/frame1_pic.jpeg' );
	
	} );
	
	loader.load( './assets/frame.glb', function ( gltf ) {
		frame_2 = gltf.scene;
		scene.add( frame_2 );
		frame_2.position.set( -19.5, 5, 5 );
		frame_2.scale.set( 5, 5, 5 );

		frame_2.rotation.set( 0, 0, 0 );


		frame_2.traverse( function ( child ) {
			if ( child.isMesh ) {
				child.castShadow = true;
				child.receiveShadow = true;
			}
		} );

		// Add custom properties for interaction (similar to shapes)
		frame_2.userData.isInteractive = true;
		frame_2.userData.originalPosition = { x: -19.5, y: 5, z: 5 };
		frame_2.userData.rotationSpeed = 0;
		frame_2.userData.bobSpeed = 0;
		frame_2.userData.bobAmount = 0;
		frame_2.userData.interacted = false;

		scene.add( frame_2 );
		stage2Objects.push( frame_2 );
		
		// Create speech bubble for this frame with image 2
		// To use a different image, add img2.jpeg to assets/images/ and change the path below
		createSpeechBubbleForFrame( frame_2, './assets/images/frame2_pic.jpeg' );
	
	} );

	loader.load( './assets/frame.glb', function ( gltf ) {
		frame_3 = gltf.scene;
		scene.add( frame_3 );
		frame_3.position.set( 19.5, 5, -5 );
		frame_3.scale.set( 5, 5, 5 );

		frame_3.rotation.set( 0, Math.PI, 0 );


		frame_3.traverse( function ( child ) {
			if ( child.isMesh ) {
				child.castShadow = true;
				child.receiveShadow = true;
			}
		} );

		// Add custom properties for interaction (similar to shapes)
		frame_3.userData.isInteractive = true;
		frame_3.userData.originalPosition = { x: 19.5, y: 5, z: -5 };
		frame_3.userData.rotationSpeed = 0;
		frame_3.userData.bobSpeed = 0;
		frame_3.userData.bobAmount = 0;
		frame_3.userData.interacted = false;

		scene.add( frame_3 );
		stage2Objects.push( frame_3 );
		
		// Create speech bubble for this frame with image 3
		// To use a different image, add img3.jpeg to assets/images/ and change the path below
		createSpeechBubbleForFrame( frame_3, './assets/images/frame3_pic.jpeg' );
	
	} );
	
	loader.load( './assets/frame.glb', function ( gltf ) {
		frame_4 = gltf.scene;
		scene.add( frame_4 );
		frame_4.position.set( 19.5, 5, 5 );
		frame_4.scale.set( 5, 5, 5 );

		frame_4.rotation.set( 0, Math.PI, 0 );


		frame_4.traverse( function ( child ) {
			if ( child.isMesh ) {
				child.castShadow = true;
				child.receiveShadow = true;
			}
		} );

		// Add custom properties for interaction (similar to shapes)
		frame_4.userData.isInteractive = true;
		frame_4.userData.originalPosition = { x: 19.5, y: 5, z: 5 };
		frame_4.userData.rotationSpeed = 0;
		frame_4.userData.bobSpeed = 0;
		frame_4.userData.bobAmount = 0;
		frame_4.userData.interacted = false;

		scene.add( frame_4 );
		stage2Objects.push( frame_4 );
		
		// Create speech bubble for this frame with image 4
		// To use a different image, add img4.jpeg to assets/images/ and change the path below
		createSpeechBubbleForFrame( frame_4, './assets/images/frame4_pic.jpeg' );
	
	} );


	console.log( `Stage 2: ${stage2Objects.length} interactive objects loaded!` );
	console.log( 'Stage 2 objects positions:', stage2Objects.map( obj => ({ x: obj.position.x, z: obj.position.z }) ) );
	
	// Note: Speech bubbles are created inside each frame's loader callback
	// To use different images for each frame, add images to assets/images/ and update the paths
	// Example: './assets/images/img1.jpeg', './assets/images/img2.jpeg', etc.
}

function initStage3() {
	console.log( 'Stage 3 initialized! All pictures have been dusted!' );
	
	const loader = new GLTFLoader();
	loader.load( './assets/watercan.glb', function ( gltf ) {
		wateringCan = gltf.scene;
		wateringCan.position.set( -17, 0, -17 );
		wateringCan.scale.set( 1, 1, 1 );

		wateringCan.traverse( function ( child ) {
			if ( child.isMesh ) {
				child.castShadow = true;
				child.receiveShadow = true;
			}
		} );

		scene.add( wateringCan );
		console.log( 'WateringCan loaded at position:', wateringCan.position );
	
	} );
}

function createGroundGrid() {
	// Initialize arrays
	groundTiles = [];
	wateredTiles = [];
	
	const startX = -20; // Start at -20 to center the grid
	const startZ = -20;
	
	// Create grid of tiles
	for ( let i = 0; i < GRID_SIZE; i++ ) {
		groundTiles[ i ] = [];
		wateredTiles[ i ] = [];
		
		for ( let j = 0; j < GRID_SIZE; j++ ) {
			// Calculate tile position
			const x = startX + i * TILE_SIZE + TILE_SIZE / 2;
			const z = startZ + j * TILE_SIZE + TILE_SIZE / 2;
			
			// Create tile mesh
			const tileMaterial = new THREE.MeshPhongMaterial( { 
				color: 0x4a9b4a, // Light green (unwatered)
				depthWrite: false 
			} );
			const tile = new THREE.Mesh( 
				new THREE.PlaneGeometry( TILE_SIZE, TILE_SIZE ), 
				tileMaterial 
			);
			tile.rotation.x = - Math.PI / 2;
			tile.position.set( x, 0, z );
			
			// Store material reference for easy color changes
			tile.userData.material = tileMaterial;
			tile.userData.gridX = i;
			tile.userData.gridZ = j;
			
			scene.add( tile );
			groundTiles[ i ][ j ] = tile;
			wateredTiles[ i ][ j ] = false;
		}
	}
	
	console.log( `Ground grid created: ${GRID_SIZE}x${GRID_SIZE} tiles` );
}

function handleWatering() {
	if ( !states.wateringCan_pickedUp || !keys.x || !model ) {
		return;
	}
	
	const playerX = model.position.x;
	const playerZ = model.position.z;
	let anyWatered = false;
	
	// Check all tiles and water those within radius
	for ( let i = 0; i < GRID_SIZE; i++ ) {
		for ( let j = 0; j < GRID_SIZE; j++ ) {
			if ( wateredTiles[ i ][ j ] ) {
				continue; // Already watered
			}
			
			const tile = groundTiles[ i ][ j ];
			const tileX = tile.position.x;
			const tileZ = tile.position.z;
			
			// Calculate distance from player to tile center
			const dx = tileX - playerX;
			const dz = tileZ - playerZ;
			const distance = Math.sqrt( dx * dx + dz * dz );
			
			// Water tiles within radius
			if ( distance <= WATERING_RADIUS ) {
				wateredTiles[ i ][ j ] = true;
				tile.userData.material.color.setHex( 0x2d5a2d ); // Dark green
				anyWatered = true;
			}
		}
	}
	
	// Check if all tiles are watered
	if ( anyWatered && checkAllWatered() ) {
		if ( !states.stage4_initialized ) {
			initStage4();
			states.stage4_initialized = true;
		}
	}
}

function checkAllWatered() {
	for ( let i = 0; i < GRID_SIZE; i++ ) {
		for ( let j = 0; j < GRID_SIZE; j++ ) {
			if ( !wateredTiles[ i ][ j ] ) {
				return false;
			}
		}
	}
	return true;
}

function initStage4() {
	console.log( 'Stage 4 initialized! All ground has been watered!' );
	
	// Create speech bubble for model2
	createSpeechBubbleForModel2( './assets/images/image.png' );
	
	// Remove watering can from the model
	if ( wateringCan && model ) {
		model.remove( wateringCan );
		// Optionally remove it from the scene entirely
		if ( wateringCan.parent === model ) {
			scene.remove( wateringCan );
		}
		console.log( 'Watering can removed from model' );
	}

	const loader = new GLTFLoader();

	loader.load( './assets/grass.glb', function ( gltf ) {
		grass = gltf.scene;
		grass.position.set( 13, 0, 13 );
		grass.scale.set( 5, 5, 5 );

		scene.add( grass );
		console.log( 'Grass loaded at position:', grass.position );
	
	} );


	loader.load( './assets/grass.glb', function ( gltf ) {
		grass2 = gltf.scene;
		grass2.position.set( -15, 0, 2 );
		grass2.scale.set( 8, 8, 8 );

		scene.add( grass2 );
		console.log( 'Grass2 loaded at position:', grass2.position );
	} );

	loader.load( './assets/grass.glb', function ( gltf ) {
		grass3 = gltf.scene;
		grass3.position.set( 17, 0, -17 );
		grass3.scale.set( 8, 8, 8 );

		scene.add( grass3 );
		console.log( 'Grass3 loaded at position:', grass3.position );
	} );

	loader.load( './assets/tulip.glb', function ( gltf ) {
		tulips = gltf.scene;
		tulips.position.set( -7, 0, 10 );
		tulips.scale.set( 2, 2, 2 );

		scene.add( tulips );
		console.log( 'Tulips loaded at position:', tulips.position );
	} );

	loader.load( './assets/rose.glb', function ( gltf ) {
		rose = gltf.scene;
		rose.scale.set( 0.05, 0.05, 0.05 );

		rose.position.set( 0, 0, 0 );
		scene.add( rose );

	} );

	loader.load( './assets/tree.glb', function ( gltf ) {
		tree = gltf.scene;
		tree.position.set( 0, 0, -5 );
		tree.scale.set( 0.05, 0.05, 0.05 );

		tree.traverse( function ( child ) {
			if ( child.isMesh ) {
				child.castShadow = true;
				child.receiveShadow = true;
			}
		} );

		scene.add( tree );
		

	}, undefined, function ( error ) {
		console.error( 'Error loading tree:', error );
	} );








}

function createSpeechBubbleForFrame( frame, imagePath ) {
	// Load image texture
	const textureLoader = new THREE.TextureLoader();
	
	textureLoader.load( 
		imagePath,
		// onLoad callback
		function ( texture ) {
			// Create sprite material with the loaded image
			const spriteMaterial = new THREE.SpriteMaterial( { 
				map: texture,
				color: 0xdddddd, // Darken the image by applying a darker color tint (0x666666 = ~40% brightness)
				// transparent: true,
				alphaTest: 0.1,
				depthTest: false, // Always render on top
				depthWrite: false
			} );
			
			// Create sprite
			const bubble = new THREE.Sprite( spriteMaterial );
			
			// Calculate aspect ratio to maintain image proportions
			const aspectRatio = texture.image.width / texture.image.height;
			const baseHeight = 15; // Base height for the sprite (increased from 6 to make images larger)
			bubble.scale.set( baseHeight * aspectRatio, baseHeight, 1 );
			
			bubble.visible = false; // Initially hidden
			bubble.renderOrder = 999; // Render on top
			scene.add( bubble );
			
			// Create dusty overlay sprite
			const dustyMaterial = new THREE.SpriteMaterial( {
				color: 0x8b7355, // Brownish dusty color
				transparent: true,
				opacity: 0.6, // Semi-transparent dusty layer
				depthTest: false,
				depthWrite: false
			} );
			
			const dustyOverlay = new THREE.Sprite( dustyMaterial );
			dustyOverlay.scale.copy( bubble.scale ); // Same size as the image
			dustyOverlay.visible = false; // Initially hidden (same as bubble)
			dustyOverlay.renderOrder = 1000; // Render on top of the image
			scene.add( dustyOverlay );
			
			// Store speech bubble and dusty overlay references in frame's userData
			frame.userData.speechBubble = bubble;
			frame.userData.dustyOverlay = dustyOverlay;
			speechBubbles.push( bubble );
			
			console.log( `Speech bubble created for frame at (${frame.position.x}, ${frame.position.z}) with image: ${imagePath}` );
		},
		// onProgress callback (optional)
		undefined,
		// onError callback
		function ( error ) {
			console.error( 'Error loading speech bubble image:', error );
			console.error( 'Attempted to load from:', imagePath );
		}
	);
}

function createSpeechBubbleForModel2( imagePath ) {
	// Load image texture
	const textureLoader = new THREE.TextureLoader();
	
	textureLoader.load( 
		imagePath,
		// onLoad callback
		function ( texture ) {
			// Create sprite material with the loaded image
			const spriteMaterial = new THREE.SpriteMaterial( { 
				map: texture,
				color: 0xdddddd, // Darken the image by applying a darker color tint
				alphaTest: 0.1,
				depthTest: false, // Always render on top
				depthWrite: false
			} );
			
			// Create sprite
			const bubble = new THREE.Sprite( spriteMaterial );
			
			// Calculate aspect ratio to maintain image proportions
			const aspectRatio = texture.image.width / texture.image.height;
			const baseHeight = 10; // Base height for the sprite
			bubble.scale.set( baseHeight * aspectRatio, baseHeight, 1 );
			
			bubble.visible = false; // Initially hidden
			bubble.renderOrder = 999; // Render on top
			scene.add( bubble );
			
			// Store speech bubble reference in model2's userData
			if ( model2 ) {
				model2.userData.speechBubble = bubble;
				console.log( `Speech bubble created for model2 at (${model2.position.x}, ${model2.position.z}) with image: ${imagePath}` );
			} else {
				console.warn( 'model2 not available when creating speech bubble' );
			}
		},
		// onProgress callback (optional)
		undefined,
		// onError callback
		function ( error ) {
			console.error( 'Error loading model2 speech bubble image:', error );
			console.error( 'Attempted to load from:', imagePath );
		}
	);
}

function createHelpBubble() {
	// Create canvas for text rendering
	const canvas = document.createElement( 'canvas' );
	const context = canvas.getContext( '2d' );
	canvas.width = 2048; // Increased width to fit more text per row
	canvas.height = 256;
	
	// Function to update the help bubble text
	function updateHelpText( message ) {
		// Clear canvas
		context.clearRect( 0, 0, canvas.width, canvas.height );
		
		// Draw background (speech bubble style)
		context.fillStyle = 'rgba(255, 255, 255, 0.9)';
		context.strokeStyle = 'rgba(0, 0, 0, 0.3)';
		context.lineWidth = 4;
		
		// Rounded rectangle for bubble
		const padding = 20;
		const cornerRadius = 15;
		const x = padding;
		const y = padding;
		const width = canvas.width - padding * 2;
		const height = canvas.height - padding * 2;
		
		// Draw rounded rectangle
		context.beginPath();
		context.moveTo( x + cornerRadius, y );
		context.lineTo( x + width - cornerRadius, y );
		context.quadraticCurveTo( x + width, y, x + width, y + cornerRadius );
		context.lineTo( x + width, y + height - cornerRadius );
		context.quadraticCurveTo( x + width, y + height, x + width - cornerRadius, y + height );
		context.lineTo( x + cornerRadius, y + height );
		context.quadraticCurveTo( x, y + height, x, y + height - cornerRadius );
		context.lineTo( x, y + cornerRadius );
		context.quadraticCurveTo( x, y, x + cornerRadius, y );
		context.closePath();
		context.fill();
		context.stroke();
		
		// Draw text
		context.fillStyle = '#000000';
		context.font = 'bold 48px Arial';
		context.textAlign = 'center';
		context.textBaseline = 'middle';
		
		// Word wrap text
		const words = message.split( ' ' );
		const lineHeight = 60;
		const maxWidth = width - padding * 2;
		let line = '';
		let yPos = canvas.height / 2 - ( ( words.length > 3 ? 2 : 1 ) * lineHeight ) / 2;
		
		for ( let i = 0; i < words.length; i++ ) {
			const testLine = line + words[i] + ' ';
			const metrics = context.measureText( testLine );
			if ( metrics.width > maxWidth && i > 0 ) {
				context.fillText( line, canvas.width / 2, yPos );
				line = words[i] + ' ';
				yPos += lineHeight;
			} else {
				line = testLine;
			}
		}
		context.fillText( line, canvas.width / 2, yPos );
	}
	
	// Create texture from canvas
	const texture = new THREE.CanvasTexture( canvas );
	texture.needsUpdate = true;
	
	// Wrap updateHelpText to include texture update
	const wrappedUpdateHelpText = function( message ) {
		updateHelpText( message );
		// Force texture update after canvas is drawn
		texture.needsUpdate = true;
	};
	
	// Create sprite material
	const spriteMaterial = new THREE.SpriteMaterial( {
		map: texture,
		transparent: true,
		depthTest: false,
		depthWrite: false
	} );
	
	// Create sprite
	const bubble = new THREE.Sprite( spriteMaterial );
	bubble.scale.set( 18, 3, 1 ); // Larger horizontal size for help bubble
	bubble.renderOrder = 1001; // Render on top of everything
	bubble.visible = true;
	scene.add( bubble );
	
	// Store wrapped update function
	bubble.userData.updateText = wrappedUpdateHelpText;
	
	// Set initial message
	const initialMessage = 'Use WASD to move, X to interact';
	updateHelpText( initialMessage );
	currentHelpMessage = initialMessage;
	
	return bubble;
}

function updateHelpMessage() {
	if ( !helpBubble ) return;
	
	let message = '';
	
	// Determine message based on game state
	// Check stages in reverse order (latest stage first) to ensure proper priority
	if ( states.stage3_initialized ) {
		if ( !states.wateringCan_pickedUp ) {
			message = 'I also need help with the garden. Can you help water the ground? \n Everything is better when it\'s wet ;)';
		} else {
			// Calculate watering progress with safety checks
			let wateredCount = 0;
			const totalTiles = GRID_SIZE * GRID_SIZE;
			
			// Ensure arrays are initialized
			if ( wateredTiles && wateredTiles.length > 0 ) {
				for ( let i = 0; i < GRID_SIZE; i++ ) {
					if ( wateredTiles[ i ] && wateredTiles[ i ].length > 0 ) {
						for ( let j = 0; j < GRID_SIZE; j++ ) {
							if ( wateredTiles[ i ][ j ] === true ) {
								wateredCount++;
							}
						}
					}
				}
			}
			
			const progress = totalTiles > 0 ? Math.round( ( wateredCount / totalTiles ) * 100 ) : 0;
			
			if ( states.stage4_initialized ) {
				if ( states.y_pressed_stage4 ) {
					message = 'woooooooooo';
				} else {
					message = 'Wow! Looks like you can make things grow pretty easily. I have a secret to tell you, come closer';
				}
			} else if ( progress === 100 ) {
				message = 'Wow! Looks like you can make things grow pretty easily. I have a secret to tell you, come closer';
			} else {
				message = `Hold X to water the ground (${progress}% watered)`;
			}
		}
	} else if ( states.stage2_initialized ) {
		const dustedCount = ( states.frame1_dusted ? 1 : 0 ) + 
		                    ( states.frame2_dusted ? 1 : 0 ) + 
		                    ( states.frame3_dusted ? 1 : 0 ) + 
		                    ( states.frame4_dusted ? 1 : 0 );
		
		if ( dustedCount === 0 ) {
			message = 'I accidently used vinegar gel on the pictures. Can you help clean them?';
		} else if ( dustedCount < 4 ) {
			message = `Cleaned ${dustedCount}/4 pictures! Keep going!`;
		} else if ( dustedCount === 4 ) {
			message = 'All pictures cleaned! Well done!';
		}
	} else if ( !states.walls_up ) {
		if ( !states.wall_1_up && !states.wall_2_up ) {
			message = 'Hey! My place always sucks when you\'re not around. Can you help build it back up?';
		} else if ( states.wall_1_up && !states.wall_2_up ) {
			message = 'Nice we got one of them up. Now lets get the other one up!';
		} else if ( !states.wall_1_up && states.wall_2_up ) {
			message = 'Nice we got one of them up. Now lets get the other one up!';
		}
	} else {
		message = 'Use WASD to move, X to interact';
	}
	
	// Always update message when watering (for progress updates), otherwise only update if changed
	const isWateringStage = states.stage3_initialized && states.wateringCan_pickedUp;
	const shouldUpdate = isWateringStage || ( message !== currentHelpMessage );
	
	if ( shouldUpdate ) {
		currentHelpMessage = message;
		if ( helpBubble && helpBubble.userData.updateText ) {
			helpBubble.userData.updateText( message );
		}
	}
}

function onMouseClick( event ) {
	// Only handle clicks if stage 2 is initialized
	if ( !states.stage2_initialized ) return;

	// Calculate mouse position in normalized device coordinates (-1 to +1)
	mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	mouse.y = -( event.clientY / window.innerHeight ) * 2 + 1;

	// Update the picking ray with the camera and mouse position
	raycaster.setFromCamera( mouse, camera );

	// Calculate objects intersecting the picking ray
	const intersects = raycaster.intersectObjects( stage2Objects );

	if ( intersects.length > 0 ) {
		const clickedObject = intersects[0].object;
		
		if ( clickedObject.userData.isInteractive ) {
			// Handle interaction
			handleObjectInteraction( clickedObject );
		}
	}
}

function handleObjectInteraction( object ) {
	console.log( 'Object interacted with!', object );

	// Mark as interacted
	object.userData.interacted = true;

	// Visual feedback: change color and scale
	const material = object.material;
	const originalColor = object.userData.originalColor;
	
	// Flash effect
	material.emissive.setHex( 0xffffff );
	material.emissiveIntensity = 0.8;
	
	// Scale up briefly
	const originalScale = object.scale.clone();
	object.scale.multiplyScalar( 1.5 );

	// Reset after a short time
	setTimeout( () => {
		material.emissive.setHex( originalColor );
		material.emissiveIntensity = 0.2;
		object.scale.copy( originalScale );
	}, 300 );

	// Optional: Trigger an emote on the character
	if ( api.Wave && mixer ) {
		api.Wave();
	}
}

//

function animate() {

	const dt = clock.getDelta();

	if ( mixer ) mixer.update( dt );
	if ( mixer2 ) mixer2.update( dt );

	// Handle movement
	if ( model ) {
		handleMovement( dt );
	}

	// Handle watering when watering can is picked up
	if ( states.wateringCan_pickedUp ) {
		handleWatering();
	}

	// Animate stage 2 objects and check proximity for speech bubble
	if ( states.stage2_initialized && model ) {
		let foundNearby = false;
		const proximityThreshold = 3.0; // 1 block distance (horizontal only)
		
		stage2Objects.forEach( ( obj ) => {
			// Rotate objects
			obj.rotation.x += obj.userData.rotationSpeed;
			obj.rotation.y += obj.userData.rotationSpeed * 0.7;
			
			// Bob up and down
			const time = clock.getElapsedTime();
			obj.position.y = obj.userData.originalPosition.y + Math.sin( time * obj.userData.bobSpeed ) * obj.userData.bobAmount;
			
			// Check proximity to player (horizontal distance only, ignoring Y-axis)
			const dx = model.position.x - obj.position.x;
			const dz = model.position.z - obj.position.z;
			const horizontalDistance = Math.sqrt( dx * dx + dz * dz );
			
			// Get the speech bubble and dusty overlay for this object
			const objSpeechBubble = obj.userData.speechBubble;
			const objDustyOverlay = obj.userData.dustyOverlay;
			
			if ( horizontalDistance < proximityThreshold ) {
				// Show this object's speech bubble
				if ( objSpeechBubble ) {
					if ( !foundNearby ) {
						// Hide all other speech bubbles first
						speechBubbles.forEach( bubble => {
							if ( bubble !== objSpeechBubble ) {
								bubble.visible = false;
							}
						} );
						// Hide all other dusty overlays
						stage2Objects.forEach( otherObj => {
							if ( otherObj !== obj && otherObj.userData.dustyOverlay ) {
								otherObj.userData.dustyOverlay.visible = false;
							}
						} );
					}
					
					foundNearby = true;
					currentNearbyObject = obj;
					objSpeechBubble.visible = true;
					objSpeechBubble.position.set( 
						obj.position.x, 
						obj.position.y + 8, // High in the sky above object
						obj.position.z 
					);
					// Make speech bubble always face camera
					objSpeechBubble.lookAt( camera.position );
					
					// Show and position dusty overlay if it exists and hasn't been removed
					if ( objDustyOverlay ) {
						// Determine which frame this is and check if dust has been removed
						let dustRemoved = false;
						if ( obj === frame_1 ) dustRemoved = states.frame1_dusted;
						else if ( obj === frame_2 ) dustRemoved = states.frame2_dusted;
						else if ( obj === frame_3 ) dustRemoved = states.frame3_dusted;
						else if ( obj === frame_4 ) dustRemoved = states.frame4_dusted;
						
						if ( !dustRemoved ) {
							objDustyOverlay.visible = true;
							objDustyOverlay.position.copy( objSpeechBubble.position );
							objDustyOverlay.lookAt( camera.position );
						} else {
							objDustyOverlay.visible = false;
						}
					}
				}
			} else {
				// Hide this object's speech bubble if we're not near it
				if ( objSpeechBubble && objSpeechBubble.visible ) {
					objSpeechBubble.visible = false;
				}
				// Hide dusty overlay
				if ( objDustyOverlay && objDustyOverlay.visible ) {
					objDustyOverlay.visible = false;
				}
			}
		} );
		
		// Reset current nearby object if not near any
		if ( !foundNearby ) {
			currentNearbyObject = null;
		}
	}

	// Check proximity to model2 and show/hide speech bubble (only in stage 4)
	if ( states.stage4_initialized && model && model2 && model2.userData.speechBubble ) {
		const proximityThreshold = 3.0; // Distance threshold for being "near" model2
		
		// Calculate horizontal distance between player and model2 (ignoring Y-axis)
		const dx = model.position.x - model2.position.x;
		const dz = model.position.z - model2.position.z;
		const horizontalDistance = Math.sqrt( dx * dx + dz * dz );
		
		const model2SpeechBubble = model2.userData.speechBubble;
		
		if ( horizontalDistance < proximityThreshold ) {
			// Show speech bubble when near model2
			model2SpeechBubble.visible = true;
			model2SpeechBubble.position.set( 
				model2.position.x, 
				model2.position.y + 10, // A little above model2 so model2 remains visible
				model2.position.z 
			);
			// Make speech bubble always face camera
			model2SpeechBubble.lookAt( camera.position );
		} else {
			// Hide speech bubble when not near model2
			model2SpeechBubble.visible = false;
		}
	}

	// Update help bubble position (always at bottom of screen)
	if ( helpBubble ) {
		// Position help bubble at bottom center of screen in world space
		// Convert screen coordinates to world coordinates
		const vector = new THREE.Vector3( 0, -0.7, -0.5 ); // Bottom center, slightly in front
		vector.unproject( camera );
		const dir = vector.sub( camera.position ).normalize();
		const distance = 15; // Distance from camera
		helpBubble.position.copy( camera.position ).add( dir.multiplyScalar( distance ) );
		helpBubble.lookAt( camera.position );
		
		// Update help message based on game state
		updateHelpMessage();
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
		// Calculate new position using moveSpeed multiplied by delta time for frame-rate independence
		const newX = model.position.x + moveX * moveSpeed * dt;
		const newZ = model.position.z + moveZ * moveSpeed * dt;
		
		// Boundary limits (40x40 floor means -20 to +20)
		const boundary = 20;
		
		// Move the model with boundary checking
		model.position.x = Math.max( -boundary, Math.min( boundary, newX ) );
		model.position.z = Math.max( -boundary, Math.min( boundary, newZ ) );

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
