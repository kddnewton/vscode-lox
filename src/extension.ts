"use strict";

import path from "path";

import { ExtensionContext } from "vscode";
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from "vscode-languageclient/node";

export function activate(context: ExtensionContext) {
  const serverModule = context.asAbsolutePath(path.join("out", "languageServer.js"));
  const debugOptions = { execArgv: ["--nolazy", "--inspect=6009"] };

  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: { module: serverModule, transport: TransportKind.ipc, options: debugOptions }
  }

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: "file", language: "lox" }]
  };

  context.subscriptions.push(
    new LanguageClient("Lox", "Lox", serverOptions, clientOptions).start()
  );
}
