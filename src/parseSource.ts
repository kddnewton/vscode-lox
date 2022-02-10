import generateTokens, { Comment, GeneratedToken, Token, TokenGenerator } from "./generateTokens";

// The following types define the shape of the AST generated by parseSource. All
// of the nodes have location information necessary for formatting.

type Location = { loc: { start: number, end: number } };

type Expression = Location & (
  | { kind: "missing" }
  | { kind: "assign", variable: Expression, expression: Expression }
  | { kind: "binary", left: Expression, oper: Token, right: Expression }
  | { kind: "call", recv: Expression, args: Expression[] }
  | { kind: "literal", value: null | boolean | number | string }
  | { kind: "variable", name: string }
  | { kind: "unary", oper: Token, expr: Expression }
);

type Statement = Location & (
  | { kind: "block", decls: Statement[] }
  | { kind: "exprStmt", expr: Expression }
  | { kind: "forStmt", init: Statement | null, cond: Expression | null, incr: Expression | null, stmt: Statement }
  | { kind: "funDecl", name: Expression, params: Expression[], block: Statement }
  | { kind: "ifStmt", pred: Expression, stmt: Statement, cons: Statement | null }
  | { kind: "printStmt", expr: Expression }
  | { kind: "varDecl", var: string, init: Expression | null }
  | { kind: "whileStmt", pred: Expression, stmt: Statement }
);

type Scope = Location & (
  | { kind: "scope", decls: Statement[] }
);

export type AstNode = Expression | Statement | Scope;

// This is the main parser object that gets passed around the various parse
// functions. It's used to keep track of any necesary context as the tree is
// walked.
class Parser {
  public sourceLength: number;
  private generator: TokenGenerator;

  public previous: GeneratedToken;
  public current: GeneratedToken;

  public comments: Comment[];
  public missingTokens: { token: Token, start: number, end: number, message: string }[];

  constructor(source: string) {
    this.comments = [];

    this.sourceLength = source.length;
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

type ParserWithPrevious<T extends Token> = Parser & { previous: Omit<Parser["previous"], "kind"> & { kind: T } };
enum Precedence { NONE, ASSIGNMENT, OR, AND, EQUALITY, COMPARISON, TERM, FACTOR, UNARY, CALL, PRIMARY };

type PrefixOptions = { canAssign: boolean }
type ParseRule<T extends Token> = {
  prefix: ((parser: ParserWithPrevious<T>, options: PrefixOptions) => Expression) | null,
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
    infix(parser, recv) {
      const start = parser.previous.start;
      let args: Expression[] = [];

      if (!match(parser, Token.RIGHT_PAREN)) {
        do {
          args.push(parseExpression(parser));
        } while (match(parser, Token.COMMA));

        consume(parser, Token.RIGHT_PAREN, { start, end: parser.previous.end }, "Expect ')' after arguments.");
      }

      return {
        kind: "call",
        recv,
        args,
        loc: { start: recv.loc.start, end: parser.previous.end }
      };
    },
    prec: Precedence.CALL
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
  [Token.IDENTIFIER]: { prefix: parseVariable, infix: null, prec: Precedence.NONE },
  [Token.STRING]: { prefix: parseLiteral, infix: null, prec: Precedence.NONE },
  [Token.NUMBER]: { prefix: parseLiteral, infix: null, prec: Precedence.NONE },
  [Token.AND]: { prefix: null, infix: parseLogicalAnd, prec: Precedence.AND },
  [Token.CLASS]: { prefix: null, infix: null, prec: Precedence.NONE },
  [Token.ELSE]: { prefix: null, infix: null, prec: Precedence.NONE },
  [Token.FALSE]: { prefix: parseLiteral, infix: null, prec: Precedence.NONE },
  [Token.FOR]: { prefix: null, infix: null, prec: Precedence.NONE },
  [Token.FUN]: { prefix: null, infix: null, prec: Precedence.NONE },
  [Token.IF]: { prefix: null, infix: null, prec: Precedence.NONE },
  [Token.NIL]: { prefix: parseLiteral, infix: null, prec: Precedence.NONE },
  [Token.OR]: { prefix: null, infix: parseLogicalOr, prec: Precedence.OR },
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

// Consume the expected token out of the parser. If the next token doesn't match
// what we expect, then we're going to generate a missing token to take its
// place.
function consume<T extends Token>(
  parser: Parser,
  token: T,
  location: { start: number, end: number },
  message: string
): asserts parser is ParserWithPrevious<typeof token> {
  if (parser.current.kind !== token) {
    parser.missing(token, location, message);
  } else {
    parser.advance();
  }
}

// Advance the parser if the current token that the parser is looking at matches
// the given token. Otherwise, return false.
function match(parser: Parser, token: Token) {
  if (parser.current.kind === token) {
    parser.advance();
    return true;
  }
  return false;
}

function assertPrevious<T extends Token>(parser: Parser, token: T): asserts parser is ParserWithPrevious<T> {
  if (parser.previous.kind !== token) {
    throw new Error("Parse error.");
  }
}

// variable ("=" expression)?
function parseVariable(parser: Parser, { canAssign }: PrefixOptions): Expression {
  assertPrevious(parser, Token.IDENTIFIER);

  const variable: Expression = {
    kind: "variable", 
    name: parser.previous.value,
    loc: { start: parser.previous.start, end: parser.previous.end }
  };

  if (canAssign && match(parser, Token.EQUAL)) {
    const expression = parseExpression(parser);

    return {
      kind: "assign",
      variable,
      expression,
      loc: { start: variable.loc.start, end: expression.loc.end }
    };
  }

  return variable;
}

// false | true | nil | string | number
function parseLiteral(parser: ParserWithPrevious<Token.FALSE | Token.TRUE | Token.NIL | Token.STRING | Token.NUMBER>): Expression {
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
  }
}

// ("-" | "!") node
function parseUnary(parser: ParserWithPrevious<Token.MINUS | Token.BANG>): Expression {
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

// node "and" node
function parseLogicalAnd(parser: Parser, left: Expression): Expression {
  const right = parsePrecedence(parser, Precedence.AND);

  return {
    kind: "binary",
    left,
    oper: Token.AND,
    right,
    loc: { start: left.loc.start, end: right.loc.end }
  };
}

// node "or" node
function parseLogicalOr(parser: Parser, left: Expression): Expression {
  const right = parsePrecedence(parser, Precedence.OR);

  return {
    kind: "binary",
    left,
    oper: Token.OR,
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

  let node = prefixRule(parser, { canAssign: precedence <= Precedence.ASSIGNMENT });
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
function parsePrintStatement(parser: Parser): Statement {
  const node: Statement = {
    kind: "printStmt",
    expr: parseExpression(parser),
    loc: { start: parser.previous.start, end: parser.previous.end }
  };

  consume(parser, Token.SEMICOLON, node.loc, "Expect ';' after value.");
  node.loc.end = parser.previous.end;
  return node;
};

function parseForStatement(parser: Parser): Statement {
  const { start } = parser.previous;
  consume(parser, Token.LEFT_PAREN, { start, end: parser.previous.end }, "Expect '(' after 'for'.");

  let initializer: Statement | null = null;
  if (match(parser, Token.SEMICOLON)) {
    // No initializer
  } else if (match(parser, Token.VAR)) {
    initializer = parseVarDeclaration(parser);
  } else {
    initializer = parseExpressionStatement(parser);
  }

  let condition: Expression | null = null;
  if (!match(parser, Token.SEMICOLON)) {
    condition = parseExpression(parser);
    consume(parser, Token.SEMICOLON, { start, end: condition.loc.end }, "Expect ';' after loop condition.");
  }

  let increment: Expression | null = null;
  if (!match(parser, Token.RIGHT_PAREN)) {
    increment = parseExpression(parser);
    consume(parser, Token.RIGHT_PAREN, { start, end: increment.loc.end }, "Expect ')' after for clauses.");
  }

  const statement = parseStatement(parser);

  return {
    kind: "forStmt",
    init: initializer,
    cond: condition,
    incr: increment,
    stmt: statement,
    loc: { start, end: statement.loc.end }
  };
}

function parseIfStatement(parser: Parser): Statement {
  const { start } = parser.previous;

  consume(parser, Token.LEFT_PAREN, { start, end: parser.previous.end }, "Expect '(' after 'if'.");
  const predicate = parseExpression(parser);

  consume(parser, Token.RIGHT_PAREN, { start, end: predicate.loc.end }, "Expect ')' after condition.");
  const statement = parseStatement(parser);

  const node: Statement = {
    kind: "ifStmt",
    pred: predicate,
    stmt: statement,
    cons: null,
    loc: { start, end: statement.loc.end }
  };

  if (match(parser, Token.ELSE)) {
    node.cons = parseStatement(parser);
    node.loc.end = node.cons.loc.end;
  }

  return node;
}

function parseWhileStatement(parser: Parser): Statement {
  const { start } = parser.previous;

  consume(parser, Token.LEFT_PAREN, { start, end: parser.previous.end }, "Expect '(' after 'while'.");
  const predicate = parseExpression(parser);

  consume(parser, Token.RIGHT_PAREN, { start, end: predicate.loc.end }, "Expect ')' after condition.");
  const statement = parseStatement(parser);

  return {
    kind: "whileStmt",
    pred: predicate,
    stmt: statement,
    loc: { start, end: statement.loc.end }
  };
}

function parseBlock(parser: Parser): Statement {
  const node: Statement = {
    kind: "block",
    decls: [],
    loc: { start: parser.previous.start, end: parser.previous.end }
  };

  while (parser.current.kind !== Token.RIGHT_BRACE && parser.current.kind !== Token.EOF) {
    const declaration = parseDeclaration(parser);
    node.loc.end = declaration.loc.end;
    node.decls.push(declaration);
  }

  consume(parser, Token.RIGHT_BRACE, node.loc, "Expect '}' after block.");
  return node;
}

function parseExpressionStatement(parser: Parser): Statement {
  const expression = parseExpression(parser);
  consume(parser, Token.SEMICOLON, expression.loc, "Expect ';' after expression.");

  return {
    kind: "exprStmt",
    expr: expression,
    loc: { start: expression.loc.start, end: parser.previous.end }
  };
}

function parseStatement(parser: Parser): Statement {
  if (match(parser, Token.PRINT)) {
    return parsePrintStatement(parser);
  }

  if (match(parser, Token.FOR)) {
    return parseForStatement(parser);
  }

  if (match(parser, Token.IF)) {
    return parseIfStatement(parser);
  }

  if (match(parser, Token.WHILE)) {
    return parseWhileStatement(parser);
  }

  if (match(parser, Token.LEFT_BRACE)) {
    return parseBlock(parser);
  }

  return parseExpressionStatement(parser);
}

function parseFunctionDeclaration(parser: Parser): Statement {
  const start = parser.previous.start;
  consume(parser, Token.IDENTIFIER, parser.previous, "Expect name after 'fun' keyword.");

  const name = parseVariable(parser, { canAssign: false });
  consume(parser as ParserWithPrevious<Token>, Token.LEFT_PAREN, name.loc, "Expect '(' after function name.");

  let params: Expression[] = [];
  const paramsLocation = parser.previous;

  if (!match(parser, Token.RIGHT_PAREN)) {
    do {
      consume(parser, Token.IDENTIFIER, paramsLocation, "Expect parameter identifier after '('.");
      params.push(parseVariable(parser, { canAssign: false }));
    } while (match(parser, Token.COMMA));
  }

  consume(parser, Token.RIGHT_PAREN, parser.previous, "Expect ')' after parameters.");
  consume(parser, Token.LEFT_BRACE, parser.previous, "Expect '{' before function body.");

  const block = parseBlock(parser);

  return {
    kind: "funDecl",
    name,
    params,
    block,
    loc: { start, end: block.loc.end }
  };
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

// Parse an individual declaration within a scope.
function parseDeclaration(parser: Parser): Statement {
  if (match(parser, Token.FUN)) {
    return parseFunctionDeclaration(parser);
  }

  if (match(parser, Token.VAR)) {
    return parseVarDeclaration(parser);
  }

  return parseStatement(parser);
}

// Parse a list of declarations within a scope.
function parseScope(parser: Parser): Scope {
  const scope: Scope = {
    kind: "scope",
    decls: [],
    loc: { start: 0, end: parser.sourceLength }
  };

  while (!match(parser, Token.EOF)) {
    scope.decls.push(parseDeclaration(parser));
  }

  return scope;
}

// This is the top-level parse function. It accepts the source of the lox file
// that should be parsed and returns both the parser (which will contain the
// comments and links to any missing or skipped tokens) and the top-level AST
// node.
function parseSource(source: string): { parser: Parser, scope: Scope } {
  const parser = new Parser(source);
  return { parser, scope: parseScope(parser) };
}

export default parseSource;
