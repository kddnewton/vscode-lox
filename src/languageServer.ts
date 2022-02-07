import { createConnection, TextDocuments, ProposedFeatures, TextDocumentSyncKind, Range, TextEdit, DocumentFormattingParams, DocumentRangeFormattingParams } from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import getDiagnostics from "./getDiagnostics";
import formatSource, { FormatOptions } from "./formatSource";

const connection = createConnection(ProposedFeatures.all);
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

connection.onInitialize(() => ({
  capabilities: {
    textDocumentSync: TextDocumentSyncKind.Incremental,
    documentFormattingProvider: true,
    documentRangeFormattingProvider: true
  }
}));

documents.onDidChangeContent((changeEvent) => {
  const textDocument = changeEvent.document;
  const diagnostics = getDiagnostics(textDocument);
  connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
});

function formatDocument(
  document: TextDocument,
  params: DocumentFormattingParams | DocumentRangeFormattingParams,
  options: Partial<FormatOptions> = {}
): TextEdit[] | undefined {
  const source = document.getText();
  const formatted = formatSource(source, {
    ...options,
    insertSpaces: params.options.insertSpaces,
    tabSize: params.options.tabSize
  });

  const range = Range.create(document.positionAt(0), document.positionAt(source.length));
  return [TextEdit.replace(range, formatted)];
}

connection.onDocumentFormatting((params) => {
  const document = documents.get(params.textDocument.uri);

  if (document) {
    return formatDocument(document, params);
  }
});

connection.onDocumentRangeFormatting((params) => {
  const document = documents.get(params.textDocument.uri);

  if (document) {
    return formatDocument(document, params, {
      rangeStart: document.offsetAt(params.range.start),
      rangeEnd: document.offsetAt(params.range.end)
    });
  }
});

documents.listen(connection);
connection.listen();
