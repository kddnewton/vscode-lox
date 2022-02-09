# vscode-lox

VSCode support for the lox programming language from the [Crafting Interpreters](https://craftinginterpreters.com/) book by Robert Nystrom.

## Getting started

This extension isn't published yet, as it does not yet support for the full language. However, if you want to play around with it while it continues to improve, you can perform the following:

* Clone the repository

```
git clone git@github.com:kddnewton/vscode-lox.git
cd vscode-lox
```

* Install the dependencies

```
yarn install
```

* Open VSCode within the workspace

```
code .
```

* Run the extension locally (press `F5`)
* Open a `.lox` file.

## Capabilities

This extension ships with:

* Syntax highlighting.

Many thanks to [Daniel Berezin](https://github.com/danman113/lox-language) for a lot of the work here. [LICENSE](syntaxes/LICENSE).

* Formatting support.

This package ships with a [prettier](https://prettier.io) plugin that performs formatting on request. You can trigger it with the `Format Document` command, or you can enable `formatOnSave` on your editor configuration.

* Diagnostics support.

While editing, this package enables basic syntax error highlighting. It is reasonably resiliant, such that a syntax error on one line won't trigger more errors on subsequent lines.

## Contributing

Bug reports and pull requests are welcome on GitHub at https://github.com/kddnewton/vscode-lox.

## License

The project is available as open source under the terms of the [MIT License](https://opensource.org/licenses/MIT).
