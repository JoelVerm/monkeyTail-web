Object.assign(functions, {
	$get: c(
		async name =>
			name.startsWith('#')
				? document.querySelector(name)
				: document.querySelectorAll(name),
		'$get',
		'string'
	),
	$on: c(
		async (el, name, fn) => el.addEventListener(name, (el, ev) => fn(ev)),
		'on',
		'map',
		'string',
		'block'
	)
})
