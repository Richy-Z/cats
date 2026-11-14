import { renderMeme } from "./render.js"
import { canCopyImages, clipboardImageType, copyImage } from "/scripts/image-clipboard.js"

const canvas = document.getElementById("meme-canvas")
const topCaption = document.getElementById("top-caption")
const bottomCaption = document.getElementById("bottom-caption")
const strip = document.getElementById("caption-strip")
const textSize = document.getElementById("text-size")
const format = document.getElementById("download-format")
const downloadButton = document.getElementById("download-image")
const copyButton = document.getElementById("copy-image")
const captionControls = document.getElementById("caption-controls")
const exportControls = document.getElementById("export-controls")
const status = document.getElementById("editor-status")
const message = document.getElementById("preview-message")
const preview = document.querySelector(".preview-panel")
const clipboardAvailable = canCopyImages()
let source
let filename = "cat"
let busy = false

function draw() {
	if (!source) return
	const dimensions = renderMeme(canvas, source, {
		top: topCaption.value,
		bottom: bottomCaption.value,
		strip: strip.checked,
		size: Number(textSize.value),
	})
	document.getElementById("text-size-value").value = `${textSize.value}%`
	document.getElementById("top-label").textContent = strip.checked ? "Caption above the photo" : "Top caption"
	document.getElementById("image-details").textContent = `${dimensions.width} x ${dimensions.height}`
	status.textContent = ""
}

function setBusy(value) {
	busy = value
	captionControls.disabled = value
	exportControls.disabled = value
	copyButton.disabled = !clipboardAvailable
}

function pngBlob() {
	return new Promise((resolve, reject) => {
		canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Couldn't create the image. Please try again.")), "image/png")
	})
}

function gifBlob() {
	return new Promise((resolve, reject) => {
		const worker = new Worker(new URL("./gif-worker.js", import.meta.url), { type: "module" })
		const timeout = setTimeout(() => finish(new Error("GIF export took too long. Try downloading as PNG.")), 30000)
		function finish(error, bytes) {
			clearTimeout(timeout)
			worker.terminate()
			if (error) reject(error)
			else resolve(new Blob([bytes], { type: "image/gif" }))
		}
		worker.onmessage = ({ data }) => finish(data.error ? new Error(data.error) : null, data.bytes)
		worker.onerror = () => finish(new Error("Couldn't create the GIF. Please try PNG or reload the editor."))
		const pixels = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data
		worker.postMessage({ pixels: pixels.buffer, width: canvas.width, height: canvas.height }, [pixels.buffer])
	})
}

async function download() {
	if (!source || busy) return
	const extension = format.value
	setBusy(true)
	status.textContent = `Making your ${extension.toUpperCase()}...`
	try {
		const blob = extension === "gif" ? await gifBlob() : await pngBlob()
		const url = URL.createObjectURL(blob)
		const link = document.createElement("a")
		link.href = url
		link.download = `${filename}-meme.${extension}`
		document.body.appendChild(link)
		link.click()
		link.remove()
		setTimeout(() => URL.revokeObjectURL(url), 30000)
		status.textContent = `${extension.toUpperCase()} ready. Check your downloads.`
	} catch (error) {
		status.textContent = error.message || "Download failed. Please try again."
	} finally {
		setBusy(false)
	}
}

function updateCopyButton() {
	const type = clipboardImageType(format.value === "gif" ? "image/gif" : "image/png")
	copyButton.textContent = type === "image/gif" ? "Copy GIF" : "Copy PNG"
	copyButton.title = clipboardAvailable ? "" : "Image copying isn't available in this browser"
}

async function copy() {
	if (!source || busy || !clipboardAvailable) return
	setBusy(true)
	status.textContent = "Copying image..."
	try {
		const type = clipboardImageType(format.value === "gif" ? "image/gif" : "image/png")
		await copyImage(type === "image/gif" ? gifBlob() : pngBlob(), type)
		status.textContent = "Image copied."
	} catch {
		status.textContent = "Couldn't copy the image. Allow clipboard access in your browser, or download the PNG."
	} finally {
		setBusy(false)
	}
}

async function load() {
	try {
		const input = new URLSearchParams(location.search).get("url")
		if (!input) throw new Error("Choose a cat in the gallery and tap its pencil to start.")
		const url = new URL(input, location.origin)
		if (url.origin !== location.origin || !/^\/(cats|kusya)\/[^/]+\.(gif|png|jpe?g|webp|avif)$/i.test(url.pathname) || url.search || url.hash) {
			throw new Error("This image isn't in the cat galleries. Go back and choose a cat to edit.")
		}
		const isKusya = url.pathname.startsWith("/kusya/")
		const back = document.getElementById("back-link")
		back.href = isKusya ? "/kusya/" : "/"
		back.textContent = isKusya ? "← Back to Kusya" : "← Back to cats"
		filename = decodeURIComponent(url.pathname.split("/").pop()).replace(/\.[^.]+$/, "")
		const response = await fetch(url.href, { credentials: "omit" })
		if (!response.ok) throw new Error("Couldn't load this cat. Go back to the gallery and try another image.")
		const blob = await response.blob()
		let image
		let objectURL
		try {
			if (window.createImageBitmap) image = await createImageBitmap(blob)
			else {
				objectURL = URL.createObjectURL(blob)
				image = new Image()
				image.src = objectURL
				await image.decode()
			}

			// yes were freezing only one frame because DESPITE gifs being used,
			// they were only chosen as a easy sharing format, not for animation
			// platforms like discord make it easy to favourite gifs
			// hence a single frame of the gif is just frozen here

			const width = image.width || image.naturalWidth
			const height = image.height || image.naturalHeight
			if (!width || !height) throw new Error("The image has no usable dimensions.")
			const scale = Math.min(1, 1600 / Math.max(width, height))
			source = document.createElement("canvas")
			source.width = Math.max(1, Math.round(width * scale))
			source.height = Math.max(1, Math.round(height * scale))
			source.getContext("2d").drawImage(image, 0, 0, source.width, source.height)
		} finally {
			if (objectURL) URL.revokeObjectURL(objectURL)
			if (image?.close) image.close()
		}
		canvas.hidden = false
		message.hidden = true
		setBusy(false)
		updateCopyButton()
		draw()
	} catch (error) {
		message.textContent = error.message || "Couldn't open this image. Go back to the gallery and try again."
	} finally {
		preview.setAttribute("aria-busy", "false")
	}
}

document.getElementById("editor-form").addEventListener("submit", event => event.preventDefault())
for (const input of [topCaption, bottomCaption, strip, textSize]) input.addEventListener("input", draw)
format.addEventListener("change", () => {
	downloadButton.textContent = `Download ${format.value.toUpperCase()}`
	updateCopyButton()
	status.textContent = ""
})
document.getElementById("reset-button").addEventListener("click", () => {
	topCaption.value = ""
	bottomCaption.value = ""
	strip.checked = false
	textSize.value = "7"
	draw()
	topCaption.focus()
})
downloadButton.addEventListener("click", download)
copyButton.addEventListener("click", copy)
load()
