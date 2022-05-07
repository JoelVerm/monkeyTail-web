let text = Object.values(document.querySelectorAll('script[type="text/mt"]'))
    .map((el) => el.textContent)
    .join("\n\n")

const functions = {
    'wait': (last, ms) => new Promise(resolve => setTimeout(resolve, ms, last)),
    'fetch': url => fetch(url).then(res => res.json()),

}

let threadPrograms = text.split('\n\n')

async function execute(code, input = null) {
    if (!code) return input
    let atIndex = code.search(/ @ /);
    if (atIndex === -1) atIndex = code.length;
    let thisStatement = code.slice(0, atIndex).trim();
    let [func, ...args] = thisStatement.split(" ");
    let f = functions[func];
    if (!f) {
        if (args.length)
            throw `error: undefined function ${func}`;
        else
            return execute(code.slice(atIndex + 3), func);
    }
    return await f(input, ...args)
      .then((v) => execute(code.slice(atIndex + 3), v))
      .catch((e) => {
        throw `error: ${e}`
      });
}

for (const threadProgram of threadPrograms) {
    execute(threadProgram).then(console.log).catch(console.error)
}

// code from:
// https://blog.stevenlevithan.com/archives/javascript-match-nested
// use as: matchRecursive('a(b)c(d(e)f)g', '(...)')
// returns: ['b', 'd(e)f']

var matchRecursive = (function () {
  var formatParts = /^([\S\s]+?)\.\.\.([\S\s]+)/,
    metaChar = /[-[\]{}()*+?.\\^$|,]/g,
    escape = function (str) {
      return str.replace(metaChar, "\\$&");
    };

  return function (str, format) {
    var p = formatParts.exec(format);
    if (!p)
      throw new Error(
        "format must include start and end tokens separated by '...'"
      );
    if (p[1] == p[2])
      throw new Error("start and end format tokens cannot be identical");

    var opener = p[1],
      closer = p[2],
      /* Use an optimized regex when opener and closer are one character each */
      iterator = new RegExp(
        format.length == 5
          ? "[" + escape(opener + closer) + "]"
          : escape(opener) + "|" + escape(closer),
        "g"
      ),
      results = [],
      openTokens,
      matchStartIndex,
      match;

    do {
      openTokens = 0;
      while ((match = iterator.exec(str))) {
        if (match[0] == opener) {
          if (!openTokens) matchStartIndex = iterator.lastIndex;
          openTokens++;
        } else if (openTokens) {
          openTokens--;
          if (!openTokens)
            results.push(str.slice(matchStartIndex, match.index));
        }
      }
    } while (openTokens && (iterator.lastIndex = matchStartIndex));

    return results;
  };
})();
