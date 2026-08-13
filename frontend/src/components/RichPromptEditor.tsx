'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Sparkles } from 'lucide-react';
import { createPortal } from 'react-dom';

interface RichPromptEditorProps {
  value: string;
  onChange: (newValue: string) => void;
  placeholder?: string;
  savedPlaceholders: Array<{ id: string; name: string; value?: string; category?: string }>;
  variableValues: Record<string, string>;
  onUpdateVariableValue: (key: string, val: string) => void;
  getPlaceholderIcon: (name: string) => React.ReactNode;
}

const CHIP_CLASS = 'inline-chip';
const CHIP_SELECTOR = `.${CHIP_CLASS}`;

export function RichPromptEditor({
  value,
  onChange,
  placeholder = "Type your prompt here... Use the 'Smart Tags' button to insert variables.",
  savedPlaceholders,
  variableValues,
  onUpdateVariableValue,
  getPlaceholderIcon,
}: RichPromptEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ x: number; y: number } | null>(null);
  const [dropdownTrigger, setDropdownTrigger] = useState<{ text: string } | null>(null);

  // Sync tracking
  const isInternalChange = useRef(false);
  const lastSyncedValue = useRef(value);

  // 1. Find Placeholder
  const findPlaceholder = useCallback((name: string) => {
    return savedPlaceholders.find((p) => p.name.toLowerCase() === name.toLowerCase());
  }, [savedPlaceholders]);

  // 2. Render HTML Chip
  const renderChip = useCallback((name: string) => {
    const ph = findPlaceholder(name);
    if (!ph) {
      return `<span class="${CHIP_CLASS} invalid-chip" data-name="${name}" contenteditable="false">{{${name}}}</span>`;
    }
    const cleanLabel = ph.name.replace(/_/g, ' ').toUpperCase();
    const key = ph.name.toUpperCase();
    const currentVal = variableValues[key] ?? ph.value ?? '';
    const isValid = !!currentVal;
    
    // We render a simple text icon for the HTML string fallback if complex SVG fails
    return `<span class="${CHIP_CLASS} ${isValid ? 'valid' : 'empty'}" data-name="${name}" data-id="${ph.id}" contenteditable="false">
      <span class="chip-label">${cleanLabel}</span>
      ${currentVal ? `<span class="chip-value">(${currentVal})</span>` : ''}
    </span>`;
  }, [findPlaceholder, variableValues]);

  // 3. Text to HTML
  const htmlFromText = useCallback((text: string) => {
    return text.split(/(\{\{[a-zA-Z0-9_]+\}\})/g).map(part => {
      const match = part.match(/^\{\{([a-zA-Z0-9_]+)\}\}$/);
      if (match) return renderChip(match[1]);
      return part.replace(/</g, '<').replace(/>/g, '>');
    }).join('');
  }, [renderChip]);

  // 4. HTML to Text
  const textFromHtml = useCallback((html: string) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return Array.from(div.childNodes).map(node => {
      if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        if (el.classList.contains(CHIP_CLASS)) return `{{${el.dataset.name}}}`;
        return el.textContent || '';
      }
      return '';
    }).join('');
  }, []);

  // 5. Caret Management
  const restoreCaret = useCallback((editor: HTMLElement, start: number, end: number) => {
    const text = textFromHtml(editor.innerHTML);
    if (start > text.length) start = text.length;
    if (end > text.length) end = text.length;

    let charIndex = 0;
    let foundStart = false;
    let foundEnd = false;
    const range = document.createRange();
    const sel = window.getSelection();
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);

    while (walker.nextNode()) {
      const node = walker.currentNode;
      const nodeText = node.textContent || '';
      const nodeLen = nodeText.length;

      if (!foundStart && charIndex + nodeLen >= start) {
        const offset = Math.max(0, start - charIndex);
        range.setStart(node.nodeType === Node.TEXT_NODE ? node : node.firstChild || node, Math.min(offset, nodeLen));
        foundStart = true;
      }
      if (!foundEnd && charIndex + nodeLen >= end) {
        const offset = Math.max(0, end - charIndex);
        range.setEnd(node.nodeType === Node.TEXT_NODE ? node : node.firstChild || node, Math.min(offset, nodeLen));
        foundEnd = true;
        break;
      }
      charIndex += nodeLen;
    }

    if (foundStart) {
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [textFromHtml]);

  const getCaretPosition = useCallback((editor: HTMLElement) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return { start: 0, end: 0 };
    const range = sel.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return { start: 0, end: 0 };

    let start = 0, end = 0;
    let charIndex = 0;
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    const nodes: Node[] = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    for (const node of nodes) {
      const nodeText = node.textContent || '';
      const nodeLen = nodeText.length;
      if (node === range.startContainer) start = charIndex + range.startOffset;
      if (node === range.endContainer) end = charIndex + range.endOffset;
      charIndex += nodeLen;
    }
    return { start, end };
  }, []);

  const applyHtml = useCallback((editor: HTMLElement, html: string, caretPos?: { start: number; end: number }) => {
    if (editor.innerHTML === html) return;
    editor.innerHTML = html;
    if (caretPos) restoreCaret(editor, caretPos.start, caretPos.end);
  }, [restoreCaret]);

  // 6. Events
  const handleInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    if (isComposing) return;
    const editor = e.currentTarget;
    const newText = textFromHtml(editor.innerHTML);
    
    isInternalChange.current = true;
    lastSyncedValue.current = newText;
    onChange(newText);
    
    requestAnimationFrame(() => {
      isInternalChange.current = false;
    });
  }, [textFromHtml, isComposing, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const editor = e.currentTarget;
    const sel = window.getSelection();

    if (e.key === 'Backspace' || e.key === 'Delete') {
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const startContainer = range.startContainer;
        const chip = (startContainer.nodeType === Node.ELEMENT_NODE
          ? startContainer as Element
          : startContainer.parentElement)?.closest(CHIP_SELECTOR) as HTMLElement;
        
        if (chip && range.collapsed) {
          const name = chip.dataset.name;
          if (name) {
            e.preventDefault();
            const text = textFromHtml(editor.innerHTML);
            const idx = text.indexOf(`{{${name}}}`);
            if (idx >= 0) {
              const newText = text.slice(0, idx) + text.slice(idx + name.length + 4);
              isInternalChange.current = true;
              lastSyncedValue.current = newText;
              onChange(newText);
              requestAnimationFrame(() => {
                applyHtml(editor, htmlFromText(newText), { start: idx, end: idx });
                isInternalChange.current = false;
              });
            }
            return;
          }
        }
      }
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      document.execCommand('insertText', false, '\n');
    }
  }, [textFromHtml, htmlFromText, onChange, applyHtml]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const chip = target.closest(CHIP_SELECTOR) as HTMLElement;

    if (chip) {
      const name = chip.dataset.name;
      const id = chip.dataset.id;
      if (name && id) {
        e.preventDefault();
        e.stopPropagation();
        const ph = findPlaceholder(name);
        if (!ph) return;
        const rect = chip.getBoundingClientRect();
        setDropdownTrigger({ text: `{{${name}}}` });
        setDropdownPos({ x: rect.left + rect.width / 2, y: rect.top });
        setShowDropdown(true);
      }
    }
  }, [findPlaceholder]);

  // Sync from props
  useEffect(() => {
    if (isInternalChange.current || value === lastSyncedValue.current) return;
    const editor = editorRef.current;
    if (!editor) return;
    const newHtml = htmlFromText(value);
    if (editor.innerHTML !== newHtml) {
      const caretPos = getCaretPosition(editor);
      applyHtml(editor, newHtml, caretPos);
      lastSyncedValue.current = value;
    }
  }, [value, htmlFromText, applyHtml, getCaretPosition]);

  // Dropdown render
  const renderDropdown = useCallback(() => {
    if (!showDropdown || !dropdownPos || !dropdownTrigger) return null;
    return createPortal(
      <div
        className="fixed z-[9999] w-72 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-3 shadow-2xl animate-fadeIn backdrop-blur-xl"
        style={{ left: dropdownPos.x, top: dropdownPos.y + 8, transform: 'translateX(-50%)' }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-extrabold text-[#2563EB] uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            Set Value
          </span>
          <button onClick={() => setShowDropdown(false)} className="text-slate-400 hover:text-slate-200 text-xs font-bold cursor-pointer">✕</button>
        </div>
        <input
          type="text"
          placeholder="Enter value..."
          className="w-full text-xs bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl px-3 py-2 outline-none focus:border-[#2563EB] font-sans mb-2"
          onChange={(e) => {
            onUpdateVariableValue(dropdownTrigger.text.replace(/[{}]/g, '').toUpperCase(), e.target.value);
            setShowDropdown(false);
          }}
          autoFocus
        />
      </div>,
      document.body
    );
  }, [showDropdown, dropdownPos, dropdownTrigger, onUpdateVariableValue]);

  return (
    <div className="relative bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl p-3 flex flex-col transition-all shadow-inner min-h-[200px] focus-within:border-[#2563EB]">
      
      {/* SaaS Top Header */}
      <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-[var(--border-color)]/60 shrink-0">
        <span className="text-xs text-[#2563EB] font-extrabold uppercase tracking-wider flex items-center gap-1.5 px-1">
          <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
          Prompt Editor
        </span>
      </div>

      {/* Editor Body */}
      <div className="flex-1 relative w-full h-full flex flex-col">
        <div
          ref={editorRef}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onClick={handleClick}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={(e) => {
            setIsComposing(false);
            const newText = textFromHtml(e.currentTarget.innerHTML);
            isInternalChange.current = true;
            lastSyncedValue.current = newText;
            onChange(newText);
            requestAnimationFrame(() => { isInternalChange.current = false; });
          }}
          contentEditable
          suppressContentEditableWarning
          spellCheck={false}
          className="w-full flex-1 bg-transparent border-none p-1 text-[var(--text-primary)] text-sm focus:outline-none leading-relaxed font-sans min-h-[140px] empty:before:content-[attr(data-placeholder)] empty:before:text-[var(--text-secondary)] empty:before:italic"
          data-placeholder={placeholder}
          style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}
        >
          {/* Initial Render handled by useEffect to set cursor right */}
        </div>
      </div>

      {/* Internal Styles for Chips */}
      <style jsx>{`
        .${CHIP_CLASS} {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
          cursor: pointer;
          user-select: none;
          margin: 0 2px;
          vertical-align: middle;
        }
        .${CHIP_CLASS}.valid {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .${CHIP_CLASS}.empty {
          background: rgba(37, 99, 235, 0.15);
          color: #3b82f6;
          border: 1px solid rgba(37, 99, 235, 0.4);
        }
        .${CHIP_CLASS}.invalid-chip {
          background: rgba(244, 63, 94, 0.1);
          color: #f43f5e;
          border: 1px solid rgba(244, 63, 94, 0.3);
        }
        .${CHIP_CLASS} .chip-value {
          font-size: 9px;
          opacity: 0.8;
          max-width: 80px;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      `}</style>

      {renderDropdown()}
    </div>
  );
}