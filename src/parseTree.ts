import generateTokens, { Comment, GeneratedToken, Token, TokenGenerator } from "./generateTokens";

type Location = { loc: { start: number, end: number } };

type Expression = Location & (
  | { kind: "binary", left: Expression, oper: Token, right: Expression }
  | { kind: "literal", value: null | boolean | number | string }
  | { kind: "var", name: string }
  | { kind: "unary", oper: Token, expr: Expression }
);

type Statement = Location & (
  | { kind: "exprStmt", expr: Expression }
  | { kind: "printStmt", expr: Expression }
  | { kind: "varDecl", var: string, init: Expression | null }
);

type Scope = Location & (
  | { kind: "decls", decls: Statement[] }
);

export type AstNode = Expression | Statement | Scope;

class Parser {
  private generator: TokenGenerator;

  public previous: GeneratedToken;
  public current: GeneratedToken;

  public comments: Comment[];
  public missingTokens: { token: Token, start: number, end: number, message: string }[];

  constructor(source: string) {
    this.comments = [];
    this.generator = generateTokens(source, (comment) => {
      this.comments.push(comment);
    });

    this.previous = this.generator.next().value;
    this.current = this.previous;
    this.missingTokens = [];
  }

  advance() {
    this.previous = this.current;
    this.current = this.generator.next().value;
  }

  missing(token: Token, location: { start: number, end: number }, message: string) {
    this.missingTokens.push({ token, start: location.start, end: location.end, message });
    this.previous = { ...this.current, kind: token } as GeneratedToken;
  }
}

enum Precedence { NONE, ASSIGNMENT, OR, AND, EQUALITY, COMPARISON, TERM, FACTOR, UNARY, CALL, PRIMARY };

type ParserWithPrevious<T extends Token> = Parser & { previous: Omit<Parser["previous"], "kind"> & { kind: T } };
type ParseRule<T extends Token> = {
  prefix: ((parser: ParserWithPrevious<T>) => Expression) | null,
  infix: ((parser: ParserWithPrevious<T>, left: Expression) => Expression) | null,
  prec: Precedence
};

const parseRules: { [T in Token]: ParseRule<T> } = {
  [Token.LEFT_PAREN]: {
    prefix(parser) {
      const start = parser.previous.start;
      const node = parseExpression(parser);

      consume(parser, Token.RIGHT_PAREN, { start, end: node.loc.end }, "Expect ')' after expression.");
      return node;
    },
    infix: null,
    prec: Precedence.NONE
  },
  [Token.RIGHT_PAREN]: { prefix: null, infix: null, prec: Precedence.NONE },
  [Token.LEFT_BRACE]: { prefix: null, infix: null, prec: Precedence.NONE },
  [Token.RIGHT_BRACE]: { prefix: null, infix: null, prec: Precedence.NONE },
  [Token.COMMA]: { prefix: null, infix: null, prec: Precedence.NONE },
  [Token.DOT]: { prefix: null, infix: null, prec: Precedence.NONE },
  [Token.MINUS]: { prefix: parseUnary, infix: parseBinary, prec: Precedence.TERM },
  [Token.PLUS]: { prefix: null, infix: parseBinary, prec: Precedence.TERM },
  [Token.SEMICOLON]: { prefix: null, infix: null, prec: Precedence.NONE },
  [Token.SLASH]: { prefix: null, infix: parseBinary, prec: Precedence.FACTOR },
  [Token.STAR]: { prefix: null, infix: parseBinary, prec: Precedence.FACTOR },
  [Token.BANG]: { prefix: parseUnary, infix: null, prec: Precedence.NONE },
  [Token.BANG_EQUAL]: { prefix: null, infix: parseBinary, prec: Precedence.EQUALITY },
  [Token.EQUAL]: { prefix: null, infix: null, prec: Precedence.NONE },
  [Token.EQUAL_EQUAL]: { prefix: null, infix: parseBinary, prec: Precedence.EQUALITY },
  [Token.GREATER]: { prefix: null, infix: parseBinary, prec: Precedence.COMPARISON },
  [Token.GREATER_EQUAL]: { prefix: null, infix: parseBinary, prec: Precedence.COMPARISON },
  [Token.LESS]: { prefix: null, infix: parseBinary, prec: Precedence.COMPARISON },
  [Token.LESS_EQUAL]: { prefix: null, infix: parseBinary, prec: Precedence.COMPARISON },
  [Token.IDENTIFIER]: {
    prefix(parser) {
      return {
        kind: "var",
        name: parser.previous.value,
        loc: { start: parser.previous.start, end: parser.previous.end }
      };
    },
    infix: null,
    prec: Precedence.NONE
  },
  [Token.STRING]: { prefix: parseLiteral, infix: null, prec: Precedence.NONE },
  [Token.NUMBER]: { prefix: parseLiteral, infix: null, prec: Precedence.NONE },
  [Token.AND]: { prefix: null, infix: null, prec: Precedence.NONE },
  [Token.CLASS]: { prefix: null, infix: null, prec: Precedence.NONE },
  [Token.ELSE]: { prefix: null, infix: null, prec: Precedence.NONE },
  [Token.FALSE]: { prefix: parseLiteral, infix: null, prec: Precedence.NONE },
  [Token.FOR]: { prefix: null, infix: null, prec: Precedence.NONE },
  [Token.FUN]: { prefix: null, infix: null, prec: Precedence.NONE },
  [Token.IF]: { prefix: null, infix: null, prec: Precedence.NONE },
  [Token.NIL]: { prefix: parseLiteral, infix: null, prec: Precedence.NONE },
  [Token.OR]: { prefix: null, infix: null, prec: Precedence.NONE },
  [Token.PRINT]: { prefix: null, infix: null, prec: Precedence.NONE },
  [Token.RETURN]: { prefix: null, infix: null, prec: Precedence.NONE },
  [Token.SUPER]: { prefix: null, infix: null, prec: Precedence.NONE },
  [Token.THIS]: { prefix: null, infix: null, prec: Precedence.NONE },
  [Token.TRUE]: { prefix: parseLiteral, infix: null, prec: Precedence.NONE },
  [Token.VAR]: { prefix: null, infix: null, prec: Precedence.NONE },
  [Token.WHILE]: { prefix: null, infix: null, prec: Precedence.NONE },
  [Token.EOF]: { prefix: null, infix: null, prec: Precedence.NONE },
  [Token.ERROR]: { prefix: null, infix: null, prec: Precedence.NONE }
};

function consume<T extends Token>(parser: Parser, token: T, location: { start: number, end: number }, message: string): asserts parser is ParserWithPrevious<typeof token> {
  if (parser.current.kind !== token) {
    parser.missing(token, location, message);
  } else {
    parser.advance();
  }
}

function match(parser: Parser, token: Token) {
  if (parser.current.kind === token) {
    parser.advance();
    return true;
  }
  return false;
}

// false | true | nil | string | number
function parseLiteral(parser: Parser): Expression {
  const loc = { start: parser.previous.start, end: parser.previous.end };

  switch (parser.previous.kind) {
    case Token.FALSE:
      return { kind: "literal", value: false, loc };
    case Token.TRUE:
      return { kind: "literal", value: true, loc };
    case Token.NIL:
      return { kind: "literal", value: null, loc };
    case Token.STRING:
      return { kind: "literal", value: parser.previous.value, loc };
    case Token.NUMBER:
      return { kind: "literal", value: parser.previous.value, loc };
    default:
      throw new Error("Parsing error.");
  }
}

// ("-" | "!") node
function parseUnary(parser: Parser): Expression {
  const oper = parser.previous.kind;
  const expr = parsePrecedence(parser, Precedence.UNARY);

  switch (oper) {
    case Token.MINUS:
      return {
        kind: "unary",
        oper,
        expr,
        loc: { start: parser.previous.start, end: expr.loc.end }
      };
    case Token.BANG:
      return {
        kind: "unary",
        oper,
        expr,
        loc: { start: parser.previous.start, end: expr.loc.end }
      };
    default:
      throw new Error("Parsing error.");
  }
}

// node "+" node
function parseBinary(parser: Parser, left: Expression): Expression {
  const oper = parser.previous.kind;
  const right = parsePrecedence(parser, parseRules[oper].prec + 1);

  return {
    kind: "binary",
    left,
    oper,
    right,
    loc: { start: left.loc.start, end: right.loc.end }
  };
}

function parsePrecedence(parser: Parser, precedence: Precedence): Expression {
  parser.advance();

  const prefixRule = parseRules[parser.previous.kind].prefix as ParseRule<Token>["prefix"];
  if (prefixRule === null) {
    throw new Error("Parse error.");
  }

  let node = prefixRule(parser);
  while (precedence <= parseRules[parser.current.kind].prec) {
    parser.advance();

    const infixRule = parseRules[parser.previous.kind].infix as ParseRule<Token>["infix"];
    node = infixRule!(parser, node);
  }

  return node;
}

function parseExpression(parser: Parser): Expression {
  return parsePrecedence(parser, Precedence.ASSIGNMENT);
}

// "print" expression ";"
function printStatement(parser: Parser): Statement {
  const node: Statement = {
    kind: "printStmt",
    expr: parseExpression(parser),
    loc: { start: parser.previous.start, end: parser.previous.end }
  };

  consume(parser, Token.SEMICOLON, node.loc, "Expect ';' after value.");
  node.loc.end = parser.previous.end;
  return node;
};

function parseStatement(parser: Parser): Statement {
  if (match(parser, Token.PRINT)) {
    return printStatement(parser);
  }

  const expr = parseExpression(parser);
  consume(parser, Token.SEMICOLON, expr.loc, "Expect ';' after expression.");

  expr.loc.end = parser.previous.end;
  return { kind: "exprStmt", expr, loc: expr.loc };
}

// "var" variable ("=" expression)? ";"
function parseVarDeclaration(parser: Parser): Statement {
  const start = parser.previous.start;
  consume(parser, Token.IDENTIFIER, { start, end: parser.previous.end }, "Expect variable name.");

  const node: Statement = {
    kind: "varDecl",
    var: parser.previous.value,
    init: null,
    loc: { start, end: parser.previous.end }
  };

  if (match(parser, Token.EQUAL)) {
    node.init = parseExpression(parser);
    node.loc.end = node.init.loc.end;
  }

  consume(parser as ParserWithPrevious<Token>, Token.SEMICOLON, { start, end: parser.previous.end }, "Expect ';' after variable declaration.");
  node.loc.end = parser.previous.end;
  return node;
}

function parseDeclaration(parser: Parser): Statement {
  if (match(parser, Token.VAR)) {
    return parseVarDeclaration(parser);
  } else {
    return parseStatement(parser);
  }
}

function parseTree(source: string): { parser: Parser, node: Scope } {
  const parser = new Parser(source);
  const node: Scope = {
    kind: "decls",
    decls: [],
    loc: { start: 0, end: source.length }
  };

  while (!match(parser, Token.EOF)) {
    node.decls.push(parseDeclaration(parser));
  }

  return { parser, node };
}

export default parseTree;
