export function EditorInstructions({ id }: { id: string }) {
    return (
        <p id={id} className="sr-only">
            Ctrl or Command-click toggles a note. Ctrl or Command-drag empty
            grid selects overlapping notes. Use the note-list buttons to toggle
            selection with the keyboard, arrow keys to move selected notes,
            Shift+Left or Shift+Right to resize them, and Delete to remove them.
            Drag a note's right edge to resize the selection. Ctrl or Command+C
            copies selected notes. Ctrl or Command+V pastes after the selected
            group or last paste. Space toggles playback. Enter toggles a focused
            note-list button's selection. Use the New note pitch and Start tick
            fields followed by Add note to insert a note.
        </p>
    );
}
