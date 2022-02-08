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
});
