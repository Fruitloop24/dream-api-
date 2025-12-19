/**
 * CopyButton - Small button to copy text to clipboard
 */

interface CopyButtonProps {
  text: string;
  onCopy: (text: string) => void;
  label?: string;
}

export function CopyButton({ text, onCopy, label = 'Copy' }: CopyButtonProps) {
  return (
    <button
      onClick={() => onCopy(text)}
      className="text-xs text-blue-400 hover:text-blue-300"
    >
      {label}
    </button>
  );
}
