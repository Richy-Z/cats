export function canCopyImages() {
	return Boolean(window.isSecureContext && navigator.clipboard?.write && window.ClipboardItem)
}

export function clipboardImageType(preferred = "image/png") {
	return canCopyImages() && ClipboardItem.supports?.(preferred) ? preferred : "image/png"
}

export function copyImage(blob, type = "image/png") {
	if (!canCopyImages()) throw new Error("Image copying isn't available in this browser. Download the image instead.")
	// pass the promise directly to preserve safari's click activation while encoding
	return navigator.clipboard.write([new ClipboardItem({ [type]: blob })])
}

export async function originalImageBlob(url, type) {
	const response = await fetch(url, { credentials: "omit" })
	if (!response.ok) throw new Error("Couldn't load the image. Please try again.")
	const blob = await response.blob()
	if (blob.type === type) return blob
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
		const canvas = document.createElement("canvas")
		canvas.width = image.width || image.naturalWidth
		canvas.height = image.height || image.naturalHeight
		canvas.getContext("2d").drawImage(image, 0, 0)
		return await new Promise((resolve, reject) => {
			canvas.toBlob(result => result ? resolve(result) : reject(new Error("Couldn't copy this image. Try downloading it instead.")), type)
		})
	} finally {
		if (objectURL) URL.revokeObjectURL(objectURL)
		image?.close?.()
	}
}
