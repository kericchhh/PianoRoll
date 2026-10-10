import { useRef } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

type Props = {
    label: string;
    loadingLabel: string;
    fileLabel: string;
    accept: string;
    isLoading: boolean;
    describedBy: string;
} & (
    | { directory?: false; onFile: (file: File) => void | Promise<void> }
    | {
          directory: true;
          onFiles: (files: readonly File[]) => void | Promise<void>;
      }
);

export function ImportFileButton({
    label,
    loadingLabel,
    fileLabel,
    accept,
    isLoading,
    describedBy,
    ...selection
}: Props) {
    const inputRef = useRef<HTMLInputElement>(null);
    return (
        <>
            <Button
                type="button"
                variant="outline"
                className="w-full justify-start"
                aria-busy={isLoading}
                aria-disabled={isLoading}
                aria-describedby={describedBy}
                onClick={() => {
                    if (!isLoading) inputRef.current?.click();
                }}
            >
                <Upload aria-hidden="true" />
                {isLoading ? loadingLabel : label}
            </Button>
            <input
                ref={inputRef}
                type="file"
                accept={accept}
                multiple={selection.directory}
                {...(selection.directory
                    ? { webkitdirectory: '', directory: '' }
                    : {})}
                aria-label={fileLabel}
                hidden
                onChange={(event) => {
                    const files = Array.from(event.currentTarget.files ?? []);
                    event.currentTarget.value = '';
                    if (!files.length || isLoading) return;
                    if (selection.directory) void selection.onFiles(files);
                    else void selection.onFile(files[0]);
                }}
            />
        </>
    );
}
