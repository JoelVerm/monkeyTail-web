// code modified from:
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



		let text = Object.values(document.querySelectorAll('script[type="text/mt"]'))
		.map((el) => el.textContent)
		.join("\n\n");

		const functions = {
			wait: (last, ms) => new Promise((resolve) => setTimeout(resolve, ms, last)),
			fetch: (url) => fetch(url).then((res) => res.json()),
			add: (a, b) => Promise.resolve(a + b),
			subtract: (a, b) => Promise.resolve(a - b),
			multiply: (a, b) => Promise.resolve(a * b),
			divide: (a, b) => Promise.resolve(a / b),
		};
		const shorthands = {
			"+": "@ add",
			"-": "@ subtract",
			"*": "@ multiply",
			"/": "@ divide",
		}
		function resolveShorthands(code) {
			for (let [shorthand, command] of Object.entries(shorthands)) {
				code = code.replace(new RegExp(` \\${shorthand} `, "g"), ` ${command} `);
			}
			return code;
		}

		let threadPrograms = text.split("\n\n");

		async function execute(code, input = null) {
			if (!code) return input;

			let parentheses = matchRecursive(code, '(<', ')>');
            let innerScopes = []
            let strings = []
			for (const tuple of parentheses) {
				let [str, start, end, char] = tuple;
                if (char === ')') {
                    code =
                        `${code.substring(0, start)}${innerScopes.length}${code.substring(end)};`
                    innerScopes.push(await execute(str));
                }
                console.log(input);
                console.log(code);
                console.log(innerScopes);
                console.log("");
			}

			let atIndex = code.search(/ @ /);
			if (atIndex === -1) atIndex = code.length;
			let thisStatement = code.slice(0, atIndex).trim();
			let [func, ...args] = thisStatement.split(" ");
			let f = functions[func];
			if (!f) {
				if (args.length) throw `error: undefined function ${func}`;
				else return execute(code.slice(atIndex + 3), func);
			}
            for (const i in args) {
                if (args[i].startsWith('('))
                    args[i] = innerScopes[args[i][1]]
            }
			return await f(input, ...args)
			.then((v) => execute(code.slice(atIndex + 3), v))
			.catch((e) => {
				throw `error: ${e}`;
			});
		}

		for (let threadProgram of threadPrograms) {
			threadProgram = resolveShorthands(threadProgram)
			execute(threadProgram).then(console.log).catch(console.error);
		}
