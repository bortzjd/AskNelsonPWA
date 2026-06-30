// Generates simple solid-colour placeholder PNG icons so the PWA manifest
// resolves during dev/build. Replace these with real brand assets later.
//
// Run with: node scripts/gen-icons.mjs
import { mkdirSync, writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const OUT_DIR = new URL('../public/icons/', import.meta.url)
mkdirSync(OUT_DIR, { recursive: true })

// Brand navy.
const COLOR = [0x17, 0x2b, 0x5c]

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crc])
}

function makePng(size) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // colour type: truecolour RGB
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  // Raw image data: each row prefixed with a filter byte (0).
  const rowLen = size * 3
  const raw = Buffer.alloc((rowLen + 1) * size)
  for (let y = 0; y < size; y++) {
    const off = y * (rowLen + 1)
    raw[off] = 0
    for (let x = 0; x < size; x++) {
      const p = off + 1 + x * 3
      raw[p] = COLOR[0]
      raw[p + 1] = COLOR[1]
      raw[p + 2] = COLOR[2]
    }
  }

  const idat = deflateSync(raw)
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const targets = [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['icon-512-maskable.png', 512],
]

for (const [name, size] of targets) {
  writeFileSync(new URL(name, OUT_DIR), makePng(size))
  console.log(`wrote public/icons/${name} (${size}x${size})`)
}
