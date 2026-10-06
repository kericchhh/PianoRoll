type Props = {
    announcement: { text: string; sequence: number };
};

export function EditorAnnouncement({ announcement }: Props) {
    return (
        <p
            role="status"
            aria-label="Note editing status"
            aria-atomic="true"
            className="sr-only"
        >
            <span key={announcement.sequence}>{announcement.text}</span>
        </p>
    );
}
