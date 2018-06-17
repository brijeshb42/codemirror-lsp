export function convertCmChangestoLsp(editor, changes) {
  return changes.map(change => {
    const range = {};

    if (change.from.line === change.to.line) {
      range.rangeLength = Math.abs(change.from.ch - change.to.ch);
    } else {
      let len = 0;
      for(let i=change.from.line; i<=change.to.line; i++) {
        const line = editor.getLine(i);
        if (!line) {
          continue;
        }
        if (i === change.from.line) {
          len += (line.length - change.from.ch);
        } else if (i === change.to.line) {
          len += change.to.ch;
        } else {
          len += line.length;
        }
      }
      range.rangeLength = len;
    }

    range.range = {
      start: {
        line: change.from.line,
        character: change.from.ch,
      },
      end: {
        line: change.to.line,
        character: change.to.ch,
      },
    };

    range.text = change.text.join('\n');

    return range;
  });
}

export function convertLspPositionToCm(pos) {
  return {
    line: pos.line,
    ch: pos.character,
  };
}

export function convertLspRangeToCm(range) {
  return {
    from: convertLspPositionToCm(range.start),
    to: convertLspPositionToCm(range.end),
  };
}

export function severityToString(level) {
  switch(level) {
    case 1:
    return 'error';
    case 2:
    return 'warning';
    case 3:
    return 'info';
    case 4:
    return 'hint';
    default:
    return '' + level;
  }
}

export function convertLspDiagnosticsToCm(diagnostics) {
  return diagnostics.map(diagnostic => {
    return {
      // range: convertLspRangeToCm(diagnostic.range),
      severity: severityToString(diagnostic.severity),
      code: diagnostic.code,
      source: diagnostic.source,
      message: diagnostic.message,
      from: convertLspPositionToCm(diagnostic.range.start),
      to: convertLspPositionToCm(diagnostic.range.end),
    };
  });
}

export function convertLspCompletionToCm(completions, options) {
  return completions.map(item => {
    return {
      text: item.insertText,
      displayText: item.label || item.insertText,
      className: options.completionItemClassName || '',
    };
  });
}

export function createAdapter(editor, client, options = {}) {
  let connectionResolved = false;
  let autoCompletionEnabled = false;
  let triggerChars = [];

  const onChange = function(_cm, changes) {
    client.resolveConnection()
    .then(() => {
      client.send('textDocument/didChange', {
        textDocument: {
          uri: 'file:///workspace/file.py',
          version: 1,
        },
        contentChanges: convertCmChangestoLsp(editor, changes),
      }, false);
    });

    if (autoCompletionEnabled && changes.length && triggerChars.includes(changes[0].text[0])) {
      editor.execCommand('autocomplete');
    }
  };

  let previousMarks = [];
  const getDiagnostics = function(params) {
    previousMarks.forEach(mark => mark.clear());
    previousMarks = [];

    if (params.diagnostics.length) {
      convertLspDiagnosticsToCm(params.diagnostics).forEach(diag => {
        previousMarks.push(editor.markText(diag.range.from, diag.range.to, {
          className: 'cm-lint-' + diag.severity,
          title: diag.message,
          inclusiveRight: true,
        }));
      });
    }
  };

  let lastAnnotations = [];
  let lastPromise = null;
  const di = function(params) {
    if (lastPromise) {
      lastPromise(convertLspDiagnosticsToCm(params.diagnostics));
    }
  }

  const completionKeyMap = {
    'Ctrl-N': function(_cm, handlers) {
      handlers.moveFocus(1);
    },
    'Ctrl-P': function(_cm, handlers) {
      handlers.moveFocus(-1);
    },
  };

  const completion = function(editor, opt) {
    return new Promise((resolve, reject) => {
      client.resolveConnection()
      .then(() => {
        const cursor = editor.getCursor();
        const pr = client.send('textDocument/completion', {
          textDocument: {
            uri: 'file:///workspace/file.py',
          },
          position: {
            character: cursor.ch,
            line: cursor.line,
          },
        });

        pr.then((data) => {
          const newCursor = editor.getCursor();
          let start = newCursor.ch;
          let end = newCursor.ch;

          if (start !== cursor.ch && newCursor.line !== cursor.line) {
            reject();
            return;
          }

          const line = editor.getLine(newCursor.line);

          while (start && /\w/.test(line.charAt(start - 1))) {
            start -= 1;
          }

          while (end < line.length && /\w/.test(line.charAt(end))) {
            end += 1;
          }

          if (data.items && data.items.length) {
            resolve({
              list: convertLspCompletionToCm(data.items, options),
              from: {
                line: newCursor.line,
                ch: start,
              },
              to: {
                line: newCursor.line,
                ch: end,
              },
            });
          } else {
            reject();
          }
        });
      });
    });
  };

  return {
    start: function() {
      client.resolveConnection()
      .then(() => {
        client.initialize()
        .then(() => {
          editor.on('changes', onChange);
          connectionResolved = true;

          client.send('textDocument/didOpen', {
            textDocument: {
              uri: 'file:///workspace/file.py',
              languageId: editor.getMode().name,
              version: 1,
              text: editor.getValue(),
            },
          }, false);
          triggerChars = (client.serverCapabilities.completionProvider && client.serverCapabilities.completionProvider.triggerCharacters) ? client.serverCapabilities.completionProvider.triggerCharacters : null;

          if (client.serverCapabilities.completionProvider) {
            if (options.loadHintModule) {
              options.loadHintModule()
              .then(() => {
                autoCompletionEnabled = true;
                editor.setOption('hintOptions', {
                  hint: completion,
                  container: editor.getWrapperElement().parentNode,
                  alignWithWord: false,
                  extraKeys: completionKeyMap,
                });
              });
            }
          }

          editor.setOption('lintAsync', true);
          editor.setOption('lint', {
            getAnnotations(value, opts, cm) {
              return new Promise((resolve) => {
                lastPromise = resolve;
              });
            },
          });
          client.addDiagnosticListener(di);
        });
      });
    },
    dispose: function() {
      if (!connectionResolved) {
        client.close();
        return;
      }

      editor.off('changes', onChange);
      client.removeDiagnosticListener(getDiagnostics);
      previousMarks.forEach(mark => mark.clear());

      if (autoCompletionEnabled) {
        editor.setOption('hintOptions', {
          hint: null,
        });
      }

      client.close();
    },
  };
}
