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
  });

  describe("literal", () => {
    test.each(["true", "false", "nil", "123", "\"abc\""])("%s", (literal) => {
      expect(`${literal};`).toMatchFormat();
    });
  });

  test("printStmt", () => {
    expect("print xxx;").toMatchFormat();
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
  });

  describe("varDecl", () => {
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
  });
});
