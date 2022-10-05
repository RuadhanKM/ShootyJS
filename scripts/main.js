const canvas = document.querySelector("#canvas")
const ctx = canvas.getContext("2d")

const renderer = new Renderer(ctx, canvas)

const input = new Input()

const player = new Player()
var players = {}

renderer.addScene("Game")
renderer.addScene("MainMenu", input)
renderer.addScene("MapEditor", input)
renderer.switchScene("MainMenu")


var performanceMode = false
var interpolation = 0.3

var map

function updateHealthBar() {
	let health
	if (player.spectating) {
		health = player.spectating.health
	} else {
		health = player.health
	}

	let mul = health/100

	healthBarText.text = Math.ceil(health)
	healthBar.sizeX = 400*mul
	healthBar.color = `rgba(${255-(mul*255)+20}, ${mul*255+20}, 20, 0.8)`
}
function updateAmmoCount() {
	if (player.spectating) {
		ammoText.text = `${player.spectating.ammo} | ${player.spectating.reserve}`
	} else {
		ammoText.text = `${player.ammo} | ${player.reserve}`
	}
}
 
const title = {
	type: "text",
	x: 100,
	y: 100,
	text: "Epic game!!!111!!", 
	isUI: true,
	color: "#ee9b00",
	fontSize: 60,
}
const playerWait = {
	type: "text",
	x: 100,
	y: 200,
	text: "", 
	isUI: true,
	color: "#ee9b00",
	fontSize: 40,
	disabled: true
}
const healthBarText = {
	type: "text",
	x: 105,
	y: -99,
	isUI: true,
	align: "bottom left",
	text: 100,
	fontSize: 40,
	z: 81
}
const healthBarBack = {
	type: "rect",
	x: 95,
	y: -105,
	sizeX: 410,
	sizeY: 50,
	isUI: true,
	align: "bottom left",
	color: "rgba(255,255,255,0.5)",
	z: 79
}
const healthBar = {
	type: "rect",
	x: 100,
	y: -100,
	sizeX: 400,
	sizeY: 40,
	isUI: true,
	align: "bottom left",
	color: "rgba(20,255,20,0.8)",
	z: 80
}

const ammoText = {
	type: "text",
	x: -100,
	y: -79,
	isUI: true,
	fontSize: 40,
	alignSelf: "center",
	align: "bottom right",
	text: "20 | 20",
	z: 80,
}
const teamDubskyText = {
	type: "text",
	align: "top",
	alignSelf: "center",
	text: "0",
	isUI: true,
	x: -40,
	y: 30,
	fontSize: 50,
	z: 80,
	color: "#ee9b00"
}
let teamDubskys = 0
const opsDubskyText = {
	type: "text",
	align: "top",
	alignSelf: "center",
	text: "0",
	isUI: true,
	x: 40,
	y: 30,
	fontSize: 50,
	z: 80,
	color: "#0a9396"
}
let opDubskys = 0

const nameBox = new TextBox(100, 320, 50, 300, "Name...", renderer)
const mapEditorButton = new Button(100, 260, 50, "Map Editor", renderer, () => {
	renderer.switchScene("MapEditor")
})
const cancelStartButton = new Button(100, 260, 50, "Cancel", renderer, () => {
	ws.close()
})
const endRoundMessage = {
	type: "text",
	text: "",
	x: 0,
	y: 0,
	isUI: true,
	fontSize: 80,
	disabled: true,
	align: "center",
	alignSelf: "center",
	z: 75
}
var killFeed = []


const crosshair = {
	x: 0,
	y: 0,
	rad: 20,
	color: "#e9d8a666",
	type: "circ",
	isUI: true,
	z: 100
}
player.weapon = {
	x: 0,
	y: 0,
	type: "rect",
	sizeX: 10,
	sizeY: 30,
	rotation: 0,
	color: "#bb3e03",
	z: 3,
	lastShotTick: -Infinity,
	disabled: true
}
player.nametag = {
	x: 0,
	y: 0,
	type: "text",
	text: "",
	fontSize: 20,
	z: 50,
	disabled: true
}
player.alive = false
player.disabled = true

renderer.addToScene("Game", player.nametag)
renderer.addToScene("Game", player.weapon)
renderer.addToScene("Game", player)
renderer.addToScene("MainMenu", title)
renderer.addToScene("MainMenu", mapEditorButton)
renderer.addToScene("MainMenu", cancelStartButton)
renderer.addToScene("MainMenu", nameBox)
renderer.addToScene("Game", crosshair)
renderer.addToScene("MainMenu", playerWait)
renderer.addToScene("Game", endRoundMessage)
renderer.addToScene("Game", healthBar)
renderer.addToScene("Game", healthBarBack)
renderer.addToScene("Game", healthBarText)
renderer.addToScene("Game", ammoText)
renderer.addToScene("Game", teamDubskyText)
renderer.addToScene("Game", opsDubskyText)

shooting = false
reloading = false

/*
renderer.addPostProcessing("Game", (imageData) => {
	let halfHeight = imageData.height/2
	let halfWidth = imageData.width/2
	let invIMwidth = 1/imageData.width
	
	for (var i=0; i<imageData.data.length; i+=4) {
		let api = i/4
		let apx = api%imageData.width - halfWidth
		let apy = api*invIMwidth - halfHeight
		
		imageData.data[i+0] += (Math.abs(apx)+Math.abs(apy)) * 128
	}	
})
*/

function loop() {
	if (renderer.scene == "Game") {
		crosshair.x = input.mouse.x
		crosshair.y = -input.mouse.y

		if (player.alive) {
			player.handleMovement(input, renderer.dt)
			for (const obj of map) {
				if (obj.mapType == "block") {
					player.handleCollision(obj)
				}
			}

			Util.pointToObject(player.weapon, Util.uiToGamePosition(crosshair, renderer))
			Util.lerpObject(renderer.activeScene.cam, player, 0.05)

			ws.send(`${0x00} ${player.x} ${player.y} ${player.weapon.rotation}`)
		} else {
			if (player.spectating) {
				Util.lerpObject(renderer.activeScene.cam, player.spectating, 0.05)
			}
		}

		if ((input.keys[32] || input.mouse.down) && !shooting) {
			shooting = true
			ws.send(0x01)
		} 
		else if (!(input.keys[32] || input.mouse.down) && shooting) {
			shooting = false
			ws.send(0x02)
		}

		if (input.keys[82] && !reloading && player.ammo < 20) {
			reloading = true
			ws.send(0x03)
		}

		for (const uid in players) {
			if (players[uid] != player) {
				Util.lerpObject(players[uid], {x: players[uid].lmx, y: players[uid].lmy}, interpolation)
				if (players[uid].lmr != undefined) {
					players[uid].weapon.rotation = Util.rlerp(players[uid].weapon.rotation, players[uid].lmr, interpolation)
				}
			}
			Util.lerpObject(players[uid].weapon, players[uid], 0.4)

			if (!players[uid].nametag) {continue}
			players[uid].nametag.x = players[uid].x - renderer.measureText(players[uid].nametag).width/2
			players[uid].nametag.y = -players[uid].y - 45
		}
		
		document.body.style.cursor = "none"
	} else if (renderer.scene == "MapEditor") {
		if (input.keys[87]) {
			renderer.activeScene.cam.y += 10
		}
		if (input.keys[83]) {
			renderer.activeScene.cam.y -= 10
		}
		if (input.keys[68]) {
			renderer.activeScene.cam.x += 10
		}
		if (input.keys[65]) {
			renderer.activeScene.cam.x -= 10
		}
		
		let pos = Util.uiToGamePosition({x: input.mouse.x, y: -input.mouse.y}, renderer)
		placingSpawnHighlight.x = Util.snap(pos.x, snap)
		placingSpawnHighlight.y = Util.snap(pos.y, snap)
	}
	
	renderer.render()
	
	requestAnimationFrame(loop)
}

requestAnimationFrame(loop)