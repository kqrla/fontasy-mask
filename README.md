# Fontasy Mask

Decorative fabric pattern lettering — apply gingham, polka dots, stripes, checkered patterns with recolorable swatches, edge stitching, and fabric texture overlays to any text.

## Structure

```
fontasy-mask/
├── plugin/          # Figma plugin source
│   ├── manifest.json
│   ├── code.ts      # Plugin API logic
│   └── ui.html      # Plugin UI
└── web/             # Standalone web app
    └── index.html   # Single-file web app (open in browser)
```

## Figma Plugin

The plugin runs inside Figma and creates editable vector lettering with fabric patterns. Each letter is a self-contained frame with:

- Vector mask of the letter shape
- Procedurally generated pattern fill (gingham, polka, stripes, checkered, solid)
- Optional dashed edge stitch effect
- Optional fabric noise texture overlay
- 8 recolorable palette swatches

### Per-letter customization

Right-click or click any letter in the preview to customize its pattern, color, stitch, and texture independently.

## Web App

Open `web/index.html` in any browser. Same features as the plugin with PNG and SVG download.

## Patterns

| Pattern | Description |
|---------|-------------|
| Gingham | Overlapping semi-transparent horizontal + vertical stripes |
| Polka | Offset dot grid |
| Stripes | Horizontal stripes |
| Checkered | Alternating checkerboard squares |
| Solid | Single color fill |

## Color Palettes

Red, Blue, Green, Pink, Yellow, Teal, Purple, Brown — each with a primary and secondary color.
