import { useRef, useEffect, useCallback } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, Minus } from 'lucide-react';

const Sep = () => <div className="h-4 w-px bg-[var(--border-soft)] mx-1 shrink-0" />;

const TBtn = ({ onClick, title, children }) => (
  <button
    type="button"
    onMouseDown={(e) => { e.preventDefault(); onClick(); }}
    title={title}
    className="px-2 py-1 rounded-md text-xs font-bold text-[var(--text-muted)] hover:bg-[var(--bg-surface-2)] hover:text-[var(--text-primary)] transition-colors flex items-center justify-center"
  >
    {children}
  </button>
);

const RichTextEditor = ({ value, onChange, placeholder = 'Escribe aquí...' }) => {
  const editorRef = useRef(null);

  // Solo sincroniza cuando el editor no tiene foco (cambio externo de valor, e.g., al seleccionar otra lección)
  useEffect(() => {
    if (editorRef.current && document.activeElement !== editorRef.current) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const exec = useCallback((command, arg = null) => {
    editorRef.current?.focus();
    document.execCommand(command, false, arg);
    if (onChange) onChange(editorRef.current?.innerHTML || '');
  }, [onChange]);

  const handleInput = useCallback(() => {
    if (onChange) onChange(editorRef.current?.innerHTML || '');
  }, [onChange]);

  return (
    <div className="border border-[var(--border-soft)] rounded-xl overflow-hidden focus-within:border-[var(--color-primary)] transition-colors">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-[var(--bg-surface-3)] border-b border-[var(--border-soft)]">
        <TBtn onClick={() => exec('bold')} title="Negrita (Ctrl+B)">
          <Bold className="h-3.5 w-3.5" />
        </TBtn>
        <TBtn onClick={() => exec('italic')} title="Cursiva (Ctrl+I)">
          <Italic className="h-3.5 w-3.5" />
        </TBtn>
        <TBtn onClick={() => exec('underline')} title="Subrayado (Ctrl+U)">
          <Underline className="h-3.5 w-3.5" />
        </TBtn>

        <Sep />

        <TBtn onClick={() => exec('formatBlock', 'H1')} title="Título H1">
          <span className="text-[11px] font-black tracking-tight">H1</span>
        </TBtn>
        <TBtn onClick={() => exec('formatBlock', 'H2')} title="Título H2">
          <span className="text-[11px] font-black tracking-tight">H2</span>
        </TBtn>
        <TBtn onClick={() => exec('formatBlock', 'P')} title="Párrafo normal">
          <span className="text-[11px] font-bold">P</span>
        </TBtn>

        <Sep />

        <TBtn onClick={() => exec('insertUnorderedList')} title="Lista con viñetas">
          <List className="h-3.5 w-3.5" />
        </TBtn>
        <TBtn onClick={() => exec('insertOrderedList')} title="Lista numerada">
          <ListOrdered className="h-3.5 w-3.5" />
        </TBtn>

        <Sep />

        <TBtn onClick={() => exec('removeFormat')} title="Quitar formato">
          <Minus className="h-3.5 w-3.5" />
        </TBtn>
      </div>

      {/* Área editable */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        data-placeholder={placeholder}
        className="rich-editor min-h-[160px] p-4 bg-[var(--bg-surface-2)] text-[var(--text-primary)] focus:outline-none text-sm leading-relaxed"
      />
    </div>
  );
};

export default RichTextEditor;
