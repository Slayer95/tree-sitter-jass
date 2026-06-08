# tree-sitter-jass

A Tree-sitter grammar for the JASS scripting language used by Warcraft III.

## Overview

This package provides a parser for JASS built on top of Tree-sitter.

The grammar aims to parse valid JASS source code into a concrete syntax tree suitable for:

* Syntax highlighting
* Static analysis
* Refactoring tools
* Language servers
* Source code indexing
* Custom tooling

## Scope

This package performs **syntactic parsing only**.

It does **not** perform semantic validation, including:

* Name resolution
* Type checking
* Function signature validation
* Global initialization rules
* Native declaration validation
* Warcraft III API validation
* Compile-time constant evaluation

As a result, some files may parse successfully while still failing compilation in Warcraft III.

## Semantic Validation

If you need semantic validation, symbol resolution, type checking, or linting, see Prism:

* https://github.com/Slayer95/prism

Prism consumes the syntax trees produced by this grammar and performs higher-level analysis.

## Installation

```bash
npm install github:Slayer95/tree-sitter-jass#main
```

## Usage

```javascript
const Parser = require('tree-sitter');
const Jass = require('tree-sitter-jass');

const parser = new Parser();
parser.setLanguage(Jass);

const tree = parser.parse(sourceCode);
```

## Project Repository

The full project repository contains additional tooling and language bindings:

https://github.com/Slayer95/tree-sitter-jass

## License

MIT
