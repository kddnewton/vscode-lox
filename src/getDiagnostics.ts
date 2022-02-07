import { TextDocument } from "vscode-languageserver-textdocument";
import { Diagnostic, DiagnosticSeverity } from "vscode-languageserver/node";
import generateTokens, { Token, TokenError } from "./generateTokens";

function getTokenErrorMessage(tokenError: TokenError) {
  switch (tokenError) {
    case TokenError.UNTERMINATED_STRING: return "Unterminated string.";
    case TokenError.UNRECOGNIZED_LEXEME: return "Unrecognized lexeme.";
  }
}

function getDiagnostics(textDocument: TextDocument): Diagnostic[] {
  const diagnostics = [];
  let previousError: TokenError | null = null;

  for (const token of generateTokens(textDocument.getText())) {
    if (token.kind === Token.ERROR) {
      if (previousError !== null && previousError === token.error) {
        diagnostics[diagnostics.length - 1].range.end = textDocument.positionAt(token.end);
      } else {
        diagnostics.push({
          severity: DiagnosticSeverity.Error,
          range: {
            start: textDocument.positionAt(token.start),
            end: textDocument.positionAt(token.end)
          },
          message: getTokenErrorMessage(token.error)
        });
      }

      previousError = token.error;
    } else {
      previousError = null;
    }
  }

  return diagnostics;
}

export default getDiagnostics;
