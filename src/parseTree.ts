import generateTokens, { Comment, GeneratedToken, Token, TokenGenerator } from "./generateTokens";

export type TreeNode = { loc: { start: number, end: number } } & (
  | { kind: "binary", left: TreeNode, oper: Token, right: TreeNode }
  | { kind: "boolean", value: boolean }
  | { kind: "decls", decls: TreeNode[] }
  | { kind: "exprStmt", expr: TreeNode }
  | { kind: "nil" }
  | { kind: "number", value: number }
  | { kind: "printStmt", expr: TreeNode }
  | { kind: "string", value: string }
  | { kind: "varDecl", var: string, init: TreeNode | null }
  | { kind: "var", name: string }
  | { kind: "unary", oper: Token, expr: TreeNode }
);

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
  prefix: ((parser: ParserWithPrevious<T>) => TreeNode) | null,
  infix: ((parser: ParserWithPrevious<T>, left: TreeNode) => TreeNode) | null,
  prec: Precedence
};

const parseRules: { [T in Token]: ParseRule<T> } = {
  [Token.LEFT_PAREN]: {
    prefix(parser) {
      const start = parser.previous.start;
      const node = expression(parser);

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
  [Token.MINUS]: { prefix: unary, infix: binary, prec: Precedence.TERM },
  [Token.PLUS]: { prefix: null, infix: binary, prec: Precedence.TERM },
  [Token.SEMICOLON]: { prefix: null, infix: null, prec: Precedence.NONE },
  [Token.SLASH]: { prefix: null, infix: binary, prec: Precedence.FACTOR },
  [Token.STAR]: { prefix: null, infix: binary, prec: Precedence.FACTOR },
  [Token.BANG]: { prefix: unary, infix: null, prec: Precedence.NONE },
  [Token.BANG_EQUAL]: { prefix: null, infix: binary, prec: Precedence.EQUALITY },
  [Token.EQUAL]: { prefix: null, infix: null, prec: Precedence.NONE },
  [Token.EQUAL_EQUAL]: { prefix: null, infix: binary, prec: Precedence.EQUALITY },
  [Token.GREATER]: { prefix: null, infix: binary, prec: Precedence.COMPARISON },
  [Token.GREATER_EQUAL]: { prefix: null, infix: binary, prec: Precedence.COMPARISON },
  [Token.LESS]: { prefix: null, infix: binary, prec: Precedence.COMPARISON },
  [Token.LESS_EQUAL]: { prefix: null, infix: binary, prec: Precedence.COMPARISON },
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
  [Token.STRING]: { prefix: atom, infix: null, prec: Precedence.NONE },
  [Token.NUMBER]: { prefix: atom, infix: null, prec: Precedence.NONE },
  [Token.AND]: { prefix: null, infix: null, prec: Precedence.NONE },
  [Token.CLASS]: { prefix: null, infix: null, prec: Precedence.NONE },
  [Token.ELSE]: { prefix: null, infix: null, prec: Precedence.NONE },
  [Token.FALSE]: { prefix: atom, infix: null, prec: Precedence.NONE },
  [Token.FOR]: { prefix: null, infix: null, prec: Precedence.NONE },
  [Token.FUN]: { prefix: null, infix: null, prec: Precedence.NONE },
  [Token.IF]: { prefix: null, infix: null, prec: Precedence.NONE },
  [Token.NIL]: { prefix: atom, infix: null, prec: Precedence.NONE },
  [Token.OR]: { prefix: null, infix: null, prec: Precedence.NONE },
  [Token.PRINT]: { prefix: null, infix: null, prec: Precedence.NONE },
  [Token.RETURN]: { prefix: null, infix: null, prec: Precedence.NONE },
  [Token.SUPER]: { prefix: null, infix: null, prec: Precedence.NONE },
  [Token.THIS]: { prefix: null, infix: null, prec: Precedence.NONE },
  [Token.TRUE]: { prefix: atom, infix: null, prec: Precedence.NONE },
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
function atom(parser: Parser): TreeNode {
  const loc = { start: parser.previous.start, end: parser.previous.end };

  switch (parser.previous.kind) {
    case Token.FALSE:
      return { kind: "boolean", value: false, loc };
    case Token.TRUE:
      return { kind: "boolean", value: true, loc };
    case Token.NIL:
      return { kind: "nil", loc };
    case Token.STRING:
      return { kind: "string", value: parser.previous.value, loc };
    case Token.NUMBER:
      return { kind: "number", value: parser.previous.value, loc };
    default:
      throw new Error("Parsing error.");
  }
}

// ("-" | "!") node
function unary(parser: Parser): TreeNode {
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
function binary(parser: Parser, left: TreeNode): TreeNode {
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

function parsePrecedence(parser: Parser, precedence: Precedence): TreeNode {
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

function expression(parser: Parser): TreeNode {
  return parsePrecedence(parser, Precedence.ASSIGNMENT);
}

// "print" expression ";"
function printStatement(parser: Parser): TreeNode {
  const node: TreeNode = {
    kind: "printStmt",
    expr: expression(parser),
    loc: { start: parser.previous.start, end: parser.previous.end }
  };

  consume(parser, Token.SEMICOLON, node.loc, "Expect ';' after value.");
  node.loc.end = parser.previous.end;
  return node;
};

function statement(parser: Parser): TreeNode {
  if (match(parser, Token.PRINT)) {
    return printStatement(parser);
  }

  const expr = expression(parser);
  consume(parser, Token.SEMICOLON, expr.loc, "Expect ';' after expression.");

  expr.loc.end = parser.previous.end;
  return { kind: "exprStmt", expr, loc: expr.loc };
}

// "var" variable ("=" expression)? ";"
function varDeclaration(parser: Parser): TreeNode {
  const start = parser.previous.start;
  consume(parser, Token.IDENTIFIER, { start, end: parser.previous.end }, "Expect variable name.");

  const node: TreeNode = {
    kind: "varDecl",
    var: parser.previous.value,
    init: null,
    loc: { start, end: parser.previous.end }
  };

  if (match(parser, Token.EQUAL)) {
    node.init = expression(parser);
    node.loc.end = node.init.loc.end;
  }

  consume(parser as ParserWithPrevious<Token>, Token.SEMICOLON, { start, end: parser.previous.end }, "Expect ';' after variable declaration.");
  node.loc.end = parser.previous.end;
  return node;
}

function parseDeclaration(parser: Parser): TreeNode {
  if (match(parser, Token.VAR)) {
    return varDeclaration(parser);
  } else {
    return statement(parser);
  }
}

function parseTree(source: string): { parser: Parser, node: TreeNode } {
  const parser = new Parser(source);
  const node: TreeNode = {
    kind: "decls",
    decls: [],
    loc: { start: 0, end: source.length }
  };

  while (!match(parser, Token.EOF)) {
    node.decls.push(parseDeclaration(parser));
  }

  return{ parser, node };
}

export default parseTree;
