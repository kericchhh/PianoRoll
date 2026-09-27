export function drawTimeLine(context: CanvasRenderingContext2D, x: number, height: number): void {
    context.strokeStyle = '#64748b'
    context.beginPath()
    context.moveTo(x,0)
    context.lineTo(x,height)
    context.stroke()
};
