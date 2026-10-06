export function getCanvasScale(
    canvas: HTMLElement,
    width: number,
    height: number,
) {
    if (canvas.clientWidth <= 0 || canvas.clientHeight <= 0) return null;
    return { x: width / canvas.clientWidth, y: height / canvas.clientHeight };
}

export function clientToCanvasPoint(
    canvas: HTMLElement,
    clientX: number,
    clientY: number,
    width: number,
    height: number,
) {
    const scale = getCanvasScale(canvas, width, height);
    if (!scale) return null;
    const bounds = canvas.getBoundingClientRect();
    return {
        x: (clientX - bounds.left - canvas.clientLeft) * scale.x,
        y: (clientY - bounds.top - canvas.clientTop) * scale.y,
    };
}
