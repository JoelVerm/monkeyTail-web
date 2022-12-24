addMtFunction(
	async name$string =>
		name$string.startsWith('#')
			? document.querySelector(name$string)
			: document.querySelectorAll(name$string),
	'HTMLget'
)
addMtFunction(
	async (el$any, name$string, fn$lambda) =>
		el$any.addEventListener(name$string, (el, ev) => fn$lambda(ev)),
	'HTMLon'
)
