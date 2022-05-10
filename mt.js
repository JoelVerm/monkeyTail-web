// function modified from:
// https://blog.stevenlevithan.com/archives/javascript-match-nested
// use as: matchRecursive('a(b)c(d(e)f)g', '(...)')
// returns: [['b', 2, 3], ['d(e)f', 6, 11]]

let matchRecursive = (function () {
	const formatParts = /^([\S\s]+?)\.\.\.([\S\s]+)/,
	metaChar = /[-[\]{}()*+?.\\^$|,]/g,
	escape = function (str) {
		return str.replace(metaChar, "\\$&");
	};

	return function (str, opener, closer) {
		let openRE = new RegExp(`[${escape(opener)}]`),
		iterator = new RegExp(`[${escape(opener)}${escape(closer)}]`, "g"),
		results = [],
		openTokens,
		matchStartIndex,
		match;

		do {
			openTokens = 0;
			while ((match = iterator.exec(str))) {
				if (openRE.exec(match[0])) {
					if (!openTokens) matchStartIndex = iterator.lastIndex;
					openTokens++;
				} else if (openTokens) {
					openTokens--;
					if (!openTokens)
					results.push([
						str.slice(matchStartIndex, match.index),
						matchStartIndex,
						match.index,
						match[0],
					]);
				}
			}
		} while (openTokens && (iterator.lastIndex = matchStartIndex));

		return results;
	};
})();



function getType(val) {
  if (typeof val === "string") return "string";
  else if (typeof val === "number") return "number";
  else if (typeof val === "boolean") return "boolean";
  else if (Array.isArray(val)) return "list";
  else if (val instanceof Date) return "date";
  else if (val instanceof RegExp) return "regex";
  else if (typeof val === "object") return "map";
  else throw `type ${typeof val} of ${val} is not implemented`;
}
function typeConvert(val) {
  if (val === "true") return true;
  if (val === "false") return false;
  if (!Number.isNaN(Number(val))) return Number(val);
  return val;
}

let text = Object.values(document.querySelectorAll('script[type="text/mt"]'))
.map((el) => el.textContent)
.join("\n\n");

function c (fn, name, ...argTypes) {
	return (...args) => {
		if (typeof argTypes[0] === 'number') {
			if ((args.length - 1) % argTypes[0] !== 0) {
				throw `${name} expects argument pairs of ${argTypes[0]} arguments`
			}
		} else {
			if (args.length !== argTypes.length + 1) {
				throw `${name} expects ${argTypes.length} arguments, got ${args.length}`
			}
			for (let i = 0; i < args.length - 1; i++) {
				if (argTypes[i] !== 'any' && getType(args[i]) !== argTypes[i]) {
					throw `${name} expects argument ${i} to be of type ${argTypes[i]}, got ${getType(args[i])}`
				}
			}
		}
		return fn(...args);
	}
}
const functions = {
	wait: c((last, ms) => new Promise((resolve) => setTimeout(resolve, ms, last)),'wait', 'any', 'number'),
	fetch: c((url) => fetch(url).then((res) => res.json()), 'fetch', 'string'),
	add: c(async (a, b) => a + b, 'add', 'any', 'any'),
	subtract: c(async (a, b) => a - b, 'subtract', 'any', 'any'),
	multiply: c(async (a, b) => a * b, 'multiply', 'any', 'any'),
	divide: c(async (a, b) => a / b, 'divide', 'any', 'any'),
	type: c(async (a) => getType(a), 'type', 'any'),
	length: c(async (a) => a.length, 'length', 'any'),
	print: c(async (a) => {console.log(a); return a}, 'print', 'any'),
	convert: c(async (value, to) => {
		try {
			switch (to) {
				case "number": return Number(value);
				case "string": return String(value);
				case "boolean": return Boolean(value);
				case "list": return Array.isArray(value) ? value : [value];
				case "map": return typeof value === "object" ? value : {value};
				case "date": return new Date(value);
				case "regex": return new RegExp(value);
				default: throw `invalid conversion type: ${to}`;
			}
		} catch {
			throw `can not convert ${value} to ${to}`;
		}
	}, 'convert', 'any', 'string'),
	variable: c(async (value, setType, getType, name, data) => {
		if (!data.variables) data.variables = {};
		if (setType) {
			data.variables[name] = await functions.convert(value, setType, data);
		}
		if (!data.variables[name]) throw `undefined variable: ${name}`;
		return await functions.convert(data.variables[name], getType, data);
	}, 'variable', 'any', 'string', 'string', 'string'),
	list: c(async (...args) =>([...args.slice(0, -1)]), 'list', 1),
	map: c(async (...args) => {
		if(args.length % 2 === 1)
			return Object.fromEntries(args.slice(0, -1).reduce(function(result, value, index, array) {
			if (index % 2 === 0)
				result.push(array.slice(index, index + 2));
			return result;
		}, []))
		else
			throw 'last map key has no value'
	}, 'map', 2),
};
const shorthands = {
	"+": "@ add",
	"-": "@ subtract",
	"*": "@ multiply",
	"/": "@ divide",
	"$>N": "@ variable false number",
	"$>S": "@ variable false string",
	"$>B": "@ variable false boolean",
	"$>L": "@ variable false list",
	"$>M": "@ variable false map",
	"$>D": "@ variable false date",
	"$>R": "@ variable false regex",
	"$NN": "@ variable number number",
	"$NS": "@ variable number string",
	"$NB": "@ variable number boolean",
	"$NL": "@ variable number list",
	"$NM": "@ variable number map",
	"$ND": "@ variable number date",
	"$NR": "@ variable number regex",
	"$SN": "@ variable string number",
	"$SS": "@ variable string string",
	"$SB": "@ variable string boolean",
	"$SL": "@ variable string list",
	"$SM": "@ variable string map",
	"$SD": "@ variable string date",
	"$SR": "@ variable string regex",
	"$BN": "@ variable boolean number",
	"$BS": "@ variable boolean string",
	"$BB": "@ variable boolean boolean",
	"$BL": "@ variable boolean list",
	"$BM": "@ variable boolean map",
	"$BD": "@ variable boolean date",
	"$BR": "@ variable boolean regex",
	"$LN": "@ variable list number",
	"$LS": "@ variable list string",
	"$LB": "@ variable list boolean",
	"$LL": "@ variable list list",
	"$LM": "@ variable list map",
	"$LD": "@ variable list date",
	"$LR": "@ variable list regex",
	"$MN": "@ variable map number",
	"$MS": "@ variable map string",
	"$MB": "@ variable map boolean",
	"$ML": "@ variable map list",
	"$MM": "@ variable map map",
	"$MD": "@ variable map date",
	"$MR": "@ variable map regex",
	"$DN": "@ variable date number",
	"$DS": "@ variable date string",
	"$DB": "@ variable date boolean",
	"$DL": "@ variable date list",
	"$DM": "@ variable date map",
	"$DD": "@ variable date date",
	"$DR": "@ variable date regex",
	"$RN": "@ variable regex number",
	"$RS": "@ variable regex string",
	"$RB": "@ variable regex boolean",
	"$RL": "@ variable regex list",
	"$RM": "@ variable regex map",
	"$RD": "@ variable regex date",
	"$RR": "@ variable regex regex",
	">N": "@ convert number",
	">S": "@ convert string",
	">B": "@ convert boolean",
	">L": "@ convert list",
	">M": "@ convert map",
	">D": "@ convert date",
	">R": "@ convert regex",
}
function resolveShorthands(code) {
	for (let [shorthand, command] of Object.entries(shorthands)) {
		code = code.replace(new RegExp(` \\${shorthand} `, "g"), ` ${command} `);
	}
	return code;
}

let threadPrograms = text.split("\n\n");

async function execute(code, input = null, data = null) {
	if (!code) return input;

	if (!data) {
		let parentheses = matchRecursive(code, "(<", ")>");
		let replaceOffset = 0;
		let innerScopes = [];
		let strings = [];
		for (const tuple of parentheses) {
			let [str, start, end, char] = tuple;
			if (char === ")") {
				code = `${code.substring(0, start + replaceOffset)}${
					innerScopes.length
				}${code.substring(end + replaceOffset)}`;
				innerScopes.push(await execute(str));
				replaceOffset -= str.length - innerScopes.length.toString().length;
			}
			if (char === ">") {
				code = `${code.substring(0, start + replaceOffset)}${
					strings.length
				}${code.substring(end + replaceOffset)}`;
				strings.push(str);
				replaceOffset -= str.length - strings.length.toString().length;
			}
		}
		data = { innerScopes: innerScopes, strings: strings };
	}
	let innerScopes = data.innerScopes,
	strings = data.strings

	let atIndex = code.search(/ @ /);
	if (atIndex === -1) atIndex = code.length;
	let thisStatement = code.slice(0, atIndex).trim();
	let [func, ...args] = thisStatement.split(" ");
	if (typeof func === "string") {
		if (func.startsWith("(")) func = innerScopes[func.slice(1, -1)];
		else if (func.startsWith("<")) func = strings[func.slice(1, -1)];
	}
	try {
		func = typeConvert(func);
	} catch {}
	let f = functions[func];
	if (!f) {
		if (args.length) throw `error: undefined function ${func}`;
		else return execute(code.slice(atIndex + 3), func, data);
	}
	for (const i in args) {
		if (typeof args[i] === "string") {
			if (args[i].startsWith("(")) args[i] = innerScopes[args[i].slice(1, -1)];
			else if (args[i].startsWith("<")) args[i] = strings[args[i].slice(1, -1)];
    	}
		args[i] = typeConvert(args[i]);
	}
	if (input === null)
		return f(...args, data)
		.then((v) => execute(code.slice(atIndex + 3), v, data))
	else
		return f(input, ...args, data)
		.then((v) => execute(code.slice(atIndex + 3), v, data))
}

for (let threadProgram of threadPrograms) {
	threadProgram = resolveShorthands(threadProgram)
	execute(threadProgram).then(console.log).catch(e => console.error(`error: ${e}`));
}
