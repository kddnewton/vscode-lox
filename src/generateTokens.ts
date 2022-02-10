export enum Token {
  LEFT_PAREN, RIGHT_PAREN, LEFT_BRACE, RIGHT_BRACE, COMMA, DOT, MINUS, PLUS, SEMICOLON, SLASH, STAR,
  BANG_EQUAL, BANG, EQUAL_EQUAL, EQUAL, GREATER_EQUAL, GREATER, LESS_EQUAL, LESS,
  STRING, NUMBER, IDENTIFIER,
  AND, CLASS, ELSE, FALSE, FUN, FOR, IF, NIL, OR, PRINT, RETURN, SUPER, THIS, TRUE, VAR, WHILE,
  EOF, ERROR
};

const KEYWORDS: Record<string, Exclude<Token, Token.IDENTIFIER | Token.STRING | Token.NUMBER | Token.ERROR>> = [
  Token.AND, Token.CLASS, Token.ELSE, Token.FALSE, Token.FUN, Token.FOR, Token.IF, Token.NIL,
  Token.OR, Token.PRINT, Token.RETURN, Token.SUPER, Token.THIS, Token.TRUE, Token.VAR, Token.WHILE
].reduce((accum, token) => ({ ...accum, [Token[token].toLowerCase()]: token }), {});

function isKeyword(value: string): value is keyof typeof KEYWORDS {
  return KEYWORDS.hasOwnProperty(value);
}

export enum TokenError {
  UNRECOGNIZED_LEXEME,
  UNTERMINATED_STRING
};

export type GeneratedToken = { start: number, end: number, line: number } & (
  | { kind: Exclude<Token, Token.IDENTIFIER | Token.STRING | Token.NUMBER | Token.ERROR> }
  | { kind: Token.IDENTIFIER, value: string }
  | { kind: Token.STRING, value: string }
  | { kind: Token.NUMBER, value: number }
  | { kind: Token.ERROR, error: TokenError }
);

export type TokenGenerator = Generator<GeneratedToken>;

export type Comment = { value: string, loc: { start: number, end: number } };
type HandleComment = ((comment: Comment) => void);

function* generateTokens(source: string, onComment?: HandleComment): TokenGenerator {
  let index = 0;
  let line = 1;

  while (index < source.length) {
    let start = index;

    switch (source[index++]) {
      case "\n":
        line += 1;
        break;
      case " ": case "\t": case "\r":
        break;

      case "(": yield { kind: Token.LEFT_PAREN, start, end: index, line }; break;
      case ")": yield { kind: Token.RIGHT_PAREN, start, end: index, line }; break;
      case "{": yield { kind: Token.LEFT_BRACE, start, end: index, line }; break;
      case "}": yield { kind: Token.RIGHT_BRACE, start, end: index, line }; break;
      case ",": yield { kind: Token.COMMA, start, end: index, line }; break;
      case ".": yield { kind: Token.DOT, start, end: index, line }; break;
      case "-": yield { kind: Token.MINUS, start, end: index, line }; break;
      case "+": yield { kind: Token.PLUS, start, end: index, line }; break;
      case ";": yield { kind: Token.SEMICOLON, start, end: index, line }; break;
      case "/": {
        if (source[index] === "/") {
          while (source[index++] !== "\n" && index < source.length);
          if (onComment) {
            onComment({
              value: source.substring(start, index),
              loc: { start, end: index }
            });
          }

          break;
        }
        yield { kind: Token.SLASH, start, end: index, line }; break;
      }
      case "*": yield { kind: Token.STAR, start, end: index, line }; break;

      case "!": yield { kind: match("=") ? Token.BANG_EQUAL : Token.BANG, start, end: index, line }; break;
      case "=": yield { kind: match("=") ? Token.EQUAL_EQUAL : Token.EQUAL, start, end: index, line }; break;
      case ">": yield { kind: match("=") ? Token.GREATER_EQUAL : Token.GREATER, start, end: index, line }; break;
      case "<": yield { kind: match("=") ? Token.LESS_EQUAL : Token.LESS, start, end: index, line }; break;

      case "\"": {
        const startLine = line;

        while (source[index] !== "\"" && index < source.length) {
          line += source[index] === "\n" ? 1 : 0;
          index += 1;
        }

        if (index === source.length) {
          yield { kind: Token.ERROR, start, end: index, line: startLine, error: TokenError.UNTERMINATED_STRING };
          break;
        }

        index += 1;
        yield { kind: Token.STRING, start, end: index, line: startLine, value: source.substring(start + 1, index - 1) };
        break;
      }

      case "0": case "1": case "2": case "3": case "4": case "5": case "6": case "7": case "8": case "9": {
        const pattern = new RegExp(/\d+(\.\d+)?/, "g");
        pattern.lastIndex = index - 1;

        const [value] = pattern.exec(source)!;
        index += value.length - 1;

        yield { kind: Token.NUMBER, start, end: index, line, value: parseFloat(value) };
        break;
      }

      default: {
        const pattern = new RegExp(/[A-Za-z_][A-Za-z0-9_]*/, "g");
        pattern.lastIndex = index - 1;

        const matched = pattern.exec(source);
        if (!matched || matched.index !== index - 1) {
          yield { kind: Token.ERROR, start, end: index, line, error: TokenError.UNRECOGNIZED_LEXEME };
          break;
        }

        const value = matched[0];
        index += value.length - 1;

        if (isKeyword(value)) {
          yield { kind: KEYWORDS[value], start, end: index, line };
        } else {
          yield { kind: Token.IDENTIFIER, start, end: index, line, value };
        }

        break;
      }
    }
  }

  yield { kind: Token.EOF, start: index, end: index, line };

  function match(value: string) {
    if (source[index] === value) {
      index += 1;
      return true;
    }
    return false;
  }
}

export default generateTokens;
