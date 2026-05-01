import sharp from 'sharp'

await sharp('public/pwa-512x512.png')
  .resize(192, 192).png()
  .toFile('public/pwa-192x192.png')

await sharp('public/pwa-512x512.png')
  .resize(180, 180).png()
  .toFile('public/apple-touch-icon.png')

await sharp('public/pwa-512x512.png')
  .resize(32, 32).png()
  .toFile('public/favicon.png')

console.log('✓ Íconos generados')
