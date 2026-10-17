import { useId, useState } from 'react';
import { MIN_BPM, MAX_BPM } from '@/features/piano-roll/constants/music';
import { isValidBpm } from '@/features/piano-roll/utils/time/isValidBpm';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';

type Props = {
    value: number;
    onCommit: (value: number) => boolean;
};

export function BpmInput({ value, onCommit }: Props) {
    const inputId = useId();
    const errorId = useId();
    const [edit, setEdit] = useState({
        bpm: value,
        draft: String(value),
        error: '',
    });
    const current =
        edit.bpm === value
            ? edit
            : { bpm: value, draft: String(value), error: '' };
    if (edit.bpm !== value) setEdit(current);
    function commitDraft() {
        const next = Number(current.draft);
        const error = !isValidBpm(next)
            ? `Enter a whole BPM from ${MIN_BPM} to ${MAX_BPM}.`
            : onCommit(next)
              ? ''
              : 'Finish the active edit before changing BPM.';
        setEdit({
            bpm: value,
            draft: error ? current.draft : String(next),
            error,
        });
    }
    return (
        <div className="flex min-w-0 flex-col items-end gap-1">
            <div className="flex items-center gap-2">
                <Label
                    htmlFor={inputId}
                    className="text-xs text-muted-foreground"
                >
                    BPM
                </Label>
                <Input
                    id={inputId}
                    type="number"
                    className="w-20"
                    min={MIN_BPM}
                    max={MAX_BPM}
                    step={1}
                    value={current.draft}
                    aria-invalid={!!current.error}
                    aria-describedby={current.error ? errorId : undefined}
                    onChange={(event) =>
                        setEdit({
                            bpm: value,
                            draft: event.target.value,
                            error: '',
                        })
                    }
                    onBlur={commitDraft}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            commitDraft();
                        }
                    }}
                />
            </div>
            {current.error && (
                <p
                    id={errorId}
                    role="alert"
                    className="max-w-64 text-xs text-destructive"
                >
                    {current.error}
                </p>
            )}
        </div>
    );
}
