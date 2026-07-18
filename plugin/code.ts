const TOOL_ID = 'c1d0a2b6-8406-4f8f-924b-738649a36738'
const DISPLAY_NAME = 'Fontasy mask'

type PatternType = 'gingham' | 'polka' | 'stripes' | 'checkered' | 'solid'
interface LetterConfig { char: string; pattern: PatternType; paletteIdx: number; stitch: boolean; texture: boolean }

const PALETTES: Array<{ name: string; c1: RGB; c2: RGB }> = [
  { name: 'Red',    c1: { r: 0.90, g: 0.22, b: 0.21 }, c2: { r: 1, g: 1, b: 1 } },
  { name: 'Blue',   c1: { r: 0.12, g: 0.53, b: 0.90 }, c2: { r: 1, g: 1, b: 1 } },
  { name: 'Green',  c1: { r: 0.26, g: 0.63, b: 0.28 }, c2: { r: 1, g: 1, b: 1 } },
  { name: 'Pink',   c1: { r: 0.93, g: 0.25, b: 0.48 }, c2: { r: 1, g: 1, b: 1 } },
  { name: 'Yellow', c1: { r: 0.99, g: 0.85, b: 0.21 }, c2: { r: 0.45, g: 0.30, b: 0.10 } },
  { name: 'Teal',   c1: { r: 0.00, g: 0.54, b: 0.48 }, c2: { r: 1, g: 1, b: 1 } },
  { name: 'Purple', c1: { r: 0.48, g: 0.12, b: 0.64 }, c2: { r: 1, g: 1, b: 1 } },
  { name: 'Brown',  c1: { r: 0.55, g: 0.33, b: 0.19 }, c2: { r: 0.96, g: 0.94, b: 0.92 } },
]

type Msg =
  | { type: 'resize'; height: number }
  | { type: 'insert'; letters: LetterConfig[]; fontSize: number; spacing: number; fontFamily: string; fontStyle: string }

figma.root.setRelaunchData({ [TOOL_ID]: DISPLAY_NAME })
figma.showUI(__html__, { width: 340, height: 620 })

figma.ui.onmessage = async (msg: Msg) => {
  if (msg.type === 'resize') {
    figma.ui.resize(340, Math.max(200, Math.min(900, Math.round(msg.height))))
    return
  }
  if (msg.type === 'insert') {
    try {
      figma.ui.postMessage({ type: 'status', text: 'vectorizing letters...' })
      await insertLetters(msg)
      figma.ui.postMessage({ type: 'done' })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      figma.notify(message, { error: true })
      figma.ui.postMessage({ type: 'error', message })
    }
  }
}

async function insertLetters(msg: { letters: LetterConfig[]; fontSize: number; spacing: number; fontFamily: string; fontStyle: string }) {
  const { letters, fontSize, spacing, fontFamily, fontStyle } = msg
  if (!letters.length || letters.every(l => l.char === ' ')) {
    figma.notify('Type some text first')
    return
  }

  try {
    await figma.loadFontAsync({ family: fontFamily, style: fontStyle })
  } catch {
    throw new Error('Font not found: ' + fontFamily + ' ' + fontStyle)
  }

  interface LetterVec {
    config: LetterConfig
    paths: Array<{ windingRule: WindingRule; data: string }>
    w: number
    h: number
  }
  const vecData: LetterVec[] = []

  for (let i = 0; i < letters.length; i++) {
    const lc = letters[i]
    figma.ui.postMessage({ type: 'progress', current: i + 1, total: letters.length })

    if (lc.char === ' ') {
      vecData.push({ config: lc, paths: [], w: fontSize * 0.3, h: fontSize })
      continue
    }

    const tn = figma.createText()
    tn.fontName = { family: fontFamily, style: fontStyle }
    tn.characters = lc.char
    tn.fontSize = fontSize
    tn.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }]

    let paths: Array<{ windingRule: WindingRule; data: string }> = []
    let w = 0
    let h = 0
    try {
      const vec = figma.flatten([tn])
      paths = vec.vectorPaths.map(vp => ({ windingRule: vp.windingRule as WindingRule, data: vp.data }))
      w = vec.width
      h = vec.height
      vec.remove()
    } catch {
      if (!tn.removed) tn.remove()
    }

    if (paths.length === 0 || w < 1 || h < 1) {
      vecData.push({ config: lc, paths: [], w: fontSize * 0.2, h: fontSize })
    } else {
      vecData.push({ config: lc, paths, w, h })
    }
  }

  const validLetters = vecData.filter(v => v.paths.length > 0)
  if (!validLetters.length) {
    figma.notify('No valid letter shapes')
    return
  }

  const maxH = Math.max(...vecData.map(v => v.h))
  let totalW = 0
  for (let i = 0; i < vecData.length; i++) {
    totalW += vecData[i].w
    if (i < vecData.length - 1) totalW += spacing
  }

  const main = figma.createFrame()
  main.name = '✦ fontasy mask'
  main.resize(Math.max(1, Math.round(totalW)), Math.max(1, Math.round(maxH)))
  main.fills = []
  main.clipsContent = false

  let xOff = 0
  for (const vd of vecData) {
    if (vd.paths.length === 0) {
      xOff += vd.w + spacing
      continue
    }

    const lc = vd.config
    const pal = PALETTES[lc.paletteIdx] ?? PALETTES[0]
    const pad = 4
    const fw = Math.round(vd.w + pad * 2)
    const fh = Math.round(vd.h + pad * 2)

    const letterFrame = figma.createFrame()
    letterFrame.name = lc.char
    letterFrame.resize(fw, fh)
    letterFrame.x = Math.round(xOff) - pad
    letterFrame.y = Math.round((maxH - vd.h) / 2) - pad
    letterFrame.fills = []
    letterFrame.clipsContent = false
    main.appendChild(letterFrame)

    const maskVec = figma.createVector()
    maskVec.name = 'mask'
    maskVec.vectorPaths = vd.paths
    maskVec.x = pad
    maskVec.y = pad
    maskVec.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }]
    maskVec.isMask = true
    letterFrame.appendChild(maskVec)

    const patternNodes = buildPattern(letterFrame, lc.pattern, pal, fw, fh)

    const groupNodes: SceneNode[] = [maskVec, ...patternNodes]
    if (groupNodes.length > 1) {
      const grp = figma.group(groupNodes, letterFrame)
      grp.name = 'pattern'
    }

    if (lc.stitch) {
      const sv = figma.createVector()
      sv.name = 'stitch'
      sv.vectorPaths = vd.paths
      sv.x = pad
      sv.y = pad
      sv.fills = []
      sv.strokes = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }]
      sv.strokeWeight = Math.max(1, Math.round(fontSize / 80))
      sv.dashPattern = [Math.max(2, Math.round(fontSize / 30)), Math.max(2, Math.round(fontSize / 30))]
      sv.strokeAlign = 'INSIDE'
      letterFrame.appendChild(sv)
    }

    if (lc.texture) {
      letterFrame.effects = [
        {
          type: 'NOISE',
          noiseType: 'MONOTONE',
          visible: true,
          color: { r: 0, g: 0, b: 0, a: 0.18 },
          blendMode: 'NORMAL',
          noiseSize: 1.8,
          density: 0.55,
        } as NoiseEffect,
      ]
    }

    xOff += vd.w + spacing
  }

  main.x = Math.round(figma.viewport.center.x - totalW / 2)
  main.y = Math.round(figma.viewport.center.y - maxH / 2)
  main.setRelaunchData({ [TOOL_ID]: DISPLAY_NAME })
  figma.currentPage.selection = [main]
  figma.viewport.scrollAndZoomIntoView([main])
  figma.notify('✦ fontasy mask · ' + validLetters.length + ' letters')
}

function buildPattern(parent: FrameNode, pattern: PatternType, pal: { c1: RGB; c2: RGB }, w: number, h: number): SceneNode[] {
  const nodes: SceneNode[] = []
  const MAX = 120

  if (pattern === 'solid') {
    const r = figma.createRectangle()
    r.name = 'fill'
    r.resize(w, h)
    r.x = 0
    r.y = 0
    r.fills = [{ type: 'SOLID', color: pal.c1 }]
    parent.appendChild(r)
    nodes.push(r)
    return nodes
  }

  const bg = figma.createRectangle()
  bg.name = 'bg'
  bg.resize(w, h)
  bg.x = 0
  bg.y = 0
  bg.fills = [{ type: 'SOLID', color: pattern === 'polka' ? pal.c1 : pal.c2 }]
  parent.appendChild(bg)
  nodes.push(bg)

  let count = 0

  if (pattern === 'gingham') {
    const s = Math.max(4, Math.round(Math.min(w, h) / 10))
    for (let y = 0; y < h && count < MAX; y += s * 2) {
      const stripe = figma.createRectangle()
      stripe.name = 'h'
      stripe.resize(w, Math.min(s, h - y))
      stripe.x = 0
      stripe.y = y
      stripe.fills = [{ type: 'SOLID', color: pal.c1, opacity: 0.5 }]
      parent.appendChild(stripe)
      nodes.push(stripe)
      count++
    }
    for (let x = 0; x < w && count < MAX; x += s * 2) {
      const stripe = figma.createRectangle()
      stripe.name = 'v'
      stripe.resize(Math.min(s, w - x), h)
      stripe.x = x
      stripe.y = 0
      stripe.fills = [{ type: 'SOLID', color: pal.c1, opacity: 0.5 }]
      parent.appendChild(stripe)
      nodes.push(stripe)
      count++
    }
  } else if (pattern === 'polka') {
    const dotR = Math.max(2, Math.round(Math.min(w, h) / 14))
    const gap = dotR * 3.5
    for (let y = dotR; y < h && count < MAX; y += gap) {
      const rowOff = (Math.floor(y / gap) % 2) * (gap / 2)
      for (let x = dotR + rowOff; x < w && count < MAX; x += gap) {
        const dot = figma.createEllipse()
        dot.name = 'dot'
        dot.resize(dotR * 2, dotR * 2)
        dot.x = Math.round(x - dotR)
        dot.y = Math.round(y - dotR)
        dot.fills = [{ type: 'SOLID', color: pal.c2 }]
        parent.appendChild(dot)
        nodes.push(dot)
        count++
      }
    }
  } else if (pattern === 'stripes') {
    const s = Math.max(4, Math.round(Math.min(w, h) / 8))
    for (let y = 0; y < h && count < MAX; y += s * 2) {
      const stripe = figma.createRectangle()
      stripe.name = 'stripe'
      stripe.resize(w, Math.min(s, h - y))
      stripe.x = 0
      stripe.y = y
      stripe.fills = [{ type: 'SOLID', color: pal.c1 }]
      parent.appendChild(stripe)
      nodes.push(stripe)
      count++
    }
  } else if (pattern === 'checkered') {
    const s = Math.max(4, Math.round(Math.min(w, h) / 10))
    for (let y = 0; y < h && count < MAX; y += s) {
      for (let x = 0; x < w && count < MAX; x += s) {
        if ((Math.floor(x / s) + Math.floor(y / s)) % 2 !== 0) continue
        const sq = figma.createRectangle()
        sq.name = 'sq'
        sq.resize(Math.min(s, w - x), Math.min(s, h - y))
        sq.x = x
        sq.y = y
        sq.fills = [{ type: 'SOLID', color: pal.c1 }]
        parent.appendChild(sq)
        nodes.push(sq)
        count++
      }
    }
  }

  return nodes
}
