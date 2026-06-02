"use strict";

/**
 * @file Parser for the JASS2 language
 * @author Leonardo Julca <ivojulca@gmail.com>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const PRECEDENCES = {
    'and': 1,
	'or': 2,
	'==': 10,
	'!=': 10,
	'<': 15,
	'>': 15,
	'<=': 15,
	'>=': 15,
	'+': 20,
	'-': 20,
	'*': 21,
	'/': 21,
	'not': 30,
	'neg': 30,
	'pos': 30,
}

const binaryOperators = [
	'and', 'or', '==', '!=', '<', '>', '<=', '>=', '+', '-', '*', '/',
];

function repeat1WithDelimiter(nodeTypes, arg, delim) {
	return seq(nodeTypes[arg], repeat(seq(delim, nodeTypes[arg])));
}

function makeBinaryExpressionRule(operator) {
	return prec.left(PRECEDENCES[operator], seq(this.Expression, field('operator', alias(operator, this.Operator)), this.Expression));
}

const helpers = {
	AnyStatementsOrNewLines(nodeTypes) {
		return repeat(choice(
			seq(nodeTypes.Statement, nodeTypes.NewLine),
			nodeTypes.NewLine,
		));
	},
};

module.exports = grammar({
	name: 'jass',

	extras(nodeTypes) {
		return [
			/ |\t/,
			nodeTypes.Comment,
		];
	},

	word(nodeTypes) {
		return nodeTypes.Identifier;
	},

	inline(nodeTypes) {
		return [
			nodeTypes.TopLevel,
			nodeTypes.Statement,
			nodeTypes.Binding,
			nodeTypes.Expression,
			nodeTypes.PrimaryExpression,
			nodeTypes.UnaryExpression,
			//nodeTypes.BinaryExpression,
			nodeTypes.Integer,
		];
	},

	conflicts(nodeTypes) {
		return [
			[nodeTypes.FunctionBody],
		];
	},

	rules: {
		program(nodeTypes) {
			return seq(
				repeat(choice(
					seq(nodeTypes.TopLevel, nodeTypes.NewLine),
					nodeTypes.NewLine,
				)),
				optional(nodeTypes.TopLevel),
			);
		},

		NewLine() {
			return /\r|\r?\n/;
		},

		Identifier() {
			return /[a-zA-Z]([a-zA-Z0-9_]*)/;
		},

		AtomicType(nodeTypes) {
			return nodeTypes.Identifier;
		},

		ArrayType(nodeTypes) {
			return seq(nodeTypes.Identifier, 'array');
		},

		Type(nodeTypes) {
			return choice(nodeTypes.AtomicType, nodeTypes.ArrayType);
		},

		ArrayElement(nodeTypes) {
			return seq(
				field('array', nodeTypes.Identifier),
				'[',
				field('index', nodeTypes.Expression),
				']',
			);
		},

		Comment(nodeTypes) {
			// Rust dot includes every entity, except LF.
			return token(seq('//', /.*/));
		},

		String(nodeTypes) {
			return token(seq(
				'"',
				repeat(choice(
					/[^"\\]/,
					/\\./,
				)),
				'"',
			));
		},

		DecimalInteger(nodeTypes) {
			return token(seq(
				optional('-'),
				choice(
					'0',
					/[1-9]([0-9]*)/,
				),
			));
		},

		OctalInteger(nodeTypes) {
			return /-?0([0-7]+)/;
		},

		HexInteger(nodeTypes) {
			return token(seq(
				optional('-'),
				choice('0x', '0X', '$'),
				/[0-9a-fA-F]+/
			));
		},

		Integer(nodeTypes) {
			return choice(
				nodeTypes.DecimalInteger,
				nodeTypes.OctalInteger,
				nodeTypes.HexInteger,
			);
		},

		Real(nodeTypes) {
			return token(
				seq(
					optional('-'),
					choice(
						/\.[0-9]+/,
						/[0-9]+\.[0-9]*/,
					),
				),
			);
		},

		Byte(nodeTypes) {
			return token(seq(
				"'",
				choice(
					/[^'\\]/,
					'\\(\\|n|r|t|f|b)',
				),
				"'",
			));
		},

		FourCC(nodeTypes) {
			return token(seq(
				"'",
				/[^']/,
				/[^']/,
				/[^']/,
				/[^']/,
				"'",
			));
		},

		Literal(nodeTypes) {
			return choice(
				nodeTypes.String,
				nodeTypes.Integer,
				nodeTypes.Real,
				nodeTypes.FourCC,
				nodeTypes.Byte,
			);
		},

		TopLevel(nodeTypes) {
			return choice(
				nodeTypes.TypeDeclaration,
				nodeTypes.NativeDeclaration,
				nodeTypes.FunctionDeclaration,
				nodeTypes.GlobalsBlock,
			);
		},

		TypeDeclaration(nodeTypes) {
			return seq(
				'type',
				field('name', nodeTypes.Identifier),
				'extends',
				field('super', nodeTypes.Identifier),
			);
		},

		GlobalsBlock(nodeTypes) {
			return seq(
				'globals',
				repeat(choice(
					seq(nodeTypes.GlobalDeclarationStatement, nodeTypes.NewLine),
					nodeTypes.NewLine,
				)),
				'endglobals',
			);
		},

		GlobalDeclarationStatement(nodeTypes) {
			return choice(
				seq(
					optional(nodeTypes.DeclareAttributes),
					field('type', nodeTypes.AtomicType),
					field('name', nodeTypes.Identifier),
					optional(nodeTypes.Initializer),
				),
				seq(
					field('type', nodeTypes.ArrayType),
					field('name', nodeTypes.Identifier),
				),
			);
		},

		FunctionSignature(nodeTypes) {
			return seq(
				field('name', nodeTypes.Identifier),
				'takes',
				field('input', choice(
					alias('nothing', nodeTypes.Empty),
					nodeTypes.FunctionParameterList,
				)),
				'returns',
				field('output', choice(
					alias('nothing', nodeTypes.None),
					nodeTypes.Identifier,
				))
			);
		},

		FunctionParameterList(nodeTypes) {
			return repeat1WithDelimiter(nodeTypes, 'FunctionParameter', ',');
		},

		FunctionParameter(nodeTypes) {
			return seq(
				field('type', nodeTypes.Identifier),
				field('name', nodeTypes.Identifier),
			);
		},

		NativeDeclaration(nodeTypes) {
			return seq(
				optional(nodeTypes.NativeAttributes),
				'native',
				nodeTypes.FunctionSignature,
			);
		},

		NativeAttributes(nodeTypes) {
			return 'constant';
		},

		FunctionDeclaration(nodeTypes) {
			return seq(
				optional(nodeTypes.FunctionAttributes),
				'function',
				nodeTypes.FunctionSignature,
				nodeTypes.FunctionBody,
				'endfunction',
			);
		},

		FunctionAttributes(nodeTypes) {
			return 'constant';
		},

		FunctionBody(nodeTypes) {
			return seq(
				nodeTypes.NewLine,
				repeat(choice(
					seq(nodeTypes.LocalDeclarationStatement, nodeTypes.NewLine),
					nodeTypes.NewLine,
				)),
				helpers.AnyStatementsOrNewLines(nodeTypes),
			);
		},

		LocalDeclarationStatement(nodeTypes) {
			return choice(
				seq(
					'local',
					optional(nodeTypes.DeclareAttributes),
					field('type', nodeTypes.AtomicType),
					field('name', nodeTypes.Identifier),
					optional(nodeTypes.Initializer),
				),
				seq(
					'local',
					field('type', nodeTypes.ArrayType),
					field('name', nodeTypes.Identifier),
				),
			);
		},

		DeclareAttributes(nodeTypes) {
			return 'constant';
		},

		Initializer(nodeTypes) {
			return seq('=', field('value', nodeTypes.Expression));
		},

		Statement(nodeTypes) {
			return choice(
				nodeTypes.IfStatement,
				nodeTypes.LoopStatement,
				nodeTypes.ReturnStatement,
				nodeTypes.SetStatement,
				nodeTypes.CallStatement,
				// CFG grammar forces to define ExitWhen at this level rather than LoopStatement body.
				nodeTypes.ExitWhenStatement,
			);
		},

		IfStatement(nodeTypes) {
			return seq(
				'if',
				field('test', nodeTypes.Expression),
				'then',
				nodeTypes.Consequent,
				repeat(nodeTypes.ElseIfStatement),
				optional(nodeTypes.ElseStatement),
				'endif',
			);
		},

		ElseIfStatement(nodeTypes) {
			return seq(
				'elseif',
				field('test', nodeTypes.Expression),
				'then',
				nodeTypes.Consequent,
			);
		},

		ElseStatement(nodeTypes) {
			return seq(
				'else',
				nodeTypes.Alternate,
			);
		},

		Consequent(nodeTypes) {
			return seq(
				nodeTypes.NewLine,
				helpers.AnyStatementsOrNewLines(nodeTypes),
			);
		},

		Alternate(nodeTypes) {
			return seq(
				nodeTypes.NewLine,
				helpers.AnyStatementsOrNewLines(nodeTypes),
			);
		},

		LoopStatement(nodeTypes) {
			return seq(
				'loop',
				nodeTypes.NewLine,
				helpers.AnyStatementsOrNewLines(nodeTypes),
				'endloop',
			);
		},

		ExitWhenStatement(nodeTypes) {
			return seq(
				'exitwhen',
				nodeTypes.Expression,
			);
		},

		ReturnStatement(nodeTypes) {
			return seq(
				'return',
				optional(nodeTypes.Expression),
			);
		},

		SetStatement(nodeTypes) {
			return seq(
				'set',
				field('binding', nodeTypes.Binding),
				nodeTypes.Initializer,
			);
		},

		Binding(nodeTypes) {
			return choice(
				nodeTypes.Identifier,
				nodeTypes.ArrayElement,
			);
		},

		CallStatement(nodeTypes) {
			return seq(
				'call',
				nodeTypes.CallExpression,
			);
		},

		CallExpression(nodeTypes) {
			return seq(
				field('callee', nodeTypes.Identifier),
				'(',
				optional(field('arguments', repeat1WithDelimiter(nodeTypes, 'FunctionArgument', ','))),
				')',
			);
		},

		Expression(nodeTypes) {
			return choice(
				nodeTypes.PrimaryExpression,
				nodeTypes.UnaryExpression,
				nodeTypes.BinaryExpression,
			);
		},

		PrimaryExpression(nodeTypes) {
			return choice(
				nodeTypes.Literal,
				nodeTypes.Identifier,
				nodeTypes.ArrayElement,
				nodeTypes.CallExpression,
				nodeTypes.ParenthesizedExpression,
			);
		},

		UnaryExpression(nodeTypes) {
			return choice(
				nodeTypes.NotExpression,
				nodeTypes.NegativeExpression,
				nodeTypes.PositiveExpression,
			);
		},

		NotExpression(nodeTypes) {
			return prec.right(PRECEDENCES.not, seq('not', nodeTypes.Expression));
		},

		NegativeExpression(nodeTypes) {
			return prec.right(PRECEDENCES.neg, seq('-', nodeTypes.Expression));
		},

		PositiveExpression(nodeTypes) {
			return prec.right(PRECEDENCES.pos, seq('+', nodeTypes.Expression));
		},

		BinaryExpression(nodeTypes) {
			return choice(...binaryOperators.map(makeBinaryExpressionRule, nodeTypes));
		},

		ParenthesizedExpression(nodeTypes) {
			return seq('(', nodeTypes.Expression, ')');
		},

		FunctionArgument(nodeTypes) {
			return choice(
				nodeTypes.Expression,
				nodeTypes.CodeReference,
			);
		},

		CodeReference(nodeTypes) {
			return seq('function', nodeTypes.Identifier);
		},
	},
});
