import formatSource from "../formatSource";

declare global {
  namespace jest {
    interface Matchers<R> {
      toChangeFormat(actual: string): CustomMatcherResult;
      toMatchFormat(): CustomMatcherResult;
    }
  }
}

function checkFormat(before: string, after: string) {
  const formatted = formatSource(before);

  return {
    pass: formatted.trim() === after.trim(),
    message: () => `Expected:\n${after}\nReceived:\n${formatted}`
  };
}

expect.extend({
  toChangeFormat: checkFormat,
  toMatchFormat: (before) => checkFormat(before, before)
});

const long = new Array(80).fill("x").join("");

describe("formatSource", () => {
  describe("assign", () => {
    test("flat to flat", () => {
      expect("foo = 1;").toMatchFormat();
    });

    test("flat to break", () => {
      expect(`foo = ${long};`).toChangeFormat(`foo =\n  ${long};`);
    });

    test("break to break", () => {
      expect(`foo =\n  ${long};`).toMatchFormat();
    });

    test("break to flat", () => {
      expect("foo =\n  1;").toChangeFormat("foo = 1;");
    });
  });

  describe("block", () => {
    test("flat to flat", () => {
      expect("{ 1 + 2; }").toMatchFormat();
    });

    test("flat to break", () => {
      expect("{ 1 + 2; 3 + 4; }").toChangeFormat("{\n  1 + 2;\n  3 + 4;\n}");
    });

    test("break to break", () => {
      expect("{\n  1 + 2;\n  3 + 4;\n}").toMatchFormat();
    });

    test("break to flat", () => {
      expect("{\n  1 + 2;\n}").toChangeFormat("{ 1 + 2; }");
    });
  });

  describe("binary", () => {
    test("flat to flat", () => {
      expect("1 + 2;").toMatchFormat();
    });

    test("flat to break", () => {
      expect(`1 + ${long};`).toChangeFormat(`1 +\n  ${long};`);
    });

    test("break to break", () => {
      expect(`1 +\n  ${long};`).toMatchFormat();
    });

    test("break to flat", () => {
      expect("1 +\n  2;").toChangeFormat("1 + 2;");
    });

    test("comment", () => {
      expect("1 + 2; // comment").toMatchFormat();
    });

    test.each(["-", "+", "/", "*", "!=", "==", ">", ">=", "<", "<=", "or", "and"])("%s", (operator) => {
      expect(`1 ${operator} 2;`).toMatchFormat();
    });
  });

  describe("forStmt", () => {
    test("nothing", () => {
      expect("for (;;) 1;").toMatchFormat();
    });

    test("initializer", () => {
      expect("for (var i = 0;;) 1;").toMatchFormat();
    });
  });

  describe("ifStmt", () => {
    test("flat to flat", () => {
      expect("if (foo) bar;").toMatchFormat();
    });

    test("flat to break", () => {
      expect(`if (${long}) bar;`).toChangeFormat(`if (\n  ${long}\n)\n  bar;`);
    });

    test("break to break", () => {
      expect(`if (\n  ${long}\n)\n  bar;`).toMatchFormat();
    });

    test("break to flat", () => {
      expect(`if (\n  foo\n) bar;`).toChangeFormat("if (foo) bar;");
    });

    test("with else", () => {
      expect("if (foo) bar; else baz;").toChangeFormat(`if (foo)\n  bar;\nelse\n  baz;`);
    });
  });

  describe("literal", () => {
    test.each(["true", "false", "nil", "123", "\"abc\""])("%s", (literal) => {
      expect(`${literal};`).toMatchFormat();
      expect(`${literal}; // comment`).toMatchFormat();
    });
  });

  describe("printStmt", () => {
    test("plain", () => {
      expect("print xxx;").toMatchFormat();
    });

    test("comment", () => {
      expect("print xxx; // comment").toMatchFormat();
    });
  });

  describe("scope", () => {
    test("declarations", () => {
      expect("var a = 1; var b = 2;").toChangeFormat("var a = 1;\nvar b = 2;");
    });

    test("spaces between declarations", () => {
      expect("var a = 1;\nvar b = 2;").toMatchFormat();
    });

    test("two newlines between declarations", () => {
      expect("var a = 1;\n\nvar b = 2;").toMatchFormat();
    });

    test("lots of newlines get collapsed", () => {
      expect("var a = 1;\n\n\nvar b = 2;").toChangeFormat("var a = 1;\n\nvar b = 2;");
    });
  });

  describe("unary", () => {
    test("minus", () => {
      expect("-xxx;").toMatchFormat();
    });
  
    test("bang", () => {
      expect("!xxx;").toMatchFormat();
    });

    test("comment", () => {
      expect("!xxx; // comment").toMatchFormat();
    });
  });

  describe("varDecl", () => {
    test("no init", () => {
      expect("var xxx;").toMatchFormat();
    });

    test("flat to flat", () => {
      expect("var xxx = 1;").toMatchFormat();
    });

    test("flat to break", () => {
      expect(`var xxx = ${long};`).toChangeFormat(`var xxx =\n  ${long};`);
    });

    test("break to break", () => {
      expect(`var xxx =\n  ${long};`).toMatchFormat();
    });

    test("break to flat", () => {
      expect("var xxx =\n  2;").toChangeFormat("var xxx = 2;");
    });
  
    test("comment", () => {
      expect("var xxx = 1; // comment").toMatchFormat();
    });
  });

  describe("whileStmt", () => {
    test("flat to flat", () => {
      expect("while (foo) bar;").toMatchFormat();
    });

    test("flat to break", () => {
      expect(`while (${long}) bar;`).toChangeFormat(`while (\n  ${long}\n)\n  bar;`);
    });

    test("break to break", () => {
      expect(`while (\n  ${long}\n)\n  bar;`).toMatchFormat();
    });

    test("break to flat", () => {
      expect(`while (\n  foo\n) bar;`).toChangeFormat("while (foo) bar;");
    });
  });
});
