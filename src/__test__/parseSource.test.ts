import { printLiteral, printOperator } from "../formatSource";
import parseSource, { AstNode } from "../parseSource";

declare global {
  namespace jest {
    interface Matchers<R> {
      toMatchAST(expected: string): CustomMatcherResult;
    }
  }
}

function ast(node: AstNode): string {
  switch (node.kind) {
    case "assign":
      return `(assign ${ast(node.variable)} ${ast(node.expression)})`;
    case "binary":
      return `(${printOperator(node.oper)} ${ast(node.left)} ${ast(node.right)})`;
    case "exprStmt":
      return ast(node.expr);
    case "literal":
      return printLiteral(node);
    case "missing":
      return " ";
    case "printStmt":
      return `(print ${ast(node.expr)})`;
    case "scope":
      return `[${node.decls.map(ast).join(", ")}]`;
    case "unary":
      return `(${printOperator(node.oper)} ${ast(node.expr)})`;
    case "varDecl":
      if (node.init) {
        return `(varDecl ${node.var} ${ast(node.init)})`;
      } else {
        return `(varDecl ${node.var})`;
      }
    case "variable":
      return `(var ${node.name})`;
  }
}

expect.extend({
  toMatchAST(source: string, expected: string) {
    const received = ast(parseSource(source).scope);

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

  test("grouping", () => {
    expect("1 * (2 + 3)").toMatchAST("[(* 1 (+ 2 3))]");
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
