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
    case "call":
      return `(call ${printAST(node.recv)} [${node.args.map(printAST).join(", ")}])`;
    case "classDecl":
      return `(class ${node.name})`;
    case "exprStmt":
      return printAST(node.expr);
    case "forStmt": {
      let ast = `(for`;

      if (node.init) {
        ast = `${ast} ${printAST(node.init)}`;
      }

      if (node.cond) {
        ast = `${ast} ${printAST(node.cond)}`;
      }

      if (node.incr) {
        ast = `${ast} ${printAST(node.incr)}`;
      }

      return `${ast} ${printAST(node.stmt)})`;
    }
    case "funDecl": {
      let ast = `(fun ${printAST(node.name)}`;

      if (node.params.length > 0) {
        ast = `${ast} [${node.params.map(printAST).join(", ")}]`;
      }

      return `${ast} ${printAST(node.block)})`;
    }
    case "ifStmt": {
      let ast = `(if ${printAST(node.pred)} ${printAST(node.stmt)}`;

      if (node.cons) {
        ast = `${ast} ${printAST(node.cons)}`;
      }

      return `${ast})`;
    }
    case "literal":
      return printLiteral(node);
    case "missing":
      return " ";
    case "printStmt":
      return `(print ${printAST(node.expr)})`;
    case "returnStmt": {
      let ast = "(return";

      if (node.expr) {
        ast = `${ast} ${printAST(node.expr)}`;
      }

      return `${ast})`;
    }
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
    case "whileStmt":
      return `(while ${printAST(node.pred)} ${printAST(node.stmt)})`;
  }
}

export default printAST;
