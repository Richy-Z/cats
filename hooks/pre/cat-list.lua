local cats = {}

for _, file in pairs(fs.scandir("project:cats")) do
	if file.isDir then goto continue end

	table.insert(cats, "/cats/" .. file.name)

	::continue::
end

fs.write("generated:cats.json", json.encode(cats))
