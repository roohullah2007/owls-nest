import { Children, isValidElement, ReactNode } from 'react';
import ReactSelect, { GroupBase, StylesConfig } from 'react-select';

export interface SelectOption {
    value: string;
    label: string;
    isDisabled?: boolean;
}

interface CommonProps {
    /** Current value (string). Wrapper converts to/from react-select's object shape. */
    value?: string | null;
    onChange?: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    isClearable?: boolean;
    isSearchable?: boolean;
    className?: string;
    /** Visual height — defaults to 'md' (36px). */
    size?: 'sm' | 'md' | 'lg';
    /** Forwarded onBlur so callers can dismiss inline editors etc. */
    onBlur?: () => void;
    /** When true, opens the menu on mount and focuses the input. */
    autoFocus?: boolean;
    name?: string;
    required?: boolean;
}

interface OptionsModeProps extends CommonProps {
    options: SelectOption[];
    children?: never;
}

interface ChildrenModeProps extends CommonProps {
    options?: never;
    /** When passed, the wrapper extracts <option> children and converts them to react-select options. */
    children: ReactNode;
}

type Props = OptionsModeProps | ChildrenModeProps;

const HEIGHT_PX: Record<NonNullable<CommonProps['size']>, number> = { sm: 32, md: 36, lg: 40 };
const FONT_PX: Record<NonNullable<CommonProps['size']>, number> = { sm: 12, md: 13, lg: 14 };

function optionsFromChildren(children: ReactNode): SelectOption[] {
    const result: SelectOption[] = [];
    Children.forEach(children, (child) => {
        if (!isValidElement(child)) return;
        if (child.type === 'option') {
            const props = child.props as { value: string | number; children: ReactNode; disabled?: boolean };
            const label = typeof props.children === 'string' ? props.children : String(props.children ?? '');
            result.push({ value: String(props.value), label, isDisabled: props.disabled });
        }
    });
    return result;
}

/**
 * Drop-in replacement for native <select> with consistent app styling.
 *
 * Internally renders react-select so option text is always vertically-centered, the
 * chevron never overlaps long labels, and we get free search/keyboard support.
 *
 * Two usage modes:
 *   1) <Select value={v} onChange={set} options={[{ value, label }]} />
 *   2) <Select value={v} onChange={set}>
 *        <option value="a">A</option>
 *        <option value="b">B</option>
 *      </Select>
 *
 * `onChange` receives the raw string value (not the option object) to match native
 * <select> semantics.
 */
export default function Select(props: Props) {
    const { value, onChange, placeholder, disabled, isClearable, isSearchable = true, className, size = 'md', onBlur, autoFocus, name, required } = props;

    const options: SelectOption[] = 'options' in props && props.options
        ? props.options
        : optionsFromChildren(props.children);

    const height = HEIGHT_PX[size];
    const fontSize = FONT_PX[size];
    const selected = options.find((o) => o.value === (value ?? '')) ?? null;

    const styles: StylesConfig<SelectOption, false, GroupBase<SelectOption>> = {
        control: (base, state) => ({
            ...base,
            minHeight: height,
            height,
            borderColor: state.isFocused ? '#1693C9' : '#E4E7EB',
            boxShadow: state.isFocused ? '0 0 0 1px #1693C9' : 'none',
            backgroundColor: state.isDisabled ? '#F9FAFB' : 'white',
            borderRadius: 8,
            cursor: 'pointer',
            ':hover': { borderColor: state.isFocused ? '#1693C9' : '#C8CCD1' },
        }),
        valueContainer: (base) => ({ ...base, paddingTop: 0, paddingBottom: 0, paddingLeft: 12, paddingRight: 0, fontSize }),
        input: (base) => ({ ...base, margin: 0, padding: 0, color: '#111315' }),
        singleValue: (base) => ({ ...base, color: '#111315', margin: 0 }),
        placeholder: (base) => ({ ...base, color: '#8B9096', margin: 0 }),
        indicatorSeparator: () => ({ display: 'none' }),
        dropdownIndicator: (base, state) => ({
            ...base,
            color: state.isFocused ? '#1693C9' : '#8B9096',
            paddingLeft: 4,
            paddingRight: 8,
            ':hover': { color: '#5F656D' },
        }),
        clearIndicator: (base) => ({ ...base, color: '#8B9096', padding: 4, ':hover': { color: '#DC2626' } }),
        menu: (base) => ({ ...base, borderRadius: 8, border: '1px solid #E4E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', overflow: 'hidden', zIndex: 60 }),
        menuList: (base) => ({ ...base, padding: 4 }),
        option: (base, state) => ({
            ...base,
            backgroundColor: state.isSelected ? '#EBF5FF' : state.isFocused ? '#F3F4F6' : 'white',
            color: state.isSelected ? '#1693C9' : '#111315',
            fontSize,
            padding: '6px 10px',
            borderRadius: 6,
            cursor: 'pointer',
            ':active': { backgroundColor: '#EBF5FF' },
        }),
    };

    return (
        <ReactSelect<SelectOption, false>
            className={className}
            classNamePrefix="bunny-select"
            options={options}
            value={selected}
            onChange={(opt) => onChange?.(opt?.value ?? '')}
            onBlur={onBlur}
            placeholder={placeholder ?? 'Select…'}
            isDisabled={disabled}
            isClearable={isClearable}
            isSearchable={isSearchable}
            autoFocus={autoFocus}
            name={name}
            required={required}
            styles={styles}
            menuPlacement="auto"
            menuPosition="fixed"
        />
    );
}
