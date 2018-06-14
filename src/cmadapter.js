export function convertChanges(editor, changes) {
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

export function convertLspRangeToCm(range) {
  return {
    from: {
      line: range.start.line,
      ch: range.start.character,
    },
    to: {
      line: range.end.line,
      ch: range.end.character,
    },
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
      range: convertLspRangeToCm(diagnostic.range),
      severity: severityToString(diagnostic.severity),
      code: diagnostic.code,
      source: diagnostic.source,
      message: diagnostic.message,
    };
  });
}

export function startListening(editor, client) {
  const onChange = function(_cm, changes) {
    client.resolveConnection()
    .then(() => {
      client.send('textDocument/didChange', {
        textDocument: {
          uri: 'file:///workspace/file.py',
          version: 1,
        },
        contentChanges: convertChanges(editor, changes),
      }, false);
    });
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
        }));
      });
    }
  };

  editor.on('changes', onChange);
  client.addDiagnosticListener(getDiagnostics);

  return function() {
    editor.off('changes', onChange);
    client.removeDiagnosticListener(getDiagnostics);
  };
}
