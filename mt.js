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

//#region variables
class Variable {
	constructor(value) {
		this.set(value)
	}
}
class VarNull extends Variable {
	set() {
		this.value = null
	}
}
class VarBool extends Variable {
	set(value) {
		this.value = Boolean(value)
	}
}
class VarInt extends Variable {
	set(value) {
		this.value = Math.round(Number(value))
	}
}
class VarFloat extends Variable {
	set(value) {
		this.value = Number(value)
	}
}
class VarString extends Variable {
	set(value) {
		this.value = value.toString()
	}
}
class VarLambda extends Variable {
	set(value) {
		this.value = value
	}
}
const variableClasses = {
	null: VarNull,
	bool: VarBool,
	int: VarInt,
	float: VarFloat,
	string: VarString,
	lambda: VarLambda
}

function getType(val) {
	return val.constructor.name.slice(3).toLowerCase()
}

function parseVariable(val) {
	if (val.constructor.__proto__ === Variable) return val
	if (val === 'true') return new VarBool(true)
	if (val === 'false') return new VarBool(false)
	if (val === 'null') return new VarNull(null)
	if (!Number.isNaN(Number(val))) {
		const n = Number(val)
		if (n.toFixed() === n.toString()) return new VarInt(n)
		return new VarFloat(n)
	}
	if (val.trim) {
		if (val.trim() === '') return new VarNull(null)
		return new VarString(val)
	}
	return new VarNull(null)
}
//#endregion variables

//#region lambdas
const varsFromNames = (names, vars) =>
	Object.fromEntries(
		names.map(v => [v.split(':')[1] || v, vars[v.split(':')[0] || v]])
	)
const getBlockVars = (data, num) =>
	varsFromNames(data.codeBlocksVars[num] || [], data.variables)
const getScopeVars = (data, num) =>
	data.innerScopesVars[num] !== undefined
		? varsFromNames(data.innerScopesVars[num], data.variables)
		: { ...data.variables }

const codeBlock = (code, vars) => {
	let f = async (i = null, args = {}) =>
		execute(code, i, { variables: { ...vars, ...args, this: f } })
	return new VarLambda(f)
}
//#endregion lambdas

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
		.map(e => e.trim().split('$'))
	const minArgsLen = argsDefs.filter(
		e => !e[0].startsWith('...') && !e[1].startsWith('_')
	).length
	const maxArgsLen = argsDefs[argsDefs.length - 1][0].startsWith('...')
		? null
		: argsDefs.length
	let pipeArgPos = argsDefs.findIndex(e => e[0].startsWith('_'))
	if (pipeArgPos === -1) pipeArgPos = 0
	let [fnName, returns] = name.split('$')
	functions[fnName] = (pipeArg, ...args) => {
		if (pipeArg ?? false) args.splice(pipeArgPos, 0, pipeArg)
		if (returns === '_') returns = getType(args[0])
		if (
			args.length < minArgsLen ||
			(maxArgsLen && args.length > maxArgsLen)
		) {
			throw `${fnName} expects between ${minArgsLen} and ${maxArgsLen} arguments, got ${
				args.length
			}: ${args.slice(0, -1).join(', ')}`
		}
		for (let i = 0; i < args.length; i++) {
			const index = Math.min(i, argsDefs.length - 1)
			if (
				argsDefs[index][1].replace('_', '') !== 'any' &&
				!argsDefs[index][1].split('_').includes(getType(args[index]))
			) {
				throw `${fnName} expects ${
					index === pipeArgPos && pipeArg ? 'piped ' : ''
				}argument [${argsDefs[index][0]
					.replace('...', '')
					.replace('_', '')}] to be of type <${
					argsDefs[index][1]
				}>, got <${getType(args[i])}>:${args[i].value}`
			}
			if (!argsDefs[index][1].endsWith('_')) args[i] = args[i].value
		}
		return fn(...args).then(v =>
			returns ? new variableClasses[returns](v) : v
		)
	}
}
//#region functions
addMtFunction(
	(last$any_, ms$int) =>
		new Promise(resolve => setTimeout(resolve, ms$int, last$any_)),
	'wait'
)
addMtFunction(
	url$string => fetch(url$string).then(res => res.json()),
	'fetch$string'
)
addMtFunction(
	async (a$int_float, b$int_float) => a$int_float + b$int_float,
	'add$_'
)
addMtFunction(
	async (a$int_float, b$int_float) => a$int_float - b$int_float,
	'subtract$_'
)
addMtFunction(
	async (a$int_float, b$int_float) => a$int_float * b$int_float,
	'multiply$_'
)
addMtFunction(
	async (a$int_float, b$int_float) => a$int_float / b$int_float,
	'divide$_'
)
addMtFunction(
	async (a$int_float, b$int_float) => a$int_float % b$int_float,
	'modulo$_'
)
addMtFunction(
	async (a$int_float, b$int_float) => a$int_float ** b$int_float,
	'power$_'
)
addMtFunction(async a$int_float => Math.sqrt(a$int_float), 'sqrt$_')
addMtFunction(async a$int_float => Math.abs(a$int_float), 'abs$_')
addMtFunction(async a$int_float => Math.floor(a$int_float), 'floor$_')
addMtFunction(async a$int_float => Math.ceil(a$int_float), 'ceil$_')
addMtFunction(async a$int_float => Math.round(a$int_float), 'round$_')
addMtFunction(
	async (a$int_float, b$int_float) => a$int_float > b$int_float,
	'greater$bool'
)
addMtFunction(
	async (a$int_float, b$int_float) => a$int_float < b$int_float,
	'less$bool'
)
addMtFunction(
	async (a$int_float, b$int_float) => a$int_float >= b$int_float,
	'greaterEqual$bool'
)
addMtFunction(
	async (a$int_float, b$int_float) => a$int_float <= b$int_float,
	'lessEqual$bool'
)
addMtFunction(async (a$any, b$any) => a$any === b$any, 'equal$bool')
addMtFunction(async (a$any, b$any) => a$any !== b$any, 'notEqual$bool')
addMtFunction(async (a$bool, b$bool) => a$bool && b$bool, 'and$bool')
addMtFunction(async (a$bool, b$bool) => a$bool || b$bool, 'or$bool')
addMtFunction(async a$bool => !a$bool, 'not$bool')
addMtFunction(
	async (a$bool, b$lambda, c$lambda) => (a$bool ? b$lambda() : c$lambda()),
	'if'
)
addMtFunction(async (a$any_, b$lambda, c$lambda) => {
	while ((await b$lambda(a$any_)).value) a$any_ = await c$lambda(a$any_)
	return a$any_.value
}, 'while$_')
addMtFunction(async a$any => getType(a$any), 'type$string')
addMtFunction(async a$any => a$any.length, 'length$int') //TODO specify iterable type
addMtFunction(async (...a$any) => {
	console.log(...a$any)
	return a$any[0]
}, 'print$_')
addMtFunction(
	//TODO variable types separate functions
	async (value$any, set$any, name$string, data$any) => {
		if (!data$any.variables) data$any.variables = {}
		if (set$any) data$any.variables[name$string] = value$any
		if (!data$any.variables[name$string])
			throw `undefined variable: ${name$string}`
		return data$any.variables[name$string]
	},
	'variable$_'
)
addMtFunction(async (...args$any) => args$any, 'list$_', 1)
addMtFunction(
	//TODO specify iterable type
	async (...args$any) => {
		if (args$any.length % 2 === 1)
			return Object.fromEntries(
				args$any.reduce(function (result, value, index, array) {
					if (index % 2 === 0)
						result.push(array.slice(index, index + 2))
					return result
				}, [])
			)
		else throw 'last map key has no value'
	},
	'map$_'
)
addMtFunction(
	//TODO specify iterable type
	async (a$any, index$int, val$_any) => {
		try {
			if (val$_any !== undefined) a$any[index$int] = val$_any
			return a$any[index$int]
		} catch {
			if (getType(a$any) === 'list' || getType(a$any) === 'string')
				throw `index ${index$int} out of range`
			else if (getType(a$any) === 'map')
				throw `index ${index$int} not in map`
			else throw `Can not get index of ${getType(a$any)}`
		}
	},
	'index$_'
)
addMtFunction(
	//TODO specify iterable type
	async (a$any, start$int, end$int) => a$any.slice(start$int, end$int),
	'slice$_'
)
addMtFunction(async (a$any, b$lambda) => a$any.map(b$lambda), 'transform$_') //TODO specify iterable type
addMtFunction(async (a$any, b$lambda) => a$any.filter(b$lambda), 'filter$_') // TODO specify iterable type
addMtFunction(
	async (a$any, b$lambda, c$any) =>
		a$any.reduce((last, current) => {
			let result = b$lambda(current)
			if (getType(last) === 'list') last.push(result)
			else last += result
			return last
		}, c$any),
	'reduce$_'
) // TODO specify iterable type
addMtFunction(
	async (block$lambda, ...input$any_) => block$lambda(...input$any_),
	'execute'
)
//#endregion functions

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
		for (const [str, start, end, char] of parentheses) {
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
		else if (code[atIndex + 1] === ';')
			return execute(code.slice(atIndex + 2), null, data)
		else if (func.trim && func.trim() === '')
			return execute(code.slice(atIndex + 2), input, data)
		else return execute(code.slice(atIndex + 2), parseVariable(func), data)
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
				args[i] = new VarString(data.strings[num])
			} else args[i] = parseVariable(args[i])
		} else args[i] = parseVariable(args[i])
	}
	let cbf
	if (code[atIndex + 1] === ';')
		cbf = v => execute(code.slice(atIndex + 2), null, data)
	else cbf = v => execute(code.slice(atIndex + 2), v, data)
	return f(input, ...args)
		.then(res => (typeof res === 'function' ? res(data) : res))
		.then(cbf)
		.catch(e => {
			throw e + '\nat:\t' + code.trim()
		})
}

window.onload = function () {
	let text = Object.values(
		document.querySelectorAll('script[type="text/mt"]')
	)
		.map(el => removeComments(el.textContent))
		.map(el => resolveShorthands(el))
		.join('\n\n')
	let threadPrograms = text.split('\n\n')
	for (let threadProgram of threadPrograms) {
		if (!threadProgram.trim()) continue
		execute(threadProgram)
			.then(r => console.log(r.value))
			.catch(e => console.error(`error: ${e}`))
	}
}
