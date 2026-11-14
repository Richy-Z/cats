for (const card of document.querySelectorAll(".cat-card")) {
	const image = card.querySelector("img")
	const url = image.getAttribute("src")
	card.querySelector(".edit-btn").href = `/edit?url=${encodeURIComponent(url)}`
	card.querySelector(".copy-btn").addEventListener("click", async () => {
		try {
			await navigator.clipboard.writeText(new URL(url, window.location.origin).href)
		} catch (error) {
			console.error("Failed to copy image link:", error)
		}
	})
}
