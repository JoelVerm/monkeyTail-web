# MonkeyTail web

MonkeyTail web is a smart asynchronous programming language, powered by JavaScript.

## Documentation

### **Getting started**

Make a simple HTML file that includes `mt.js` and write your MonkeyTail script in between `script` tags with the type set to `"text/mt"` :

```html
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<script src="mt.js" defer></script>
		<title>MonkeyTail web demo</title>
	</head>
	<body>
		<script type="text/mt">
			5 * 8
		</script>
	</body>
</html>
```

Look at the console for the output of your scripts.

### **Functional**

MonkeyTail web is functional in that every operation is a function. You pass values between functions using the `@` symbol like this:

```mt
5 @ add 3 @ divide 2
```

You use the `;` symbol to end the function chain and start a new one:

```mt
5 @ add 3 @ divide 2 ; 3 @ add 8 //will return 11
```

### **Operators**

Being functional also means that MonkeyTail has no operators like `*`, but converts them to functions. This behavior is named 'shorthand resolving'. The following list describes the meaning of all shorthands:

- `'+'`: add
- `'-'`: subtract
- `'*'`: multiply
- `'/'`: divide
- `'%'`: modulo
- `'^'`: power
- `'**'`: power
- `'>'`: greater than
- `'<'`: less than
- `'>='`: greater than or equal
- `'<='`: less than or equal
- `'=='`: equal
- `'!='`: not equal
- `'&'`: and
- `'|'`: or
- `'!'`: not
- `'?'`: if (explained below)
- `'<$>'`: set and get a variable
- `'$>'`: only get a variable
- `'>N'`: convert to a number
- `'>S'`: convert to a string
- `'>B'`: convert to a boolean
- `'>L'`: convert to a list
- `'>M'`: convert to a map
- `'>D'`: convert to a date
- `'>R'`: convert to a regex
- `'#'`: get value of index of string, list or map
- `'##'`: slice (get string of list values between indexes)
- `'->'`: execute a lambda

### **Strings**

Strings are defined by using `<<` and `>>`:

```mt
<<mt web is great!>> @ print // will print mt web is great!
```

### **Scopes**

Code between parentheses `()` is executed first, like in most programming languages. For example:

```mt
5 * (3 + 8)
```

But because all operators are functions, this would produce a mathematically wrong answer:

```mt
2 + 3 * 4 // will return 20
```

You instead have to write this:

```mt
2 + (3 * 4) // will return 14
```

#### *Scoped variables*

When you set a variable like this:

```mt
5 <$> myNumber
```

it is bound to the current scope. Inner scopes can use them too, but you can also choose which variables an inner scope can access by using `[]` :

```mt
5 <$> myNumber ; [myNumber](myNumber * 3) // will return 15
```

If you use `[]` but do not specify variable names, the inner scope will not have access to any outer variable:

```mt
5 <$> myNumber ; [](myNumber * 3) // will throw an error
```

If you do not use `[]`, inner scopes will have access to all outer variables:

```mt
5 <$> myNumber ; (myNumber * 3) // will return 15
```

### **Code blocks**

Code blocks work like scopes, but are defined using `{}`. You can directly execute a code block using the `->` operator, or save it to a variable. Blocks do not automatically have access to outer variables, but you can still import them using `[]`:

```mt
5 <$> myNumber ; [myNumber]{ + myNumber * 3} -> 2
// will return 2 + 5 * 3 = 21 in MonkeyTail
```

As you can see, you can pass an argument to execute a block. Inside the block, that argument is passed as start of the function chain.

Variables are imported when a block is defined, not when it is executed.

### **If statement**

If statements look like this:

```mt
5 < 8 ? {3 * 2} {4 + 1}
```

The boolean result of `<` is passed to the `?` operator, the 'if statement' in MonkeyTail. If the boolean is true, then the first code block (the second argument) is executed. If the boolean is false, then the second code block (the third argument) is executed.

## Inner details

### **Shorthand equivalent code**

The following list contains all shorthands and their equivalent code:

- `'+': '@ add'`
- `'-': '@ subtract'`
- `'*': '@ multiply'`
- `'/': '@ divide'`
- `'%': '@ modulo'`
- `'^': '@ power'`
- `'**': '@ power'`
- `'>': '@ greater'`
- `'<': '@ less'`
- `'>=': '@ greaterEqual'`
- `'<=': '@ lessEqual'`
- `'==': '@ equal'`
- `'!=': '@ notEqual'`
- `'&': '@ and'`
- `'|': '@ or'`
- `'!': '@ not'`
- `'?': '@ if'`
- `'<$>': '@ variable true'`
- `'$>': '; variable null false'`
- `'>N': '@ convert number'`
- `'>S': '@ convert string'`
- `'>B': '@ convert boolean'`
- `'>L': '@ convert list'`
- `'>M': '@ convert map'`
- `'>D': '@ convert date'`
- `'>R': '@ convert regex'`
- `'#': '@ index'`
- `'##': '@ slice'`
- `'->': '@ execute`

### **All functions**

These are all functions, with argument types, return type and explanation:

- `wait any number : any` :&nbsp; wait specified time in milliseconds and return first argument
- `fetch string : map` :&nbsp; fetch json from uri
- `add any any : any` :&nbsp; add the two arguments
- `subtract number number : number` :&nbsp; subtract arg 2 from arg 1
- `multiply number number : number` :&nbsp; multiply the two arguments
- `divide number number : number` :&nbsp; divide arg 1 by arg 2
- `modulo number number : number` :&nbsp; modulo arg 1 by arg 2
- `power number number : number` :&nbsp; arg 1 to the power of arg 2
- `sqrt number : number` :&nbsp; square root of argument
- `abs number : number` :&nbsp; absolute value of argument
- `floor number : number` :&nbsp; round argument down to integer
- `ceil number : number` :&nbsp; round argument up to integer
- `round number : number` :&nbsp; round argument to nearest integer
- `greater number number : boolean` :&nbsp; is a greater than b
- `less number number : boolean` :&nbsp; is a less than b
- `greaterEqual number number : boolean` :&nbsp; is a greater than or equal to b
- `lessEqual number number : boolean` :&nbsp; is a less than or equal to b
- `equal any any : boolean` :&nbsp; is a equal to b
- `notEqual any any : boolean` :&nbsp; is a not equal to b
- `and : boolean boolean : boolean` :&nbsp; are a and b true
- `or boolean boolean : boolean` :&nbsp; is a or b true
- `not boolean : boolean` :&nbsp; is the argument false
- `if boolean block block : any` :&nbsp; if statement (explained above)
- `type any : string` :&nbsp; type of argument
- `length any : number` :&nbsp; length of argument (string or list)
- `print ...any : any` :&nbsp; print all arguments and return first argument
- `convert any string : any` :&nbsp; convert argument to type
- `variable any boolean string` :&nbsp; if boolean is true, set variable to first argument. Return variable with last argument as name
- `list ...any : list` :&nbsp; convert arguments to list
- `map ...any : map` :&nbsp; convert argument key value pairs to map
- `getIndex any any : any` :&nbsp; get value at index
- `slice` :&nbsp; get value of index of string, list or map
- `execute` :&nbsp; execute a lambda
