import parseSource from "../parseSource";
import printAST from "../printAST";

declare global {
  namespace jest {
    interface Matchers<R> {
      toMatchAST(expected: string): CustomMatcherResult;
    }
  }
}

expect.extend({
  toMatchAST(source: string, expected: string) {
    const received = printAST(parseSource(source).scope);

    return {
      pass: received === expected,
      message: () => `expected ${expected}, received: ${received}`
    };
  }
});

describe("parseSource", () => {
  test("assign", () => {
    expect("foo = bar;").toMatchAST("[(assign (var foo) (var bar))]");
  });

  test("binary", () => {
    expect("1 + 2").toMatchAST("[(+ 1 2)]");
  });

  test("binary with precedence", () => {
    expect("1 + 2 * 3").toMatchAST("[(+ 1 (* 2 3))]");
  });

  test("block", () => {
    const source = `
      {
        1 + 2;
      }
    `;

    expect(source).toMatchAST("[[(+ 1 2)]]");
  });

  test("grouping", () => {
    expect("1 * (2 + 3)").toMatchAST("[(* 1 (+ 2 3))]");
  });

  test("ifStmt", () => {
    expect("if (foo) bar;").toMatchAST("[(if (var foo) (var bar))]");
  });

  test("printStmt", () => {
    expect("print foo;").toMatchAST("[(print (var foo))]");
  });

  test("unary", () => {
    expect("!foo;").toMatchAST("[(! (var foo))]");
  });

  test("varDecl", () => {
    expect("var foo = bar;").toMatchAST("[(varDecl foo (var bar))]");
  });
});
