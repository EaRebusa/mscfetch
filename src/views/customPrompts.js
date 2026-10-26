import {
  createPrompt,
  useState,
  useKeypress,
  usePrefix,
  usePagination,
  useMemo,
  useRef,
  useEffect,
  makeTheme,
  isUpKey,
  isDownKey,
  isNumberKey,
  isEnterKey,
  isBackspaceKey,
  isTabKey,
  ValidationError,
  Separator,
} from '@inquirer/core';
import { cursorHide } from '@inquirer/ansi';
import { styleText } from 'node:util';
import figures from '@inquirer/figures';

export const BACK_ACTION = Symbol('BACK');

export function isEscapeKey(key) {
  return (
    key.name === 'escape' ||
    key.name === 'esc' ||
    (key.sequence === '\x1b' && !key.ctrl && !key.meta && !key.shift)
  );
}

export function isToggleKey(key) {
  return key.name === 'd' || key.name === 'D';
}

// ---------------------------------------------------------
// Custom Checkbox Prompt: 'd' toggles, Esc cancels/goes back
// ---------------------------------------------------------
const checkboxTheme = {
  icon: {
    checked: styleText('green', figures.circleFilled),
    unchecked: figures.circle,
    cursor: figures.pointer,
    disabledChecked: styleText('green', figures.circleDouble),
    disabledUnchecked: '-',
  },
  style: {
    disabled: (text) => styleText('dim', text),
    renderSelectedChoices: (selectedChoices) =>
      selectedChoices.map((choice) => choice.short).join(', '),
    description: (text) => styleText('cyan', text),
    keysHelpTip: (keys) =>
      keys
        .map(([key, action]) => `${styleText('bold', key)} ${styleText('dim', action)}`)
        .join(styleText('dim', ' • ')),
  },
  i18n: { disabledError: 'This option is disabled and cannot be toggled.' },
};

function isSelectable(item) {
  return !Separator.isSeparator(item) && !item.disabled;
}

function isNavigable(item) {
  return !Separator.isSeparator(item);
}

function isChecked(item) {
  return !Separator.isSeparator(item) && item.checked;
}

function toggle(item) {
  return isSelectable(item) ? { ...item, checked: !item.checked } : item;
}

function check(checked) {
  return function (item) {
    return isSelectable(item) ? { ...item, checked } : item;
  };
}

function normalizeCheckboxChoices(choices) {
  return choices.map((choice) => {
    if (Separator.isSeparator(choice)) return choice;
    if (typeof choice !== 'object' || choice === null || !('value' in choice)) {
      const name = String(choice);
      return {
        value: choice,
        name,
        short: name,
        checkedName: name,
        disabled: false,
        checked: false,
      };
    }
    const name = choice.name ?? String(choice.value);
    const normalizedChoice = {
      value: choice.value,
      name,
      short: choice.short ?? name,
      checkedName: choice.checkedName ?? name,
      disabled: choice.disabled ?? false,
      checked: choice.checked ?? false,
    };
    if (choice.description) {
      normalizedChoice.description = choice.description;
    }
    return normalizedChoice;
  });
}

export const customCheckbox = createPrompt((config, done) => {
  const { pageSize = 7, loop = true, required, validate = () => true } = config;
  const shortcuts = { all: 'a', invert: 'i', ...config.shortcuts };
  const theme = makeTheme(checkboxTheme, config.theme);
  const { keybindings } = theme;
  const [status, setStatus] = useState('idle');
  const prefix = usePrefix({ status, theme });
  const [items, setItems] = useState(normalizeCheckboxChoices(config.choices));
  const isCancelledRef = useRef(false);

  const bounds = useMemo(() => {
    const first = items.findIndex(isNavigable);
    const last = items.findLastIndex(isNavigable);
    if (first === -1) {
      throw new ValidationError('[checkbox prompt] No selectable choices. All choices are disabled.');
    }
    return { first, last };
  }, [items]);

  const [active, setActive] = useState(bounds.first);
  const [errorMsg, setError] = useState();

  useKeypress(async (key) => {
    if (status !== 'idle') return;

    if (isEscapeKey(key)) {
      isCancelledRef.current = true;
      setStatus('done');
      done(BACK_ACTION);
      return;
    }

    if (isEnterKey(key)) {
      setStatus('loading');
      const selection = items.filter(isChecked);
      const isValid = await validate([...selection]);
      setStatus('idle');
      if (required && !selection.length) {
        setError('At least one choice must be selected');
      } else if (isValid === true) {
        setStatus('done');
        done(selection.map((choice) => choice.value));
      } else {
        setError(isValid || 'You must select a valid value');
      }
    } else if (isUpKey(key, keybindings) || isDownKey(key, keybindings)) {
      if (errorMsg) setError(undefined);
      if (
        loop ||
        (isUpKey(key, keybindings) && active !== bounds.first) ||
        (isDownKey(key, keybindings) && active !== bounds.last)
      ) {
        const offset = isUpKey(key, keybindings) ? -1 : 1;
        let next = active;
        do {
          next = (next + offset + items.length) % items.length;
        } while (!isNavigable(items[next]));
        setActive(next);
      }
    } else if (isToggleKey(key)) {
      const activeItem = items[active];
      if (activeItem && !Separator.isSeparator(activeItem)) {
        if (activeItem.disabled) {
          setError(theme.i18n.disabledError);
        } else {
          setError(undefined);
          setItems(items.map((choice, i) => (i === active ? toggle(choice) : choice)));
        }
      }
    } else if (key.name === shortcuts.all) {
      const selectAll = items.some((choice) => isSelectable(choice) && !choice.checked);
      setItems(items.map(check(selectAll)));
    } else if (key.name === shortcuts.invert) {
      setItems(items.map(toggle));
    } else if (isNumberKey(key)) {
      const selectedIndex = Number(key.name) - 1;
      let selectableIndex = -1;
      const position = items.findIndex((item) => {
        if (Separator.isSeparator(item)) return false;
        selectableIndex++;
        return selectableIndex === selectedIndex;
      });
      const selectedItem = items[position];
      if (selectedItem && isSelectable(selectedItem)) {
        setActive(position);
        setItems(items.map((choice, i) => (i === position ? toggle(choice) : choice)));
      }
    }
  });

  const message = theme.style.message(config.message, status);
  let description;
  const page = usePagination({
    items,
    active,
    renderItem({ item, isActive }) {
      if (Separator.isSeparator(item)) {
        return ` ${item.separator}`;
      }
      const cursor = isActive ? theme.icon.cursor : ' ';
      if (item.disabled) {
        const disabledLabel = typeof item.disabled === 'string' ? item.disabled : '(disabled)';
        const checkbox = item.checked
          ? theme.icon.disabledChecked
          : theme.icon.disabledUnchecked;
        return theme.style.disabled(`${cursor}${checkbox} ${item.name} ${disabledLabel}`);
      }
      if (isActive) {
        description = item.description;
      }
      const checkbox = item.checked ? theme.icon.checked : theme.icon.unchecked;
      const name = item.checked ? item.checkedName : item.name;
      const color = isActive ? theme.style.highlight : (x) => x;
      return color(`${cursor}${checkbox} ${name}`);
    },
    pageSize,
    loop,
  });

  if (status === 'done') {
    if (isCancelledRef.current) {
      return [prefix, message, theme.style.disabled('(back)')].filter(Boolean).join(' ');
    }
    const selection = items.filter(isChecked);
    const answer = theme.style.answer(theme.style.renderSelectedChoices(selection, items));
    return [prefix, message, answer].filter(Boolean).join(' ');
  }

  const keys = [
    ['↑↓', 'navigate'],
    ['d', 'toggle'],
  ];
  if (shortcuts.all) keys.push([shortcuts.all, 'all']);
  if (shortcuts.invert) keys.push([shortcuts.invert, 'invert']);
  keys.push(['esc', 'back']);
  keys.push(['⏎', 'submit']);
  const helpLine = theme.style.keysHelpTip(keys);

  const lines = [
    [prefix, message].filter(Boolean).join(' '),
    page,
    ' ',
    description ? theme.style.description(description) : '',
    errorMsg ? theme.style.error(errorMsg) : '',
    helpLine,
  ]
    .filter(Boolean)
    .join('\n')
    .trimEnd();

  return `${lines}${cursorHide}`;
});

// ---------------------------------------------------------
// Custom Input Prompt: Esc cancels / goes back
// ---------------------------------------------------------
const inputTheme = {
  validationFailureMode: 'keep',
};

export const customInput = createPrompt((config, done) => {
  const { prefill = 'tab' } = config;
  const theme = makeTheme(inputTheme, config.theme);
  const [status, setStatus] = useState('idle');
  const [defaultValue, setDefaultValue] = useState(String(config.default ?? ''));
  const [errorMsg, setError] = useState();
  const [value, setValue] = useState('');
  const isCancelledRef = useRef(false);
  const prefix = usePrefix({ status, theme });

  async function validate(val) {
    const { required, pattern, patternError = 'Invalid input' } = config;
    if (required && !val) return 'You must provide a value';
    if (pattern && !pattern.test(val)) return patternError;
    if (typeof config.validate === 'function') {
      return (await config.validate(val)) || 'You must provide a valid value';
    }
    return true;
  }

  useKeypress(async (key, rl) => {
    if (status !== 'idle') return;

    if (isEscapeKey(key)) {
      rl.clearLine(0);
      isCancelledRef.current = true;
      setStatus('done');
      done(BACK_ACTION);
      return;
    }

    if (isEnterKey(key)) {
      const answer = value || defaultValue;
      setStatus('loading');
      const isValid = await validate(answer);
      if (isValid === true) {
        setValue(answer);
        setStatus('done');
        done(answer);
      } else {
        if (theme.validationFailureMode === 'clear') {
          setValue('');
        } else {
          rl.write(value);
        }
        setError(isValid);
        setStatus('idle');
      }
    } else if (isBackspaceKey(key) && !value) {
      setDefaultValue('');
    } else if (isTabKey(key) && !value) {
      setDefaultValue('');
      rl.clearLine(0);
      rl.write(defaultValue);
      setValue(defaultValue);
    } else {
      setDefaultValue('');
      setValue(rl.line);
      setError(undefined);
    }
  });

  useEffect((rl) => {
    if (prefill === 'editable' && defaultValue) {
      rl.write(defaultValue);
      setValue(defaultValue);
    }
  }, []);

  const message = theme.style.message(config.message, status);
  let formattedValue = value;
  if (status === 'done' && isCancelledRef.current) {
    formattedValue = theme.style.disabled ? theme.style.disabled('(back)') : '(back)';
  } else if (typeof config.transformer === 'function') {
    formattedValue = config.transformer(value, { isFinal: status === 'done' });
  } else if (status === 'done') {
    formattedValue = theme.style.answer(value);
  }

  let defaultStr;
  if (defaultValue && status !== 'done' && !value) {
    defaultStr = theme.style.defaultAnswer(defaultValue);
  }

  let error = '';
  if (errorMsg) {
    error = theme.style.error(errorMsg);
  }

  return [
    [prefix, message, defaultStr, formattedValue]
      .filter((v) => v !== undefined)
      .join(' '),
    error,
  ];
});

// ---------------------------------------------------------
// Custom Select Prompt: Esc cancels / goes back
// ---------------------------------------------------------
const selectTheme = {
  icon: { cursor: figures.pointer },
  style: {
    disabled: (text) => styleText('dim', text),
    description: (text) => styleText('cyan', text),
    keysHelpTip: (keys) =>
      keys
        .map(([key, action]) => `${styleText('bold', key)} ${styleText('dim', action)}`)
        .join(styleText('dim', ' • ')),
  },
  i18n: { disabledError: 'This option is disabled and cannot be selected.' },
  indexMode: 'hidden',
};

function normalizeSelectChoices(choices) {
  return choices.map((choice) => {
    if (Separator.isSeparator(choice)) return choice;
    if (typeof choice !== 'object' || choice === null || !('value' in choice)) {
      const name = String(choice);
      return {
        value: choice,
        name,
        short: name,
        disabled: false,
      };
    }
    const name = choice.name ?? String(choice.value);
    const normalizedChoice = {
      value: choice.value,
      name,
      short: choice.short ?? name,
      disabled: choice.disabled ?? false,
    };
    if (choice.description) {
      normalizedChoice.description = choice.description;
    }
    return normalizedChoice;
  });
}

export const customSelect = createPrompt((config, done) => {
  const { loop = true, pageSize = 7 } = config;
  const theme = makeTheme(selectTheme, config.theme);
  const { keybindings } = theme;
  const [status, setStatus] = useState('idle');
  const prefix = usePrefix({ status, theme });
  const searchTimeoutRef = useRef();
  const isCancelledRef = useRef(false);
  const searchEnabled = !keybindings.includes('vim');
  const items = useMemo(() => normalizeSelectChoices(config.choices), [config.choices]);
  const bounds = useMemo(() => {
    const first = items.findIndex(isNavigable);
    const last = items.findLastIndex(isNavigable);
    if (first === -1) {
      throw new ValidationError('[select prompt] No selectable choices. All choices are disabled.');
    }
    return { first, last };
  }, [items]);

  const [active, setActive] = useState(bounds.first);
  const [errorMsg, setError] = useState();
  const selectedChoice = items[active];

  useKeypress((key, rl) => {
    clearTimeout(searchTimeoutRef.current);
    if (errorMsg) setError(undefined);

    if (isEscapeKey(key)) {
      isCancelledRef.current = true;
      setStatus('done');
      done(BACK_ACTION);
      return;
    }

    if (isEnterKey(key)) {
      if (selectedChoice.disabled) {
        setError(theme.i18n.disabledError);
      } else {
        setStatus('done');
        done(selectedChoice.value);
      }
    } else if (isUpKey(key, keybindings) || isDownKey(key, keybindings)) {
      rl.clearLine(0);
      if (
        loop ||
        (isUpKey(key, keybindings) && active !== bounds.first) ||
        (isDownKey(key, keybindings) && active !== bounds.last)
      ) {
        const offset = isUpKey(key, keybindings) ? -1 : 1;
        let next = active;
        do {
          next = (next + offset + items.length) % items.length;
        } while (!isNavigable(items[next]));
        setActive(next);
      }
    } else if (isNumberKey(key) && !Number.isNaN(Number(rl.line))) {
      const selectedIndex = Number(rl.line) - 1;
      let selectableIndex = -1;
      const position = items.findIndex((item) => {
        if (Separator.isSeparator(item)) return false;
        selectableIndex++;
        return selectableIndex === selectedIndex;
      });
      const item = items[position];
      if (item != null && isSelectable(item)) {
        setActive(position);
      }
      searchTimeoutRef.current = setTimeout(() => {
        rl.clearLine(0);
      }, 700);
    } else if (isBackspaceKey(key)) {
      rl.clearLine(0);
    } else if (searchEnabled) {
      const searchTerm = rl.line.toLowerCase();
      const matchIndex = items.findIndex((item) => {
        if (Separator.isSeparator(item) || !isSelectable(item)) return false;
        return item.name.toLowerCase().startsWith(searchTerm);
      });
      if (matchIndex !== -1) {
        setActive(matchIndex);
      }
      searchTimeoutRef.current = setTimeout(() => {
        rl.clearLine(0);
      }, 700);
    }
  });

  useEffect(() => () => {
    clearTimeout(searchTimeoutRef.current);
  }, []);

  const message = theme.style.message(config.message, status);
  const helpLine = theme.style.keysHelpTip([
    ['↑↓', 'navigate'],
    ['esc', 'back'],
    ['⏎', 'select'],
  ]);

  let separatorCount = 0;
  const page = usePagination({
    items,
    active,
    renderItem({ item, isActive, index }) {
      if (Separator.isSeparator(item)) {
        separatorCount++;
        return ` ${item.separator}`;
      }
      const cursor = isActive ? theme.icon.cursor : ' ';
      const indexLabel = theme.indexMode === 'number' ? `${index + 1 - separatorCount}. ` : '';
      if (item.disabled) {
        const disabledLabel = typeof item.disabled === 'string' ? item.disabled : '(disabled)';
        const disabledCursor = isActive ? theme.icon.cursor : '-';
        return theme.style.disabled(`${disabledCursor} ${indexLabel}${item.name} ${disabledLabel}`);
      }
      const color = isActive ? theme.style.highlight : (x) => x;
      return color(`${cursor} ${indexLabel}${item.name}`);
    },
    pageSize,
    loop,
  });

  if (status === 'done') {
    if (isCancelledRef.current) {
      return [prefix, message, theme.style.disabled ? theme.style.disabled('(back)') : '(back)']
        .filter(Boolean)
        .join(' ');
    }
    return [prefix, message, theme.style.answer(selectedChoice.short)]
      .filter(Boolean)
      .join(' ');
  }

  const { description } = selectedChoice;
  const lines = [
    [prefix, message].filter(Boolean).join(' '),
    page,
    ' ',
    description ? theme.style.description(description) : '',
    errorMsg ? theme.style.error(errorMsg) : '',
    helpLine,
  ]
    .filter(Boolean)
    .join('\n')
    .trimEnd();

  return `${lines}${cursorHide}`;
});

// ---------------------------------------------------------
// Custom Confirm Prompt: Esc acts as 'no'
// ---------------------------------------------------------
const confirmTheme = {
  keywords: {
    yes: 'Yes',
    no: 'No',
    error: ({ yes, no }) => `You must answer with "${yes}" or "${no}"`,
  },
  style: {
    confirmDefault: (text) => {
      const first = text[0] ?? '';
      if (first.toLowerCase() === first.toUpperCase()) {
        return styleText('cyan', text);
      }
      return first.toUpperCase() + text.slice(1);
    },
  },
};

export const customConfirm = createPrompt((config, done) => {
  const [status, setStatus] = useState('idle');
  const [value, setValue] = useState('');
  const [errorMsg, setError] = useState();
  const theme = makeTheme(confirmTheme, config.theme);
  const prefix = usePrefix({ status, theme });
  const { yes, no } = theme.keywords;
  const isCancelledRef = useRef(false);

  const yesHint = (yes[0] ?? '').toLowerCase();
  const noHint = (no[0] ?? '').toLowerCase();
  const hint =
    config.default === false
      ? `${yesHint}/${theme.style.confirmDefault(noHint)}`
      : `${theme.style.confirmDefault(yesHint)}/${noHint}`;

  function boolToString(val) {
    return val ? yes : no;
  }
  const { transformer = boolToString } = config;

  function getBooleanValue(val) {
    const v = val.trim().toLowerCase();
    if (v === '') return config.default !== false;
    if (yes.toLowerCase().startsWith(v)) return true;
    if (no.toLowerCase().startsWith(v)) return false;
    if ('yes'.startsWith(v)) return true;
    if ('no'.startsWith(v)) return false;
    return undefined;
  }

  useKeypress((key, rl) => {
    if (status !== 'idle') return;

    if (isEscapeKey(key)) {
      isCancelledRef.current = true;
      setStatus('done');
      done(false);
      return;
    }

    if (isEnterKey(key)) {
      const answer = getBooleanValue(value);
      if (typeof answer === 'boolean') {
        setStatus('done');
        done(answer);
      } else {
        setError(theme.keywords.error({ yes, no }));
      }
    } else if (isBackspaceKey(key)) {
      rl.clearLine(0);
      setValue('');
      setError(undefined);
    } else {
      setValue(rl.line);
      setError(undefined);
    }
  });

  const message = theme.style.message(config.message, status);
  let formattedValue = value;
  let defaultValue = '';
  if (status === 'done') {
    if (isCancelledRef.current) {
      formattedValue = theme.style.answer(no);
    } else {
      formattedValue = theme.style.answer(value || transformer(config.default !== false));
    }
  } else {
    defaultValue = ` ${theme.style.defaultAnswer(hint)}`;
  }

  let error = '';
  if (errorMsg) {
    error = theme.style.error(errorMsg);
  }

  return [
    `${prefix} ${message}${defaultValue} ${formattedValue}`,
    error,
  ];
});
