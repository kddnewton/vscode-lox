import generateTokens, { Comment, GeneratedToken, Token } from "../generateTokens";

declare global {
  namespace jest {
    interface Matchers<R> {
      toMatchTokens(...expected: Token[]): CustomMatcherResult;
    }
  }
}

expect.extend({
  toMatchTokens(source: string, ...expected: Token[]) {
    const received = getGeneratedTokens(source);

    return {
      pass: received.length === expected.length && received.every((token, index) => expected[index] === token.kind),
      message: () => `expected ${expected}, received: ${received}`
    };
  }
});

function getGeneratedTokens(source: string): GeneratedToken[] {
  const generatedTokens = [];
    for (const token of generateTokens(source)) {
      generatedTokens.push(token);
    }

    return generatedTokens;
}

describe("generateTokens", () => {
  describe("individuals", () => {
    test.each([
      [Token.LEFT_PAREN, "("],
      [Token.RIGHT_PAREN, ")"],
      [Token.LEFT_BRACE, "{"],
      [Token.RIGHT_BRACE, "}"],
      [Token.COMMA, ","],
      [Token.DOT, "."],
      [Token.MINUS, "-"],
      [Token.PLUS, "+"],
      [Token.SEMICOLON, ";"],
      [Token.SLASH, "/"],
      [Token.STAR, "*"],
      [Token.BANG_EQUAL, "!="],
      [Token.BANG, "!"],
      [Token.EQUAL_EQUAL, "=="],
      [Token.EQUAL, "="],
      [Token.GREATER_EQUAL, ">="],
      [Token.GREATER, ">"],
      [Token.LESS_EQUAL, "<="],
      [Token.LESS, "<"],
      [Token.STRING, "\"string\""],
      [Token.NUMBER, "123"],
      [Token.IDENTIFIER, "ident"],
      [Token.AND, "and"],
      [Token.CLASS, "class"],
      [Token.ELSE, "else"],
      [Token.FALSE, "false"],
      [Token.FUN, "fun"],
      [Token.FOR, "for"],
      [Token.IF, "if"],
      [Token.NIL, "nil"],
      [Token.OR, "or"],
      [Token.PRINT, "print"],
      [Token.RETURN, "return"],
      [Token.SUPER, "super"],
      [Token.THIS, "this"],
      [Token.TRUE, "true"],
      [Token.VAR, "var"],
      [Token.WHILE, "while"]
    ])("%s", (token, source) => {
      expect(source).toMatchTokens(token, Token.EOF);
    });
  });

  describe("numbers", () => {
    test.each(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"])("%s", (source) => {
      expect(source).toMatchTokens(Token.NUMBER, Token.EOF);
    });

    test("decimal", () => {
      expect("1.23").toMatchTokens(Token.NUMBER, Token.EOF);
    });
  });

  describe("errors", () => {
    test("unterminated string", () => {
      expect("\"string").toMatchTokens(Token.ERROR, Token.EOF);
    });

    test("unrecognized lexeme", () => {
      expect("1 % 2").toMatchTokens(Token.NUMBER, Token.ERROR, Token.NUMBER, Token.EOF);
    });
  });

  test("comment", () => {
    const comments: Comment[] = [];
    const tokens = generateTokens("// comment", (comment) => comments.push(comment));

    tokens.next();
    expect(comments).toHaveLength(1);
  });
});
