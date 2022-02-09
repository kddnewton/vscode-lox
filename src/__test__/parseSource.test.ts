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

  describe("forStmt", () => {
    test("nothing", () => {
      expect("for (;;) 1;").toMatchAST("[(for 1)]");
    });

    test("initializer", () => {
      expect("for (var i = 0;;) 1;").toMatchAST("[(for (varDecl i 0) 1)]");
    });

    test("condition", () => {
      expect("for (; i < 10;) 1;").toMatchAST("[(for (< (var i) 10) 1)]");
    });

    test("initializer and condition", () => {
      expect("for (var i = 0; i < 10;) 1;").toMatchAST("[(for (varDecl i 0) (< (var i) 10) 1)]");
    });

    test("increment", () => {
      expect("for (;; i = i + 1) 1;").toMatchAST("[(for (assign (var i) (+ (var i) 1)) 1)]");
    });
  });

  test("grouping", () => {
    expect("1 * (2 + 3)").toMatchAST("[(* 1 (+ 2 3))]");
  });

  describe("ifStmt", () => {
    test("no consequent", () => {
      expect("if (foo) bar;").toMatchAST("[(if (var foo) (var bar))]");
    });

    test("consequent", () => {
      expect("if (foo) bar; else baz;").toMatchAST("[(if (var foo) (var bar) (var baz))]");
    });
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

  test("whileStmt", () => {
    expect("while (foo) bar;").toMatchAST("[(while (var foo) (var bar))]");
  });
});
