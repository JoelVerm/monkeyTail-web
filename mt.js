// function modified from:
// https://blog.stevenlevithan.com/archives/javascript-match-nested
// use as: matchRecursive('a(b)c(d(e)f)g', '(', ')')
// returns: [['b', 2, 3], ['d(e)f', 6, 11]]

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

function getType(val) {
	if (typeof val === 'string') return 'string'
	else if (typeof val === 'number') return 'number'
	else if (typeof val === 'boolean') return 'boolean'
	else if (Array.isArray(val)) return 'list'
	else if (val instanceof Date) return 'date'
	else if (val instanceof RegExp) return 'regex'
	else if (val instanceof Function) return 'block'
	else if (typeof val === 'object') return 'map'
	else throw `type ${typeof val} of ${val} is not implemented`
}
function typeConvert(val) {
	if (val === 'true') return true
	if (val === 'false') return false
	if (val === 'null') return null
	if (val.trim && val.trim() === '') return val
	if (!Number.isNaN(Number(val))) return Number(val)
	return val
}
const varsFromNames = (names, vars) =>
	Object.fromEntries(names.map(v => [(v.split(':')[1] || v), vars[(v.split(':')[0] || v)]]))
const getBlockVars = (data, num) =>
	varsFromNames(data.codeBlocksVars[num] || [], data.variables)
const getScopeVars = (data, num) =>
	data.innerScopesVars[num] !== undefined
		? varsFromNames(data.innerScopesVars[num], data.variables)
		: { ...data.variables }

const codeBlock = (code, vars) => {
	let f = async (i = null) =>
		execute(code, i, { variables: { ...vars, this: f } })
	return f
}

function c(fn, name, ...argTypes) {
	return (...args) => {
		if (typeof argTypes[0] === 'number') {
			if ((args.length - 1) % argTypes[0] !== 0) {
				throw `${name} expects argument pairs of ${argTypes[0]} arguments`
			}
		} else {
			if (!(args.length -1 <= argTypes.length && args.length - 1 >= argTypes.filter(a => !a.startsWith('?')).length)) {
				throw `${name} expects ${argTypes.length} arguments, got ${
					args.length - 1
				}: [ ${args.slice(0, -1).join(', ')} ]`
			}
			for (let i = 0; i < args.length - 1; i++) {
				if (
					argTypes[i].replace('?', '') !== 'any' &&
					getType(args[i]) !== argTypes[i].replace('?', '')
				) {
					throw `${name} expects argument ${i} to be of type ${
						argTypes[i]
					}, got ${getType(args[i])}`
				}
			}
		}
		return fn(...args)
	}
}
let functions = {
	wait: c(
		(last, ms) => new Promise(resolve => setTimeout(resolve, ms, last)),
		'wait',
		'any',
		'number'
	),
	fetch: c(url => fetch(url).then(res => res.json()), 'fetch', 'string'),
	add: c(async (a, b) => a + b, 'add', 'any', 'any'),
	subtract: c(async (a, b) => a - b, 'subtract', 'any', 'any'),
	multiply: c(async (a, b) => a * b, 'multiply', 'any', 'any'),
	divide: c(async (a, b) => a / b, 'divide', 'any', 'any'),
	modulo: c(async (a, b) => a % b, 'modulo', 'any', 'any'),
	power: c(async (a, b) => a ** b, 'power', 'any', 'any'),
	sqrt: c(async a => Math.sqrt(a), 'sqrt', 'any'),
	abs: c(async a => Math.abs(a), 'abs', 'any'),
	floor: c(async a => Math.floor(a), 'floor', 'any'),
	ceil: c(async a => Math.ceil(a), 'ceil', 'any'),
	round: c(async a => Math.round(a), 'round', 'any'),
	greater: c(async (a, b) => a > b, 'greater', 'any', 'any'),
	less: c(async (a, b) => a < b, 'less', 'any', 'any'),
	greaterEqual: c(async (a, b) => a >= b, 'greaterEqual', 'any', 'any'),
	lessEqual: c(async (a, b) => a <= b, 'lessEqual', 'any', 'any'),
	equal: c(async (a, b) => a === b, 'equal', 'any', 'any'),
	notEqual: c(async (a, b) => a !== b, 'notEqual', 'any', 'any'),
	and: c(async (a, b) => a && b, 'and', 'any', 'any'),
	or: c(async (a, b) => a || b, 'or', 'any', 'any'),
	not: c(async a => !a, 'not', 'any'),
	if: c(async (a, b, c) => (a ? b() : c()), 'if', 'any', 'block', 'block'),
	while: c(
		async (a, b, c) => {
			while (await b(a)) a = await c(a)
			return a
		},
		'while',
		'any',
		'block',
		'block'
	),
	type: c(async a => getType(a), 'type', 'any'),
	length: c(async a => a.length, 'length', 'any'),
	print: c(
		async (...a) => {
			console.log(...a.slice(0, -1))
			return a[0]
		},
		'print',
		1
	),
	convert: c(
		async (value, to) => {
			try {
				switch (to) {
					case 'number':
						return Number(value)
					case 'string':
						return String(value)
					case 'boolean':
						return Boolean(value)
					case 'list':
						return Array.isArray(value) ? value : [value]
					case 'map':
						return typeof value === 'object' ? value : { value }
					case 'date':
						return new Date(value)
					case 'regex':
						return new RegExp(value)
					default:
						throw `invalid conversion type: ${to}`
				}
			} catch {
				throw `can not convert ${value} to ${to}`
			}
		},
		'convert',
		'any',
		'string'
	),
	variable: c(
		async (value, set, name, data) => {
			if (!data.variables) data.variables = {}
			if (set) data.variables[name] = value
			if (!data.variables[name]) throw `undefined variable: ${name}`
			return data.variables[name]
		},
		'variable',
		'any',
		'boolean',
		'string'
	),
	list: c(async (...args) => [...args.slice(0, -1)], 'list', 1),
	map: c(
		async (...args) => {
			if (args.length % 2 === 1)
				return Object.fromEntries(
					args
						.slice(0, -1)
						.reduce(function (result, value, index, array) {
							if (index % 2 === 0)
								result.push(array.slice(index, index + 2))
							return result
						}, [])
				)
			else throw 'last map key has no value'
		},
		'map',
		2
	),
	index: c(
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
		'index',
		'any',
		'any',
		'?any'
	),
	slice: c(
		async (a, start, end) => a.slice(start, end),
		'slice',
		'any',
		'number',
		'number'
	),
	transform: c(async (a, b) => a.map(b), 'transform', 'any', 'block'),
	filter: c(async (a, b) => a.filter(b), 'filter', 'any', 'block'),
	reduce: c(async (a, b, c) => a.reduce((last, current) => {
		let result = b(current)
		if (getType(last) === 'list') last.push(result)
		else last += result
		return last
	}, c), 'reduce', 'any', 'block', 'any'),
	execute: c(async (block, ...input) => block(...input), 'execute', 1)
}
const shorthands = {
	'+': '@ add',
	'-': '@ subtract',
	'*': '@ multiply',
	'/': '@ divide',
	'%': '@ modulo',
	'^': '@ power',
	'**': '@ power',
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
	'<$>': '@ variable true',
	'$>': '; variable null false',
	'>N': '@ convert number',
	'>S': '@ convert string',
	'>B': '@ convert boolean',
	'>L': '@ convert list',
	'>M': '@ convert map',
	'>D': '@ convert date',
	'>R': '@ convert regex',
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
const removeComments = code => code.replace(/\/\/.*|\/\*(.|\s)*\*\//g, '')

async function execute(code, input = null, data = null) {
	if (!code) return input

	if (!data || !data.innerScopes || !data.strings) {
		let parentheses = matchRecursive(
			code,
			'\\(|<<|\\[|\\{',
			'\\)|>>|\\]|\\}'
		)
		let replaceOffset = 0
		let innerScopes = []
		let innerScopesVars = {}
		let codeBlocks = []
		let codeBlocksVars = {}
		let strings = []
		for (const tuple of parentheses) {
			let [str, start, end, char] = tuple

			if (char === ']') {
				let type = code[end + replaceOffset + 1]
				if (type === '(')
					innerScopesVars[innerScopes.length] = str.split(/\s+/)
				else if (type === '{')
					codeBlocksVars[codeBlocks.length] = str.split(/\s+/)
				else
					throw `square brackets must be followed by a scope or code block`
				code =
					code.substring(0, start + replaceOffset - 1) +
					code.substring(end + replaceOffset + 1)
				replaceOffset -= str.length + 2
			}
			if (char === ')') {
				code = `${code.substring(0, start + replaceOffset)}${
					innerScopes.length
				}${code.substring(end + replaceOffset)}`
				innerScopes.push(str)
				replaceOffset -=
					str.length - innerScopes.length.toString().length
			}
			if (char === '}') {
				code = `${code.substring(0, start + replaceOffset)}${
					codeBlocks.length
				}${code.substring(end + replaceOffset)}`
				codeBlocks.push(str)
				replaceOffset -=
					str.length - codeBlocks.length.toString().length
			}
			if (char === '>>') {
				code = `${code.substring(0, start + replaceOffset)}${
					strings.length
				}${code.substring(end + replaceOffset)}`
				strings.push(str)
				replaceOffset -= str.length - strings.length.toString().length
			}
		}
		data = {
			variables: {},
			...data,
			innerScopes: innerScopes,
			innerScopesVars: innerScopesVars,
			codeBlocks: codeBlocks,
			codeBlocksVars: codeBlocksVars,
			strings: strings
		}
	}

	let atIndex = code.search(/\s[@;]\s/)
	if (atIndex === -1) atIndex = code.length
	let thisStatement = code.slice(0, atIndex).trim()
	let [func, ...args] = thisStatement.split(/\s+/)
	try {
		func = typeConvert(func)
	} catch {}
	if (typeof func === 'string') {
		if (func.startsWith('(')) {
			let num = func.slice(1, -1)
			func = await execute(data.innerScopes[num], null, {
				variables: getScopeVars(data, num)
			})
		} else if (func.startsWith('{')) {
			let num = func.slice(1, -1)
			func = codeBlock(data.codeBlocks[num], getBlockVars(data, num))
		} else if (func.startsWith('<<')) {
			let num = func.slice(2, -2)
			func = data.strings[num]
			func.variables = getBlockVars(data, num)
		}
	}
	let f = functions[func]
	if (!f) {
		if (args.length) throw `error: undefined function ${func}`
		else if (code[atIndex + 1] === ';') return execute(code.slice(atIndex + 2), null, data)
		else if (func.trim && func.trim() === '')
			return execute(code.slice(atIndex + 2), input, data)
		else return execute(code.slice(atIndex + 2), func, data)
	}
	for (const i in args) {
		if (typeof args[i] === 'string') {
			if (args[i].startsWith('(')) {
				let num = args[i].slice(1, -1)
				args[i] = await execute(data.innerScopes[num], null, {
					variables: getScopeVars(data, num)
				})
			} else if (args[i].startsWith('{')) {
				let num = args[i].slice(1, -1)
				args[i] = codeBlock(
					data.codeBlocks[num],
					getBlockVars(data, num)
				)
			} else if (args[i].startsWith('<<')) {
				let num = args[i].slice(2, -2)
				args[i] = data.strings[num]
			}
		}
		args[i] = typeConvert(args[i])
	}
	let cbf
	if (code[atIndex + 1] === ';')
		cbf = v => execute(code.slice(atIndex + 2), null, data)
	else cbf = v => execute(code.slice(atIndex + 2), v, data)
	if (input === null)
		return f(...args, data)
			.then(cbf)
			.catch(e => {
				throw e + '\nat:\t' + code.trim()
			})
	else
		return f(input, ...args, data)
			.then(cbf)
			.catch(e => {
				throw e + '\nat:\t' + code.trim()
			})
}

window.onload = function() {
	let text = Object.values(
		document.querySelectorAll('script[type="text/mt"]')
	)
		.map(el => removeComments(el.textContent))
		.join('\n\n')
	let threadPrograms = text.split('\n\n')
	for (let threadProgram of threadPrograms) {
		threadProgram = resolveShorthands(threadProgram)
		execute(threadProgram)
			.then(console.log)
			.catch(e => console.error(`error: ${e}`))
	}
}
