import { createConnection, TextDocuments, ProposedFeatures, TextDocumentSyncKind } from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import getDiagnostics from "./getDiagnostics";

const connection = createConnection(ProposedFeatures.all);
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

connection.onInitialize(() => ({
  capabilities: {
    textDocumentSync: TextDocumentSyncKind.Incremental
  }
}));

documents.onDidChangeContent((changeEvent) => {
  const textDocument = changeEvent.document;
  const diagnostics = getDiagnostics(textDocument);
  connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
});

documents.listen(connection);
connection.listen();
