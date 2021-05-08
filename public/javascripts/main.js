import Vector from './models/vector.js'
import FourByFour from './models/four_by_four.js'
import Camera from './models/orthographic.js'
import angles from './isomorphisms/angles.js'
import renderCircle from './views/circle.js'
import renderCube from './views/cube.js'
import renderLine from './views/line.js'
import renderPolygon from './views/polygon.js'
import { seed, noise } from './utilities/noise.js'
import { marchingCubes } from './utilities/marches.js'
import { stableSort, remap, cube, durstenfeldShuffle } from './utilities/index.js'
import { COLORS, LIGHT_GREY } from './constants/colors.js'
import { GYROID_RANGE, MARCHING_CUBE_RANGE } from './constants/dimensions.js'

// Copyright (c) 2020 Nathaniel Wroblewski
// I am making my contributions/submissions to this project solely in my personal
// capacity and am not conveying any rights to any intellectual property of any
// third parties.

const canvas = document.querySelector('.canvas')
const context = canvas.getContext('2d')
const { sin, cos } = Math

seed(Math.random())

const perspective = FourByFour
  .identity()
  .rotX(angles.toRadians(40))
  .rotY(angles.toRadians(40))

const camera = new Camera({
  position: Vector.from([0,0,0]),
  direction: Vector.zeroes(),
  up: Vector.from([0, 1, 0]),
  width: canvas.width,
  height: canvas.height,
  zoom: 0.06
})

const from = Vector.from([0, 0, 0])
const to = Vector.from([16, 16, 16])
const by = Vector.from([1, 1, 1])

const gyroid = ([x, y, z]) => sin(x) * cos(y) + sin(y) * cos(z) + sin(z) * cos(x)
const volume = []
const gyroidResolution = 0.5

cube({ from, to, by }, ([x, y, z]) => {
  if (!Array.isArray(volume[x])) volume[x] = []
  if (!Array.isArray(volume[x][y])) volume[x][y] = []

  const vol = gyroid(Vector.from([x, y, z]).multiply(gyroidResolution))

  volume[x][y][z] = remap(vol, GYROID_RANGE, MARCHING_CUBE_RANGE)
})

const vertices = marchingCubes({ from, to: to.subtract(1), by, res: 1, volume }).map(point => {
  return point.subtract(to.multiply(0.5))
})

const faces = []

for (let i = 0; i < vertices.length; i += 3) {
  faces.push([vertices[i], vertices[i + 1], vertices[i + 2]])
}

const light = Vector.from([2,2,-5])
const rotations = durstenfeldShuffle([0.5, 1, 1.5])

const step = () => {
  context.clearRect(0, 0, canvas.width, canvas.height)

  perspective.rotX(angles.toRadians(rotations[0]))
  perspective.rotY(angles.toRadians(rotations[1]))
  perspective.rotZ(angles.toRadians(rotations[2]))

  const rotated = faces.map(triangle => {
    return triangle.map(point => {
      return point.transform(perspective)
    })
  })

  const renderOrder = stableSort(rotated, (a, b) => {
    if (a[0].z < b[0].z) return -1
    if (a[0].z > b[0].z) return 1
    if (a[0].x < b[0].x) return -1
    if (a[0].x > b[0].x) return 1
    if (a[0].y < b[0].y) return -1
    if (a[0].y > b[0].y) return 1
  })

  renderOrder.forEach(face => {
    const normal = face[1].subtract(face[0]).cross(face[2].subtract(face[1])).normalize()
    const ray = light.subtract(face[1]).normalize()
    const facingRatio = Math.min(0.16, Math.max(0, normal.dot(ray)))
    const color = COLORS[Math.floor(remap(facingRatio, [0.001, 0.16], [0, COLORS.length - 1]))]
    const triangle = face.map(point => camera.project(point))
    const stroke = !color ? LIGHT_GREY : color

    renderPolygon(context, triangle, stroke, color, 0.1)
  })

  window.requestAnimationFrame(step)
}

step()
