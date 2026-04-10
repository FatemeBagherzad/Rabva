import { MAP_NODE_TYPES, useAyahMapCanvas } from '../../hooks/useAyahMapCanvas';
import './AyahMapCanvas.scss';

const AyahMapCanvas = ({ preferences }) => {
  const {
    viewportRef,
    pan,
    nodes,
    canvasStyles,
    startPanDrag,
    movePanDrag,
    stopPanDrag,
    panBy,
    onTemplateDragStart,
    onDropToSurface,
    onAllowDrop,
    updateNode,
    onPlaceholderKeyDown,
    onNodePointerDown,
    onResizeHandlePointerDown,
  } = useAyahMapCanvas(preferences);

  return (
    <div className="ayah-map" style={canvasStyles}>
      <div className="ayah-map__toolbar">
        <button type="button" className="ayah-map__arrow" onClick={() => panBy(0, 80)}>
          ↑
        </button>
        <button type="button" className="ayah-map__arrow" onClick={() => panBy(0, -80)}>
          ↓
        </button>
        <button type="button" className="ayah-map__arrow" onClick={() => panBy(80, 0)}>
          ←
        </button>
        <button type="button" className="ayah-map__arrow" onClick={() => panBy(-80, 0)}>
          →
        </button>

        <div className="ayah-map__seed" draggable onDragStart={onTemplateDragStart}>
          1:1
        </div>
      </div>

      <div
        ref={viewportRef}
        className="ayah-map__viewport"
        onPointerDown={startPanDrag}
        onPointerMove={movePanDrag}
        onPointerUp={stopPanDrag}
        onPointerCancel={stopPanDrag}
        onDrop={onDropToSurface}
        onDragOver={onAllowDrop}
      >
        <div
          className="ayah-map__surface"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}
        >
          {nodes.map((node) => (
            <div
              key={node.id}
              className={`ayah-map__node ayah-map__node--${node.type}`}
              style={{ transform: `translate3d(${node.x}px, ${node.y}px, 0)` }}
              onPointerDown={(event) => onNodePointerDown(event, node.id, node.type)}
            >
              {(node.type === MAP_NODE_TYPES.PLACEHOLDER || node.type === MAP_NODE_TYPES.ERROR) && (
                <div className="ayah-map__address-box">
                  <input
                    value={node.address}
                    onChange={(event) => updateNode(node.id, { address: event.target.value })}
                    onKeyDown={(event) => onPlaceholderKeyDown(event, node.id)}
                    className="ayah-map__address-input"
                  />
                  {node.error ? <div className="ayah-map__error">{node.error}</div> : null}
                </div>
              )}

              {node.type === MAP_NODE_TYPES.LOADING && <div className="ayah-map__loading">Loading...</div>}

              {node.type === MAP_NODE_TYPES.READY && (
                <div
                  className={`ayah-map__ayah-card ${node.width ? 'is-resized' : ''}`}
                  style={{
                    width: node.width ? `${node.width}px` : undefined,
                    height: node.height ? `${node.height}px` : undefined,
                  }}
                >
                  <button
                    type="button"
                    className="ayah-map__resize-handle ayah-map__resize-handle--nw"
                    onPointerDown={(event) => onResizeHandlePointerDown(event, node.id, 'nw')}
                    aria-label="Resize from top-left"
                  />
                  <button
                    type="button"
                    className="ayah-map__resize-handle ayah-map__resize-handle--ne"
                    onPointerDown={(event) => onResizeHandlePointerDown(event, node.id, 'ne')}
                    aria-label="Resize from top-right"
                  />
                  <button
                    type="button"
                    className="ayah-map__resize-handle ayah-map__resize-handle--sw"
                    onPointerDown={(event) => onResizeHandlePointerDown(event, node.id, 'sw')}
                    aria-label="Resize from bottom-left"
                  />
                  <button
                    type="button"
                    className="ayah-map__resize-handle ayah-map__resize-handle--se"
                    onPointerDown={(event) => onResizeHandlePointerDown(event, node.id, 'se')}
                    aria-label="Resize from bottom-right"
                  />
                  <div className="ayah-map__ayah-content">
                    {node.words.map((word, index) => (
                      <span key={`${node.id}-${index}`} className="ayah-map__word-block">
                        <span className="ayah-map__word-text">{word.text}</span>
                        <span className="ayah-map__segments">
                          {word.segments.length ? (
                            word.segments.map((segment, segmentIndex) => (
                              <span
                                key={`${node.id}-${index}-${segmentIndex}`}
                                className="ayah-map__segment-item"
                              >
                                {segment}
                              </span>
                            ))
                          ) : (
                            <span className="ayah-map__segment-item">---</span>
                          )}
                        </span>
                      </span>
                    ))}
                  </div>
                  <div className="ayah-map__address-label">{node.address}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AyahMapCanvas;
