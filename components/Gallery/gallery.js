import { canCopyImages, clipboardImageType, copyImage, originalImageBlob } from "/scripts/image-clipboard.js"

const status = document.getElementById("gallery-status")
let statusTimeout
function notify(message) {
	clearTimeout(statusTimeout)
	status.textContent = message
	statusTimeout = setTimeout(() => { status.textContent = "" }, 4000)
}

for (const card of document.querySelectorAll(".cat-card")) {
	const image = card.querySelector("img")
	const url = image.getAttribute("src")
	card.querySelector(".edit-btn").href = `/edit/?url=${encodeURIComponent(url)}`
	card.querySelector(".copy-btn").addEventListener("click", async () => {
		try {
			await navigator.clipboard.writeText(new URL(url, window.location.origin).href)
			notify("Link copied.")
		} catch {
			notify("Couldn't copy the link. Check your browser's clipboard permissions.")
		}
	})
	const copyButton = card.querySelector(".copy-image-btn")
	const originalType = /\.gif$/i.test(url) ? "image/gif" : "image/png"
	const type = clipboardImageType(originalType)
	copyButton.disabled = !canCopyImages()
	copyButton.title = copyButton.disabled ? "Image copying isn't available in this browser" : `Copy image as ${type === "image/gif" ? "GIF" : "PNG"}`
	copyButton.addEventListener("click", async () => {
		copyButton.disabled = true
		try {
			await copyImage(originalImageBlob(url, type), type)
			notify("Image copied.")
		} catch (error) {
			notify(error.message || "Couldn't copy the image. Check your browser's clipboard permissions.")
		} finally {
			copyButton.disabled = false
		}
	})
}
