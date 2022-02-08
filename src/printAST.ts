import { printLiteral, printOperator } from "./formatSource";
import { AstNode } from "./parseSource";

function printAST(node: AstNode): string {
  switch (node.kind) {
    case "assign":
      return `(assign ${printAST(node.variable)} ${printAST(node.expression)})`;
    case "binary":
      return `(${printOperator(node.oper)} ${printAST(node.left)} ${printAST(node.right)})`;
    case "block":
      return `[${node.decls.map(printAST).join(", ")}]`;
    case "exprStmt":
      return printAST(node.expr);
    case "literal":
      return printLiteral(node);
    case "missing":
      return " ";
    case "printStmt":
      return `(print ${printAST(node.expr)})`;
    case "scope":
      return `[${node.decls.map(printAST).join(", ")}]`;
    case "unary":
      return `(${printOperator(node.oper)} ${printAST(node.expr)})`;
    case "varDecl":
      if (node.init) {
        return `(varDecl ${node.var} ${printAST(node.init)})`;
      } else {
        return `(varDecl ${node.var})`;
      }
    case "variable":
      return `(var ${node.name})`;
  }
}

export default printAST;
