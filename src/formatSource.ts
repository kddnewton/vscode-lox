import prettier, { Doc, Plugin, Printer } from "prettier";
import { Comment, Token } from "./generateTokens";
import parseSource, { AstNode } from "./parseSource";

const { group, hardline, join, line, indent, softline } = prettier.doc.builders;

export function printOperator(token: Token) {
  switch (token) {
    case Token.MINUS: return "-";
    case Token.PLUS: return "+";
    case Token.SLASH: return "/";
    case Token.STAR: return "*";
    case Token.BANG_EQUAL: return "!=";
    case Token.BANG: return "!";
    case Token.EQUAL_EQUAL: return "==";
    case Token.EQUAL: return "=";
    case Token.GREATER_EQUAL: return ">=";
    case Token.GREATER: return ">";
    case Token.LESS_EQUAL: return "<=";
    case Token.LESS: return "<";
    case Token.AND: return "and";
    case Token.OR: return "or";
    default:
      throw new Error(`Not an operator: ${Token[token]}`);
  }
}

export function printLiteral(node: AstNode & { kind: "literal" }) {
  if (node.value === true) {
    return "true";
  } else if (node.value === false) {
    return "false";
  } else if (node.value === null) {
    return "nil";
  } else if (typeof node.value === "number") {
    return node.value.toString();
  } else {
    return `"${node.value}"`;
  }
}

const printDecls: Printer["print"] = (path, opts, print) => {
  const node = path.getValue();
  if (node.decls.length === 0) {
    return [];
  }

  const parts: Doc = [];
  let previous: number | null = null;

  path.each((declPath) => {
    const decl = declPath.getValue();

    if (previous !== null) {
      parts.push(hardline);

      if (decl.loc.start < previous || opts.originalText.substring(previous, decl.loc.start).split("\n").length > 2) {
        parts.push(hardline);
      }
    }

    parts.push(print(declPath));
    previous = decl.loc.end;
  }, "decls");

  return parts;
};

const plugin: Plugin<AstNode> = {
  languages: [
    {
      name: "Lox",
      parsers: ["lox"],
      extensions: [".lox"]
    }
  ],
  parsers: {
    lox: {
      parse(source) {
        const { parser, scope } = parseSource(source);
        return { ...scope, comments: parser.comments };
      },
      astFormat: "lox",
      locStart(node: AstNode) {
        return node.loc.start;
      },
      locEnd(node: AstNode) {
        return node.loc.end;
      }
    }
  },
  printers: {
    lox: {
      canAttachComment() {
        return true;
      },
      print(path, opts, print) {
        const node: AstNode = path.getValue();

        switch (node.kind) {
          case "assign":
            return group([
              path.call(print, "variable"),
              " =",
              indent([line, path.call(print, "expression")])
            ]);
          case "binary":
            return group([
              path.call(print, "left"),
              " ",
              printOperator(node.oper),
              indent([line, path.call(print, "right")])
            ]);
          case "block":
            return group([
              "{",
              indent([line, printDecls(path, opts, print)]),
              line,
              "}"
            ]);
          case "call":
            return group([
              path.call(print, "recv"),
              "(",
              indent([softline, join([",", line], path.map(print, "args"))]),
              softline,
              ")"
            ]);
          case "classDecl":
            return `class ${node.name} {}`;
          case "exprStmt":
            return [path.call(print, "expr"), ";"];
          case "forStmt": {
            const parts: Doc[] = [
              group([
                "for (",
                indent([
                  softline,
                  node.init ? path.call(print, "init") : ";",
                  node.cond ? [line, path.call(print, "cond"), ";"] : ";",
                  node.incr ? [line, path.call(print, "incr"), softline] : softline
                ]),
                ")"
              ]),
              indent([
                node.stmt.kind === "block" ? " " : line,
                path.call(print, "stmt")
              ])
            ];

            return group(parts);
          }
          case "funDecl": {
            let paramsDoc: Doc;

            if (node.params.length > 0) {
              paramsDoc = [
                "(",
                indent([softline, join([",", line], path.map(print, "params"))]),
                softline,
                ")"
              ];
            } else {
              paramsDoc = "()";
            }

            return group([
              group([
                group(["fun ", path.call(print, "name")]),
                " ",
                paramsDoc
              ]),
              " ",
              path.call(print, "block")
            ]);
          }
          case "ifStmt": {
            const parts: Doc[] = [
              group([
                "if (",
                indent([softline, path.call(print, "pred")]),
                softline,
                ")"
              ]),
              indent([
                node.stmt.kind === "block" ? " " : line,
                path.call(print, "stmt")
              ])
            ];

            if (node.cons) {
              parts.push(
                node.stmt.kind === "block" ? " " : hardline,
                "else",
                indent([node.cons.kind === "block" ? " " : hardline, path.call(print, "cons")])
              );
            }

            return group(parts);
          }
          case "literal":
            return printLiteral(node);
          case "missing":
            return " ";
          case "printStmt":
            return group(["print ", path.call(print, "expr"), ";"]);
          case "returnStmt":
            if (node.expr) {
              return group(["return ", path.call(print, "expr"), ";"]);
            } else {
              return "return;"
            }
          case "scope":
            return [printDecls(path, opts, print), hardline];
          case "unary":
            return group([printOperator(node.oper), path.call(print, "expr")]);
          case "variable":
            return node.name;
          case "varDecl":
            if (node.init) {
              return group(["var ", node.var, " =", indent([line, path.call(print, "init")]), ";"]);
            } else {
              return group(["var ", node.var, ";"]);
            }
          case "whileStmt":
            return group([
              group([
                "while (",
                indent([softline, path.call(print, "pred")]),
                softline,
                ")"
              ]),
              indent([
                node.stmt.kind === "block" ? " " : line,
                path.call(print, "stmt")
              ])
            ]);
        }
      },
      printComment(path) {
        return (path.getValue() as Comment).value;
      }
    }
  },
  defaultOptions: {
    printWidth: 80,
    tabWidth: 2
  }
};

// Doing it this way since @types/prettier is missing this declaration.
(plugin as any).printers.lox.getCommentChildNodes = (node: AstNode): AstNode[] => {
  switch (node.kind) {
    case "assign":
      return [node.variable, node.expression];
    case "binary":
      return [node.left, node.right];
    case "block":
    case "scope":
      return node.decls;
    case "call":
      return [node.recv, ...node.args];
    case "classDecl":
      return [];
    case "exprStmt":
    case "printStmt":
    case "unary":
      return [node.expr];
    case "forStmt": {
      const childNodes = [];

      if (node.init) {
        childNodes.push(node.init);
      }

      if (node.cond) {
        childNodes.push(node.cond);
      }

      if (node.incr) {
        childNodes.push(node.incr);
      }

      childNodes.push(node.stmt);
      return childNodes;
    }
    case "funDecl":
      return [node.name, node.block];
    case "ifStmt": {
      const childNodes = [node.pred, node.stmt];
      if (node.cons) {
        childNodes.push(node.cons);
      }

      return childNodes;
    }
    case "literal":
    case "missing":
    case "variable":
      return [];
    case "returnStmt":
      return node.expr ? [node.expr] : [];
    case "varDecl": {
      const childNodes = [];
      if (node.init) {
        childNodes.push(node.init);
      }

      return childNodes;
    }
    case "whileStmt":
      return [node.pred, node.stmt];
  }
};

export type FormatOptions = {
  insertSpaces: boolean,
  rangeStart?: number,
  rangeEnd?: number,
  tabSize: number
};

function formatSource(source: string, options: FormatOptions = { insertSpaces: true, tabSize: 2 }) {
  return prettier.format(source, {
    parser: "lox",
    plugins: [plugin],
    rangeStart: options.rangeStart,
    rangeEnd: options.rangeEnd,
    tabWidth: options.tabSize,
    useTabs: !options.insertSpaces
  });
}

export default formatSource;
