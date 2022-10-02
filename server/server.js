const ws = require('ws')
const uuid = require('uuid')
const fs = require('fs');
const readline = require('readline')
const express = require('express');
//const { PeerServer } = require('peer');

const address = "0.0.0.0"
const port = 3001

const app = express()
app.use("/", express.static(__dirname + "/../"))

app.listen(port, address, () => {
	console.log(`Listening on http://${address}:${port}`)
})

//const peerServer = PeerServer({ port: 3002 })

const wss = new ws.WebSocketServer({ host: address, port: 3000 })
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
})
rl.on('line', (input) => {
	let parsed = input.split(' ')
	let command = parsed[0]
	
	if (command == "map") {
		fs.readFile(`${__dirname}/maps/${parsed[1]}.tmf`, 'utf8', (err, data) => {
			mapString = data
			map = JSON.parse(LZWdecompress(data.split(",")))
			
			if (players.length > 1 && mapString) {
				startGame()
			}
		})
	}
	if (command == "force_start") {
		startGame()
	}
})
function lineRectIntersect(line, rect) {		
	let xmax = rect.x+rect.sizeX/2
	let xmin = rect.x-rect.sizeX/2
	let ymax = rect.y+rect.sizeY/2
	let ymin = rect.y-rect.sizeY/2
	let x0 = line.x1
	let x1 = line.x2
	let y0 = line.y1
	let y1 = line.y2
	
	let computeOutCode = (x, y) => {
		let code = 0
		
		if (x < xmin) {
			code |= 1
		} 
		else if (x > xmax) {
			code |= 2
		}
		if (y < ymin) {
			code |= 4
		} 
		else if (y > ymax) {
			code |= 8
		}
		
		return code
	}

	let outcode0 = computeOutCode(x0, y0)
	let outcode1 = computeOutCode(x1, y1)
	let accept = false

	while (true) {
		if (!(outcode0 | outcode1)) {
			accept = true;
			break;
		} else if (outcode0 & outcode1) {
			break;
		} else {
			let x, y
			let outcodeOut = outcode1 > outcode0 ? outcode1 : outcode0

			if (outcodeOut & 8) {
				x = x0 + (x1 - x0) * (ymax - y0) / (y1 - y0)
				y = ymax
			} else if (outcodeOut & 4) {
				x = x0 + (x1 - x0) * (ymin - y0) / (y1 - y0)
				y = ymin
			} else if (outcodeOut & 2) {
				y = y0 + (y1 - y0) * (xmax - x0) / (x1 - x0)
				x = xmax
			} else if (outcodeOut & 1) {
				y = y0 + (y1 - y0) * (xmin - x0) / (x1 - x0)
				x = xmin
			}

			if (outcodeOut == outcode0) {
				x0 = x
				y0 = y
				outcode0 = computeOutCode(x0, y0)
			} else {
				x1 = x
				y1 = y
				outcode1 = computeOutCode(x1, y1)
			}
		}
	}
	
	return {hit: accept, x1: x0, y1: y0, x2: x1, y2: y1}
}

function LZWdecompress(compressed)
{
	let dictionary = {};
	for (let i = 0; i < 256; i++)
	{
		dictionary[i] = String.fromCharCode(i);
	}
	
	let word = String.fromCharCode(compressed[0]);
	let result = word;
	let entry = '';
	let dictSize = 256;
	
	for (let i = 1, len = compressed.length; i < len; i++)
	{
		let curNumber = compressed[i];
		
		if (dictionary[curNumber] !== undefined)
		{
			entry = dictionary[curNumber];
		}
		else
		{
			if (curNumber === dictSize)
			{
				entry = word + word[0];
			}
			else
			{
				throw 'Error in processing';
				return null;
			}
		}
		
		result += entry;
		
		dictionary[dictSize++] = word + entry[0];
		
		word = entry;
	}
	
	return result;
}

var serverState = "waiting for players"
var players = []
var playersById = {}

var mapString
var map
fs.readFile(`${__dirname}/maps/dust2.tmf`, 'utf8', (err, data) => {
	mapString = data
	map = JSON.parse(LZWdecompress(data.split(",")))
})

var blues = 0
var reds = 0
var blueDubs = 0
var redDubs = 0

function startGame() {
	console.log("Starting game!")
	
	let blueSpawns = map.filter(a => a.mapType == "blue spawn")
	let redSpawns = map.filter(a => a.mapType == "red spawn")

	for (const [index, player] of players.entries()) {
		let spawn = player.team == "red" ? redSpawns[index] : blueSpawns[index]

		player.x = spawn.x
		player.y = spawn.y
		player.sizeX = 20
		player.sizeY = 45
		player.rot = 0
		player.health = 100
		player.alive = true
		player.shooting = false
		player.lastShotTick = 0
		player.ammo = 20
		player.reserve = 20
		player.reloading = false
		player.lastReloadTick = 0
	}

	for (const player of players) {
		player.send(JSON.stringify({
			type: "start", 
			mes: {
				players: players.map( a => ({id: a.id, team: a.team, name: a.name, x: a.x, y: a.y}) ),
				map: mapString,
			}
		}))
	}
	
	serverState = "playing"
}

function checkDubsky() {
	if (players.filter(a => a.team == "red" && a.alive).length <= 0) {
		for (const conn of players) {
			blueDubs++
			conn.send(JSON.stringify({type: "begin end round", mes: {winner: "blue", dubs: {reds: redDubs, blue: blueDubs}}}))
		}

		setTimeout(startGame, 5000)
	}
	else if (players.filter(a => a.team == "blue" && a.alive).length <= 0) {
		for (const conn of players) {
			redDubs++
			conn.send(JSON.stringify({type: "begin end round", mes: {winner: "red", dubs: {reds: redDubs, blue: blueDubs}}}))
		}

		setTimeout(startGame, 5000)
	}
}

function doShot(player) {
	let hitPlayer
	let hit
	let hitDis = Infinity

	let rot = player.rot + (Math.random()-0.5)/5
	let ray = {x1: player.x, y1: player.y, x2: Math.sin(rot)*1000+player.x, y2: Math.cos(rot)*1000+player.y}
	
	for (const obj of map) {
		if (obj.mapType != "block") {continue}
		let res = lineRectIntersect(ray, obj)
		
		if (res.hit) {
			let dis = Math.sqrt((ray.x1 - res.x1)**2 + (ray.y1 - res.y1)**2)
			if (dis < hitDis) {
				hit = res
				hitDis = dis
			}
		}
	}
	for (const enemy of players.filter(a => a.team != player.team && a.alive)) {
		let res = lineRectIntersect(ray, enemy)
		
		if (res.hit) {
			let dis = Math.sqrt((ray.x1 - res.x1)**2 + (ray.y1 - res.y1)**2)
			if (dis < hitDis) {
				hit = res
				hitDis = dis
				hitPlayer = enemy
			}
		}
	}
	
	if (hit) {
		ray.x2 = hit.x1
		ray.y2 = hit.y1
	} if (hitPlayer) {
		hitPlayer.health -= 24.75
		if (hitPlayer.health <= 0) {
			hitPlayer.alive = false
			for (const conn of players) {
				conn.send(JSON.stringify({type: "died", mes: {killed: hitPlayer.id, killer: player.id}}))
			}

			checkDubsky()
		} else {
			for (const conn of players) {
				conn.send(JSON.stringify({type: "hit", mes: {id: hitPlayer.id, health: hitPlayer.health}}))
			}
		}
	}

	for (const conn of players) {
		conn.send(`1 ${ray.x1} ${ray.y1} ${ray.x2} ${ray.y2} ${hitPlayer == undefined ? 0 : 1} ${player.id}`)
	}
}

function isPosSynced(player, newx, newy) {
	if (Math.sqrt((newx - player.x)**2+(newy - player.y)**2) > 3.5) {
		player.send(`3 ${player.x} ${player.y}`)

		return false
	}
	return true
}

function handleCollision(player, obj) {
	if (Util.rectInRect(player, obj)) {
		let tDis = Math.abs((player.y-22.5) - (obj.y+obj.sizeY/2))
		let bDis = Math.abs((player.y+22.5) - (obj.y-obj.sizeY/2))
		let lDis = Math.abs((player.x+10) - (obj.x-obj.sizeX/2))
		let rDis = Math.abs((player.x-10) - (obj.x+obj.sizeX/2))
		
		let min = Math.min(tDis, bDis, lDis, rDis)
		
		if (min == tDis) {
			player.y = obj.y+obj.sizeY/2+player.sizeY/2
		}
		if (min == bDis) {
			player.y = obj.y-obj.sizeY/2-player.sizeY/2
		}
		if (min == lDis) {
			player.x = obj.x-obj.sizeX/2-player.sizeX/2
		}
		if (min == rDis) {
			player.x = obj.x+obj.sizeX/2+player.sizeX/2
		}
	}
}

function handleRaw(ws, raw) {
	if (raw[0] == 48) {
		let mes = raw.toString().split(" ")

		let newx = parseFloat(mes[1])
		let newy = parseFloat(mes[2])

		if (isPosSynced(ws, newx, newy)) {
			ws.x = newx
			ws.y = newy
		}

		ws.x = parseFloat(mes[1])
		ws.y = parseFloat(mes[2])
		ws.rot = parseFloat(mes[3])
		return true
	}
	if (raw == 0x01) {
		ws.shooting = true
		return true
	}
	if (raw == 0x02) {
		ws.shooting = false
		return true
	}
	if (raw == 0x03 && ws.ammo < 20 && !ws.reloading && ws.reserve > 0) {
		ws.reloading = true
		ws.lastReloadTick = tick
		return true
	}

	return false
}

wss.on('connection', (ws) => {
	ws.on('message', (raw) => {
		if (handleRaw(ws, raw)) {return}

		let parsed
		try {
			parsed = JSON.parse(raw)
		} catch {
			console.log(`Invalid Json from (${ws.name})`)
			return
		}
		let type = parsed.type
		let mes = parsed.mes
		
		if (type == "join") {
			if (players.includes(ws)) {
				return
			}

			if (!mapString) {
				ws.close()
				console.log("Player attempted to join but was kicked because no map was loaded")
				return
			}
			
			players.push(ws)
			
			if (reds > blues) {
				ws.team = "blue"
				blues++
			} else {
				ws.team = "red"
				reds++
			}
			
			ws.id = uuid.v4()
			ws.name = mes.name
			ws.alive = false
			playersById[ws.id] = ws
			//ws.peerId = mes.peerId

			ws.send(JSON.stringify({type: "uuid", mes: {id: ws.id, team: ws.team, map: mapString, name: ws.name, players: players.filter(a => a != ws).map(a => ({id: a.id, team: a.team, name: a.name, alive: a.alive, health: a.health, ammo: a.ammo, reserve: a.reserve}))}}))

			console.log(`(${mes.name}) Connected`)
		
			for (const player of players) {
				if (player == ws) {continue}
				player.send(JSON.stringify({type: "player joined", mes: {id: ws.id, team: ws.team, name: ws.name, alive: ws.alive}}))
			}

			if (players.length > 1 && mapString && serverState == "waiting for players") {
				startGame()
			} else if (players.length > 1 && !mapString) {
				for (const player of players) {
					player.send(JSON.stringify({type: "waiting for map"}))
				}

				console.log("All players connected, waiting to load map...")
			}
		}
	})
	
	ws.on('close', () => {
		players.splice(players.indexOf(ws), 1)
		delete playersById[ws.id]
		ws.team == "red" ? reds-- : blues--
		
		console.log(`(${ws.name}) Left the game`)

		for (const player of players) {
			player.send(JSON.stringify({type: "player left", mes: {id: ws.id}}))
		}

		checkDubsky()

		/*if (Math.abs(reds - blues) > 1) {
			if (reds > blues) {
				reds--
				blues++
				players.filter(a => a.team == "red")[0].team = "blue"
			} else {
				blues--
				reds++
				players.filter(a => a.team == "blue")[0].team = "red"
			}
		}*/
		
		if (players.length < 2) {
			if (serverState == "playing") {
				console.log("Ending game due to loss of required players")
			}
			serverState = "waiting for players"
		}
	})
})


let tick = 0
function loop() {
	if (serverState == "playing") {
		for (const player of players) {
			for (const playerB of players.filter(a => a.alive)) {
				if (player == playerB) {continue}
				player.send(`0 ${playerB.id} ${playerB.x} ${playerB.y} ${playerB.rot}`)
			}
			if (player.shooting) {
				if (player.alive && Math.abs(tick - player.lastShotTick) > 1 && player.ammo > 0 && !player.reloading) {
					doShot(player)
					player.ammo--
					player.lastShotTick = tick
				}
			}
			if (player.reloading && Math.abs(tick - player.lastReloadTick) > 8 && player.reserve > 0) {
				player.reloading = false
				
				if (player.reserve >= (20 - player.ammo)) {
					player.reserve -= (20 - player.ammo)
					player.ammo = 20
				} else {
					player.ammo += player.reserve
					player.reserve = 0
				}

				for (const conn of players) {
					conn.send(`2 ${player.id} ${player.ammo} ${player.reserve}`)
				}
			}
		}
	}
	
	tick++ 
	setTimeout(loop, 100)
}

setTimeout(loop, 100)
