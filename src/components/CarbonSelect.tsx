import { Children, isValidElement, useEffect, useMemo, useRef, useState } from "react";

type Option = { value: string; label: string; disabled?: boolean };
type Props = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  children?: React.ReactNode;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
};

function OptionLabel({ label }: { label: string }) {
  const characters = Array.from(label);
  const firstCode = characters[0]?.codePointAt(0) ?? 0;
  const secondCode = characters[1]?.codePointAt(0) ?? 0;
  const isFlag = firstCode >= 0x1f1e6 && firstCode <= 0x1f1ff &&
    secondCode >= 0x1f1e6 && secondCode <= 0x1f1ff;
  const flag = characters.slice(0, 2).join("");
  const text = characters.slice(2).join("").trimStart();
  return isFlag ? (
    <span className="carbon-select-flag-label">
      <span className="carbon-select-flag-circle">{flag}</span>
      <span>{text}</span>
    </span>
  ) : <>{label}</>;
}

export default function CarbonSelect({
  id,
  value,
  onChange,
  children,
  placeholder = "请选择",
  className = "",
  ariaLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const listboxId = id ? `${id}-listbox` : undefined;

  const options = useMemo<Option[]>(() => Children.toArray(children).flatMap((child) => {
    if (!isValidElement(child) || child.type !== "option") return [];
    const props = child.props as { value?: string; children?: React.ReactNode; disabled?: boolean };
    return [{
      value: props.value ?? String(props.children ?? ""),
      label: String(props.children ?? ""),
      disabled: props.disabled,
    }];
  }), [children]);

  const selected = options.find((option) => option.value === value);
  const filtered = options.filter((option) =>
    option.label.toLocaleLowerCase().includes(query.toLocaleLowerCase())
  );
  const enabledFiltered = filtered.filter((option) => !option.disabled);

  const focusOption = (option: Option | undefined) => {
    if (!option) return;
    const index = options.findIndex((item) => item.value === option.value);
    optionRefs.current[index]?.focus();
  };

  useEffect(() => {
    if (!open) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        root.current?.querySelector<HTMLButtonElement>(".carbon-select-trigger")?.focus();
      }
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);

    const focusTarget = options.length > 8
      ? root.current?.querySelector<HTMLInputElement>(".carbon-select-search")
      : optionRefs.current[options.findIndex((option) => option.value === selected?.value)] ??
        optionRefs.current[options.findIndex((option) => !option.disabled)];
    focusTarget?.focus();

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open, options, selected?.value]);

  const handleOptionKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    currentOption: Option,
  ) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();

    const currentIndex = enabledFiltered.findIndex((option) => option.value === currentOption.value);
    let nextIndex = currentIndex;
    if (event.key === "ArrowDown") nextIndex = (currentIndex + 1) % enabledFiltered.length;
    if (event.key === "ArrowUp") nextIndex = (currentIndex - 1 + enabledFiltered.length) % enabledFiltered.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = enabledFiltered.length - 1;
    focusOption(enabledFiltered[nextIndex]);
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" && enabledFiltered.length) {
      event.preventDefault();
      focusOption(enabledFiltered[0]);
    }
  };

  return (
    <div className={`carbon-select ${className}`} ref={root}>
      <button
        id={id}
        type="button"
        className="carbon-select-trigger"
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-expanded={open}
        aria-label={ariaLabel || selected?.label || placeholder}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={selected ? "" : "carbon-select-placeholder"}>
          {selected ? <OptionLabel label={selected.label} /> : placeholder}
        </span>
        <span className="carbon-select-chevron" aria-hidden="true">⌄</span>
      </button>

      {open && (
        <div className="carbon-select-menu">
          {options.length > 8 && (
            <input
              className="carbon-select-search"
              aria-label="搜索选项"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="搜索选项…"
            />
          )}
          <div id={listboxId} className="carbon-select-options" role="listbox" aria-label={ariaLabel || placeholder}>
            {filtered.map((option) => {
              const optionIndex = options.findIndex((item) => item.value === option.value);
              return (
                <button
                  ref={(node) => { optionRefs.current[optionIndex] = node; }}
                  type="button"
                  role="option"
                  tabIndex={-1}
                  aria-selected={value === option.value}
                  disabled={option.disabled}
                  key={option.value}
                  className={value === option.value ? "carbon-select-option selected" : "carbon-select-option"}
                  onKeyDown={(event) => handleOptionKeyDown(event, option)}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                    setQuery("");
                    root.current?.querySelector<HTMLButtonElement>(".carbon-select-trigger")?.focus();
                  }}
                >
                  <OptionLabel label={option.label} />
                  {value === option.value && <span aria-hidden="true">✓</span>}
                </button>
              );
            })}
            {!filtered.length && <div className="carbon-select-empty">没有匹配的选项</div>}
          </div>
        </div>
      )}
    </div>
  );
}
