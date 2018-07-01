// eslint-disable-next-line
import * as monaco from 'monaco-editor';

const { KeyCode, KeyMod } = monaco;

const MODES = {
  INSERT: 1,
  NORMAL: 2,
  VISUAL: 3,
};

const keyToCommand = {
  [KeyCode.KEY_H]: (vim) => {
    if (!vim.cursorIsAtStartOfLine()) {
      vim.trigger('cursorLeft');
    }
  },

  [KeyCode.KEY_J]: 'cursorDown',
  [KeyCode.KEY_K]: 'cursorUp',
  [KeyCode.KEY_U]: 'undo',
  [KeyCode.KEY_R]: 'redo',
  [KeyCode.KEY_L]: (vim) => {
    if (!vim.cursorIsAtEndOfLine()) {
      vim.trigger('cursorRight');
    }
  },

  [KeyCode.KEY_A]: (vim, editor) => {
    const position = editor.getPosition();

    if (position.column <= vim.getCurrentLineLength()) {
      vim.trigger('cursorRight');
    }
    vim.changeToInsertMode();
  },

  [KeyCode.Enter]: (vim, editor) => {
    const position = editor.getPosition();
    const lineCount = editor.model.getLineCount();

    if (position.lineNumber === lineCount) {
      return;
    }

    const firstNonSpaceColumn =
      editor.model.getLineFirstNonWhitespaceColumn(position.lineNumber + 1);
    editor.setPosition(new monaco.Position(position.lineNumber + 1, firstNonSpaceColumn));
    editor.revealLine(position.lineNumber + 1);
  },

  [KeyCode.US_SLASH]: (vim, editor) => {
    const findWidget = editor.getContribution('editor.contrib.findController');
    vim.trigger('actions.find');
    findWidget.setSearchString('');
  },

  [KeyCode.KEY_V]: (vim) => {
    vim.changeToVisualMode();
  },

  [(KeyMod.Shift | KeyCode.KEY_A)]: (vim, editor) => {
    const position = editor.getPosition();
    const lineLength = vim.getCurrentLineLength();
    vim.changeToInsertMode();
    editor.setPosition(new monaco.Position(position.lineNumber, lineLength + 1));
  },

  [(KeyMod.Shift | KeyCode.KEY_I)]: (vim, editor) => {
    const position = editor.getPosition();
    const firstNonSpaceColumn =
      editor.model.getLineFirstNonWhitespaceColumn(position.lineNumber);
    editor.setPosition(new monaco.Position(position.lineNumber, firstNonSpaceColumn));
    vim.changeToInsertMode();
  },

  [(KeyMod.Shift | KeyCode.KEY_G)]: (vim, editor) => {
    const lastLine = editor.model.getLineCount();
    editor.setPosition(new monaco.Position(lastLine, 1));
    editor.revealLine(lastLine);
  },

  [(KeyMod.Shift | KeyCode.KEY_8)]: (vim) => {
    vim.trigger('actions.find');
  },

  [(KeyMod.Shift | KeyCode.KEY_V)]: (vim) => {
    vim.changeToVisualMode();
  },
};

const visualKeyToCommand = [
  (KeyCode.KEY_J),
  (KeyCode.KEY_H),
  (KeyCode.KEY_K),
  (KeyCode.KEY_L),
  {
    [KeyCode.Escape]: (vim) => {
      vim.changeToNormalMode();
    },
  },
];

function monacoToVimKeyCode() {

}

class VimStatusBarOverlayWidget {
  constructor() {
    this.dom = document.createElement('div');
    this.dom.className = 'monaco-vim-status-bar';
    this.id = 'vim.ext.statusbaroverlay';
    this.position = {
      preference: monaco.editor.OverlayWidgetPositionPreference.BOTTOM_RIGHT_CORNER,
    };
  }

  getDomNode() {
    return this.dom;
  }

  getId() {
    return this.id;
  }

  getPosition() {
    return this.position;
  }

  setText(text) {
    this.dom.textContent = text;
  }
}

export default class VimExt {
  constructor(editor, ignoreKeys = []) {
    this.editor = editor;
    this.mode = MODES.INSERT;
    this.ignoreKeys = ignoreKeys;

    this.init();
  }

  init() {
    const { editor } = this;
    this.disposables = [];
    this.disposables.push(editor.onKeyDown(this.handleKeyDown));
    this.disposables.push(editor.onDidChangeCursorPosition(this.handleCursorChange));
    this.statusBarWidget = new VimStatusBarOverlayWidget();
    this.editor.addOverlayWidget(this.statusBarWidget);
    this.statusBarWidget.setText('--INSERT--');
  }

  modeIsNormal() {
    return this.mode === MODES.NORMAL;
  }

  modeIsInsert() {
    return this.mode === MODES.INSERT;
  }

  modeIsVisual() {
    return this.mode === MODES.VISUAL;
  }

  handleKeyDown = (e) => {
    console.log(e);
    e.preventDefault();
    const { ignoreKeys } = this;
    const isIgnorable = ignoreKeys.includes(e._asKeybinding);
    if (this.modeIsNormal()) {
      if (isIgnorable) {
        return;
      }
      this.handleKeyInNormalMode(e);
      return;
    } else if (this.modeIsVisual()) {
      if (isIgnorable) {
        return;
      }
      this.handleKeyInVisualMode(e);
      return;
    }

    if (e.keyCode !== KeyCode.Escape) {
      return;
    }

    this.changeToNormalMode();
  };

  handleCursorChange = ({ position, source }) => {
    if (!this.modeIsNormal() || source !== 'mouse') {
      return;
    }

    const { editor } = this;
    const maxCol = editor.model.getLineMaxColumn(position.lineNumber);

    if (position.column === maxCol) {
      editor.setPosition(new monaco.Position(position.lineNumber, maxCol - 1));
    }
  }

  changeToNormalMode() {
    const config = this.editor.getConfiguration();

    this.mode = MODES.NORMAL;
    this.initialCursorWidth = config.viewInfo.cursorWidth || 0;
    this.editor.updateOptions({
      cursorWidth: config.fontInfo.typicalFullwidthCharacterWidth,
      cursorBlinking: 'solid',
    });

    if (!this.cursorIsAtStartOfLine()) {
      this.trigger('cursorLeft');
    }

    this.visualModeStartPosition = null;
    this.statusBarWidget.setText('--NORMAL--');
  }

  changeToInsertMode() {
    this.mode = MODES.INSERT;
    this.editor.updateOptions({
      cursorWidth: this.initialCursorWidth,
      cursorBlinking: 'blink',
    });
    this.statusBarWidget.setText('--INSERT--');
  }

  changeToVisualMode() {
    this.mode = MODES.VISUAL;
    this.visualModeStartPosition = this.editor.getPosition();
    this.statusBarWidget.setText('--VISUAL--');
  }

  handleKeyInNormalMode(e) {
    e.preventDefault();

    if (e._asKeybinding === KeyCode.KEY_I) {
      this.changeToInsertMode();
      return;
    }

    const command = keyToCommand[e._asKeybinding];
    this.triggerKey(command);
  }

  handleKeyInVisualMode(e) {
    e.preventDefault();

    for (let i = 0; i < visualKeyToCommand.length; i += 1) {
      const cmd = visualKeyToCommand[i];

      if (typeof cmd === 'number') {
        const command = keyToCommand[e._asKeybinding];

        if (command) {
          this.triggerKey(command);
          this.updateVisualSelection();
          return;
        }
      } else if (typeof cmd === 'object') {
        const command = cmd[e._asKeybinding];

        if (!command) {
          return;
        }

        command(this);
        // this.updateVisualSelection();
      }
    }
  }

  updateVisualSelection() {
    const position = this.editor.getPosition();
    this.editor.setSelection(new monaco.Selection(
      this.visualModeStartPosition.lineNumber,
      this.visualModeStartPosition.column,
      position.lineNumber,
      position.column,
    ));
  }

  trigger(command) {
    this.editor.trigger('vim', command);
  }

  triggerKey(command) {
    if (!command) {
      return;
    }

    if (typeof command === 'string') {
      this.trigger(command);
    } else if (typeof command === 'function') {
      command(this, this.editor);
    }
  }

  destroy() {
    this.editor.removeOverlayWidget(this.statusBarWidget);
    this.changeToInsertMode();
    this.disposables.forEach(d => d.dispose());
  }

  getCurrentLineLength() {
    const position = this.editor.getPosition();
    return this.editor.model.getLineLength(position.lineNumber);
  }

  cursorIsAtStartOfLine() {
    const position = this.editor.getPosition();

    return (position.column <= 1);
  }

  cursorIsAtEndOfLine() {
    const position = this.editor.getPosition();
    const lineLength = this.editor.model.getLineLength(position.lineNumber);

    return (position.column >= lineLength);
  }

  setMarkAtCurrentPosition() {
    this.lastMark = this.editor.getPosition();
  }
}
