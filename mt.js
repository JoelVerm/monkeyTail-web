'use strict'

/*
|  function modified from:
|  https://blog.stevenlevithan.com/archives/javascript-match-nested
|  use as: matchRecursive('a(b)c(d(e)f)g', '(', ')')
|  returns: [['b', 2, 3, ')'], ['d(e)f', 6, 11, ')']]
*/

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

function parseValue(val) {
	const num = Number(val)
	if (!isNaN(num)) {
		return () => num
	}
	if (val.trim) {
		if (val.trim() === '') return () => 0
		const str = val
		return () => str
	}
	return () => 0
}

const functions = {}
function curry(fn, len) {
	function curried(argsIn = [], args = []) {
		args = args.concat(argsIn)
		if (args.length >= len) {
			return fn(...args)
		} else {
			return function (...argsIn) {
				return curried(argsIn, args)
			}
		}
	}
	return function (...argsIn) {
		return curried(argsIn)
	}
}
const isBareValue = v =>
	typeof v === 'number' ||
	(typeof v === 'string' && v.length === 1) ||
	typeof v === 'function'
function applied(fn) {
	return function apply(...args) {
		for (const i in args) {
			if (!isBareValue(args[i])) {
				return args[i].map(e => {
					const a = [...args]
					a[i] = e
					return apply(...a)
				})
			}
		}
		return fn(...args)
	}
}
function getParamNames(func) {
	var fnStr = func.toString().replace(/((\/\/.*$)|(\/\*[\s\S]*?\*\/))/gm, '')
	var result = fnStr
		.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')'))
		.match(/([^\s,]+)/g)
	if (result === null) result = []
	return result
}
const mtFn =
	fn =>
	async (...args) => {
		let paramNames = getParamNames(fn)
		return fn(
			...(await Promise.all(
				args.map(async (e, i) =>
					paramNames[i].endsWith('$') ? e : await e()
				)
			))
		)
	}
/**
 * @param {Function} fn
 * @returns {Function}
 */
function addMtFunction(fn, name, apply = true) {
	if (apply) functions[name] = curry(applied(mtFn(fn)), fn.length)
	else functions[name] = curry(mtFn(fn), fn.length)
	functions[name].len = fn.length
	functions[name].fn = name
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
addMtFunction(async a => a.length, 'length')
addMtFunction(async a => {
	console.log(a)
	return a
}, 'print')
addMtFunction(async () => [], 'list')
addMtFunction(async (a, b) => [...a, b], 'append')
addMtFunction(
	async (a, index, val) => {
		try {
			if (val !== '_') a[index] = val
			return a[index]
		} catch {
			if (getType(a) === 'list' || getType(a) === 'string')
				throw `index ${index} out of range`
			else if (getType(a) === 'map') throw `index ${index} not in map`
			else throw `Can not get index of ${getType(a)}`
		}
	},
	'index',
	false
)
addMtFunction(async (a, start, end) => a.slice(start, end), 'slice', false)
addMtFunction(async (a, b$) => await Promise.all(a.map(b$)), 'map', false)
addMtFunction(async (a, b$) => a.filter(b$), 'filter', false)
addMtFunction(
	async (a, b$, c) =>
		a.reduce((last, current) => {
			let result = b$(current)
			if (getType(last) === 'list') last.push(result)
			else last += result
			return last
		}, c),
	'reduce',
	false
)
//#endregion functions

const shorthands = {
	'+': 'add',
	'-': 'subtract',
	'*': 'multiply',
	'/': 'divide',
	'%': 'modulo',
	'^': 'power',
	'**': 'power',
	'v/': 'sqrt',
	'|.|': 'abs',
	'|v|': 'floor',
	'|^|': 'ceil',
	'|x|': 'round',
	'>': 'greater',
	'<': 'less',
	'>=': 'greaterEqual',
	'<=': 'lessEqual',
	'==': 'equal',
	'!=': 'notEqual',
	'&': 'and',
	'|': 'or',
	'!': 'not',
	'?': 'if',
	'?=': 'while',
	'#-': 'length',
	'|>': 'print',
	'[': '( ; list append',
	',': 'append',
	']': ')',
	'#': 'index',
	'##': 'slice'
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
const removeComments = code =>
	code.replace(/\/\/[^\n]*\n|\/\*(.|\n)*?\*\//g, '')

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
	let data = new CodeData(code)
	let strings = matchRecursive(data.code, '<<', '>>')
	let replaceOffset = 0
	for (const [str, start, end, char] of strings) {
		switch (char) {
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
	let parentheses = matchRecursive(data.code, '\\(|\\{', '\\)|\\}')
	replaceOffset = 0
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
		}
	}
	data.code = data.code.trim()
	return data
}

/**
 * @param {string} text
 * @param {CodeData} data
 * @param {{string:any}} variables
 */
async function parseWord(word, data, variables) {
	if (word.startsWith('(')) {
		let num = word.slice(1, -1)
		let fooTest = await execute(data.innerScopes[num])
		return () => fooTest
	} else if (word.startsWith('{')) {
		let num = word.slice(1, -1)
		return await createComposition(data.codeBlocks[num])
	} else if (word.startsWith('<<')) {
		let num = word.slice(2, -2)
		return data.strings[num]
	} else if (word.startsWith('$')) {
		let f = variables[word.slice(1)]
		if (f == null) throw `undefined variable ${word.slice(1)}`
		return f
	} else if (word.startsWith('=$')) {
		let varName = word.slice(2)
		variables[varName] = { isVariable: true, varName, value: null }
		function varFn(value) {
			variables[varName].value = value
			return () => value
		}
		varFn.len = 1
		return varFn
	} else {
		let f = functions[word]
		if (f) {
			return f
		} else {
			return parseValue(word)
		}
	}
}

async function createComposition(code) {
	const data = replaceBlocks(code)

	const variables = {}

	let words = data.code.split(/\s+/g)
	let callList = []
	let currentCall = []
	let reset = false
	for (let word of words) {
		word = word.trim()
		if (word === ';') {
			reset = true
			continue
		}
		const parsedWord = await parseWord(word, data, variables)
		if (reset) {
			callList.push([parsedWord, [], [word]])
			currentCall = []
			reset = false
			continue
		}
		if (!currentCall.length) {
			currentCall.push(parsedWord, [], [word])
		} else {
			if (currentCall[1].length < currentCall[0].len - 1) {
				currentCall[1].push(parsedWord)
				currentCall[2].push(word)
			}
		}
		if (currentCall[1].length >= currentCall[0].len - 1) {
			callList.push(currentCall)
			currentCall = []
		}
	}
	return async inp => {
		for (let [func, args, words] of callList) {
			if (inp != null) args = [() => inp, ...args]
			inp = await func(
				...args.map(v => {
					if (v.isVariable === true && v.varName) {
						if (v.value == null)
							throw `unassigned variable ${v.varName}`
						return v.value
					} else return v
				})
			)
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
		execute(';' + threadProgram)
			.then(console.log)
			.catch(e => console.error(`error: ${e}`))
	}
}
