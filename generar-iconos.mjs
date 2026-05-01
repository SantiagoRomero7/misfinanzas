import { createCanvas } from 'canvas'
import { writeFileSync } from 'fs'

const generateIcon = (size) => {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')
  
  // Fondo violeta con bordes redondeados
  ctx.fillStyle = '#7C3AED'
  ctx.beginPath()
  ctx.roundRect(0, 0, size, size, size * 0.2)
  ctx.fill()
  
  // Letra M$ en blanco
  ctx.fillStyle = '#FFFFFF'
  ctx.font = `bold ${size * 0.55}px Arial`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('M$', size / 2, size / 2)
  
  return canvas.toBuffer('image/png')
}

;[192, 512, 180].forEach(size => {
  const name = size === 180 ? 'apple-touch-icon' : `pwa-${size}x${size}`
  writeFileSync(`public/${name}.png`, generateIcon(size))
  console.log(`Generated ${name}.png`)
})
