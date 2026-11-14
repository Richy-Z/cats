import { GIFEncoder, quantize, applyPalette } from "./vendor/gifenc.js"

self.onmessage = ({ data: { pixels, width, height } }) => {
	try {
		const rgba = new Uint8Array(pixels)
		const palette = quantize(rgba, 256)
		const indexed = applyPalette(rgba, palette)
		const gif = GIFEncoder()
		gif.writeFrame(indexed, width, height, { palette, repeat: -1 })
		gif.finish()
		const bytes = gif.bytes()
		self.postMessage({ bytes }, [bytes.buffer])
	} catch (error) {
		self.postMessage({ error: error.message })
	}
}
