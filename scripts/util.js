class Util {
	static lerp(a, b, t) {
		return a + (b - a) * t
	}
	static rlerp (a, b, t) {
		let CS = (1-t)*Math.cos(a) + t*Math.cos(b)
		let SN = (1-t)*Math.sin(a) + t*Math.sin(b)
		return Math.atan2(SN,CS)
	}
	static lerpObject(a,b,t) {
		a.x = Util.lerp(a.x, b.x, t)
		a.y = Util.lerp(a.y, b.y, t)
	}
	static pointToObject(a,b) {
		a.rotation = Math.atan2(b.x - a.x, b.y - a.y)
	}
	static uiToGamePosition(a, renderer) {
		return {x: a.x - renderer.canvas.width/2 + renderer.activeScene.cam.x, y: a.y + renderer.canvas.height/2 + renderer.activeScene.cam.y}
	}
	static lineRectIntersect(line, rect) {		
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
		let normal = {x: 0, y: 0}

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
	static pointInRect(point, rect) {
		return point.x > rect.x - rect.sizeX/2 && point.x < rect.x + rect.sizeX/2 && point.y > rect.y - rect.sizeY/2 && point.y < rect.y + rect.sizeY/2
	}
	static rectInRect(a, b) {
		return a.x + a.sizeX/2 > b.x - b.sizeX/2 && a.x - a.sizeX/2 < b.x + b.sizeX/2 && a.y + a.sizeY/2 > b.y - b.sizeY/2 && a.y - a.sizeY/2 < b.y + b.sizeY/2
	} 
	static snap(a, s) {
		return Math.round(a/s)*s
	}
	static LZWcompress(uncompressed)
    {
        let dictionary = {};
        for (let i = 0; i < 256; i++)
        {
            dictionary[String.fromCharCode(i)] = i;
        }
        
        let word = '';
        let result = [];
        let dictSize = 256;
        
        for (let i = 0, len = uncompressed.length; i < len; i++)
        {
            let curChar = uncompressed[i];
            let joinedWord = word + curChar;

            if (dictionary.hasOwnProperty(joinedWord)) 
            {
                word = joinedWord;
            }
            else
            {
                result.push(dictionary[word]);
                dictionary[joinedWord] = dictSize++;
                word = curChar;
            }
        }
        
        if (word !== '')
        {
            result.push(dictionary[word]);
        }
        
        return result;
    }
	static LZWdecompress(compressed)
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
}