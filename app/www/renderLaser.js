import { ILDA } from "./ilda.js"

var ildaFile = new ILDA.File()
var section = 0
var point = 0
var defaultcolors = [
  '#F00', '#F10', '#F20', '#F30', '#F40', '#F50', '#F60', '#F70', '#F80', '#F90', '#FA0', '#FB0', '#FC0', '#FD0', '#FE0', '#FF0', '#FF0', '#EF0', '#CF0', '#AF0',
  '#8F0', '#6F0', '#4F0', '#2F0', '#0F0', '#0F2', '#0F4', '#0F6', '#0F8', '#0FA', '#0FC', '#0FE', '#08F', '#07F', '#06F', '#06F', '#05F', '#04F', '#04F', '#02F',
  '#00F', '#20F', '#40F', '#60F', '#80F', '#A0F', '#C0F', '#E0F', '#F0F', '#F2F', '#F4F', '#F6F', '#F8F', '#FAF', '#FCF', '#FEF', '#FFF', '#FEE', '#FCC', '#FAA',
  '#F88', '#F66', '#F44', '#022'
]
var laserInterval

let ctx
let laserCanvas
const offset = 10
const maxOffset = 32768
let lastpoint = { x: 0, y: 0 }
let speed = 100
let laserActive = false // toggle laser interval on/off

// load data from bytearray
async function loadIldaDataToCanvas(canvas, arrayBuffer) {
  laserCanvas = canvas
  ctx = laserCanvas.getContext("2d")
  //console.log(arrayBuffer)
  ildaFile = ILDA.Reader.readFromBuffer(arrayBuffer)
}

function startLaser() {
  if (laserActive === false) {
    laserInterval = setInterval(moveLaser, 5)
    laserActive = true
  }
}

function stopLaser() {
  if (laserActive === true) {
    clearInterval(laserInterval)
    laserActive = false
  }
}

function stepLaser () {
  const centerX = laserCanvas.width / 2
  const centerY = laserCanvas.height / 2
  if (section >= ildaFile.sections.length) {
    section = 0
    point = 0
  }
  if (section < ildaFile.sections.length) {
    var seg = ildaFile.sections[section]
    if (point < seg.points.length) {
      var pt = seg.points[point]
      var newpoint = {
        x: centerX + ((centerX - offset) * pt.x / maxOffset),
        y: centerY - ((centerY - offset) * pt.y / maxOffset),
      }
      if (!pt.blanking) {
        ctx.strokeStyle = defaultcolors[pt.color % defaultcolors.length]
        ctx.beginPath()
          ctx.moveTo(lastpoint.x, lastpoint.y)
          ctx.lineTo(newpoint.x, newpoint.y)
          ctx.closePath()
          ctx.stroke()
        }
        lastpoint.x = newpoint.x
        lastpoint.y = newpoint.y
      point ++
    } else {
      section ++
      point = 0
    }
  }
}

function moveLaser () {
  ctx.globalAlpha = 0.1 // fade background a bit...
  ctx.fillStyle = "#000"
  ctx.fillRect(0, 0, 700, 700)
  ctx.globalAlpha = 1.0
  for (var i=0; i<speed; i++) {
    stepLaser()
  }
}

export { loadIldaDataToCanvas, startLaser, stopLaser }