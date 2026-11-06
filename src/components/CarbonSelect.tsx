import { ComboBox, Dropdown } from "@carbon/react";
import { Children, isValidElement, useId, useMemo } from "react";

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

export default function CarbonSelect({
  id,
  value,
  onChange,
  children,
  placeholder = "请选择",
  className = "",
  ariaLabel,
}: Props) {
  const generatedId = useId();
  const controlId = id ?? `carbon-select-${generatedId}`;
  const options = useMemo<Option[]>(() => Children.toArray(children).flatMap((child) => {
    if (!isValidElement(child) || child.type !== "option") return [];
    const props = child.props as { value?: string; children?: React.ReactNode; disabled?: boolean };
    return [{
      value: props.value ?? String(props.children ?? ""),
      label: String(props.children ?? ""),
      disabled: props.disabled,
    }];
  }), [children]);

  const selectedItem = options.find((option) => option.value === value) ?? null;
  const itemToString = (item: Option | null) => item?.label ?? "";
  const handleChange = ({ selectedItem: nextItem }: { selectedItem?: Option | null }) => {
    if (nextItem) onChange(nextItem.value);
  };

  if (options.length > 8) {
    return (
      <ComboBox
        id={controlId}
        className={className}
        items={options}
        itemToString={itemToString}
        selectedItem={selectedItem}
        onChange={handleChange}
        titleText=""
        placeholder={placeholder}
        ariaLabel={ariaLabel || placeholder}
        size="md"
      />
    );
  }

  return (
    <Dropdown
      id={controlId}
      className={className}
      items={options}
      itemToString={itemToString}
      selectedItem={selectedItem}
      onChange={handleChange}
      titleText=""
      label={placeholder}
      ariaLabel={ariaLabel || placeholder}
      size="md"
    />
  );
}
