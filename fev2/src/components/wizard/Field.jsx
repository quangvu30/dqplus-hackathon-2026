// Shared label/input/error markup, ported from /frontend ProfileForm field pattern.
export function TextField({ label, required, value, onChange, error, type = 'text', placeholder, textarea }) {
  const cls = (textarea ? 'textarea' : 'input') + (error ? ' invalid' : '');
  const Comp = textarea ? 'textarea' : 'input';
  return (
    <div className="vn-field">
      <label className="label">{label}{required && <span className="req">*</span>}</label>
      <Comp className={cls} type={textarea ? undefined : type} value={value ?? ''} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)} />
      {error && <div className="field-error">{error}</div>}
    </div>
  );
}

export function NumberField({ label, required, value, onChange, error, placeholder }) {
  return (
    <div className="vn-field">
      <label className="label">{label}{required && <span className="req">*</span>}</label>
      <input
        className={'input' + (error ? ' invalid' : '')}
        type="number"
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
      />
      {error && <div className="field-error">{error}</div>}
    </div>
  );
}

export function SelectField({ label, required, value, onChange, error, options, placeholder = 'Select…' }) {
  return (
    <div className="vn-field">
      <label className="label">{label}{required && <span className="req">*</span>}</label>
      <select className={'select' + (error ? ' invalid' : '')} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <div className="field-error">{error}</div>}
    </div>
  );
}

export function ChipToggleField({ label, required, value = [], onChange, options, error }) {
  const toggle = (id) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  return (
    <div className="vn-field">
      <label className="label">{label}{required && <span className="req">*</span>}</label>
      <div className="vn-filter-chips">
        {options.map((o) => (
          <button key={o.id || o.value} type="button" className={'chip' + (value.includes(o.id || o.value) ? ' on' : '')}
            onClick={() => toggle(o.id || o.value)}>
            {o.label}
          </button>
        ))}
      </div>
      {error && <div className="field-error">{error}</div>}
    </div>
  );
}
