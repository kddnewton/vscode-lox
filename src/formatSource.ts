import prettier, { Doc, Plugin } from "prettier";
import { Comment, Token } from "./generateTokens";
import parseTree, { AstNode } from "./parseTree";

function printOperator(token: Token) {
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
    default:
      throw new Error(`Not an operator: ${Token[token]}`);
  }
}

const { group, hardline, line, indent } = prettier.doc.builders;

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
        const { parser, scope } = parseTree(source);
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
          case "binary":
            return group([
              path.call(print, "left"),
              " ",
              printOperator(node.oper),
              indent([line, path.call(print, "right")])
            ]);
          case "decls": {
            const parts: Doc = [];
            let previous: number = 0;

            path.each((declPath) => {
              const decl = declPath.getValue();

              if (previous !== 0) {
                parts.push(hardline);
              }

              if (decl.loc.start < previous || opts.originalText.substring(previous, decl.loc.start).split("\n").length > 2) {
                parts.push(hardline);
              }

              parts.push(print(declPath));
              previous = decl.loc.end;
            }, "decls");

            return [parts, hardline];
          }
          case "exprStmt":
            return [path.call(print, "expr"), ";"];
          case "literal":
            if (node.value === true) {
              return "true";
            } else if (node.value === false) {
              return "false";
            } else if (node.value === null) {
              return "null";
            } else if (typeof node.value === "number") {
              return node.value.toString();
            } else {
              return group(["\"", node.value, "\""]);
            }
          case "missing":
            return " ";
          case "printStmt":
            return group(["print ", path.call(print, "expr"), ";"]);
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
(plugin as any).printers.lox.getCommentChildNodes = (node: AstNode) => {
  switch (node.kind) {
    case "binary":
      return [node.left, node.right];
    case "decls":
      return node.decls;
    case "exprStmt":
    case "printStmt":
    case "unary":
      return [node.expr];
    case "literal":
    case "var":
      return [];
    case "varDecl":
      return [node.init];
  }
};

export type FormatOptions = {
  insertSpaces: boolean,
  rangeStart?: number,
  rangeEnd?: number,
  tabSize: number
};

function formatSource(source: string, options: FormatOptions) {
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
