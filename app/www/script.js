import { ImageTracer } from "./imagetracer_v1.2.6.js"
import { writeToEyes, eyesConnected } from "./eyes.js"
import { ILDA } from "./ilda.js"
import { loadIldaDataToCanvas, startLaser, stopLaser } from "./renderLaser.js"

// SVG DRAW
const drawSvg = document.querySelector("#drawSvg")
const svgBoundingRect = drawSvg.getBoundingClientRect()
var strPath = ""
var ptBuffer = []      // buffer for smoothing points
var activePath = null  // svg path
const ptBufferSize = 20

// the laser preview canvas
const renderCanvas = document.querySelector("#renderCanvas")
const renderCanvasCtx = renderCanvas.getContext("2d")

const captureName = document.querySelector("#captureName")
let fazerActive   = false // toggle fazer on/off

// generate a random file name
function randomName() {
  const n1 = norwegianFolkloreNames[Math.floor( Math.random() * norwegianFolkloreNames.length )]
  const n2 = norwegianFolkloreNames[Math.floor( Math.random() * norwegianFolkloreNames.length )]
  return `${n1}-${n2}`
}

function reset() {
  console.log("clicked new")
  const name = randomName().toLowerCase()
  captureName.innerText = name
  renderCanvasCtx.clearRect(0, 0, renderCanvas.width, renderCanvas.height)
  drawSvg.innerHTML = ""
  stopLaser()
}

// START SVG DRAW
function startDraw(event) {
  activePath = document.createElementNS("http://www.w3.org/2000/svg", "path")
  activePath.setAttribute("fill", "none")
  activePath.setAttribute("stroke", "#000")
  activePath.setAttribute("stroke-width", 3)
  ptBuffer = []
  var pt = getMousePosition(event)
  appendToBuffer(pt.coord)
  strPath = "M" + pt.coord.x + " " + pt.coord.y
  activePath.setAttribute("d", strPath)
  drawSvg.appendChild(activePath)
}


function draw(event) {
  if (activePath) {
    const pos = getMousePosition(event)
    appendToBuffer(pos.coord)
    updateSvgPath()

    if (eyesConnected === true) {
      writeToEyes(pos.rel.x, pos.rel.y)
    }
  }
}

function stopDraw() {
  if (activePath) {
    activePath = null
  }
}

function getMousePosition(event) {
  //const x = Math.floor(event.pageX - svgBoundingRect.left)
  //const y = Math.floor(event.pageY - svgBoundingRect.top)
  const x = Math.floor(event.clientX - svgBoundingRect.left)
  const y = Math.floor(event.clientY - svgBoundingRect.top)
  const relX = Math.round(x / renderCanvas.width * 255)
  const relY = Math.round((renderCanvas.height - y) / renderCanvas.height * 255) // invert and compress y-axis
  //console.log(`x: ${x} => ${relX}, y: ${y} => ${relY}`)
  return { coord: {x, y}, rel: {x: relX, y: relY} }
}

function appendToBuffer(coord) {
    ptBuffer.push(coord)
    while (ptBuffer.length > ptBufferSize) {
        ptBuffer.shift()
    }
}

function getAveragePoint(offset) {
    var len = ptBuffer.length
    if (len % 2 === 1 || len >= ptBufferSize) {
        var totalX = 0
        var totalY = 0
        var pt, i
        var count = 0
        for (i = offset; i < len; i++) {
            count++
            pt = ptBuffer[i]
            totalX += pt.x
            totalY += pt.y
        }
        return {
            x: totalX / count,
            y: totalY / count,
        }
    }
    return null
}

// Update active SVG path with smoothness
function updateSvgPath() {
    let coord = getAveragePoint(0)
    if (coord) {
        // Get the smoothed part of the path that will not change
        strPath += " L" + coord.x + " " + coord.y
        // Get the last part of the path (close to the current mouse position)
        // This part will change if the mouse moves again
        var tmpPath = ""
        for (var offset = 2; offset < ptBuffer.length; offset += 2) {
            coord = getAveragePoint(offset)
            tmpPath += " L" + coord.x + " " + coord.y
        }
        // Set the complete current path coordinates
        activePath.setAttribute("d", strPath + tmpPath)
    }
}

// END SVG DRAW

/* old sketch function on canvas
function sketch(event) {
  if (!paint) return
  drawCanvasCtx.beginPath()
  drawCanvasCtx.lineWidth = 3
  drawCanvasCtx.lineCap = "round"
  drawCanvasCtx.strokeStyle = "green"
  drawCanvasCtx.moveTo(coord.x, coord.y)
  getPosition(event)
  drawCanvasCtx.lineTo(coord.x , coord.y)
  drawCanvasCtx.stroke()
  if (eyesConnected === true) {
    const relPos = getCursorPosition(drawCanvas, event)
    writeToEyes(relPos.relX, relPos.relY)
  }
}
*/

// END CANVAS DRAW

// Capture traces in image and save to svg - THEN load data into preview
async function capture () {
  // old tracer from image to svg
  //const Tracer = new ImageTracer()
  //var imgd = Tracer.getImgdata( drawCanvas )
  //var svgStr = Tracer.imagedataToSVG( imgd )
  //Tracer.appendSVGString( svgStr, "svgDiv" )
  const data = (new XMLSerializer()).serializeToString(drawSvg)
  const svg = new Blob([data], {type:"image/svg+xml;charset=utf-8"})

  /*
  display rendered svg ?
  let url = URL.createObjectURL(svg)
  let img = new Image()
  img.crossOrigin = "anonymous" // neccessary?
  img.src = url

  img.onload = async function() {
    renderCanvas.width = this.naturalWidth
    renderCanvas.height = this.naturalHeight
    renderCanvasCtx.drawImage(img, 0, 0, renderCanvas.width, renderCanvas.height)
    URL.revokeObjectURL(url)
  }
  */
  const formData = new FormData()
  const captureName = document.querySelector("#captureName")
  formData.append("name", captureName.innerText)
  formData.append("image", svg)
  try {
    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    })
    if (res.ok) {
      const buffer = await res.arrayBuffer()
      loadIldaDataToCanvas(renderCanvas, buffer)
      startLaser()
    }
  } catch(err) {
    console.log(err)
  }
}

function sendToFazer() {
  const btn = document.getElementById("sendToFazerBtn")
  if (fazerActive === false) {
    try {
      const name = captureName.innerText
      const res = fetch(`/api/startFazer?name=${name}`)
      if (res.ok) {
        console.log("Success")
      }
      fazerActive = true
      btn.innerHTML = "Stop fazer"
    } catch(err) {
      console.log(err)
    }
  } else {
    try {
      const res = fetch(`/api/stopFazer`)
      if (res.ok) {
        console.log("Success")
      }
      fazerActive = false
      btn.innerHTML = "Send to fazer"
    } catch(err) {
      console.log(err)
    }
  }
}

const norwegianFolkloreNames = ["Agi","Agji","Alebrett","Alv","Asbjønn","Aslak","Balle","Bendeli","Bendik","Bergeliten","Boril","Bronsven","Brunsvein","Brynjulv","Buris",
  "Byrill","Dagmor","Drembedrosi","Engelbrett","Ermelin","Falkvor","Falkvord","Fjalme","Fredje","Fokkji","Galite","Gaud","Gjertrud","Gjur","Gjurde","Gjøali",
  "Gjødalin","Gonillille","Gremmil","Grimmen","Grutte","Gugra","Guldmund","Gullmund","Gullmunn","Gullstein","Gundelill","Gyvri","Hakje","Heming","Herebjønn","Hermod",
  "Herredag","Herreper","Hilleliti","Holgeir","Hugaljod","Humlung","Hæge","Hølgje","Håken","Illugjen","Ingelin","Ingerliti","Ingjebjørg","Isemo","Iven","Jallen",
  "Junkar","Kristi","Kvikjesprakk","Kåre","Lagje","Lindelin","Lindeskjær","Ljodvor","Lommann","Lusse","Magnill","Margjit","Mass","Målfrid","Nikelås","Ormålen","Pale",
  "Palle","Palmi","Raud","Remar","Riboll","Rikeball","Rikeli","Roland","Rosamund","Råmund","Rosengår","Signelill","Signelita","Signeliti","Sjuransvein","Skakjelokk",
  "Slott","Soffi","Stein","Stig","Strange","Strangi","Strangji","Sundelill","Syllbor","Syllborg","Sylvelin","Sylvklar","Targjei","Targjer","Tarkjell","Tommes","Tore",
  "Torekall","Torelille","Toreliti","Torgjei","Tosstein","Trauste","Trugjen","Truls","Valivan","Vendelin","Veneliti","Veneros","Venill","Videmø","Villemann","Villfar",
  "Vilgår","Villjåm","Årolilja","Åseliti","Åste"]

export { randomName, capture, startDraw, stopDraw, draw, reset, sendToFazer }
