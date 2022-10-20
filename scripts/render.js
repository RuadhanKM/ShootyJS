class Renderer {
	constructor(ctx, canvas) {
		this.ctx = ctx
		this.canvas = canvas
		this.scenes = {}
		this.scene = "None"
		this.activeScene = this.scenes.None
		this.tick = 0
		
		this.dt = 0
		this.lastFrame = performance.now()
		
		this.background = "#001219"
		
		window.addEventListener("mousedown", (e) => {if (this.activeScene.uiManager) {this.activeScene.uiManager.mouseDown(e)}})
	}
	
	render() {
		this.canvas.width = window.innerWidth
		this.canvas.height = window.innerHeight
		
		this.ctx.fillStyle = this.background
		this.ctx.textBaseline = "top"
		this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height)
		
		if (this.activeScene.uiManager) {
			this.activeScene.uiManager.update()
		}
		
		var i = this.activeScene.objs.length
		while (i--) {
			let obj = this.activeScene.objs[i]
			if (obj.disabled) {continue}
			
			if (obj.ticks) {
				if (!obj.tickMade) {
					obj.tickMade = this.tick
				}
				obj.ticksLeft = obj.ticksLeft ? 1-((this.tick-obj.tickMade)/obj.ticks) : 1
				
				if (obj.listColor) {
					if (obj.trace) {
						if (obj.traceSpeed) {
							obj.tracePos = obj.tracePos == undefined ? 0 : obj.tracePos + obj.traceSpeed
							let gradPos = 1-obj.tracePos/obj.len
							
							let grad = this.ctx.createLinearGradient(obj.x1,-obj.y1,obj.x2,-obj.y2)
							
							grad.addColorStop(Math.max(Math.min(gradPos+(obj.traceWidth/obj.len), 1), 0), `rgba(${obj.listColor[0]}, ${obj.listColor[1]}, ${obj.listColor[2]}, 0%)`)
							grad.addColorStop(Math.max(Math.min(gradPos, 1), 0), `rgba(${obj.listColor[0]}, ${obj.listColor[1]}, ${obj.listColor[2]}, ${obj.listColor[3]}%)`)
							grad.addColorStop(Math.max(Math.min(gradPos-(obj.traceWidth/obj.len), 1), 0), `rgba(${obj.listColor[0]}, ${obj.listColor[1]}, ${obj.listColor[2]}, 0%)`)
							
							obj.color = grad
							
						} else {
							let grad = this.ctx.createLinearGradient(obj.x1,-obj.y1,obj.x2,-obj.y2)
							
							grad.addColorStop(obj.traceWidth ? Math.max(obj.ticksLeft - (obj.traceWidth/obj.len), 0): 0, `rgba(${obj.listColor[0]}, ${obj.listColor[1]}, ${obj.listColor[2]}, 0%)`)
							grad.addColorStop(obj.traceWidth ? Math.min(obj.ticksLeft + (obj.traceWidth/obj.len), 1): 1, `rgba(${obj.listColor[0]}, ${obj.listColor[1]}, ${obj.listColor[2]}, 0%)`)
							grad.addColorStop(obj.ticksLeft, `rgba(${obj.listColor[0]}, ${obj.listColor[1]}, ${obj.listColor[2]}, ${obj.listColor[3]}%)`)
							
							obj.color = grad
						}
					}
					else if (obj.fade) {
						obj.color = `rgba(${obj.listColor[0]}, ${obj.listColor[1]}, ${obj.listColor[2]}, ${obj.listColor[3]*obj.ticksLeft}%)`
					}
					else {
						obj.color = `rgba(${obj.listColor[0]}, ${obj.listColor[1]}, ${obj.listColor[2]}, ${obj.listColor[3]}%)`
					}
				}
				
				if (this.tick >= obj.tickMade + obj.ticks) {
					this.activeScene.objs.splice(i, 1)
				}
			}
		
			this.ctx.resetTransform()
			this.ctx.fillStyle = obj.color ? obj.color : "white"
			this.ctx.strokeStyle = obj.color ? obj.color : "white"
			if (obj.stroke) {
				this.ctx.strokeStyle = obj.stroke
				this.ctx.lineWidth = obj.strokeWidth ? obj.strokeWidth : 5
			}
			
			if (!obj.isUI) {
				this.ctx.translate(this.canvas.width/2, this.canvas.height/2)
				this.ctx.translate(-this.activeScene.cam.x, this.activeScene.cam.y)
			} else if (obj.align) {
				if (obj.align == "top right") {
					this.ctx.translate(this.canvas.width, 0)
				}
				if (obj.align == "bottom left") {
					this.ctx.translate(0, this.canvas.height)
				}
				if (obj.align == "bottom right") {
					this.ctx.translate(this.canvas.width, this.canvas.height)
				}
				
				if (obj.align == "center") {
					this.ctx.translate(this.canvas.width/2, this.canvas.height/2)
				}

				if (obj.align == "top") {
					this.ctx.translate(this.canvas.width/2, 0)
				}
				if (obj.align == "left") {
					this.ctx.translate(0, this.canvas.height/2)
				}
				if (obj.align == "right") {
					this.ctx.translate(this.canvas.width, this.canvas.height/2)
				}
				if (obj.align == "bottom") {
					this.ctx.translate(this.canvas.width/2, this.canvas.height)
				}
			}
			
			if (obj.type == "rect") {
				if (obj.borderRadius) {
					if (obj.isUI) {
						this.ctx.translate(obj.x, obj.y)
						if (obj.alignSelf == "center") {
							this.ctx.translate(-obj.sizeX/2, -obj.sizeY/2)
						}
					} else {
						this.ctx.translate(obj.x, -obj.y)
						this.ctx.rotate(obj.rotation)
						this.ctx.translate(-obj.sizeX/2, -obj.sizeY/2)
					}
					
					if (obj.sizeX < 2 * obj.borderRadius) obj.borderRadius = obj.sizeX / 2
					if (obj.sizeY < 2 * obj.borderRadius) obj.borderRadius = obj.sizeY / 2
					this.ctx.beginPath()
					this.ctx.moveTo(obj.borderRadius, 0)
					this.ctx.arcTo(obj.sizeX, 	0,   		obj.sizeX, 	obj.sizeY, 	obj.borderRadius)
					this.ctx.arcTo(obj.sizeX, 	obj.sizeY,	0, 			obj.sizeY, 	obj.borderRadius)
					this.ctx.arcTo(0, 			obj.sizeY,	0, 			0, 			obj.borderRadius)
					this.ctx.arcTo(0, 			0,   		obj.sizeX, 	0, 			obj.borderRadius)
					this.ctx.closePath()
					this.ctx.fill()
					if (obj.stroke) {
						this.ctx.stroke()
					}
				}
				else {
					if (obj.isUI) {
						this.ctx.fillRect(obj.x, obj.y, obj.sizeX, obj.sizeY)
					} else {
						this.ctx.translate(obj.x, -obj.y)
						this.ctx.rotate(obj.rotation)
						
						this.ctx.fillRect(-obj.sizeX/2, -obj.sizeY/2, obj.sizeX, obj.sizeY)
					}
				}
			}
			else if (obj.type == "circ") {				
				this.ctx.translate(obj.x, -obj.y)
				this.ctx.beginPath()
				this.ctx.arc(0, 0, obj.rad, 0, 2 * Math.PI)
				this.ctx.fill()
			}
			else if (obj.type == "text") {
				this.ctx.font = `bold ${obj.fontSize}px system-ui`
				if (obj.alignSelf == "center") {
					this.ctx.translate(-this.ctx.measureText(obj.text).width/2, -obj.fontSize/2)
				}
				this.ctx.fillText(obj.text, obj.x, obj.y)
			}
			else if (obj.type == "line") {
				this.ctx.lineWidth = obj.width
				
				this.ctx.beginPath()

				this.ctx.moveTo(obj.x1, -obj.y1)
				this.ctx.lineTo(obj.x2, -obj.y2)
				
				this.ctx.stroke()
			}
		}
		
		this.ctx.resetTransform()
		var imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
		this.activeScene.postProcessing(imageData)
		this.ctx.putImageData(imageData, 0, 0)
		
		this.tick++
		
		this.dt = (performance.now() - this.lastFrame) / 100
		this.lastFrame = performance.now()
	}
	
	addScene(name, input) {
		this.scenes[name] = {objs: [], postProcessing: () => {}}
		this.scenes[name].cam = {x: 0, y: 0}
		if (input) {
			this.scenes[name].uiManager = new UIManager(input)
		}
	}
	
	addPostProcessing(name, func) {
		this.scenes[name].postProcessing = func
	}
	
	addToScene(name, obj) {
		this.scenes[name].objs.push(obj)
		
		obj.scene = name
		
		if (obj.uiType) {
			this.scenes[name].uiManager.UIElements.push(obj)
			if (obj.uiType == "button") {
				this.scenes[name].objs.push(obj.label)
			} else if (obj.uiType == "textbox") {
				this.scenes[name].objs.push(obj.label)
				this.scenes[name].objs.push(obj.textHead)
			}
		}
		if (obj.type == "line") {
			obj.len = Math.sqrt((obj.x2-obj.x1)**2 + (obj.y2-obj.y1)**2)
			obj.normalized = {x: (obj.x2-obj.x1)/obj.len, y: (obj.y2-obj.y1)/obj.len}
		}
		
		
		this.scenes[name].objs.sort(function(a, b) { 
			return (b.z ? b.z : 0) - (a.z ? a.z : 0)
		})
	}
	
	removeFromScene(obj) {
		this.scenes[obj.scene].objs.splice(this.scenes[obj.scene].objs.indexOf(obj), 1)
	}
	
	switchScene(name) {
		this.tick = 0

		for (const obj of this.scene) {
			if (obj.ticks) {
				this.removeFromScene(obj)
			}
		}

		this.scene = name
		this.activeScene = this.scenes[name]
	}
	
	measureText(obj) {
		this.ctx.font = `bold ${obj.fontSize}px system-ui`
		return this.ctx.measureText(obj.text)
	}
}