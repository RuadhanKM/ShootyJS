var ws
//var peer = new Peer()

function addPlayer(mes) {
	let np = new Player()

	np.weapon = {
		x: 0,
		y: 0,
		type: "rect",
		sizeX: 10,
		sizeY: 30,
		rotation: 0,
		color: "#bb3e03",
		z: 3,
		lastShotTick: -Infinity,
		disabled: !mes.alive
	}
	np.nametag = {
		x: 0,
		y: 0,
		type: "text",
		text: mes.name,
		fontSize: 20,
		z: 50,
		disabled: !mes.alive
	}
	
	np.disabled = !mes.alive
	np.alive = mes.alive
	np.team = mes.team
	np.id = mes.id
	np.name = mes.name
	np.lmx = 0
	np.lmy = 0
	np.health = mes.health
	np.ammo = mes.ammo
	np.reserve = mes.reserve
	
	if (np.team != player.team) {
		np.weapon.color = "#94d2bd"
		np.color = "#0a9396"
	}

	players[mes.id] = np

	renderer.addToScene("Game", np)
	renderer.addToScene("Game", np.nametag)
	renderer.addToScene("Game", np.weapon)
}

function handleRaw(raw) {
	mes = raw.split(" ")
	if (mes[0] == "0") {
		players[mes[1]].lmx = parseFloat(mes[2])
		players[mes[1]].lmy = parseFloat(mes[3])
		players[mes[1]].lmr = parseFloat(mes[4])

		return true
	}
	else if (mes[0] == "1") {
		let tracer = {
			x1: parseFloat(mes[1]),
			y1: parseFloat(mes[2]),
			x2: parseFloat(mes[3]),
			y2: parseFloat(mes[4]),
			width: 3,
			type: "line",
			ticks: 5,
			fade: true,
			z: 2
		}
		let shooter = players[mes[6]]

		shooter.ammo--
		updateAmmoCount()

		if (!performanceMode) {
			tracer.listColor = [233, 216, 166, 80]

			if (mes[5] == "1") {
				for (let i=0; i<4; i++) {
					let rot = Math.random()*5
					
					shooter.weapon.x += -Math.sin(shooter.weapon.rotation)*2
					shooter.weapon.y -= Math.cos(shooter.weapon.rotation)*2
					
					renderer.addToScene("Game", {
						type: "circ",
						x: (Math.sin(rot))*(Math.random()*10+10)+tracer.x2,
						y: (Math.cos(rot))*(Math.random()*10+10)+tracer.y2,
						rad: Math.random()*3+24,
						listColor: [116, 2, 1, 50],
						fade: true,
						ticks: 40,
						z: 5
					})
				}
			} else {
				for (let i=0; i<7; i++) {
					let rot = Math.random()*5
					
					shooter.weapon.x += -Math.sin(shooter.weapon.rotation)*2
					shooter.weapon.y -= Math.cos(shooter.weapon.rotation)*2
					
					renderer.addToScene("Game", {
						x2: tracer.x2,
						y2: tracer.y2,
						x1: (Math.sin(rot))*(Math.random()*10+20)+tracer.x2,
						y1: (Math.cos(rot))*(Math.random()*10+20)+tracer.y2,
						listColor: [233, 216, 166, 40],
						initTrans: 30,
						width: 2,
						type: "line",
						ticks: 8,
						trace: true,
						traceWidth: 8,
						z: 2
					})
				}
			}
		} else {
			tracer.color = "rgba(223, 216, 166, 80%)"
		}
		
		renderer.addToScene("Game", tracer)

		return true
	} 
	else if (mes[0] == 2) {
		players[mes[1]].ammo = parseInt(mes[2]) 
		players[mes[1]].reserve = parseInt(mes[3]) 
		if (players[mes[1]] == player) {
			reloading = false
		}
 
		updateAmmoCount()

		return true
	}
	else if (mes[0] == 3) {
		player.x = parseFloat(mes[1])
		player.y = parseFloat(mes[2])
		player.lmx = parseFloat(mes[1])
		player.lmy = parseFloat(mes[2])
		player.xVel = 0
		player.yVel = 0

		return true
	}
	return false
}

/*peer.on("connection", (conn) => {
	conn.on("data", (data) => {
		handlePeer(data)
	});
});*/

function removePlayer(ply) {
	renderer.removeFromScene(ply)
	renderer.removeFromScene(ply.weapon)
	renderer.removeFromScene(ply.nametag)

	delete players[ply.id]
}

cancelStartButton.disabled = true
cancelStartButton.label.disabled = true
const startButton = new Button(100, 200, 50, "Start", renderer, () => {
	if (nameBox.value == "") {return}
	
	ws = new WebSocket(`ws://${location.hostname}:3000`)

	ws.addEventListener("message", (e) => {
		if (handleRaw(e.data)) {return}
		
		let raw = JSON.parse(e.data)
		let type = raw.type
		let mes = raw.mes
		
		if (type == "hit") {
			players[mes.id].health = mes.health
			updateHealthBar()
		}
		else if (type == "player joined") {
			addPlayer(mes)
		}
		else if (type == "player left") {
			removePlayer(players[mes.id])

			if (Object.values(players).length < 2) {
				playerWait.text = "Waiting for player to join..."
				renderer.switchScene("MainMenu")
			}
		}
		else if (type == "start") {
			map = JSON.parse(Util.LZWdecompress(mes.map.split(",")))
			for (const obj of map) {
				renderer.removeFromScene(obj)
			}
			for (const obj of map) {
				if (obj.mapType == "block") {
					renderer.addToScene("Game", obj)
				}
			}

			for (const ply of mes.players) {
				players[ply.id].x = ply.x
				players[ply.id].y = ply.y
				players[ply.id].lmx = ply.x
				players[ply.id].lmy = ply.y
				players[ply.id].weapon.x = ply.x
				players[ply.id].weapon.y = ply.y
				players[ply.id].alive = true
				players[ply.id].disabled = false
				players[ply.id].nametag.disabled = false
				players[ply.id].weapon.disabled = false
				players[ply.id].health = 100
				players[ply.id].ammo = 20
				players[ply.id].reserve = 20
			}

			player.spectating = undefined

			updateAmmoCount()
			updateHealthBar()
			
			endRoundMessage.disabled = true
			if (renderer.scene !== "Game") {
				renderer.switchScene("Game")
			}
			renderer.activeScene.cam = {x: player.x, y: player.y}
		}
		else if (type == "died") {
			if (players[mes.killed].alive) {
				players[mes.killed].disabled = true
				players[mes.killed].alive = false
				players[mes.killed].nametag.disabled = true
				players[mes.killed].weapon.disabled = true

				if (players[mes.killed] == player || players[mes.killed] == player.spectating) {
					player.spectating = players[mes.killer]
					updateHealthBar()
					updateAmmoCount()
				}

				for (const kill of killFeed) {
					kill.y += 28
					kill.label.y += 28
				}

				let bounder = {
					type: "rect",
					x: 20,
					y: 20,
					isUI: true,
					sizeX: 0,
					sizeY: 24,
					color: "#ffffff77",
					borderRadius: 4,
					z: 60,
					stroke: player == players[mes.killer] ? "green" : (player == players[mes.killed] ? "red" : undefined),
					strokeWidth: 3,
					ticks: 400,
					label: {
						type: "text",
						text: `${players[mes.killer].name} 💀 ${players[mes.killed].name}`,
						x: 25,
						y: 22,
						isUI: true,
						fontSize: 20,
						z: 61,
						ticks: 400
					}
				}
				bounder.sizeX = renderer.measureText(bounder.label).width + 10

				renderer.addToScene("Game", bounder)
				renderer.addToScene("Game", bounder.label)

				killFeed.push(bounder)
			}
		} else if (type == "begin end round") {
			endRoundMessage.disabled = false
			endRoundMessage.text = mes.winner == player.team ? "Round Won" : "Round Lost"
			teamDubskys = parseInt(mes.dubs[player.team])
			teamDubskyText.text = teamDubskys
			opDubskys = parseInt(mes.dubs[player.team == "red" ? "blue" : "red"])
			opsDubskyText.text = opDubskys
		}
		else if (type == "uuid") {
			players[mes.id] = player
			player.id = mes.id
			player.team = mes.team
			player.name = mes.name

			for (const ply of mes.players) {
				addPlayer(ply)
			}

			if (mes.players < 2) {
				playerWait.text = "Waiting for player to join..."
			} else {
				map = JSON.parse(Util.LZWdecompress(mes.map.split(",")))
				for (const obj of map) {
					if (obj.mapType == "block") {
						renderer.addToScene("Game", obj)
					}
				}

				renderer.switchScene("Game")
				let plrs = Object.values(players).filter(a => a.alive)
				player.spectating = plrs[Math.floor(Math.random()*plrs.length)]

				updateAmmoCount()
				updateHealthBar()
			}
		} else if (type == "waiting for map") {
			playerWait.text = `Waiting for Server to Load Map...`
		}
	})
	ws.addEventListener("open", () => {
		startButton.disabled = true
		startButton.label.disabled = true
		playerWait.disabled = false
		mapEditorButton.disabled = true
		mapEditorButton.label.disabled = true
		cancelStartButton.disabled = false
		cancelStartButton.label.disabled = false
		nameBox.disable()
		
		player.nametag.text = nameBox.value
		ws.send(JSON.stringify({type: "join", mes: {name: nameBox.value/*, peerId: Peer.id*/}}))
	})
	ws.addEventListener("close", () => {
		renderer.switchScene("MainMenu")
		startButton.disabled = false
		startButton.label.disabled = false
		playerWait.disabled = true
		mapEditorButton.disabled = false
		mapEditorButton.label.disabled = false
		cancelStartButton.disabled = true
		cancelStartButton.label.disabled = true
		nameBox.enable()

		for (const ply of Object.values(players)) {
			if (ply == player) {continue}

			removePlayer(ply)
		}
        players = {}
	})
})
renderer.addToScene("MainMenu", startButton)