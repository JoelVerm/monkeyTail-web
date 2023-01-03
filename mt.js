// function modified from:
// https://blog.stevenlevithan.com/archives/javascript-match-nested
// use as: matchRecursive('a(b)c(d(e)f)g', '(', ')')
// returns: [['b', 2, 3, ')'], ['d(e)f', 6, 11, ')']]

function matchRecursive(str, opener, closer) {
	let openRE = new RegExp(`${opener}`),
		iterator = new RegExp(`${opener}|${closer}`, 'g'),
		results = [],
		openTokens,
		matchStartIndex,
		match

	do {
		openTokens = 0
		while ((match = iterator.exec(str))) {
			if (openRE.exec(match[0])) {
				if (!openTokens) matchStartIndex = iterator.lastIndex
				openTokens++
			} else if (openTokens) {
				openTokens--
				if (!openTokens)
					results.push([
						str.slice(matchStartIndex, match.index),
						matchStartIndex,
						match.index,
						match[0]
					])
			}
		}
	} while (openTokens && (iterator.lastIndex = matchStartIndex))

	return results
}

function parseVariable(val) {
	const n = Number(val)
	if (!isNaN(n)) {
		return n
	}
	if (val.trim) {
		if (val.trim() === '') return 0
		return val
	}
	return 0
}

const functions = {}

/**
 * @param {Function} fn
 * @returns {Function}
 */
function addMtFunction(fn, name) {
	const argsDefs = fn
		.toString()
		.split('=>')[0]
		.replace('(', '')
		.replace(')', '')
		.replace('async', '')
		.split(',')
		.map(e => e.trim())
	const minArgsLen = argsDefs.filter(e => !e.startsWith('...')).length
	const maxArgsLen = argsDefs[argsDefs.length - 1].startsWith('...')
		? null
		: argsDefs.length
	let pipeArgPos = argsDefs.findIndex(e => e[0].startsWith('_'))
	if (pipeArgPos === -1) pipeArgPos = 0
	functions[name] = (pipeArg, ...args) => {
		if (pipeArg != null) args.splice(pipeArgPos, 0, pipeArg)
		if (
			args.length < minArgsLen ||
			(maxArgsLen && args.length > maxArgsLen)
		) {
			throw `${name} expects between ${minArgsLen} and ${maxArgsLen} arguments, got ${
				args.length
			}: ${args.join(', ')}`
		}
		for (let i = 0; i < args.length; i++) {
			const index = Math.min(i, argsDefs.length - 1)
			if (
				argsDefs[index].endsWith('$') &&
				!(typeof args[i] === 'function')
			) {
				throw `${name} expects ${
					index === pipeArgPos && pipeArg ? 'piped ' : ''
				}argument [${argsDefs[index]
					.replace('...', '')
					.replace('_', '')
					.replace('$', '')}] to be a <${
					argsDefs[index].endsWith('$') ? 'function' : 'value'
				}>, got opposite: ${args[i]}`
			}
		}
		return fn(...args)
	}
}
//#region functions
addMtFunction(
	(last, ms) => new Promise(resolve => setTimeout(resolve, ms, last)),
	'wait'
)
addMtFunction(url => fetch(url).then(res => res.json()), 'fetch')
addMtFunction(async (a, b) => a + b, 'add')
addMtFunction(async (a, b) => a - b, 'subtract')
addMtFunction(async (a, b) => a * b, 'multiply')
addMtFunction(async (a, b) => a / b, 'divide')
addMtFunction(async (a, b) => a % b, 'modulo')
addMtFunction(async (a, b) => a ** b, 'power')
addMtFunction(async a => Math.sqrt(a), 'sqrt')
addMtFunction(async a => Math.abs(a), 'abs')
addMtFunction(async a => Math.floor(a), 'floor')
addMtFunction(async a => Math.ceil(a), 'ceil')
addMtFunction(async a => Math.round(a), 'round')
addMtFunction(async (a, b) => a > b, 'greater')
addMtFunction(async (a, b) => a < b, 'less')
addMtFunction(async (a, b) => a >= b, 'greaterEqual')
addMtFunction(async (a, b) => a <= b, 'lessEqual')
addMtFunction(async (a, b) => a === b, 'equal')
addMtFunction(async (a, b) => a !== b, 'notEqual')
addMtFunction(async (a, b) => a && b, 'and')
addMtFunction(async (a, b) => a || b, 'or')
addMtFunction(async a => !a, 'not')
addMtFunction(async (a, b$, c$) => (a ? b$() : c$()), 'if')
addMtFunction(async (a, b$, c$) => {
	let i = 0
	while (await b$(a)) {
		a = await c$(a)
		if (i > 10000) throw 'infinite loop detected'
		i++
	}
	return a
}, 'while')
addMtFunction(async a => getType(a), 'type')
addMtFunction(async a => a.length, 'length') //TODO specify iterable type
addMtFunction(async (...a) => {
	console.log(...a)
	return a[0]
}, 'print')
addMtFunction(async (...args) => args, 'list', 1)
addMtFunction(
	//TODO specify iterable type
	async (...args) => {
		if (args.length % 2 === 1)
			return Object.fromEntries(
				args.reduce(function (result, value, index, array) {
					if (index % 2 === 0)
						result.push(array.slice(index, index + 2))
					return result
				}, [])
			)
		else throw 'last map key has no value'
	},
	'map'
)
addMtFunction(
	//TODO specify iterable type
	async (a, index, val) => {
		try {
			if (val !== undefined) a[index] = val
			return a[index]
		} catch {
			if (getType(a) === 'list' || getType(a) === 'string')
				throw `index ${index} out of range`
			else if (getType(a) === 'map') throw `index ${index} not in map`
			else throw `Can not get index of ${getType(a)}`
		}
	},
	'index'
)
addMtFunction(
	//TODO specify iterable type
	async (a, start, end) => a.slice(start, end),
	'slice'
)
addMtFunction(async (a, b$) => a.map(b$), 'transform') //TODO specify iterable type
addMtFunction(async (a, b$) => a.filter(b$), 'filter') // TODO specify iterable type
addMtFunction(
	async (a, b$, c) =>
		a.reduce((last, current) => {
			let result = b$(current)
			if (getType(last) === 'list') last.push(result)
			else last += result
			return last
		}, c),
	'reduce'
) // TODO specify iterable type
addMtFunction(async (block$, ...input) => block$(...input), 'execute')
//#endregion functions

// !Remove type function

const shorthands = {
	'+': '@ add',
	'-': '@ subtract',
	'*': '@ multiply',
	'/': '@ divide',
	'%': '@ modulo',
	'^': '@ power',
	'**': '@ power',
	'v/': '@ sqrt',
	'|.|': '@ abs',
	'|v|': '@ floor',
	'|^|': '@ ceil',
	'|x|': '@ round',
	'>': '@ greater',
	'<': '@ less',
	'>=': '@ greaterEqual',
	'<=': '@ lessEqual',
	'==': '@ equal',
	'!=': '@ notEqual',
	'&': '@ and',
	'|': '@ or',
	'!': '@ not',
	'?': '@ if',
	'?=': '@ while',
	'#-': '@ length',
	'|>': '@ print',
	'#': '@ index',
	'##': '@ slice',
	'->': '@ execute'
}
for (const key in shorthands) {
	let newKey = key.replace(/[-[\]{}()*+?.\\^$|,]/g, '\\$&')
	if (newKey === key) continue
	shorthands[newKey] = shorthands[key]
	delete shorthands[key]
}
function resolveShorthands(code) {
	for (let [shorthand, command] of Object.entries(shorthands)) {
		code = code.replace(
			new RegExp(`(?<!<<[^\\>]*)\\s${shorthand}\\s(?![^\\<]*>>)`, 'g'),
			` ${command} `
		)
	}
	return code
}
const removeComments = code => code.replace(/\/\/[^\n]*\n|\/\*(.|\n)*\*\//g, '')

class CodeData {
	constructor(code) {
		/** @type {String} */
		this.code = code
		/** @type {Array<String>} */
		this.innerScopes = []
		/** @type {Array<String>} */
		this.codeBlocks = []
		/** @type {Array<String>} */
		this.strings = []
	}
}

/**
 * @param {CodeData} data
 */
function replaceBlocks(code) {
	data = new CodeData(code)
	let parentheses = matchRecursive(data.code, '\\(|<<|\\{', '\\)|>>|\\}')
	let replaceOffset = 0
	for (const [str, start, end, char] of parentheses) {
		switch (char) {
			case ')':
				data.code = `${data.code.substring(0, start + replaceOffset)}${
					data.innerScopes.length
				}${data.code.substring(end + replaceOffset)}`
				data.innerScopes.push(str)
				replaceOffset -=
					str.length - data.innerScopes.length.toString().length
				break
			case '}':
				data.code = `${data.code.substring(0, start + replaceOffset)}${
					data.codeBlocks.length
				}${data.code.substring(end + replaceOffset)}`
				data.codeBlocks.push(str)
				replaceOffset -=
					str.length - data.codeBlocks.length.toString().length
				break
			case '>>':
				data.code = `${data.code.substring(0, start + replaceOffset)}${
					data.strings.length
				}${data.code.substring(end + replaceOffset)}`
				data.strings.push(str)
				replaceOffset -=
					str.length - data.strings.length.toString().length
				break
		}
	}
	data.code = resolveShorthands(data.code)
	return data
}

/**
 * @param {string} text
 * @param {CodeData} data
 */
async function processCall(text, data) {
	let [func, ...args] = text.replace(/(\s|^)[@;]\s/, '').split(/\s+/)
	if (func.startsWith('(')) {
		let num = func.slice(1, -1)
		func = await execute(data.innerScopes[num])
	} else if (func.startsWith('{')) {
		let num = func.slice(1, -1)
		func = await createComposition(data.codeBlocks[num])
	} else if (func.startsWith('<<')) {
		let num = func.slice(2, -2)
		func = data.strings[num]
	} else {
		let f = functions[func]
		if (f) {
			func = f
		} else {
			if (args.length) throw `undefined function ${func}`
			return [parseVariable(func)]
		}
	}
	for (const i in args) {
		if (args[i].startsWith('(')) {
			let num = args[i].slice(1, -1)
			args[i] = await execute(data.innerScopes[num])
		} else if (args[i].startsWith('{')) {
			let num = args[i].slice(1, -1)
			args[i] = await createComposition(data.codeBlocks[num])
		} else if (args[i].startsWith('<<')) {
			let num = args[i].slice(2, -2)
			args[i] = data.strings[num]
		} else {
			let f = functions[args[i]]
			if (f) {
				args[i] = f
			} else {
				args[i] = parseVariable(args[i])
			}
		}
	}
	return [func, args]
}

async function createComposition(code) {
	const data = replaceBlocks(code)

	let compositions = data.code.matchAll(/(\s[@;]\s|^)(.|\n)*?(?=\s[@;]\s|$)/g)
	let callList = []
	for (let app of compositions) {
		app = app[0].trim()
		let [func, args] = await processCall(app, data)
		if (typeof func !== 'function') {
			callList.push(() => func)
			continue
		}
		callList.push(v => func(v, ...args))
	}
	return async inp => {
		for (call of callList) {
			inp = await call(inp)
		}
		return inp
	}
}

async function execute(code) {
	return await (
		await createComposition(code)
	)()
}

window.onload = function () {
	let text = Object.values(
		document.querySelectorAll('script[type="text/mt"]')
	)
		.map(el => removeComments(el.textContent))
		.join('\n\n')
	let threadPrograms = text.split('\n\n')
	for (let threadProgram of threadPrograms) {
		if (!threadProgram.trim()) continue
		execute(threadProgram)
			.then(console.log)
			.catch(e => console.error(`error: ${e}`))
	}
}
