export function wrapText(context, text, maxWidth) {
	const lines = []
	for (const paragraph of text.replace(/\r/g, "").trim().replace(/\n{3,}/g, "\n\n").split("\n")) {
		let line = ""
		for (const word of paragraph.trim().split(/\s+/).filter(Boolean)) {
			const candidate = line ? `${line} ${word}` : word
			if (context.measureText(candidate).width <= maxWidth) {
				line = candidate
				continue
			}
			if (line) lines.push(line)
			line = ""

			// keep[ ]even single long words inside le photo
			for (const character of Array.from(word)) {
				if (line && context.measureText(line + character).width > maxWidth) {
					lines.push(line)
					line = ""
				}
				line += character
			}
		}
		lines.push(line)
	}
	return lines
}

function captionLayout(context, text, width, size, font, maxHeight = Infinity) {
	let fontSize = size
	let lines
	while (true) {
		context.font = `${fontSize}px ${font}`
		lines = text.trim() ? wrapText(context, text, width) : []
		if (lines.length * fontSize * 1.22 <= maxHeight || fontSize <= size / 5) break
		fontSize *= .9
	}
	return { lines, fontSize, font, lineHeight: fontSize * 1.22 }
}

export function renderMeme(canvas, source, { top, bottom, strip, size }) {
	const context = canvas.getContext("2d")
	const width = source.width
	const height = source.height
	const padding = Math.max(2, width * .04)
	const textWidth = width - padding * 2
	const requestedSize = width * size / 100
	const family = 'Impact, "Arial Black", sans-serif'
	const topLayout = captionLayout(context, top, textWidth, requestedSize, strip ? 'Arial, sans-serif' : family, strip ? Infinity : height * .42)
	const bottomLayout = captionLayout(context, bottom, textWidth, requestedSize, family, height * .42)
	const stripHeight = strip ? Math.ceil(padding * 2 + Math.max(1, topLayout.lines.length) * topLayout.lineHeight) : 0

	canvas.width = width
	canvas.height = height + stripHeight
	context.fillStyle = "#fff"
	context.fillRect(0, 0, canvas.width, canvas.height)
	context.drawImage(source, 0, stripHeight)
	context.textBaseline = "top"
	context.lineJoin = "round"

	function drawCaption(layout, y, plain = false) {
		context.font = `${layout.fontSize}px ${layout.font}`
		context.textAlign = plain ? "left" : "center"
		context.fillStyle = plain ? "#111" : "#fff"
		context.strokeStyle = "#000"
		context.lineWidth = Math.max(1, layout.fontSize * .11)
		const x = plain ? padding : width / 2
		layout.lines.forEach((line, index) => {
			const lineY = y + index * layout.lineHeight
			if (!plain) context.strokeText(line, x, lineY)
			context.fillText(line, x, lineY)
		})
	}

	drawCaption(topLayout, padding, strip)
	drawCaption(bottomLayout, stripHeight + height - padding - bottomLayout.lines.length * bottomLayout.lineHeight)
	return { width: canvas.width, height: canvas.height }
}
