import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  applyTagSuggestion,
  collectKnownTags,
  suggestTags,
} from '../utils/categories';

/**
 * Tag text field with autocomplete from tags already used on expenses.
 */
export default function TagInput({
  value = '',
  onChange,
  placeholder = 'Tag · #trip',
  className = 'input',
  disabled = false,
  'aria-label': ariaLabel = 'Tag',
}) {
  const expenses = useSelector((state) => state.dashboard.expenses);
  const knownTags = useMemo(() => collectKnownTags(expenses), [expenses]);
  const suggestions = useMemo(
    () => suggestTags(knownTags, value),
    [knownTags, value]
  );

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef(null);
  const listId = useId();
  const suggestionsKey = suggestions.join('|');

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [suggestionsKey]);

  const pickSuggestion = (tag) => {
    onChange?.(applyTagSuggestion(value, tag));
    setOpen(false);
  };

  const handleKeyDown = (event) => {
    if (!open || suggestions.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % suggestions.length);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + suggestions.length) % suggestions.length);
      return;
    }
    if (event.key === 'Enter') {
      if (suggestions[activeIndex]) {
        event.preventDefault();
        pickSuggestion(suggestions[activeIndex]);
      }
      return;
    }
    if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  const showList = open && suggestions.length > 0;

  return (
    <div className="relative" ref={rootRef}>
      <input
        className={className}
        type="text"
        value={value}
        placeholder={placeholder}
        aria-label={ariaLabel}
        autoComplete="off"
        disabled={disabled}
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        role="combobox"
        onChange={(event) => {
          onChange?.(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 120);
        }}
        onKeyDown={handleKeyDown}
      />

      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-40 w-full list-none overflow-y-auto rounded-sm border border-edge bg-surface p-1 shadow-lg"
        >
          {suggestions.map((tag, index) => (
            <li key={tag} role="option" aria-selected={index === activeIndex}>
              <button
                type="button"
                className={`w-full rounded-sm border-0 px-2.5 py-2 text-left text-sm ${
                  index === activeIndex
                    ? 'bg-primary/15 text-primary'
                    : 'bg-transparent text-[#f0f4f2] hover:bg-surface-2'
                }`}
                onMouseDown={(event) => {
                  event.preventDefault();
                  pickSuggestion(tag);
                }}
                onMouseEnter={() => setActiveIndex(index)}
              >
                #{tag}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
