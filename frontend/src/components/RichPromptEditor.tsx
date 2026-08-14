'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Sparkles, Check, Trash2, X } from 'lucide-react';
import { createPortal } from 'react-dom';

interface RichPromptEditorProps {
  value: string;
  onChange: (newValue: string) => void;
  placeholder?: string;
  savedPlaceholders: Array<{ id: string; name: string; value?: string; category?: string }>;
  variableValues: Record<string, string>;
  onUpdateVariableValue: (key: string, val: string) => void;
  getPlaceholderIcon?: (name: string) => React.ReactNode;
}

const CHIP_CLASS = 'inline-chip';
const CHIP_SELECTOR = `.${CHIP_CLASS}`;

export function RichPromptEditor({
  value,
  onChange,
  placeholder = "Type your prompt here... Use the 'Smart Tags' button to insert variables like {{link}} or {{author}}.",
  savedPlaceholders,
  variableValues,
  onUpdateVariableValue,
}: RichPromptEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ x: number; y: number } | null>(null);
  const [dropdownTrigger, setDropdownTrigger] = useState<{ name: string; currentVal: string } | null>(null);
  const [tempValue, setTempValue] = useState('');

  // Sync tracking
  const isInternalChange = useRef(false);
  const lastSyncedValue = useRef<string | null>(null);
  const lastSyncedVars = useRef<string>('');

  // 1. Find Placeholder
  const findPlaceholder = useCallback((name: string) => {
    return savedPlaceholders.find((p) => p.name.toLowerCase() === name.toLowerCase());
  }, [savedPlaceholders]);

  // 2. Render HTML Chip
  const renderChip = useCallback((name: string) => {
    const ph = findPlaceholder(name);
    const cleanLabel = (ph?.name || name).replace(/_/g, ' ').toUpperCase();
    const key = name.toUpperCase();
    const currentVal = variableValues[key] ?? ph?.value ?? '';
    const isValid = Boolean(currentVal && currentVal.trim());
    
    return `<span class="${CHIP_CLASS} ${isValid ? 'valid' : 'empty'}" data-name="${name}" contenteditable="false" title="Click to view & edit {{${cleanLabel}}} value">
      <span class="chip-dot">${isValid ? '✓' : '✨'}</span>
      <span class="chip-label">{{${cleanLabel}}}</span>
      ${currentVal ? `<span class="chip-value">(${currentVal})</span>` : ''}
    </span>`;
  }, [findPlaceholder, variableValues]);

  // 3. Text to HTML
  const htmlFromText = useCallback((text: string) => {
    if (!text) return '';
    return text.split(/(\{\{[a-zA-Z0-9_]+\}\})/g).map(part => {
      const match = part.match(/^\{\{([a-zA-Z0-9_]+)\}\}$/);
      if (match) return renderChip(match[1]);
      return part.replace(/</g, '&lt;').replace(/>/g, '&gt;');
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

  // 7. Click on Chip to open Tooltip Popover
  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const chip = target.closest(CHIP_SELECTOR) as HTMLElement;

    if (chip) {
      const name = chip.dataset.name;
      if (name) {
        e.preventDefault();
        e.stopPropagation();
        const rect = chip.getBoundingClientRect();
        const key = name.toUpperCase();
        const val = variableValues[key] ?? findPlaceholder(name)?.value ?? '';
        setDropdownTrigger({ name, currentVal: val });
        setTempValue(val);
        setDropdownPos({ x: rect.left + rect.width / 2, y: rect.top });
        setShowDropdown(true);
      }
    }
  }, [findPlaceholder, variableValues]);

  // Close Popover on Outside Click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    if (showDropdown) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showDropdown]);

  // Sync from props & variable changes
  useEffect(() => {
    const varsString = JSON.stringify(variableValues);
    if (isInternalChange.current) return;
    
    if (value !== lastSyncedValue.current || varsString !== lastSyncedVars.current) {
      const editor = editorRef.current;
      if (!editor) return;
      const newHtml = htmlFromText(value || '');
      const caretPos = getCaretPosition(editor);
      applyHtml(editor, newHtml, caretPos);
      lastSyncedValue.current = value || '';
      lastSyncedVars.current = varsString;
    }
  }, [value, variableValues, htmlFromText, applyHtml, getCaretPosition]);

  // Save variable value
  const handleSaveValue = () => {
    if (!dropdownTrigger) return;
    const key = dropdownTrigger.name.toUpperCase();
    onUpdateVariableValue(key, tempValue);
    setShowDropdown(false);
  };

  // Delete variable from prompt
  const handleDeleteTagFromPrompt = () => {
    if (!dropdownTrigger) return;
    const targetTag = `{{${dropdownTrigger.name}}}`;
    const newText = (value || '').replace(targetTag, '');
    onChange(newText);
    setShowDropdown(false);
  };

  // Tooltip Popover render with Hover Tooltips on Actions
  const renderDropdown = () => {
    if (!showDropdown || !dropdownPos || !dropdownTrigger) return null;
    return createPortal(
      <div
        ref={popoverRef}
        className="fixed z-[9999] w-80 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-3.5 shadow-2xl animate-fadeIn backdrop-blur-xl space-y-3"
        style={{
          left: Math.max(16, Math.min(window.innerWidth - 330, dropdownPos.x - 160)),
          top: Math.max(10, dropdownPos.y - 145),
        }}
      >
        {/* Header with Tag Name */}
        <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#2563EB]/10 text-[#2563EB] rounded-lg">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-xs font-extrabold text-[var(--text-primary)] block">
                {`{{${dropdownTrigger.name.toUpperCase()}}}`}
              </span>
              <span className="text-[10px] text-[var(--text-secondary)] font-medium">
                Smart Variable Tooltip
              </span>
            </div>
          </div>
          <button
            type="button"
            title="Close menu"
            onClick={() => setShowDropdown(false)}
            className="h-6 w-6 rounded-lg bg-[var(--bg-input)] hover:bg-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Value Input */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">
            Value to replace on publish:
          </label>
          <input
            type="text"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSaveValue();
              }
              if (e.key === 'Escape') {
                setShowDropdown(false);
              }
            }}
            placeholder={`e.g. https://yourbrand.com/launch`}
            className="w-full text-xs bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl px-3 py-2 outline-none focus:border-[#2563EB] font-sans"
            autoFocus
          />
        </div>

        {/* Action Buttons with Hover Tooltips */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--border-color)]">
          <button
            type="button"
            onClick={handleDeleteTagFromPrompt}
            title="Remove this variable tag completely from prompt"
            className="text-[11px] font-bold text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
            <span>Remove Tag</span>
          </button>

          <button
            type="button"
            onClick={handleSaveValue}
            title="Save custom value and apply instantly"
            className="btn btn-primary px-3.5 py-1.5 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-xs bg-[#2563EB] text-white rounded-lg hover:bg-blue-600"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Save & Apply</span>
          </button>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <div className="relative bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl p-3.5 flex flex-col transition-all shadow-inner min-h-[190px] focus-within:border-[#2563EB]">
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
        />
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .${CHIP_CLASS} {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 10px;
          border-radius: 9px;
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
          cursor: pointer;
          user-select: none;
          margin: 0 3px;
          vertical-align: middle;
          transition: all 0.15s ease;
        }
        .${CHIP_CLASS}:hover {
          transform: translateY(-1px);
        }
        .${CHIP_CLASS}.valid {
          background: rgba(16, 185, 129, 0.16);
          color: #059669;
          border: 1.5px solid rgba(16, 185, 129, 0.5);
          box-shadow: 0 1px 3px rgba(16, 185, 129, 0.15);
        }
        .${CHIP_CLASS}.valid:hover {
          background: rgba(16, 185, 129, 0.25);
          border-color: rgba(16, 185, 129, 0.7);
        }
        .${CHIP_CLASS}.empty {
          background: rgba(37, 99, 235, 0.16);
          color: #2563EB;
          border: 1.5px solid rgba(37, 99, 235, 0.5);
          box-shadow: 0 1px 3px rgba(37, 99, 235, 0.15);
        }
        .${CHIP_CLASS}.empty:hover {
          background: rgba(37, 99, 235, 0.26);
          border-color: #2563EB;
        }
        .${CHIP_CLASS} .chip-dot {
          font-size: 11px;
        }
        .${CHIP_CLASS} .chip-label {
          font-weight: 800;
          font-size: 12px;
        }
        .${CHIP_CLASS} .chip-value {
          font-size: 11px;
          opacity: 0.9;
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
          font-weight: 700;
        }
      `}} />

      {renderDropdown()}
    </div>
  );
}